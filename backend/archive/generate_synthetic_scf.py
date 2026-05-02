"""
generate_synthetic_scf.py
Generates synthetic data matching the SCF 2022 extract variable structure.
Used ONLY for pipeline development and testing.
Replace with real SCF data for actual research.
"""

import pandas as pd
import numpy as np

np.random.seed(42)

N = 4595  # Match real SCF household count

# Income: log-normal distribution matching SCF 2022 median ~$70K, mean ~$105K
income = np.random.lognormal(mean=11.1, sigma=0.9, size=N).clip(0, 2_000_000)

# Debt: correlated with income but with high variance
debt = (income * np.random.uniform(0.0, 3.0, size=N) * np.random.beta(2, 5, size=N)).clip(0)

# Liquid assets (checking + savings + money market)
liq = np.random.lognormal(mean=8.5, sigma=1.8, size=N).clip(0, 5_000_000)

# Total assets
asset = liq + np.random.lognormal(mean=11.0, sigma=1.5, size=N).clip(0)

# Net worth
networth = asset - debt

# Credit card balance
ccbal = np.random.exponential(scale=3000, size=N).clip(0, 50000)
ccbal[np.random.random(N) < 0.35] = 0  # 35% carry no balance

# Monthly consumer debt payments
conspay = (debt * np.random.uniform(0.005, 0.03, size=N)).clip(0)

# Food spending
foodhome = np.random.normal(6000, 2000, size=N).clip(1200, 20000)
foodaway = np.random.normal(3500, 2000, size=N).clip(0, 15000)

# Age
age = np.random.choice(range(18, 90), size=N, p=np.array(
    [max(0, 3 - abs(x - 50) * 0.05) for x in range(18, 90)]) / 
    sum([max(0, 3 - abs(x - 50) * 0.05) for x in range(18, 90)]))

# Education: 1-16+ scale
educ = np.random.choice(range(8, 18), size=N, p=[0.02, 0.03, 0.05, 0.05, 0.20, 0.10, 0.15, 0.15, 0.15, 0.10])

# Family structure: 1-5
famstruct = np.random.choice([1, 2, 3, 4, 5], size=N, p=[0.30, 0.25, 0.15, 0.15, 0.15])

# Home ownership: 1=owner, 2=renter/other
housecl = np.random.choice([1, 2], size=N, p=[0.66, 0.34])

# Financial literacy: 0-3 correct answers
finlit = np.random.choice([0, 1, 2, 3], size=N, p=[0.10, 0.20, 0.35, 0.35])

# EXPENSHILO: 1=spending > income, 2=spending = income, 3=spending < income
# Overspending is correlated with high debt, low savings, low income
overspend_score = (
    (debt / (income + 1)) * 0.4 +
    (1 - liq / (liq.max() + 1)) * 0.3 +
    (ccbal / (ccbal.max() + 1)) * 0.2 +
    np.random.normal(0, 0.1, size=N)
)
overspend_prob = 1 / (1 + np.exp(-3 * (overspend_score - np.median(overspend_score))))
expenshilo = np.where(
    np.random.random(N) < overspend_prob * 0.6,
    1,  # spending > income
    np.where(np.random.random(N) < 0.4, 2, 3)  # equal or less
)

# Pre-computed DTI
debt2inc = np.where(income > 0, debt / income, 0)

# Build DataFrame matching SCF extract column names
df = pd.DataFrame({
    'Y1': [f'{i:05d}1' for i in range(1, N + 1)],  # Case ID with implicate 1
    'YY1': range(1, N + 1),
    'INCOME': np.round(income, 2),
    'DEBT': np.round(debt, 2),
    'LIQ': np.round(liq, 2),
    'ASSET': np.round(asset, 2),
    'NETWORTH': np.round(networth, 2),
    'CCBAL': np.round(ccbal, 2),
    'CONSPAY': np.round(conspay, 2),
    'FOODHOME': np.round(foodhome, 2),
    'FOODAWAY': np.round(foodaway, 2),
    'AGE': age,
    'EDUC': educ,
    'FAMSTRUCT': famstruct,
    'HOUSECL': housecl,
    'FINLIT': finlit,
    'DEBT2INC': np.round(debt2inc, 4),
    'EXPENSHILO': expenshilo,
    'WGT': np.random.uniform(3000, 50000, size=N).round(2),  # Survey weight
})

df.to_csv('data/scf2022_extract.csv', index=False)
print(f"Generated synthetic SCF extract: {len(df)} households, {len(df.columns)} columns")
print(f"\nTarget distribution (EXPENSHILO):")
for val, label in [(1, "Spending > Income"), (2, "Spending = Income"), (3, "Spending < Income")]:
    count = (df['EXPENSHILO'] == val).sum()
    print(f"  {val} = {label}: {count} ({count/len(df)*100:.1f}%)")
print(f"\nSample columns: {list(df.columns)}")
