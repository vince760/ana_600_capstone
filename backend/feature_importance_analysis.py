"""
feature_importance_analysis.py
==============================
Cross-method feature importance analysis for the SCF spending model.

Computes four importance measures on the same train/test split used by
scf_spending_pipeline.py, then merges them into a side-by-side comparison
so you can see which features are robustly important across methods
and which are method-specific artifacts.

Methods:
  1. Logistic Regression standardized coefficients (direction + magnitude)
  2. Random Forest built-in feature_importances_ (Gini-based)
  3. Permutation importance on Logistic Regression (test-set AUC drop)
  4. Permutation importance on Random Forest (test-set AUC drop)

Outputs:
  - outputs/feature_importance_comparison.csv   (ranks + raw values)
  - outputs/lr_coefficients.csv                 (signed LR coefs)
  - outputs/14_importance_comparison.png        (grouped bar chart of ranks)
  - outputs/15_lr_coefficients.png              (signed coefficients)
  - outputs/16_permutation_importance.png       (permutation AUC drop)

Usage:
  python feature_importance_analysis.py
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score

# --- Configuration ---
DATA_PATH = Path("data/SCFP2022.csv")
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE = 0.2
N_PERMUTATIONS = 15

plt.rcParams.update({
    'figure.figsize': (12, 8),
    'font.size': 12,
    'axes.titlesize': 14,
    'axes.labelsize': 12,
    'figure.dpi': 150,
    'savefig.bbox': 'tight',
    'savefig.dpi': 150,
})
NAVY = '#1B2A4A'
TEAL = '#2E8B8B'
GOLD = '#D4930D'
RED = '#8B2E2E'


# ═══════════════════════════════════════════════════════════════════════
# STEP 1: LOAD DATA
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 1: LOADING SCF 2022 EXTRACT DATA")
print("=" * 70)

df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df)} records, {len(df.columns)} columns")

if 'Y1' in df.columns:
    df['household_id'] = df['Y1'].astype(str).str[:-1].astype(int)
else:
    df['household_id'] = np.arange(len(df))
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 2: FEATURE ENGINEERING (mirrors pipeline)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 2: FEATURE ENGINEERING")
print("=" * 70)

df['target'] = (df['EXPENSHILO'] == 1).astype(int)

RAW_FEATURES = [
    'INCOME', 'DEBT', 'LIQ', 'ASSET', 'NETWORTH', 'CCBAL', 'CONSPAY',
    'FOODHOME', 'FOODAWAY', 'AGE', 'FAMSTRUCT',
]
available_raw = [c for c in RAW_FEATURES if c in df.columns]

if 'DEBT2INC' in df.columns:
    df['DTI'] = df['DEBT2INC']
elif {'DEBT', 'INCOME'}.issubset(df.columns):
    df['DTI'] = np.where(df['INCOME'] > 0, df['DEBT'] / df['INCOME'], 0)

if {'CONSPAY', 'INCOME'}.issubset(df.columns):
    df['PAYMENT_TO_INC'] = np.where(
        df['INCOME'] > 0, (df['CONSPAY'] * 12) / df['INCOME'], 0
    )
if {'LIQ', 'INCOME'}.issubset(df.columns):
    df['LIQ_TO_INC'] = np.where(df['INCOME'] > 0, df['LIQ'] / df['INCOME'], 0)
if {'FOODHOME', 'FOODAWAY', 'INCOME'}.issubset(df.columns):
    df['FOOD_RATIO'] = np.where(
        df['INCOME'] > 0, (df['FOODHOME'] + df['FOODAWAY']) / df['INCOME'], 0
    )
if {'CCBAL', 'INCOME'}.issubset(df.columns):
    df['CC_TO_INC'] = np.where(df['INCOME'] > 0, df['CCBAL'] / df['INCOME'], 0)

ENGINEERED = ['DTI', 'PAYMENT_TO_INC', 'LIQ_TO_INC', 'FOOD_RATIO', 'CC_TO_INC']
feature_cols = available_raw + [f for f in ENGINEERED if f in df.columns]

for col in feature_cols:
    df[col] = df[col].replace([np.inf, -np.inf], np.nan)
    if df[col].isna().any():
        df[col] = df[col].fillna(df[col].median())

dollar_cols = [c for c in feature_cols if c in [
    'INCOME', 'DEBT', 'LIQ', 'ASSET', 'NETWORTH', 'CCBAL',
    'CONSPAY', 'FOODHOME', 'FOODAWAY',
]]
for col in dollar_cols + [c for c in feature_cols if c in ENGINEERED]:
    p99 = df[col].quantile(0.99)
    df[col] = df[col].clip(upper=p99)

print(f"Feature count: {len(feature_cols)}")
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 3: GROUP-AWARE TRAIN/TEST SPLIT (matches pipeline)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 3: TRAIN/TEST SPLIT")
print("=" * 70)

X = df[feature_cols]
y = df['target']
groups = df['household_id']

gss = GroupShuffleSplit(n_splits=1, test_size=TEST_SIZE, random_state=RANDOM_STATE)
train_idx, test_idx = next(gss.split(X, y, groups=groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"Train: {len(X_train)} records | Test: {len(X_test)} records")
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 4: FIT MODELS (same config as pipeline)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 4: FITTING MODELS")
print("=" * 70)

lr = LogisticRegression(
    max_iter=1000, random_state=RANDOM_STATE, class_weight='balanced'
)
lr.fit(X_train_scaled, y_train)
lr_auc = roc_auc_score(y_test, lr.predict_proba(X_test_scaled)[:, 1])
print(f"Logistic Regression test AUC: {lr_auc:.4f}")

rf = RandomForestClassifier(
    n_estimators=200, max_depth=None, min_samples_leaf=5,
    random_state=RANDOM_STATE, n_jobs=-1, class_weight='balanced',
)
rf.fit(X_train, y_train)
rf_auc = roc_auc_score(y_test, rf.predict_proba(X_test)[:, 1])
print(f"Random Forest test AUC:       {rf_auc:.4f}")
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 5: COMPUTE IMPORTANCE MEASURES
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 5: COMPUTING IMPORTANCE MEASURES")
print("=" * 70)

# --- LR standardized coefficients ---
# Features were standardized before fitting, so coefficients are directly
# comparable in magnitude. Sign indicates direction on overspending risk.
lr_coef = pd.Series(lr.coef_.ravel(), index=feature_cols, name='lr_coef')
lr_abs = lr_coef.abs().rename('lr_abs_coef')
print("  Logistic Regression coefficients: computed")

# --- RF Gini importance ---
rf_gini = pd.Series(rf.feature_importances_, index=feature_cols, name='rf_gini')
print("  Random Forest Gini importance: computed")

# --- Permutation importance on LR ---
print(f"  Permutation importance on LR ({N_PERMUTATIONS} shuffles)...")
perm_lr = permutation_importance(
    lr, X_test_scaled, y_test,
    n_repeats=N_PERMUTATIONS, random_state=RANDOM_STATE,
    scoring='roc_auc', n_jobs=-1,
)
perm_lr_mean = pd.Series(
    perm_lr.importances_mean, index=feature_cols, name='perm_lr'
)

# --- Permutation importance on RF ---
print(f"  Permutation importance on RF ({N_PERMUTATIONS} shuffles)...")
perm_rf = permutation_importance(
    rf, X_test, y_test,
    n_repeats=N_PERMUTATIONS, random_state=RANDOM_STATE,
    scoring='roc_auc', n_jobs=-1,
)
perm_rf_mean = pd.Series(
    perm_rf.importances_mean, index=feature_cols, name='perm_rf'
)
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 6: MERGE INTO COMPARISON TABLE
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 6: BUILDING COMPARISON TABLE")
print("=" * 70)

# Try to pick up SHAP importances from the pipeline run, if available.
shap_path = OUTPUT_DIR / "shap_feature_importance.csv"
if shap_path.exists():
    shap_df = pd.read_csv(shap_path)
    shap_col = [c for c in shap_df.columns if 'import' in c.lower() or 'shap' in c.lower()]
    name_col = [c for c in shap_df.columns if 'feat' in c.lower() or c.lower() == 'feature']
    if shap_col and name_col:
        shap_series = pd.Series(
            shap_df[shap_col[0]].values,
            index=shap_df[name_col[0]].values,
            name='shap_mean_abs',
        ).reindex(feature_cols)
    else:
        shap_series = pd.Series([np.nan] * len(feature_cols),
                                index=feature_cols, name='shap_mean_abs')
    print(f"  Loaded SHAP importance from {shap_path}")
else:
    shap_series = pd.Series([np.nan] * len(feature_cols),
                            index=feature_cols, name='shap_mean_abs')
    print("  No prior SHAP file found; shap column will be NaN")

comparison = pd.concat(
    [lr_coef, lr_abs, rf_gini, perm_lr_mean, perm_rf_mean, shap_series],
    axis=1,
)

# Rank features by each method (1 = most important). Lower rank is better.
rank_cols = {}
for col in ['lr_abs_coef', 'rf_gini', 'perm_lr', 'perm_rf', 'shap_mean_abs']:
    if comparison[col].notna().any():
        rank_cols[f"{col}_rank"] = comparison[col].rank(
            ascending=False, method='min',
        )

ranks = pd.DataFrame(rank_cols, index=feature_cols)
comparison = pd.concat([comparison, ranks], axis=1)
comparison['mean_rank'] = ranks.mean(axis=1)
comparison = comparison.sort_values('mean_rank')

comp_path = OUTPUT_DIR / "feature_importance_comparison.csv"
comparison.round(4).to_csv(comp_path, index_label='feature')
print(f"Saved: {comp_path}")

coef_path = OUTPUT_DIR / "lr_coefficients.csv"
lr_coef_df = lr_coef.sort_values(key=lambda s: s.abs(), ascending=False).to_frame()
lr_coef_df['abs_coef'] = lr_coef_df['lr_coef'].abs()
lr_coef_df.round(4).to_csv(coef_path, index_label='feature')
print(f"Saved: {coef_path}")
print()

print("=== Top 10 features by mean rank across methods ===")
print(comparison[['mean_rank'] + list(ranks.columns)].head(10).round(2).to_string())
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 7: PLOTS
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 7: GENERATING PLOTS")
print("=" * 70)

# --- Rank comparison across methods ---
rank_plot_df = ranks.copy()
rank_plot_df['mean_rank'] = ranks.mean(axis=1)
rank_plot_df = rank_plot_df.sort_values('mean_rank')

fig, ax = plt.subplots(figsize=(14, 9))
method_names = list(ranks.columns)
n_methods = len(method_names)
bar_width = 0.8 / n_methods
palette = [NAVY, TEAL, GOLD, RED, '#6A4C93'][:n_methods]

y_pos = np.arange(len(rank_plot_df))
for i, (method, color) in enumerate(zip(method_names, palette)):
    offset = (i - (n_methods - 1) / 2) * bar_width
    ax.barh(
        y_pos + offset,
        len(feature_cols) + 1 - rank_plot_df[method],
        height=bar_width,
        color=color,
        label=method.replace('_rank', ''),
    )

ax.set_yticks(y_pos)
ax.set_yticklabels(rank_plot_df.index)
ax.invert_yaxis()
ax.set_xlabel(f"Inverted rank (higher bar = higher importance; max rank = {len(feature_cols)})")
ax.set_title("Feature Importance Rank Across Methods")
ax.legend(loc='lower right')
ax.grid(axis='x', alpha=0.3)
comp_plot = OUTPUT_DIR / "14_importance_comparison.png"
plt.savefig(comp_plot)
plt.close()
print(f"Saved: {comp_plot}")

# --- LR signed coefficients ---
lr_sorted = lr_coef.sort_values(key=lambda s: s.abs(), ascending=True)
fig, ax = plt.subplots(figsize=(12, 9))
colors = [RED if v > 0 else TEAL for v in lr_sorted.values]
ax.barh(range(len(lr_sorted)), lr_sorted.values, color=colors, edgecolor=NAVY)
ax.set_yticks(range(len(lr_sorted)))
ax.set_yticklabels(lr_sorted.index)
ax.axvline(0, color='black', linewidth=0.5)
ax.set_xlabel("Standardized Coefficient (positive = increases overspending risk)")
ax.set_title(f"Logistic Regression Coefficients (test AUC = {lr_auc:.3f})")
ax.grid(axis='x', alpha=0.3)
lr_plot = OUTPUT_DIR / "15_lr_coefficients.png"
plt.savefig(lr_plot)
plt.close()
print(f"Saved: {lr_plot}")

# --- Permutation importance bar chart (LR vs RF side by side) ---
perm_df = pd.DataFrame({'perm_lr': perm_lr_mean, 'perm_rf': perm_rf_mean})
perm_df['max'] = perm_df.max(axis=1)
perm_df = perm_df.sort_values('max', ascending=True)

fig, ax = plt.subplots(figsize=(12, 9))
y_pos = np.arange(len(perm_df))
ax.barh(y_pos - 0.2, perm_df['perm_lr'], height=0.4, color=NAVY, label='Logistic Regression')
ax.barh(y_pos + 0.2, perm_df['perm_rf'], height=0.4, color=TEAL, label='Random Forest')
ax.set_yticks(y_pos)
ax.set_yticklabels(perm_df.index)
ax.axvline(0, color='black', linewidth=0.5)
ax.set_xlabel("Mean AUC drop when feature is shuffled")
ax.set_title(f"Permutation Importance (higher = feature matters more)")
ax.legend(loc='lower right')
ax.grid(axis='x', alpha=0.3)
perm_plot = OUTPUT_DIR / "16_permutation_importance.png"
plt.savefig(perm_plot)
plt.close()
print(f"Saved: {perm_plot}")

print("\nFeature importance analysis complete.")
