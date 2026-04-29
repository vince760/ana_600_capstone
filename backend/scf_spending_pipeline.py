"""
scf_spending_pipeline.py
========================
SCF 2022 Household Spending Prediction Pipeline

Predicts whether a household's expenses exceed their income using
financial profile features from the Federal Reserve Survey of Consumer Finances.

Pipeline stages:
  1. Load and prepare SCF 2022 extract data
  2. Engineer features and create binary target
  3. Train four classifiers (Logistic Regression, Random Forest, XGBoost, MLP)
  4. Evaluate all models (AUC-ROC, F1, classification report)
  5. Run SHAP on the best performer
  6. Generate visualizations (feature importance, waterfall charts, model comparison)
  7. Save all outputs for presentation

Usage:
  python scf_spending_pipeline.py

Outputs saved to: outputs/
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for saving figures
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import warnings
import json
warnings.filterwarnings('ignore')

from sklearn.model_selection import (
    train_test_split, cross_val_score,
    GroupShuffleSplit, StratifiedGroupKFold
)
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (
    roc_auc_score, f1_score, classification_report,
    confusion_matrix, roc_curve, accuracy_score, brier_score_loss
)
import xgboost as xgb
import shap

# ─── Configuration ───────────────────────────────────────────────────
DATA_PATH = Path("data/SCFP2022.csv")
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE = 0.2

# Plot styling
plt.rcParams.update({
    'figure.figsize': (12, 8),
    'font.size': 12,
    'axes.titlesize': 14,
    'axes.labelsize': 12,
    'figure.dpi': 150,
    'savefig.bbox': 'tight',
    'savefig.dpi': 150,
})
COLORS = ['#1B2A4A', '#2E8B8B', '#D4930D', '#8B2E2E']


# ═══════════════════════════════════════════════════════════════════════
# STEP 1: LOAD DATA
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 1: LOADING SCF 2022 EXTRACT DATA")
print("=" * 70)

df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df)} records, {len(df.columns)} columns")

# Use all 5 SCF implicates (imputation replicates).
# Y1 encodes household ID + implicate number as the last digit.
# Derive household_id by stripping the trailing implicate digit so we can
# keep all 5 imputed records per household but prevent any household from
# appearing in both train and test splits.
if 'Y1' in df.columns:
    df['household_id'] = df['Y1'].astype(str).str[:-1].astype(int)
    n_households = df['household_id'].nunique()
    print(f"Using all 5 implicates: {len(df)} records across {n_households} households")
else:
    df['household_id'] = np.arange(len(df))
    print("No Y1 column found; treating each row as its own household")

print(f"\nDataset shape: {df.shape}")
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 2: FEATURE ENGINEERING & TARGET CREATION
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 2: FEATURE ENGINEERING & TARGET CREATION")
print("=" * 70)

# --- Create binary target (V6 financial-confirmation approach) ---
# EXPENSHILO is self-reported and noisy: ~27% of households who report
# overspending show no financial distress (median income $110K, net worth
# $813K). These "perception-only overspenders" cap any model trained on
# raw EXPENSHILO at ~58% AUC because they are statistically indistinguish-
# able from healthy non-overspenders.
#
# V6 fix: confirm self-reported overspending against numerical spending data.
#   1) TOTAL_OUTFLOW = annualized debt payments + food spending
#   2) SPEND_RATIO = TOTAL_OUTFLOW / INCOME
#   3) calc_over = SPEND_RATIO above the dataset median
#   4) target = (EXPENSHILO == 1) AND (calc_over == 1)
# Only households whose self-report AND numerical spending agree count as
# positive. The "perception-only" cases drop into the negative class.
df['TOTAL_OUTFLOW'] = (
    df['TPAY'] * 12
    + df['FOODHOME']
    + df['FOODAWAY']
    + df['FOODDELV'].fillna(0)
)
df['SPEND_RATIO'] = np.where(
    df['INCOME'] > 0,
    df['TOTAL_OUTFLOW'] / df['INCOME'],
    0,
)
df['SPEND_RATIO'] = (
    df['SPEND_RATIO'].replace([np.inf, -np.inf], np.nan).fillna(0)
)
median_spend_ratio = df['SPEND_RATIO'].median()
df['calc_over'] = (df['SPEND_RATIO'] > median_spend_ratio).astype(int)

self_reported = (df['EXPENSHILO'] == 1).astype(int)
df['target'] = (self_reported & df['calc_over']).astype(int)

print("=== Target Distribution (V6 financial-confirmation) ===")
print(f"  SPEND_RATIO median used as cutoff: {median_spend_ratio:.4f}")
n_self = int(self_reported.sum())
n_calc = int(df['calc_over'].sum())
n_both = int(df['target'].sum())
n_neither = int(((self_reported == 0) & (df['calc_over'] == 0)).sum())
n_self_only = int(((self_reported == 1) & (df['calc_over'] == 0)).sum())
n_calc_only = int(((self_reported == 0) & (df['calc_over'] == 1)).sum())
print(f"  Self-reported overspending (EXPENSHILO==1): {n_self}")
print(f"  Numerical overspending (above median ratio): {n_calc}")
print(f"  Confirmed overspending (positive class):     {n_both} "
      f"({n_both/len(df)*100:.1f}%)")
print(f"  Negative class breakdown:")
print(f"    Neither (healthy):           {n_neither}")
print(f"    Self-reported only (noise):  {n_self_only}")
print(f"    Numerical only (unaware):    {n_calc_only}")
print()

# --- Original EXPENSHILO distribution ---
print("=== Original EXPENSHILO Distribution ===")
for val, label in [(1, "Spending > Income"), (2, "Spending = Income"), (3, "Spending < Income")]:
    count = (df['EXPENSHILO'] == val).sum()
    pct = count / len(df) * 100
    print(f"  {val} = {label}: {count} ({pct:.1f}%)")
print()

# --- Select raw features ---
RAW_FEATURES = {
    'INCOME': 'Total Household Income',
    'DEBT': 'Total Debt',
    'CONSPAY': 'Monthly Consumer Debt Payments',
    'FOODHOME': 'Food Spending (Home)',
    'KIDS': 'Number of Children in Household',
}
# Notes on intentionally-omitted raw variables:
#   FOODAWAY: redundant with FOOD_DISCRETIONARY (which is derived from it)
#       and correlated with INCOME. Column still read for FOOD_DISCRETIONARY.
#   LIQ: ranked dead last (#14) on LR permutation importance because the
#       raw dollar amount is not income-normalized; LR can't usefully tell
#       $50k of liquid assets apart for a $30k earner vs a $300k earner.
#       Replaced with LIQ_TO_INC below. Column still read for that ratio.
# Note on DEBT: it produces a counterintuitive negative LR coefficient when
# paired with DTI (multicollinearity artifact - DEBT held-constant-for-
# income picks up asset-backed wealth like mortgages). We tested dropping
# it; CV AUC fell ~0.006, so the feature is carrying signal beyond what's
# in DTI alone. Kept in despite the messy coefficient.

# Check which features exist in the dataset
available_raw = {k: v for k, v in RAW_FEATURES.items() if k in df.columns}
missing_raw = {k: v for k, v in RAW_FEATURES.items() if k not in df.columns}

if missing_raw:
    print(f"Warning: Missing raw features: {list(missing_raw.keys())}")
    print("Proceeding with available features.")
print(f"Using {len(available_raw)} raw features: {list(available_raw.keys())}")
print()

# --- Engineer derived features ---
print("=== Engineering Derived Features ===")

# DTI: use pre-computed if available, otherwise derive
if 'DEBT2INC' in df.columns:
    df['DTI'] = df['DEBT2INC']
    print("  DTI: using pre-computed DEBT2INC")
elif 'DEBT' in df.columns and 'INCOME' in df.columns:
    df['DTI'] = np.where(df['INCOME'] > 0, df['DEBT'] / df['INCOME'], 0)
    print("  DTI: derived from DEBT / INCOME")

# Payment-to-Income Ratio
if 'CONSPAY' in df.columns and 'INCOME' in df.columns:
    df['PAYMENT_TO_INC'] = np.where(
        df['INCOME'] > 0,
        (df['CONSPAY'] * 12) / df['INCOME'],
        0
    )
    print("  PAYMENT_TO_INC: derived from (CONSPAY * 12) / INCOME")

# CC Balance to Income Ratio
if 'CCBAL' in df.columns and 'INCOME' in df.columns:
    df['CC_TO_INC'] = np.where(
        df['INCOME'] > 0,
        df['CCBAL'] / df['INCOME'],
        0
    )
    print("  CC_TO_INC: derived from CCBAL / INCOME")

# Liquid Assets to Income Ratio. Replaces raw LIQ as a model feature: LR
# cannot make use of the raw dollar amount because it doesn't normalize
# for household scale, so $50k means very different things across the
# income distribution. The income-normalized version has a substantially
# stronger LR coefficient.
if 'LIQ' in df.columns and 'INCOME' in df.columns:
    df['LIQ_TO_INC'] = np.where(
        df['INCOME'] > 0,
        df['LIQ'] / df['INCOME'],
        0
    )
    print("  LIQ_TO_INC: derived from LIQ / INCOME")

# ---------------------------------------------------------------------------
# Interaction features
# ---------------------------------------------------------------------------
# Added to test whether cross-feature signals improve Logistic Regression
# (our best global model), which is linear by default and cannot learn
# interactions on its own. Tree models (RF, XGBoost) can already capture
# interactions through splits, so these features are primarily a test for LR.
#
# Each interaction is grounded in a specific hypothesis from our diagnostics:
#   - age-stratified SHAP: middle-aged drivers differ from old drivers
#   - PCA: wealth (PC1) and credit burden (PC2) are orthogonal axes
#   - feature importance: FOODHOME is the #1 driver across all methods
# ---------------------------------------------------------------------------

# Pre-retirement (55+) flag: computed in the dataframe so the interaction
# features below can reference it, but NOT a standalone model feature.
# The standalone age indicator was the weakest feature in the prior run
# (ranked #14 of 16). Age signal lives in the interactions instead, where
# it answers "does age moderate the risk weight of spending and debt?"
if 'AGE' in df.columns:
    df['IS_PRE_RETIREMENT'] = (df['AGE'] >= 55).astype(int)
    n_retire = int(df['IS_PRE_RETIREMENT'].sum())
    print(f"  IS_PRE_RETIREMENT: derived from AGE >= 55 ({n_retire} households, used in interactions only)")

# FOODHOME_X_PRE_RETIREMENT: FOODHOME's #1-ranked signal may carry different
# risk weight in the 55+ cohort, where draw-down behavior and fixed-income
# constraints can flip its sign. Single interaction (rather than one per
# bin) keeps the feature count flat versus the old IS_OLD scheme.
if {'FOODHOME', 'IS_PRE_RETIREMENT'}.issubset(df.columns):
    df['FOODHOME_X_PRE_RETIREMENT'] = df['FOODHOME'] * df['IS_PRE_RETIREMENT']
    print("  FOODHOME_X_PRE_RETIREMENT: derived from FOODHOME * IS_PRE_RETIREMENT")

# DTI_X_PRE_RETIREMENT was tested and dropped: it ranked last in mean
# importance across methods (#12 of 12) and had a near-zero LR coefficient.
# Standalone DTI already captures the debt-burden signal; adding a 55+
# multiplier did not provide new predictive lift.

# FOOD_DISCRETIONARY: share of total food spending on eating out. A
# lifestyle signal independent of absolute spending levels; two households
# spending the same total on food may differ sharply on this ratio and
# therefore on their flexibility to cut spending when stressed. The +1 in
# the denominator prevents divide-by-zero for households with no food
# spending recorded.
if {'FOODHOME', 'FOODAWAY'}.issubset(df.columns):
    df['FOOD_DISCRETIONARY'] = df['FOODAWAY'] / (df['FOODHOME'] + df['FOODAWAY'] + 1)
    print("  FOOD_DISCRETIONARY: derived from FOODAWAY / (FOODHOME + FOODAWAY + 1)")

# LIQ_SQUEEZE was tested and dropped: ranked dead last (mean rank 11.2)
# in cross-method importance. Most households have DTI well below 1, so
# the multiplier (1 - DTI) was close to 1 for the majority, making the
# feature mostly a slightly-shrunken copy of LIQ - high collinearity by
# construction. The intended interaction signal only mattered for the
# small high-DTI tail.

# INCOME_SHORTFALL was tested and dropped: the LR coefficient came out
# the wrong sign (households below normal income overspent slightly LESS,
# not more), and SHAP ranked it dead last. Test AUC moved -0.0002 (noise).
# The consumption-smoothing hypothesis was reasonable but not borne out
# in this dataset, possibly because households reporting a bad year had
# already cut spending in response.

# Age group: labeled categorical for EDA/plots only (not a model feature).
# The model uses IS_PRIME_EARNING + IS_PRE_RETIREMENT dummies (under-35 ref).
# Bins match the SCF/Federal Reserve canonical 3-bin grouping.
if 'AGE' in df.columns:
    df['age_group'] = pd.cut(
        df['AGE'],
        bins=[0, 34, 54, 100],
        labels=['young_adult', 'prime_earning', 'pre_retirement'],
        include_lowest=True,
    )
    order = ['young_adult', 'prime_earning', 'pre_retirement']
    group_counts = df['age_group'].value_counts().reindex(order)
    print("  age_group: binned from AGE (<35 young_adult, 35-54 prime_earning, 55+ pre_retirement)")
    for label, count in group_counts.items():
        pct = count / len(df) * 100
        print(f"    {label}: {count} ({pct:.1f}%)")

print()

# --- Assemble final feature set ---
ENGINEERED = [
    'DTI', 'PAYMENT_TO_INC', 'CC_TO_INC', 'LIQ_TO_INC',
    # Standalone age intentionally omitted - age signal lives entirely in
    # FOODHOME_X_PRE_RETIREMENT. DTI_X_PRE_RETIREMENT was dropped after
    # ranking dead last in cross-method importance.
    'FOODHOME_X_PRE_RETIREMENT', 'FOOD_DISCRETIONARY',
]
all_features = list(available_raw.keys()) + [f for f in ENGINEERED if f in df.columns]

# Remove any features not in the dataframe
feature_cols = [f for f in all_features if f in df.columns]

print(f"=== Final Feature Set: {len(feature_cols)} features ===")
for i, f in enumerate(feature_cols, 1):
    desc = available_raw.get(f, f"Engineered: {f}")
    print(f"  {i:2d}. {f:20s} {desc}")
print()

# --- Handle infinities and extreme outliers ---
for col in feature_cols:
    df[col] = df[col].replace([np.inf, -np.inf], np.nan)

# Fill any NaN with median
for col in feature_cols:
    if df[col].isna().any():
        median_val = df[col].median()
        na_count = df[col].isna().sum()
        df[col] = df[col].fillna(median_val)
        print(f"  Filled {na_count} NaN in {col} with median ({median_val:.2f})")

# Cap extreme outliers at 99th percentile for dollar amounts
dollar_cols = [c for c in feature_cols if c in ['INCOME', 'DEBT', 'CONSPAY', 'FOODHOME']]
for col in dollar_cols:
    p99 = df[col].quantile(0.99)
    clipped = (df[col] > p99).sum()
    if clipped > 0:
        df[col] = df[col].clip(upper=p99)
        print(f"  Capped {clipped} outliers in {col} at 99th percentile (${p99:,.0f})")

# Cap ratio features at reasonable bounds
ratio_cols = [c for c in feature_cols if c in ['DTI', 'PAYMENT_TO_INC', 'CC_TO_INC', 'LIQ_TO_INC']]
for col in ratio_cols:
    p99 = df[col].quantile(0.99)
    clipped = (df[col] > p99).sum()
    if clipped > 0:
        df[col] = df[col].clip(upper=p99)
        print(f"  Capped {clipped} outliers in {col} at 99th percentile ({p99:.4f})")

# Cap interaction features at 99th percentile. FOODHOME_X_PRE_RETIREMENT
# inherits FOODHOME's heavy right tail (multiplying by 0/1 doesn't tame it),
# so unbounded interactions can dominate Logistic Regression's scaled
# feature space without this cap.
interaction_cols = [c for c in feature_cols if c in [
    'FOODHOME_X_PRE_RETIREMENT', 'FOOD_DISCRETIONARY',
]]
for col in interaction_cols:
    p99 = df[col].quantile(0.99)
    clipped = (df[col] > p99).sum()
    if clipped > 0:
        df[col] = df[col].clip(upper=p99)
        print(f"  Capped {clipped} outliers in {col} at 99th percentile ({p99:.4f})")

print()

# --- Summary statistics ---
print("=== Feature Summary Statistics ===")
summary = df[feature_cols].describe().round(2)
print(summary.to_string())
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 3: TRAIN MODELS
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 3: TRAINING FOUR CLASSIFIERS")
print("=" * 70)

X = df[feature_cols]
y = df['target']
groups = df['household_id']

# Group-aware split: same household never appears in both train and test.
# This is critical with 5 implicates per household to prevent leakage.
gss = GroupShuffleSplit(n_splits=1, test_size=TEST_SIZE, random_state=RANDOM_STATE)
train_idx, test_idx = next(gss.split(X, y, groups=groups))

X_train = X.iloc[train_idx]
X_test = X.iloc[test_idx]
y_train = y.iloc[train_idx]
y_test = y.iloc[test_idx]
groups_train = groups.iloc[train_idx]

train_households = groups_train.nunique()
test_households = groups.iloc[test_idx].nunique()

print(f"Training set: {len(X_train)} records ({train_households} households)")
print(f"Test set:     {len(X_test)} records ({test_households} households)")
print(f"Positive rate (train): {y_train.mean():.3f}")
print(f"Positive rate (test):  {y_test.mean():.3f}")
print()

# Scale features for Logistic Regression and MLP
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Define models
models = {
    'Logistic Regression': LogisticRegression(
        max_iter=1000, random_state=RANDOM_STATE, class_weight='balanced'
    ),
    'Random Forest': RandomForestClassifier(
        n_estimators=200, max_depth=None, min_samples_leaf=5,
        random_state=RANDOM_STATE, n_jobs=-1, class_weight='balanced'
    ),
    'XGBoost': xgb.XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        random_state=RANDOM_STATE, eval_metric='logloss',
        scale_pos_weight=(len(y_train) - y_train.sum()) / max(y_train.sum(), 1),
        use_label_encoder=False
    ),
    'Neural Network (MLP)': MLPClassifier(
        hidden_layer_sizes=(64, 32), max_iter=500,
        random_state=RANDOM_STATE, early_stopping=True,
        validation_fraction=0.15
    ),
}

results = {}

for name, model in models.items():
    print(f"Training {name}...")

    # Build a CV estimator that scales inside each fold for LR/MLP (prevents leakage)
    if name in ['Logistic Regression', 'Neural Network (MLP)']:
        cv_estimator = Pipeline([('scaler', StandardScaler()), ('model', clone(model))])
    else:
        cv_estimator = clone(model)

    # 5-fold StratifiedGroupKFold on training data.
    # Groups = household_id so no household straddles train/val fold.
    cv_splitter = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(
        cv_estimator, X_train, y_train,
        cv=cv_splitter, groups=groups_train,
        scoring='roc_auc', n_jobs=-1
    )
    cv_auc_mean = cv_scores.mean()
    cv_auc_std = cv_scores.std()

    # Fit on full training data and evaluate on held-out test set
    if name in ['Logistic Regression', 'Neural Network (MLP)']:
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)
        y_prob = model.predict_proba(X_test_scaled)[:, 1]
    else:
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

    auc = roc_auc_score(y_test, y_prob)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    f1_macro = f1_score(y_test, y_pred, average='macro')
    brier = brier_score_loss(y_test, y_prob)

    results[name] = {
        'model': model,
        'y_pred': y_pred,
        'y_prob': y_prob,
        'accuracy': accuracy,
        'auc_roc': auc,
        'cv_auc_mean': cv_auc_mean,
        'cv_auc_std': cv_auc_std,
        'f1': f1,
        'f1_macro': f1_macro,
        'brier': brier,
    }

    print(f"  Accuracy: {accuracy:.4f} | AUC-ROC: {auc:.4f} | CV AUC: {cv_auc_mean:.4f} +/- {cv_auc_std:.4f}")
    print(f"  F1 (pos): {f1:.4f} | F1 (macro): {f1_macro:.4f} | Brier: {brier:.4f}")

print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 4: EVALUATE & COMPARE MODELS
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 4: MODEL COMPARISON & EVALUATION")
print("=" * 70)

# --- Performance comparison table ---
perf_df = pd.DataFrame({
    name: {
        'Accuracy': r['accuracy'],
        'AUC-ROC': r['auc_roc'],
        'CV AUC (mean)': r['cv_auc_mean'],
        'CV AUC (std)': r['cv_auc_std'],
        'F1 (Overspending)': r['f1'],
        'F1 (Macro)': r['f1_macro'],
        'Brier Score': r['brier'],
    }
    for name, r in results.items()
}).T.round(4)

print("\n=== Model Performance Comparison ===")
print(perf_df.to_string())
print()

# Select best model by CV AUC mean (more robust than single-split AUC)
best_name = max(results, key=lambda k: results[k]['cv_auc_mean'])
best_result = results[best_name]
print(f">>> Best model: {best_name}")
print(f"    CV AUC:   {best_result['cv_auc_mean']:.4f} +/- {best_result['cv_auc_std']:.4f}")
print(f"    Test AUC: {best_result['auc_roc']:.4f}")
print(f"    Test Accuracy: {best_result['accuracy']:.4f}")
print()

# --- Classification report for best model ---
print(f"=== Classification Report: {best_name} ===")
target_names = ['Not Overspending', 'Overspending']
print(classification_report(y_test, best_result['y_pred'], target_names=target_names))

# Save performance table
perf_df.to_csv(OUTPUT_DIR / 'model_performance.csv')
print(f"Saved: {OUTPUT_DIR / 'model_performance.csv'}")
print()

# ─── VISUALIZATION 1: Model Comparison Bar Chart ─────────────────────
fig, ax = plt.subplots(figsize=(12, 6))
x = np.arange(len(perf_df))
width = 0.2

bars1 = ax.bar(x - 1.5 * width, perf_df['Accuracy'], width, label='Accuracy', color=COLORS[3])
bars2 = ax.bar(x - 0.5 * width, perf_df['AUC-ROC'], width, label='AUC-ROC', color=COLORS[0])
bars3 = ax.bar(x + 0.5 * width, perf_df['CV AUC (mean)'], width,
               yerr=perf_df['CV AUC (std)'], capsize=4,
               label='CV AUC (5-fold)', color=COLORS[1])
bars4 = ax.bar(x + 1.5 * width, perf_df['F1 (Overspending)'], width, label='F1 (Overspending)', color=COLORS[2])

ax.set_xlabel('Model')
ax.set_ylabel('Score')
ax.set_title('Model Performance Comparison\nSCF 2022 Household Overspending Prediction')
ax.set_xticks(x)
ax.set_xticklabels(perf_df.index, rotation=15, ha='right')
ax.legend(loc='lower right')
ax.set_ylim(0, 1.05)
ax.grid(axis='y', alpha=0.3)

for bars in [bars1, bars2, bars3, bars4]:
    for bar in bars:
        height = bar.get_height()
        ax.annotate(f'{height:.3f}', xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 3), textcoords="offset points", ha='center', va='bottom', fontsize=8)

plt.tight_layout()
plt.savefig(OUTPUT_DIR / '01_model_comparison.png')
plt.close()
print(f"Saved: {OUTPUT_DIR / '01_model_comparison.png'}")

# ─── VISUALIZATION 2: ROC Curves ─────────────────────────────────────
fig, ax = plt.subplots(figsize=(8, 8))
for i, (name, r) in enumerate(results.items()):
    fpr, tpr, _ = roc_curve(y_test, r['y_prob'])
    ax.plot(fpr, tpr, color=COLORS[i], lw=2,
            label=f"{name} (AUC = {r['auc_roc']:.3f})")

ax.plot([0, 1], [0, 1], 'k--', lw=1, alpha=0.5, label='Random Baseline')
ax.set_xlabel('False Positive Rate')
ax.set_ylabel('True Positive Rate')
ax.set_title('ROC Curves: All Four Models\nSCF 2022 Household Overspending Prediction')
ax.legend(loc='lower right')
ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '02_roc_curves.png')
plt.close()
print(f"Saved: {OUTPUT_DIR / '02_roc_curves.png'}")

# ─── VISUALIZATION 3: Confusion Matrix for Best Model ────────────────
fig, ax = plt.subplots(figsize=(7, 6))
cm = confusion_matrix(y_test, best_result['y_pred'])
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax,
            xticklabels=target_names, yticklabels=target_names)
ax.set_xlabel('Predicted')
ax.set_ylabel('Actual')
ax.set_title(f'Confusion Matrix: {best_name}')
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '03_confusion_matrix.png')
plt.close()
print(f"Saved: {OUTPUT_DIR / '03_confusion_matrix.png'}")


# ═══════════════════════════════════════════════════════════════════════
# STEP 4b: CALIBRATION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════
print()
print("=" * 70)
print("STEP 4b: CALIBRATION ANALYSIS (Best Model)")
print("=" * 70)

# Group-aware calibration via prefit pattern:
#   1. Split training data into model-train + calibration sets by household.
#   2. Fit the base model on model-train portion.
#   3. Fit isotonic calibration on the held-out calibration portion.
# CalibratedClassifierCV with cv=int does not accept groups, so we do it manually.
if best_name in ['Logistic Regression', 'Neural Network (MLP)']:
    base_for_cal = Pipeline([('scaler', StandardScaler()), ('model', clone(best_result['model']))])
else:
    base_for_cal = clone(best_result['model'])

print(f"Fitting calibration (isotonic, prefit, group-aware) on {best_name}...")
cal_splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE + 1)
model_train_idx, cal_idx = next(cal_splitter.split(X_train, y_train, groups=groups_train))

base_for_cal.fit(X_train.iloc[model_train_idx], y_train.iloc[model_train_idx])

calibrated = CalibratedClassifierCV(base_for_cal, method='isotonic', cv='prefit')
calibrated.fit(X_train.iloc[cal_idx], y_train.iloc[cal_idx])

cal_prob = calibrated.predict_proba(X_test)[:, 1]
cal_pred = calibrated.predict(X_test)

cal_brier = brier_score_loss(y_test, cal_prob)
cal_auc = roc_auc_score(y_test, cal_prob)
cal_accuracy = accuracy_score(y_test, cal_pred)

print()
print("                         Uncalibrated   Calibrated")
print(f"  Brier Score:           {best_result['brier']:.4f}         {cal_brier:.4f}")
print(f"  AUC-ROC:               {best_result['auc_roc']:.4f}         {cal_auc:.4f}")
print(f"  Accuracy:              {best_result['accuracy']:.4f}         {cal_accuracy:.4f}")
print()
print("Lower Brier = better calibrated probabilities.")
print()

# ─── VISUALIZATION 3b: Calibration (Reliability) Curve ───────────────
fig, ax = plt.subplots(figsize=(8, 7))
prob_true_uncal, prob_pred_uncal = calibration_curve(y_test, best_result['y_prob'], n_bins=10, strategy='quantile')
prob_true_cal, prob_pred_cal = calibration_curve(y_test, cal_prob, n_bins=10, strategy='quantile')

ax.plot([0, 1], [0, 1], 'k--', alpha=0.5, label='Perfect calibration')
ax.plot(prob_pred_uncal, prob_true_uncal, 'o-', color=COLORS[3], lw=2,
        label=f'{best_name} (uncalibrated, Brier={best_result["brier"]:.3f})')
ax.plot(prob_pred_cal, prob_true_cal, 's-', color=COLORS[1], lw=2,
        label=f'{best_name} (isotonic calibrated, Brier={cal_brier:.3f})')
ax.set_xlabel('Mean Predicted Probability')
ax.set_ylabel('Fraction of Positives (Observed)')
ax.set_title(f'Calibration Curve: {best_name}\nHow well do predicted probabilities match observed rates?')
ax.legend(loc='upper left', fontsize=10)
ax.grid(alpha=0.3)
ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '03b_calibration_curve.png')
plt.close()
print(f"Saved: {OUTPUT_DIR / '03b_calibration_curve.png'}")

# Store calibrated results for later use
best_result['cal_brier'] = cal_brier
best_result['cal_auc'] = cal_auc
best_result['cal_accuracy'] = cal_accuracy
best_result['calibrated_model'] = calibrated


# ═══════════════════════════════════════════════════════════════════════
# STEP 5: SHAP ANALYSIS
# ═══════════════════════════════════════════════════════════════════════
print()
print("=" * 70)
print("STEP 5: SHAP ANALYSIS")
print("=" * 70)

# Use the best tree-based model for TreeExplainer (fast, exact)
# If best is LR or MLP, use the best tree-based model instead for SHAP
tree_models = {k: v for k, v in results.items() if k in ['Random Forest', 'XGBoost']}
if best_name in tree_models:
    shap_model_name = best_name
else:
    shap_model_name = max(tree_models, key=lambda k: tree_models[k]['auc_roc'])
    print(f"Best model is {best_name} but using {shap_model_name} for TreeExplainer SHAP")

shap_model = results[shap_model_name]['model']

print(f"\nRunning SHAP TreeExplainer on {shap_model_name}...")
explainer = shap.TreeExplainer(shap_model)
shap_values = explainer.shap_values(X_test)

# For binary classification, shap_values might be a list [class_0, class_1]
# or a 3D array (samples, features, classes)
if isinstance(shap_values, list):
    shap_vals = shap_values[1]  # Class 1 = overspending
elif len(shap_values.shape) == 3:
    shap_vals = shap_values[:, :, 1]  # Class 1 = overspending
else:
    shap_vals = shap_values

print(f"SHAP values shape: {shap_vals.shape}")
print()

# --- Global feature importance ---
mean_abs_shap = np.abs(shap_vals).mean(axis=0)
importance_df = pd.DataFrame({
    'Feature': feature_cols,
    'Mean |SHAP|': mean_abs_shap
}).sort_values('Mean |SHAP|', ascending=False)

print("=== Global SHAP Feature Importance (ranked) ===")
for i, (_, row) in enumerate(importance_df.iterrows(), 1):
    bar = "#" * int(row['Mean |SHAP|'] / importance_df['Mean |SHAP|'].max() * 40)
    print(f"  {i:2d}. {row['Feature']:20s} {row['Mean |SHAP|']:.4f}  {bar}")
print()

importance_df.to_csv(OUTPUT_DIR / 'shap_feature_importance.csv', index=False)
print(f"Saved: {OUTPUT_DIR / 'shap_feature_importance.csv'}")

# ─── VISUALIZATION 4: SHAP Global Importance Bar Chart ────────────────
fig, ax = plt.subplots(figsize=(10, 8))
top_n = min(len(importance_df), 19)
top_features = importance_df.head(top_n)
bars = ax.barh(range(top_n), top_features['Mean |SHAP|'].values[::-1], color=COLORS[1])
ax.set_yticks(range(top_n))
ax.set_yticklabels(top_features['Feature'].values[::-1])
ax.set_xlabel('Mean |SHAP Value|')
ax.set_title(f'Global Feature Importance (SHAP)\n{shap_model_name} - SCF 2022 Overspending Prediction')
ax.grid(axis='x', alpha=0.3)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '04_shap_global_importance.png')
plt.close()
print(f"Saved: {OUTPUT_DIR / '04_shap_global_importance.png'}")

# ─── VISUALIZATION 5: SHAP Summary (Beeswarm) Plot ───────────────────
fig, ax = plt.subplots(figsize=(12, 8))
shap.summary_plot(shap_vals, X_test, feature_names=feature_cols, show=False, max_display=top_n)
plt.title(f'SHAP Summary Plot\n{shap_model_name} - Feature Impact on Overspending Prediction')
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '05_shap_summary_beeswarm.png')
plt.close()
print(f"Saved: {OUTPUT_DIR / '05_shap_summary_beeswarm.png'}")

# ─── VISUALIZATION 6-8: Individual Waterfall Charts ──────────────────
# Select 3 representative households: one overspending, one borderline, one not
probs = results[shap_model_name]['y_prob']
overspend_idx = np.where(y_test.values == 1)[0]
not_overspend_idx = np.where(y_test.values == 0)[0]

# Pick interesting examples
if len(overspend_idx) > 0:
    # High probability overspender
    high_prob_idx = overspend_idx[np.argmax(probs[overspend_idx])]
    # Borderline case
    borderline_diffs = np.abs(probs - 0.5)
    borderline_idx = np.argmin(borderline_diffs)
    # Clear non-overspender
    low_prob_idx = not_overspend_idx[np.argmin(probs[not_overspend_idx])]

    personas = [
        (high_prob_idx, "High-Risk Overspender", "06"),
        (borderline_idx, "Borderline Case", "07"),
        (low_prob_idx, "Financially Stable", "08"),
    ]

    for idx, persona_name, fig_num in personas:
        print(f"\n--- Waterfall: {persona_name} (index {idx}, prob={probs[idx]:.3f}) ---")

        # Print the household's key financials
        household = X_test.iloc[idx]
        for feat in ['INCOME', 'DEBT', 'CONSPAY', 'DTI', 'LIQ_TO_INC', 'KIDS']:
            if feat in household.index:
                val = household[feat]
                if feat in ['DTI', 'PAYMENT_TO_INC', 'CC_TO_INC', 'LIQ_TO_INC']:
                    print(f"    {feat}: {val:.4f}")
                elif feat == 'KIDS':
                    print(f"    {feat}: {int(val)}")
                else:
                    print(f"    {feat}: ${val:,.0f}")

        fig, ax = plt.subplots(figsize=(10, 7))
        expected_val = explainer.expected_value
        if isinstance(expected_val, (list, np.ndarray)):
            expected_val = expected_val[1] if len(expected_val) > 1 else expected_val[0]
        
        explanation = shap.Explanation(
            values=shap_vals[idx],
            base_values=expected_val,
            data=X_test.iloc[idx].values,
            feature_names=feature_cols
        )
        shap.plots.waterfall(explanation, show=False, max_display=12)
        plt.title(f'SHAP Waterfall: {persona_name}\nOverspending Probability: {probs[idx]:.1%}')
        plt.tight_layout()
        safe_name = persona_name.lower().replace(" ", "_").replace("-", "_")
        out_path = OUTPUT_DIR / f'{fig_num}_waterfall_{safe_name}.png'
        plt.savefig(out_path)
        plt.close()
        print(f"  Saved: {out_path}")


# ═══════════════════════════════════════════════════════════════════════
# STEP 6: FEATURE DISTRIBUTION ANALYSIS
# ═══════════════════════════════════════════════════════════════════════
print()
print("=" * 70)
print("STEP 6: FEATURE DISTRIBUTIONS BY TARGET")
print("=" * 70)

# ─── VISUALIZATION 9: Key feature distributions by overspending status ─
key_features = importance_df.head(6)['Feature'].tolist()

fig, axes = plt.subplots(2, 3, figsize=(16, 10))
axes = axes.flatten()

for i, feat in enumerate(key_features):
    ax = axes[i]
    for label, color, name in [(0, COLORS[0], 'Not Overspending'), (1, COLORS[2], 'Overspending')]:
        subset = df[df['target'] == label][feat]
        ax.hist(subset, bins=40, alpha=0.6, color=color, label=name, density=True)
    ax.set_title(f'{feat}', fontsize=11)
    ax.set_xlabel('')
    ax.legend(fontsize=8)
    ax.grid(alpha=0.2)

plt.suptitle('Feature Distributions by Overspending Status\nTop 6 SHAP Features', fontsize=14, y=1.02)
plt.tight_layout()
plt.savefig(OUTPUT_DIR / '09_feature_distributions.png')
plt.close()
print(f"Saved: {OUTPUT_DIR / '09_feature_distributions.png'}")


# ═══════════════════════════════════════════════════════════════════════
# STEP 7: SAVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════
print()
print("=" * 70)
print("STEP 7: PIPELINE SUMMARY")
print("=" * 70)

summary = {
    'dataset': 'SCF 2022 Extract',
    'households': len(df),
    'features': len(feature_cols),
    'feature_names': feature_cols,
    'target': 'V6 financial-confirmation: (EXPENSHILO == 1) AND (SPEND_RATIO > median)',
    'target_positive_rate': float(df['target'].mean()),
    'train_size': len(X_train),
    'test_size': len(X_test),
    'best_model': best_name,
    'best_accuracy': float(best_result['accuracy']),
    'best_auc_roc': float(best_result['auc_roc']),
    'best_cv_auc_mean': float(best_result['cv_auc_mean']),
    'best_cv_auc_std': float(best_result['cv_auc_std']),
    'best_f1': float(best_result['f1']),
    'best_brier': float(best_result['brier']),
    'calibrated_best_brier': float(best_result['cal_brier']),
    'calibrated_best_auc': float(best_result['cal_auc']),
    'calibrated_best_accuracy': float(best_result['cal_accuracy']),
    'shap_model': shap_model_name,
    'top_5_shap_features': importance_df.head(5)[['Feature', 'Mean |SHAP|']].to_dict('records'),
    'all_model_results': {
        name: {
            'accuracy': float(r['accuracy']),
            'auc_roc': float(r['auc_roc']),
            'cv_auc_mean': float(r['cv_auc_mean']),
            'cv_auc_std': float(r['cv_auc_std']),
            'f1': float(r['f1']),
            'f1_macro': float(r['f1_macro']),
            'brier': float(r['brier']),
        }
        for name, r in results.items()
    },
}

with open(OUTPUT_DIR / 'pipeline_summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print(f"\n{'-' * 50}")
print(f"Dataset:          {summary['dataset']}")
print(f"Households:       {summary['households']}")
print(f"Features:         {summary['features']}")
print(f"Target:           {summary['target']}")
print(f"Positive rate:    {summary['target_positive_rate']:.1%}")
print(f"{'-' * 50}")
print(f"Best model:       {summary['best_model']}")
print(f"  Accuracy:       {summary['best_accuracy']:.4f}")
print(f"  AUC-ROC (test): {summary['best_auc_roc']:.4f}")
print(f"  CV AUC (5-fold):{summary['best_cv_auc_mean']:.4f} +/- {summary['best_cv_auc_std']:.4f}")
print(f"  F1 (positive):  {summary['best_f1']:.4f}")
print(f"  Brier (raw):    {summary['best_brier']:.4f}")
print(f"  Brier (calib.): {summary['calibrated_best_brier']:.4f}")
print(f"{'-' * 50}")
print(f"Top 5 SHAP features:")
for i, feat in enumerate(summary['top_5_shap_features'], 1):
    print(f"  {i}. {feat['Feature']:20s} {feat['Mean |SHAP|']:.4f}")
print(f"{'-' * 50}")
print()
print(f"All outputs saved to: {OUTPUT_DIR.resolve()}/")
print()

# List all output files
print("=== Output Files ===")
for f in sorted(OUTPUT_DIR.glob('*')):
    size = f.stat().st_size
    if size > 1024 * 1024:
        size_str = f"{size / 1024 / 1024:.1f} MB"
    elif size > 1024:
        size_str = f"{size / 1024:.1f} KB"
    else:
        size_str = f"{size} bytes"
    print(f"  {f.name:45s} {size_str}")

print()
print("Pipeline complete.")
