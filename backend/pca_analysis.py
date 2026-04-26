"""
pca_analysis.py
===============
PCA diagnostic on the SCF 2022 spending pipeline features.

Loads the same 14 features used by scf_spending_pipeline.py, imputes and
standardizes them, then runs PCA. Outputs:
  - scree plot (variance explained per component)
  - cumulative variance curve (helps pick n_components)
  - 2D projection colored by target (overspending vs not)
  - 2D projection colored by age_group (young / middle_aged / old)
  - component loadings CSV (which features drive each PC)
  - explained variance CSV

This script is diagnostic only. It does not modify the training pipeline.

Usage:
  python pca_analysis.py
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.decomposition import PCA
from sklearn.pipeline import Pipeline

# --- Configuration ---
DATA_PATH = Path("data/SCFP2022.csv")
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42

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
print(f"Loaded {len(df)} records, {len(df.columns)} columns\n")


# ═══════════════════════════════════════════════════════════════════════
# STEP 2: FEATURE ENGINEERING (mirrors scf_spending_pipeline.py)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 2: FEATURE ENGINEERING")
print("=" * 70)

# Binary target (for coloring only; not used in PCA fit)
df['target'] = (df['EXPENSHILO'] == 1).astype(int)

RAW_FEATURES = [
    'INCOME', 'DEBT', 'LIQ', 'CONSPAY',
    'FOODHOME', 'FOODAWAY', 'KIDS',
]
available_raw = [c for c in RAW_FEATURES if c in df.columns]

# Derived features (mirror scf_spending_pipeline.py)
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

# IS_OLD and interaction features (mirror pipeline)
if 'AGE' in df.columns:
    df['IS_OLD'] = (df['AGE'] >= 40).astype(int)
if {'FOODHOME', 'IS_OLD'}.issubset(df.columns):
    df['FOODHOME_X_OLD'] = df['FOODHOME'] * df['IS_OLD']
if {'DTI', 'IS_OLD'}.issubset(df.columns):
    df['DTI_X_OLD'] = df['DTI'] * df['IS_OLD']
if {'FOODHOME', 'FOODAWAY'}.issubset(df.columns):
    df['FOOD_DISCRETIONARY'] = df['FOODAWAY'] / (df['FOODHOME'] + df['FOODAWAY'] + 1)

ENGINEERED = [
    'DTI', 'PAYMENT_TO_INC', 'CC_TO_INC',
    'IS_OLD',
    'FOODHOME_X_OLD', 'DTI_X_OLD', 'FOOD_DISCRETIONARY',
]
feature_cols = available_raw + [f for f in ENGINEERED if f in df.columns]

# Age group (labeled categorical, for plot coloring only)
if 'AGE' in df.columns:
    df['age_group'] = pd.cut(
        df['AGE'],
        bins=[0, 18, 49, 100],
        labels=['young', 'middle_aged', 'old'],
        include_lowest=True,
    )

# Clean infinities and cap 99th percentile outliers (matches pipeline)
for col in feature_cols:
    df[col] = df[col].replace([np.inf, -np.inf], np.nan)

dollar_cols = [c for c in feature_cols if c in [
    'INCOME', 'DEBT', 'LIQ',
    'CONSPAY', 'FOODHOME', 'FOODAWAY',
]]
ratio_cols = [c for c in feature_cols if c in ENGINEERED]
for col in dollar_cols + ratio_cols:
    p99 = df[col].quantile(0.99)
    df[col] = df[col].clip(upper=p99)

print(f"Feature count: {len(feature_cols)}")
print(f"Features: {feature_cols}\n")


# ═══════════════════════════════════════════════════════════════════════
# STEP 3: FIT PCA (Impute -> Scale -> PCA)
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 3: FITTING PCA")
print("=" * 70)

X = df[feature_cols].copy()

pca_pipeline = Pipeline(steps=[
    ('impute', SimpleImputer(strategy='median')),
    ('scale', StandardScaler()),
    ('pca', PCA(n_components=None, random_state=RANDOM_STATE)),
])
pca_pipeline.fit(X)

pca = pca_pipeline.named_steps['pca']
X_pca = pca_pipeline.transform(X)

explained = pca.explained_variance_ratio_
cumulative = np.cumsum(explained)

n_90 = int(np.searchsorted(cumulative, 0.90) + 1)
n_95 = int(np.searchsorted(cumulative, 0.95) + 1)

print(f"PC1 explains {explained[0]*100:.2f}% of variance")
print(f"PC2 explains {explained[1]*100:.2f}% of variance")
print(f"First 2 components: {cumulative[1]*100:.2f}% cumulative")
print(f"Components to reach 90% variance: {n_90}")
print(f"Components to reach 95% variance: {n_95}\n")


# ═══════════════════════════════════════════════════════════════════════
# STEP 4: SAVE EXPLAINED VARIANCE + LOADINGS TABLES
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 4: SAVING TABLES")
print("=" * 70)

# Explained variance table
var_df = pd.DataFrame({
    'component': [f"PC{i+1}" for i in range(len(explained))],
    'explained_variance_ratio': explained.round(4),
    'cumulative_variance': cumulative.round(4),
})
var_path = OUTPUT_DIR / "pca_explained_variance.csv"
var_df.to_csv(var_path, index=False)
print(f"Saved: {var_path}")

# Component loadings: rows = features, cols = PCs
loadings = pd.DataFrame(
    pca.components_.T,
    index=feature_cols,
    columns=[f"PC{i+1}" for i in range(pca.n_components_)],
).round(4)
loadings_path = OUTPUT_DIR / "pca_loadings.csv"
loadings.to_csv(loadings_path)
print(f"Saved: {loadings_path}")

# Print top drivers for the first 3 PCs
for i in range(min(3, pca.n_components_)):
    pc = f"PC{i+1}"
    top = loadings[pc].abs().sort_values(ascending=False).head(5)
    print(f"\n  Top 5 drivers of {pc}:")
    for feat in top.index:
        val = loadings.loc[feat, pc]
        print(f"    {feat:20s} {val:+.4f}")
print()


# ═══════════════════════════════════════════════════════════════════════
# STEP 5: PLOTS
# ═══════════════════════════════════════════════════════════════════════
print("=" * 70)
print("STEP 5: GENERATING PLOTS")
print("=" * 70)

# --- Scree plot ---
fig, ax = plt.subplots(figsize=(12, 6))
x_pos = np.arange(1, len(explained) + 1)
ax.bar(x_pos, explained * 100, color=TEAL, edgecolor=NAVY)
for i, v in enumerate(explained * 100):
    ax.text(i + 1, v + 0.3, f"{v:.1f}%", ha='center', fontsize=9)
ax.set_xlabel("Principal Component")
ax.set_ylabel("Variance Explained (%)")
ax.set_title("PCA Scree Plot: Variance Explained per Component")
ax.set_xticks(x_pos)
ax.set_xticklabels([f"PC{i}" for i in x_pos], rotation=45)
ax.grid(axis='y', alpha=0.3)
scree_path = OUTPUT_DIR / "10_pca_scree.png"
plt.savefig(scree_path)
plt.close()
print(f"Saved: {scree_path}")

# --- Cumulative variance plot ---
fig, ax = plt.subplots(figsize=(12, 6))
ax.plot(x_pos, cumulative * 100, marker='o', color=NAVY, linewidth=2)
ax.axhline(90, color=GOLD, linestyle='--', label='90% threshold')
ax.axhline(95, color=RED, linestyle='--', label='95% threshold')
ax.set_xlabel("Number of Components")
ax.set_ylabel("Cumulative Variance Explained (%)")
ax.set_title(
    f"PCA Cumulative Variance (90% at {n_90} PCs, 95% at {n_95} PCs)"
)
ax.set_xticks(x_pos)
ax.set_ylim(0, 105)
ax.legend(loc='lower right')
ax.grid(alpha=0.3)
cum_path = OUTPUT_DIR / "11_pca_cumulative.png"
plt.savefig(cum_path)
plt.close()
print(f"Saved: {cum_path}")

# --- 2D scatter colored by target ---
fig, ax = plt.subplots(figsize=(12, 8))
sample_idx = np.random.RandomState(RANDOM_STATE).choice(
    len(X_pca), size=min(5000, len(X_pca)), replace=False
)
xs = X_pca[sample_idx, 0]
ys = X_pca[sample_idx, 1]
target_sample = df['target'].values[sample_idx]

for val, label, color in [(0, 'Not overspending', TEAL), (1, 'Overspending', RED)]:
    mask = target_sample == val
    ax.scatter(xs[mask], ys[mask], c=color, label=label,
               alpha=0.4, s=18, edgecolors='none')
ax.set_xlabel(f"PC1 ({explained[0]*100:.1f}% variance)")
ax.set_ylabel(f"PC2 ({explained[1]*100:.1f}% variance)")
ax.set_title("PCA Projection Colored by Overspending Target (5k sample)")
ax.legend(loc='best')
ax.grid(alpha=0.3)
target_path = OUTPUT_DIR / "12_pca_scatter_target.png"
plt.savefig(target_path)
plt.close()
print(f"Saved: {target_path}")

# --- 2D scatter colored by age_group ---
if 'age_group' in df.columns:
    fig, ax = plt.subplots(figsize=(12, 8))
    ag_sample = df['age_group'].values[sample_idx]
    palette = {'young': GOLD, 'middle_aged': TEAL, 'old': NAVY}
    for label, color in palette.items():
        mask = ag_sample == label
        if mask.sum() == 0:
            continue
        ax.scatter(xs[mask], ys[mask], c=color,
                   label=f"{label} (n={mask.sum()})",
                   alpha=0.4, s=18, edgecolors='none')
    ax.set_xlabel(f"PC1 ({explained[0]*100:.1f}% variance)")
    ax.set_ylabel(f"PC2 ({explained[1]*100:.1f}% variance)")
    ax.set_title("PCA Projection Colored by Age Group (5k sample)")
    ax.legend(loc='best')
    ax.grid(alpha=0.3)
    age_path = OUTPUT_DIR / "13_pca_scatter_age_group.png"
    plt.savefig(age_path)
    plt.close()
    print(f"Saved: {age_path}")

print("\nPCA diagnostic complete.")
