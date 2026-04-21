"""
age_stratified_analysis.py
==========================
Fits the same classifiers separately on middle_aged and old subsets,
then compares against a global model evaluated on the same subsets.

Tests the hypothesis: does one global model leave signal on the table
because middle-aged and older households have different distress drivers?

For each age group:
  1. Group-aware train/test split (household_id)
  2. Fit Logistic Regression and Random Forest (pipeline hyperparameters)
  3. Evaluate specialist on its own test set
  4. Evaluate the global model (trained on everyone) on the same subset
  5. Run SHAP on the Random Forest specialist
  6. Record top drivers

Outputs:
  - outputs/age_stratified_results.csv           (AUC/F1/Brier by group + model)
  - outputs/age_stratified_shap_by_group.csv     (top SHAP features per group)
  - outputs/17_age_stratified_performance.png    (specialist vs global AUC)
  - outputs/18_age_stratified_shap.png           (top SHAP features per group)

Young is skipped (n=5 at 18 only).

Usage:
  python age_stratified_analysis.py
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
from sklearn.metrics import roc_auc_score, f1_score, brier_score_loss
import shap

# --- Configuration ---
DATA_PATH = Path("data/SCFP2022.csv")
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE = 0.2
AGE_GROUPS_TO_FIT = ['middle_aged', 'old']  # skip young (n=5)

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
if 'Y1' in df.columns:
    df['household_id'] = df['Y1'].astype(str).str[:-1].astype(int)
else:
    df['household_id'] = np.arange(len(df))
print(f"Loaded {len(df)} records\n")


# ═══════════════════════════════════════════════════════════════════════
# STEP 2: FEATURE ENGINEERING (pruned set: 16 features)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 2: FEATURE ENGINEERING")
print("=" * 70)

df['target'] = (df['EXPENSHILO'] == 1).astype(int)

RAW_FEATURES = [
    'INCOME', 'DEBT', 'LIQ', 'ASSET', 'CCBAL', 'CONSPAY',
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
if {'CCBAL', 'INCOME'}.issubset(df.columns):
    df['CC_TO_INC'] = np.where(df['INCOME'] > 0, df['CCBAL'] / df['INCOME'], 0)

ENGINEERED = ['DTI', 'PAYMENT_TO_INC', 'CC_TO_INC']
feature_cols = available_raw + [f for f in ENGINEERED if f in df.columns]

for col in feature_cols:
    df[col] = df[col].replace([np.inf, -np.inf], np.nan)
    if df[col].isna().any():
        df[col] = df[col].fillna(df[col].median())

dollar_cols = [c for c in feature_cols if c in [
    'INCOME', 'DEBT', 'LIQ', 'ASSET', 'CCBAL', 'CONSPAY', 'FOODHOME', 'FOODAWAY',
]]
for col in dollar_cols + [c for c in feature_cols if c in ENGINEERED]:
    p99 = df[col].quantile(0.99)
    df[col] = df[col].clip(upper=p99)

df['age_group'] = pd.cut(
    df['AGE'],
    bins=[0, 18, 49, 100],
    labels=['young', 'middle_aged', 'old'],
    include_lowest=True,
)

print(f"Feature count: {len(feature_cols)}")
print(f"Age group sizes:")
for lbl in ['young', 'middle_aged', 'old']:
    n = (df['age_group'] == lbl).sum()
    print(f"  {lbl:12s} {n}")
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 3: FIT GLOBAL MODEL (baseline for comparison)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 3: FITTING GLOBAL MODEL (for comparison)")
print("=" * 70)

X = df[feature_cols]
y = df['target']
groups = df['household_id']

gss = GroupShuffleSplit(n_splits=1, test_size=TEST_SIZE, random_state=RANDOM_STATE)
train_idx, test_idx = next(gss.split(X, y, groups=groups))
X_train_global, X_test_global = X.iloc[train_idx], X.iloc[test_idx]
y_train_global, y_test_global = y.iloc[train_idx], y.iloc[test_idx]
age_test_global = df['age_group'].iloc[test_idx].values

scaler_global = StandardScaler()
X_train_global_s = scaler_global.fit_transform(X_train_global)
X_test_global_s = scaler_global.transform(X_test_global)

lr_global = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE,
                               class_weight='balanced')
lr_global.fit(X_train_global_s, y_train_global)

rf_global = RandomForestClassifier(
    n_estimators=200, max_depth=None, min_samples_leaf=5,
    random_state=RANDOM_STATE, n_jobs=-1, class_weight='balanced',
)
rf_global.fit(X_train_global, y_train_global)
print(f"Global LR test AUC: {roc_auc_score(y_test_global, lr_global.predict_proba(X_test_global_s)[:,1]):.4f}")
print(f"Global RF test AUC: {roc_auc_score(y_test_global, rf_global.predict_proba(X_test_global)[:,1]):.4f}\n")


# ═══════════════════════════════════════════════════════════════════════
# STEP 4: FIT AGE-STRATIFIED SPECIALIST MODELS
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 4: FITTING SPECIALIST MODELS")
print("=" * 70)

results = []
shap_tables = {}

for age_label in AGE_GROUPS_TO_FIT:
    print(f"\n--- {age_label.upper()} ---")
    n_total = (df['age_group'] == age_label).sum()
    n_hh = df.loc[df['age_group'] == age_label, 'household_id'].nunique()
    print(f"Records: {n_total} | Households: {n_hh} | Positive rate: {df.loc[df['age_group'] == age_label, 'target'].mean():.3f}")

    # Use the SAME train/test split as the global model, then filter by age.
    # This prevents the specialist's test records from overlapping with
    # the global model's training records (which would create leakage and
    # fake-high AUC for tree models that memorize training data).
    age_mask = (df['age_group'] == age_label).values
    train_age_mask = age_mask[train_idx]
    test_age_mask = age_mask[test_idx]

    X_tr = X.iloc[train_idx][train_age_mask]
    X_te = X.iloc[test_idx][test_age_mask]
    y_tr = y.iloc[train_idx][train_age_mask]
    y_te = y.iloc[test_idx][test_age_mask]
    print(f"Train (age subset): {len(X_tr)} | Test (age subset): {len(X_te)}")

    scaler = StandardScaler()
    X_tr_s = scaler.fit_transform(X_tr)
    X_te_s = scaler.transform(X_te)

    # Specialist LR
    lr_spec = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE,
                                 class_weight='balanced')
    lr_spec.fit(X_tr_s, y_tr)
    lr_prob = lr_spec.predict_proba(X_te_s)[:, 1]
    lr_pred = lr_spec.predict(X_te_s)
    lr_metrics = {
        'auc': roc_auc_score(y_te, lr_prob),
        'f1': f1_score(y_te, lr_pred),
        'brier': brier_score_loss(y_te, lr_prob),
    }

    # Specialist RF
    rf_spec = RandomForestClassifier(
        n_estimators=200, max_depth=None, min_samples_leaf=5,
        random_state=RANDOM_STATE, n_jobs=-1, class_weight='balanced',
    )
    rf_spec.fit(X_tr, y_tr)
    rf_prob = rf_spec.predict_proba(X_te)[:, 1]
    rf_pred = rf_spec.predict(X_te)
    rf_metrics = {
        'auc': roc_auc_score(y_te, rf_prob),
        'f1': f1_score(y_te, rf_pred),
        'brier': brier_score_loss(y_te, rf_prob),
    }

    # Evaluate GLOBAL model on the same test records (same indices).
    # Since X_te is a subset of the global test set, there is no leakage.
    X_te_global_s = scaler_global.transform(X_te)
    global_lr_prob = lr_global.predict_proba(X_te_global_s)[:, 1]
    global_rf_prob = rf_global.predict_proba(X_te)[:, 1]
    global_lr_metrics = {
        'auc': roc_auc_score(y_te, global_lr_prob),
        'f1': f1_score(y_te, (global_lr_prob >= 0.5).astype(int)),
        'brier': brier_score_loss(y_te, global_lr_prob),
    }
    global_rf_metrics = {
        'auc': roc_auc_score(y_te, global_rf_prob),
        'f1': f1_score(y_te, (global_rf_prob >= 0.5).astype(int)),
        'brier': brier_score_loss(y_te, global_rf_prob),
    }

    print(f"  LR  specialist: AUC={lr_metrics['auc']:.4f} F1={lr_metrics['f1']:.4f} Brier={lr_metrics['brier']:.4f}")
    print(f"  LR  global:     AUC={global_lr_metrics['auc']:.4f} F1={global_lr_metrics['f1']:.4f} Brier={global_lr_metrics['brier']:.4f}")
    print(f"  RF  specialist: AUC={rf_metrics['auc']:.4f} F1={rf_metrics['f1']:.4f} Brier={rf_metrics['brier']:.4f}")
    print(f"  RF  global:     AUC={global_rf_metrics['auc']:.4f} F1={global_rf_metrics['f1']:.4f} Brier={global_rf_metrics['brier']:.4f}")

    for model_name, m_spec, m_glob in [
        ('Logistic Regression', lr_metrics, global_lr_metrics),
        ('Random Forest', rf_metrics, global_rf_metrics),
    ]:
        results.append({
            'age_group': age_label, 'model': model_name, 'variant': 'specialist',
            **m_spec,
        })
        results.append({
            'age_group': age_label, 'model': model_name, 'variant': 'global',
            **m_glob,
        })

    # SHAP on RF specialist
    explainer = shap.TreeExplainer(rf_spec)
    shap_vals = explainer.shap_values(X_te)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1] if len(shap_vals) == 2 else shap_vals
    shap_vals = np.array(shap_vals)
    if shap_vals.ndim == 3:
        shap_vals = shap_vals[:, :, 1]
    mean_abs = np.abs(shap_vals).mean(axis=0)
    shap_tables[age_label] = pd.Series(mean_abs, index=feature_cols).sort_values(ascending=False)

    print(f"  Top 5 SHAP drivers ({age_label}):")
    for feat, val in shap_tables[age_label].head(5).items():
        print(f"    {feat:20s} {val:.4f}")


# ═══════════════════════════════════════════════════════════════════════
# STEP 5: SAVE RESULTS
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 5: SAVING RESULTS")
print("=" * 70)

results_df = pd.DataFrame(results).round(4)
results_path = OUTPUT_DIR / "age_stratified_results.csv"
results_df.to_csv(results_path, index=False)
print(f"Saved: {results_path}")

shap_df = pd.DataFrame(shap_tables).round(4)
shap_df.index.name = 'feature'
shap_path = OUTPUT_DIR / "age_stratified_shap_by_group.csv"
shap_df.to_csv(shap_path)
print(f"Saved: {shap_path}")


# ═══════════════════════════════════════════════════════════════════════
# STEP 6: PLOTS
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("STEP 6: GENERATING PLOTS")
print("=" * 70)

# --- Performance: specialist vs global, per age group, per model ---
fig, ax = plt.subplots(figsize=(12, 7))
groups_x = AGE_GROUPS_TO_FIT
models_list = ['Logistic Regression', 'Random Forest']
bar_width = 0.2
x = np.arange(len(groups_x))

for i, model_name in enumerate(models_list):
    spec_aucs = [
        results_df.query("age_group == @g and model == @model_name and variant == 'specialist'")['auc'].iloc[0]
        for g in groups_x
    ]
    glob_aucs = [
        results_df.query("age_group == @g and model == @model_name and variant == 'global'")['auc'].iloc[0]
        for g in groups_x
    ]
    off_spec = (i * 2) * bar_width - bar_width * 1.5
    off_glob = (i * 2 + 1) * bar_width - bar_width * 1.5
    color_spec = NAVY if model_name == 'Logistic Regression' else TEAL
    color_glob = GOLD if model_name == 'Logistic Regression' else RED
    ax.bar(x + off_spec, spec_aucs, bar_width,
           label=f"{model_name} (specialist)", color=color_spec)
    ax.bar(x + off_glob, glob_aucs, bar_width,
           label=f"{model_name} (global)", color=color_glob)
    for j, (s, g) in enumerate(zip(spec_aucs, glob_aucs)):
        ax.text(x[j] + off_spec, s + 0.005, f"{s:.3f}", ha='center', fontsize=8)
        ax.text(x[j] + off_glob, g + 0.005, f"{g:.3f}", ha='center', fontsize=8)

ax.set_xticks(x)
ax.set_xticklabels(groups_x)
ax.set_ylabel("Test AUC-ROC")
ax.set_title("Age-Stratified Specialist vs Global Model (same test records)")
ax.set_ylim(0.4, max(results_df['auc'].max() + 0.05, 0.75))
ax.axhline(0.5, color='gray', linestyle=':', linewidth=1, label='Random')
ax.legend(loc='lower right', fontsize=9)
ax.grid(axis='y', alpha=0.3)
perf_plot = OUTPUT_DIR / "17_age_stratified_performance.png"
plt.savefig(perf_plot)
plt.close()
print(f"Saved: {perf_plot}")

# --- SHAP top drivers per group, side by side ---
top_features = (shap_df.max(axis=1).sort_values(ascending=False).head(10).index)
shap_plot_df = shap_df.loc[top_features]

fig, ax = plt.subplots(figsize=(12, 8))
x = np.arange(len(top_features))
bar_w = 0.4
ax.barh(x - bar_w/2, shap_plot_df['middle_aged'], bar_w,
        color=TEAL, label='middle_aged')
ax.barh(x + bar_w/2, shap_plot_df['old'], bar_w,
        color=NAVY, label='old')
ax.set_yticks(x)
ax.set_yticklabels(top_features)
ax.invert_yaxis()
ax.set_xlabel("Mean |SHAP value| (higher = more important)")
ax.set_title("Top 10 Features by SHAP, Middle-Aged vs Old")
ax.legend(loc='lower right')
ax.grid(axis='x', alpha=0.3)
shap_plot_path = OUTPUT_DIR / "18_age_stratified_shap.png"
plt.savefig(shap_plot_path)
plt.close()
print(f"Saved: {shap_plot_path}")

print("\nAge-stratified analysis complete.")
