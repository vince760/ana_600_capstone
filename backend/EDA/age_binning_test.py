"""
age_binning_test.py
===================
Head-to-head test: numeric AGE vs binary is_old (AGE >= 40) as a model feature.

Mirrors scf_spending_pipeline.py data prep exactly, then fits LR, RF, and
XGBoost on two variants of the same 14-feature set:
  Variant A: numeric AGE in standalone feature AND inside interactions
             (FOODHOME_X_AGE, DTI_X_AGE).
  Variant B: AGE replaced everywhere with is_old (binary, AGE >= 40).
             Interactions become FOODHOME * is_old and DTI * is_old.

Same train/test split is used for both variants so AUC differences are
attributable to the encoding, not the split.

Outputs:
  outputs/age_binning_comparison.csv  (per-model, per-variant AUC/F1/Brier)

Usage:
  python age_binning_test.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.base import clone
from sklearn.metrics import roc_auc_score, f1_score, brier_score_loss
import xgboost as xgb

# --- Configuration ---
DATA_PATH = Path("data/SCFP2022.csv")
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE = 0.2
AGE_CUTOFF = 40  # AGE >= 40 -> is_old = 1

# ═══════════════════════════════════════════════════════════════════════
# Build the feature matrix once for each variant
# ═══════════════════════════════════════════════════════════════════════

def prepare_features(age_encoding):
    """
    Returns (X, y, groups) for the requested AGE encoding.
    age_encoding: 'numeric' or 'binary'.
    """
    df = pd.read_csv(DATA_PATH)
    if 'Y1' in df.columns:
        df['household_id'] = df['Y1'].astype(str).str[:-1].astype(int)
    else:
        df['household_id'] = np.arange(len(df))

    df['target'] = (df['EXPENSHILO'] == 1).astype(int)

    # The feature used for "AGE" in standalone slot AND in interactions.
    # For numeric variant this is raw AGE. For binary variant this is is_old.
    if age_encoding == 'numeric':
        df['AGE_FEAT'] = df['AGE']
    elif age_encoding == 'binary':
        df['AGE_FEAT'] = (df['AGE'] >= AGE_CUTOFF).astype(int)
    else:
        raise ValueError(f"Unknown age_encoding: {age_encoding}")

    # Raw features - matches scf_spending_pipeline.py post-prune.
    # FOODAWAY is excluded from the model (collinear with FOOD_DISCRETIONARY)
    # but is still read from the dataframe to compute FOOD_DISCRETIONARY below.
    raw = ['INCOME', 'DEBT', 'LIQ', 'CONSPAY', 'FOODHOME', 'KIDS']

    # Engineered features (mirror pipeline)
    if 'DEBT2INC' in df.columns:
        df['DTI'] = df['DEBT2INC']
    else:
        df['DTI'] = np.where(df['INCOME'] > 0, df['DEBT'] / df['INCOME'], 0)
    df['PAYMENT_TO_INC'] = np.where(df['INCOME'] > 0, (df['CONSPAY'] * 12) / df['INCOME'], 0)
    df['CC_TO_INC'] = np.where(df['INCOME'] > 0, df['CCBAL'] / df['INCOME'], 0)
    # Interactions use AGE_FEAT (numeric or binary based on variant)
    df['FOODHOME_X_AGE'] = df['FOODHOME'] * df['AGE_FEAT']
    df['DTI_X_AGE'] = df['DTI'] * df['AGE_FEAT']
    df['FOOD_DISCRETIONARY'] = df['FOODAWAY'] / (df['FOODHOME'] + df['FOODAWAY'] + 1)

    engineered = ['DTI', 'PAYMENT_TO_INC', 'CC_TO_INC',
                  'FOODHOME_X_AGE', 'DTI_X_AGE', 'FOOD_DISCRETIONARY']
    feature_cols = raw + ['AGE_FEAT'] + engineered

    # Clean infinities and fill NaN with median (matches pipeline)
    for col in feature_cols:
        df[col] = df[col].replace([np.inf, -np.inf], np.nan)
        if df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())

    # Cap dollar columns and engineered columns at 99th percentile
    dollar_cols = [c for c in feature_cols if c in
                   ['INCOME', 'DEBT', 'LIQ', 'CONSPAY', 'FOODHOME']]
    ratio_cols = [c for c in feature_cols if c in ['DTI', 'PAYMENT_TO_INC', 'CC_TO_INC']]
    interaction_cols = [c for c in feature_cols if c in
                        ['FOODHOME_X_AGE', 'DTI_X_AGE', 'FOOD_DISCRETIONARY']]
    for col in dollar_cols + ratio_cols + interaction_cols:
        p99 = df[col].quantile(0.99)
        df[col] = df[col].clip(upper=p99)

    return df[feature_cols], df['target'], df['household_id'], feature_cols


# ═══════════════════════════════════════════════════════════════════════
# Fit + score helpers
# ═══════════════════════════════════════════════════════════════════════

def evaluate_variant(X, y, groups, label):
    """Fit LR, RF, XGB on the same group-aware split. Return list of dicts."""
    gss = GroupShuffleSplit(n_splits=1, test_size=TEST_SIZE, random_state=RANDOM_STATE)
    train_idx, test_idx = next(gss.split(X, y, groups=groups))
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
    groups_train = groups.iloc[train_idx]

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    pos_weight = (len(y_train) - y_train.sum()) / max(y_train.sum(), 1)
    models = {
        'Logistic Regression': (
            LogisticRegression(max_iter=1000, random_state=RANDOM_STATE,
                               class_weight='balanced'),
            True,  # uses scaled
        ),
        'Random Forest': (
            RandomForestClassifier(n_estimators=200, max_depth=None,
                                   min_samples_leaf=5, random_state=RANDOM_STATE,
                                   n_jobs=-1, class_weight='balanced'),
            False,
        ),
        'XGBoost': (
            xgb.XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.1,
                              random_state=RANDOM_STATE, eval_metric='logloss',
                              scale_pos_weight=pos_weight, use_label_encoder=False),
            False,
        ),
    }

    cv_splitter = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    rows = []
    for name, (model, uses_scaled) in models.items():
        if uses_scaled:
            cv_estimator = Pipeline([('scaler', StandardScaler()), ('model', clone(model))])
            model.fit(X_train_s, y_train)
            y_prob = model.predict_proba(X_test_s)[:, 1]
            y_pred = (y_prob >= 0.5).astype(int)
        else:
            cv_estimator = clone(model)
            model.fit(X_train, y_train)
            y_prob = model.predict_proba(X_test)[:, 1]
            y_pred = (y_prob >= 0.5).astype(int)

        cv_scores = cross_val_score(
            cv_estimator, X_train, y_train, cv=cv_splitter, groups=groups_train,
            scoring='roc_auc', n_jobs=-1,
        )
        rows.append({
            'variant': label,
            'model': name,
            'test_auc': roc_auc_score(y_test, y_prob),
            'cv_auc_mean': cv_scores.mean(),
            'cv_auc_std': cv_scores.std(),
            'f1': f1_score(y_test, y_pred),
            'brier': brier_score_loss(y_test, y_prob),
        })

    return rows


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("AGE BINNING TEST: numeric AGE vs binary is_old (AGE >= 40)")
print("=" * 70)

all_rows = []
for encoding, label in [('numeric', 'A_numeric_AGE'), ('binary', 'B_is_old_binary')]:
    print(f"\n--- Variant {label} ---")
    X, y, groups, feature_cols = prepare_features(encoding)
    print(f"Features ({len(feature_cols)}): {feature_cols}")
    rows = evaluate_variant(X, y, groups, label)
    for r in rows:
        print(f"  {r['model']:22s} test AUC={r['test_auc']:.4f}  "
              f"CV AUC={r['cv_auc_mean']:.4f} +/- {r['cv_auc_std']:.4f}  "
              f"F1={r['f1']:.4f}  Brier={r['brier']:.4f}")
    all_rows.extend(rows)

results_df = pd.DataFrame(all_rows).round(4)
results_path = OUTPUT_DIR / "age_binning_comparison.csv"
results_df.to_csv(results_path, index=False)
print(f"\nSaved: {results_path}")

# Pivot for at-a-glance comparison
print("\n=== Side-by-side: Test AUC ===")
pivot_auc = results_df.pivot(index='model', columns='variant', values='test_auc')
pivot_auc['delta_B_minus_A'] = pivot_auc['B_is_old_binary'] - pivot_auc['A_numeric_AGE']
print(pivot_auc.round(4).to_string())

print("\n=== Side-by-side: CV AUC ===")
pivot_cv = results_df.pivot(index='model', columns='variant', values='cv_auc_mean')
pivot_cv['delta_B_minus_A'] = pivot_cv['B_is_old_binary'] - pivot_cv['A_numeric_AGE']
print(pivot_cv.round(4).to_string())
