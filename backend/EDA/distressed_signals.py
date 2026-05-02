import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# ---------------------------------------------------------------------------
# Load raw SHED data
# ---------------------------------------------------------------------------
DATA_PATH = Path(__file__).parent / "data" / "public2024.csv"
df = pd.read_csv(DATA_PATH, low_memory=False)
print(f"Loaded {df.shape[0]} respondents, {df.shape[1]} columns\n")

# ---------------------------------------------------------------------------
# Select and rename the strongest distress-related variables
# Names come directly from the SHED 2024 codebook.
# ---------------------------------------------------------------------------
COLUMN_MAP = {
    # === Overall Financial Well-being ===
    "B2":     "managing_financially",          # How well managing financially (1=Difficult → 4=Comfortably)
    "B3":     "finances_vs_year_ago",          # Better/same/worse than 12 months ago (1=Much worse → 5=Much better)

    # === Financial Mindset ===
    "B0_a":   "feel_never_have_things",        # "I feel like I will never have the things I want" (1=Completely → 5=Not at all)
    "B0_b":   "feel_just_getting_by",          # "I am just getting by financially" (1=Completely → 5=Not at all)
    "B0_c":   "worried_money_wont_last",       # "Concerned money I have or will save won't last" (1=Completely → 5=Not at all)
    "B1_a":   "money_left_end_of_month",       # "I have money left over at end of month" (1=Always → 5=Never)
    "B1_b":   "finances_control_life",         # "My finances control my life" (1=Always → 5=Never)

    # === Financial Concerns (0=Not a concern, 1=Minor, 2=Major) ===
    "X12_a":  "concern_job_security",          # Finding or keeping a job
    "X12_b":  "concern_price_increases",       # Increases in prices for things you buy
    "X12_c":  "concern_housing_costs",         # Housing costs or availability
    "X12_d":  "concern_retirement_savings",    # Retirement savings
    "X12_e":  "concern_making_ends_meet",      # Making ends meet
    "X12_f":  "concern_medical_costs",         # Medical debt or affording medical care
    "X12_g":  "concern_student_loans",         # Student loans or education costs

    # === Emergency Preparedness ===
    "EF1":    "has_3mo_emergency_fund",        # Set aside emergency funds covering 3 months? (0=No, 1=Yes)
    "EF2":    "could_cover_3mo_if_lost_income", # If lost income, could cover 3mo via borrowing/savings/selling? (0=No, 1=Yes)
    "EF7":    "max_emergency_from_savings",    # Largest emergency expense could handle from savings (1=Under $100 → 5=$2000+)
    "EF3_a":  "emergency_400_cc_pay_full",     # $400 emergency: credit card, pay in full
    "EF3_b":  "emergency_400_cc_over_time",    # $400 emergency: credit card, pay over time
    "EF3_c":  "emergency_400_cash_savings",    # $400 emergency: cash/checking/savings
    "EF3_d":  "emergency_400_bank_loan",       # $400 emergency: bank loan or line of credit
    "EF3_e":  "emergency_400_borrow_friend",   # $400 emergency: borrow from friend/family
    "EF3_f":  "emergency_400_payday_loan",     # $400 emergency: payday loan, deposit advance, overdraft
    "EF3_g":  "emergency_400_sell_something",  # $400 emergency: sell something
    "EF3_h":  "emergency_400_cant_pay",        # $400 emergency: wouldn't be able to pay

    # === Bill Payment (last month) ===
    "EF5C":   "paid_all_bills_in_full",        # Other than CC, paid all bills in full last month? (0=No, 1=Yes)
    "EF6C_a": "bill_rent_mortgage",            # Rent/mortgage last month (-9=N/A, 0=Partial/didn't pay, 1=Paid in full)
    "EF6C_b": "bill_utilities",                # Utilities last month (-9=N/A, 0=Partial/didn't pay, 1=Paid in full)
    "EF6C_c": "bill_phone_internet",           # Phone/internet/cable last month
    "EF6C_d": "bill_car_payment",              # Car payment last month

    # === Income Stability ===
    "I9":     "income_variability",            # Income description (1=Same each month, 2=Occasionally varies, 3=Varies often)
    "I12":    "income_varies_struggled_bills",  # Because income varies, struggled to pay bills? (0=No, 1=Yes)
    "I20":    "spending_vs_income",            # Last month spending was (1=Less than income, 2=Same, 3=More than income)
    "I21_a":  "monthly_income_vs_year_ago",    # Monthly income vs year ago (1=Decreased, 2=Same, 3=Increased)
    "I21_b":  "monthly_spending_vs_year_ago",  # Monthly spending vs year ago (1=Decreased, 2=Same, 3=Increased)

    # === Food Security ===
    "FD3":    "food_sufficiency",              # Food eaten in household (1=Enough wanted → 4=Often not enough)

    # === Healthcare Affordability ===
    "E1_a":   "skipped_prescription_cant_afford",  # Went without Rx because couldn't afford
    "E1_b":   "skipped_doctor_cant_afford",        # Went without doctor/specialist because couldn't afford
    "E1_c":   "skipped_mental_health_cant_afford",  # Went without mental health care because couldn't afford
    "E1_d":   "skipped_dental_cant_afford",        # Went without dental care because couldn't afford
    "E1_e":   "skipped_followup_cant_afford",      # Went without follow-up care because couldn't afford
    "E2":     "had_unexpected_medical_expense",    # Had unexpected major medical expense out of pocket
    "E2B":    "has_medical_debt",                   # Currently have medical debt

    # === Inflation Impact ===
    "INF4":   "inflation_impact",              # Price changes made finances (1=Much worse → 5=Much better)
    "INF3_c": "inflation_reduced_savings",     # Reduced savings due to price increases (0=No, 1=Yes)
    "INF3_d": "inflation_increased_borrowing", # Increased borrowing due to price increases (0=No, 1=Yes)

    # === Banking & Alternative Financial Services ===
    "BK1":    "has_bank_account",              # Have checking/savings/money market account? (0=No, 1=Yes)
    "BK2_c":  "used_payday_loan",             # Took out payday loan/advance in past 12 months (0=No, 1=Yes)
    "BK2_d":  "used_pawn_or_title_loan",      # Took out pawn shop or auto title loan (0=No, 1=Yes)
    "BK2_f":  "paid_overdraft_fee",           # Paid overdraft fee on bank account (0=No, 1=Yes)

    # === Credit ===
    "A6":     "confidence_credit_approval",    # Confidence CC application approved (-2=Don't know, 1=Very → 3=Not confident)
    "C4A":    "frequency_carry_cc_balance",    # How often carried unpaid CC balance (0=Never → 3=Most/all of time)
    "A1_a":   "turned_down_for_credit",        # Turned down for credit in past 12 months (0=No, 1=Yes)
    "A1_c":   "avoided_applying_fear_denial",  # Didn't apply for credit because feared denial (0=No, 1=Yes)

    # === Buy Now Pay Later ===
    "BNPL1":  "used_bnpl",                     # Used BNPL in past year (0=No, 1=Yes)
    "BNPL3":  "late_on_bnpl",                  # Late on BNPL payment (0=No, 1=Yes)
    "BNPL4_e": "bnpl_only_way_afford",         # Used BNPL because only way to afford it (0=No, 1=Yes)

    # === Student Loans ===
    "SL1":    "has_student_loan_debt",         # Currently have student loan debt (0=No, 1=Yes)
    "SL6":    "behind_on_student_loans",       # Behind on payments or in collections (0=No, 1=Yes)

    # === Retirement ===
    "K0":     "retirement_plan_on_track",      # Retirement plan on track? (-2=Don't know, 0=No, 1=Yes)
    "K5A_a":  "borrowed_from_retirement",      # Borrowed from retirement accounts (0=No, 1=Yes)
    "K5A_b":  "cashed_out_retirement",         # Permanently withdrew from retirement (0=No, 1=Yes)

    # === Housing ===
    "GH1":    "housing_status",                # Own w/ mortgage=1, Own free=2, Rent=3, Neither=4
    "R11":    "behind_on_rent",                # Behind on rent in past year (0=No, 1=Yes)
    "R3":     "monthly_rent_amount",           # Monthly rent (numeric)
    "M4":     "monthly_mortgage_amount",       # Monthly mortgage payment (numeric)

    # === Demographics ===
    "ppage":     "age",
    "ppeduc5":   "education_level",            # 1=No HS → 5=Masters+
    "ppemploy":  "employment_status",          # 1=Full-time, 2=Part-time, 3=Not working
    "pphhsize":  "household_size",
    "pphouse4":  "housing_type",               # 1=Detached house, 2=Condo/townhouse, 3=Apartment, 4=Other
    "ppinc7":    "income_bracket",             # 1=<$10k → 7=$150k+
    "ppmarit5":  "marital_status",             # 1=Married, 2=Widowed, 3=Divorced, 4=Separated, 5=Never married
    "ppkid017":  "num_children_under_18",
    "ppt18ov":   "num_adults_in_household",
    "pprent":    "own_or_rent",                # 1=Own, 2=Rent, 3=Occupied without payment
    "ppreg4":    "region",                     # 1=NE, 2=Midwest, 3=South, 4=West

    # === Survey weight ===
    "weight":    "survey_weight",
}

# Select only the columns we need and rename them
available = [col for col in COLUMN_MAP if col in df.columns]
missing = [col for col in COLUMN_MAP if col not in df.columns]

distress_df = df[available].rename(columns=COLUMN_MAP)

print(f"Selected {len(available)} of {len(COLUMN_MAP)} variables")
if missing:
    print(f"Missing from dataset: {missing}")

print(f"Renamed dataset shape: {distress_df.shape}")
print()

# ---------------------------------------------------------------------------
# Step 2: Define the target variable
#
# B2 (managing_financially) is the respondent directly telling us how well
# they are managing financially. It's a 4-point ordinal scale defined by
# the survey instrument itself  - we just convert the text labels back to
# the codebook's numeric codes:
#   1 = Finding it difficult to get by (highest distress)
#   2 = Just getting by
#   3 = Doing okay
#   4 = Living comfortably (lowest distress)
#
# This becomes the TARGET. The Random Forest will learn what predicts it.
# ---------------------------------------------------------------------------

B2_CODEBOOK = {
    "Finding it difficult to get by": 1,
    "Just getting by": 2,
    "Doing okay": 3,
    "Living comfortably": 4,
}

distress_df["target"] = distress_df["managing_financially"].map(B2_CODEBOOK)

valid_count = distress_df["target"].notna().sum()
print(f"Target variable (B2) encoded for {valid_count} / {len(distress_df)} respondents")
print()

print("=== Target Distribution ===")
for label, code in B2_CODEBOOK.items():
    count = (distress_df["target"] == code).sum()
    pct = count / len(distress_df) * 100
    print(f"  {code} = {label:40s} {count:6d} ({pct:.1f}%)")
print()

# ---------------------------------------------------------------------------
# Step 3: Encode feature variables to numeric
#
# Converting text labels back to the codebook's own numeric codes.
# These are not subjective values  - they are the survey instrument's
# defined coding scheme. "Don't know" and "Does not apply" values
# are set to NaN so the model treats them as missing.
# ---------------------------------------------------------------------------

# --- Binary Yes/No columns: Yes=1, No=0 ---
BINARY_COLS = [
    "has_3mo_emergency_fund", "could_cover_3mo_if_lost_income",
    "emergency_400_cc_pay_full", "emergency_400_cc_over_time",
    "emergency_400_cash_savings", "emergency_400_bank_loan",
    "emergency_400_borrow_friend", "emergency_400_payday_loan",
    "emergency_400_sell_something", "emergency_400_cant_pay",
    "paid_all_bills_in_full",
    "income_varies_struggled_bills",
    "skipped_prescription_cant_afford", "skipped_doctor_cant_afford",
    "skipped_mental_health_cant_afford", "skipped_dental_cant_afford",
    "skipped_followup_cant_afford",
    "had_unexpected_medical_expense", "has_medical_debt",
    "inflation_reduced_savings", "inflation_increased_borrowing",
    "has_bank_account",
    "used_payday_loan", "used_pawn_or_title_loan", "paid_overdraft_fee",
    "turned_down_for_credit", "avoided_applying_fear_denial",
    "used_bnpl", "late_on_bnpl", "bnpl_only_way_afford",
    "has_student_loan_debt", "behind_on_student_loans",
    "borrowed_from_retirement", "cashed_out_retirement",
    "behind_on_rent",
]

BINARY_MAP = {"Yes": 1, "No": 0}

for col in BINARY_COLS:
    distress_df[col] = distress_df[col].map(BINARY_MAP)

# --- Ordinal columns: text -> codebook numeric codes ---
ORDINAL_MAPS = {
    "finances_vs_year_ago": {
        "Much worse off": 1,
        "Somewhat worse off": 2,
        "About the same": 3,
        "Somewhat better off": 4,
        "Much better off": 5,
    },
    "feel_never_have_things": {
        "Completely": 1, "Very well": 2, "Somewhat": 3,
        "Very little": 4, "Not at all": 5,
    },
    "feel_just_getting_by": {
        "Completely": 1, "Very well": 2, "Somewhat": 3,
        "Very little": 4, "Not at all": 5,
    },
    "worried_money_wont_last": {
        "Completely": 1, "Very well": 2, "Somewhat": 3,
        "Very little": 4, "Not at all": 5,
    },
    "money_left_end_of_month": {
        "Always": 1, "Often": 2, "Sometimes": 3, "Rarely": 4, "Never": 5,
    },
    "finances_control_life": {
        "Always": 1, "Often": 2, "Sometimes": 3, "Rarely": 4, "Never": 5,
    },
    "concern_job_security": {
        "Not a concern": 0, "Minor concern": 1, "Major concern": 2,
    },
    "concern_price_increases": {
        "Not a concern": 0, "Minor concern": 1, "Major concern": 2,
    },
    "concern_housing_costs": {
        "Not a concern": 0, "Minor concern": 1, "Major concern": 2,
    },
    "concern_retirement_savings": {
        "Not a concern": 0, "Minor concern": 1, "Major concern": 2,
    },
    "concern_making_ends_meet": {
        "Not a concern": 0, "Minor concern": 1, "Major concern": 2,
    },
    "concern_medical_costs": {
        "Not a concern": 0, "Minor concern": 1, "Major concern": 2,
    },
    "concern_student_loans": {
        "Not a concern": 0, "Minor concern": 1, "Major concern": 2,
    },
    "max_emergency_from_savings": {
        "Under $100": 1, "$100 to $499": 2, "$500 to $999": 3,
        "$1,000 to $1,999": 4, "$2,000 or more": 5,
    },
    "income_variability": {
        "Roughly the same amount each month": 1,
        "Occasionally varies from month to month": 2,
        "Varies quite often from month to month": 3,
    },
    "spending_vs_income": {
        "Less than your income": 1,
        "The same as your income": 2,
        "More than your income": 3,
    },
    "monthly_income_vs_year_ago": {
        "Decreased": 1, "About the same": 2, "Increased": 3,
    },
    "monthly_spending_vs_year_ago": {
        "Decreased": 1, "About the same": 2, "Increased": 3,
    },
    "food_sufficiency": {
        "Enough of the kinds of food we wanted to eat": 1,
        "Enough, but not always the kinds of food we wanted to eat": 2,
        "Sometimes not enough to eat": 3,
        "Often not enough to eat": 4,
    },
    "inflation_impact": {
        "Much worse": 1, "Somewhat worse": 2, "Little or no effect": 3,
        "Somewhat better": 4, "Much better": 5,
    },
    "frequency_carry_cc_balance": {
        "Never carried an unpaid balance (always pay in full)": 0,
        "Once": 1, "Some of the time": 2, "Most or all of the time": 3,
    },
    "housing_status": {
        "Own your home with a mortgage or loan": 1,
        "Own your home free and clear (without a mortgage or loan)": 2,
        "Pay rent": 3,
        "Neither own nor pay rent": 4,
    },
    "confidence_credit_approval": {
        "Very confident": 1, "Somewhat confident": 2, "Not confident": 3,
    },
    "retirement_plan_on_track": {
        "No": 0, "Yes": 1,
    },
    "employment_status": {
        "Working full-time": 1, "Working part-time": 2, "Not working": 3,
    },
    "education_level": {
        "No high school diploma or GED": 1,
        "High school graduate (high school diploma or the equivalent GED)": 2,
        "Some college or Associate's degree": 3,
        "Bachelor's degree": 4,
        "Master\u2019s degree or higher": 5,
    },
    "income_bracket": {
        "Less than $10,000": 1, "$10,000 to $24,999": 2,
        "$25,000 to $49,999": 3, "$50,000 to $74,999": 4,
        "$75,000 to $99,999": 5, "$100,000 to $149,999": 6,
        "$150,000 or more": 7,
    },
    "marital_status": {
        "Now married": 1, "Widowed": 2, "Divorced": 3,
        "Separated": 4, "Never married": 5,
    },
    "housing_type": {
        "A one-family house detached from any other house": 1,
        "One-family condo or townhouse attached to other units": 2,
        "Building with 2 or more apartments": 3,
        "Other (mobile home, boat, RV, van, etc.)": 4,
    },
    "own_or_rent": {
        "Owned or being bought by you or someone in your household": 1,
        "Rented for cash": 2,
        "Occupied without payment of cash rent": 3,
    },
    "region": {
        "Northeast": 1, "Midwest": 2, "South": 3, "West": 4,
    },
    "bill_rent_mortgage": {
        "Paid in full": 1, "Made partial payment or did not pay": 0,
        "Does not apply (do not have bill)": np.nan,
    },
    "bill_utilities": {
        "Paid in full": 1, "Made partial payment or did not pay": 0,
        "Does not apply (do not have bill)": np.nan,
    },
    "bill_phone_internet": {
        "Paid in full": 1, "Made partial payment or did not pay": 0,
        "Does not apply (do not have bill)": np.nan,
    },
    "bill_car_payment": {
        "Paid in full": 1, "Made partial payment or did not pay": 0,
        "Does not apply (do not have bill)": np.nan,
    },
}

for col, mapping in ORDINAL_MAPS.items():
    distress_df[col] = distress_df[col].map(mapping)

# --- Numeric columns that are already numeric: just ensure proper dtype ---
NUMERIC_COLS = [
    "age", "household_size", "num_children_under_18",
    "num_adults_in_household", "monthly_rent_amount",
    "monthly_mortgage_amount", "survey_weight",
]

for col in NUMERIC_COLS:
    distress_df[col] = pd.to_numeric(distress_df[col], errors="coerce")

# ---------------------------------------------------------------------------
# Step 4: Handle missing values based on survey skip logic
#
# Missing values in SHED are NOT random  - they result from conditional
# survey logic. The codebook documents exactly when each question is
# skipped. We fill based on what "not asked" means for each variable.
# ---------------------------------------------------------------------------

# Group 1: Not applicable = no distress on this item (fill with 0)
# If the question wasn't asked because they don't have that obligation,
# they can't be distressed by it.
FILL_ZERO = {
    "behind_on_rent":                 "Not a renter (GH1 != Rent)",
    "behind_on_student_loans":        "No student loan debt (SL1 = No)",
    "late_on_bnpl":                   "Didn't use BNPL (BNPL1 = No)",
    "bnpl_only_way_afford":           "Didn't use BNPL (BNPL1 = No)",
    "income_varies_struggled_bills":  "Income is stable (I9 = same each month)",
    "paid_overdraft_fee":             "No bank account (BK1 = No)",
    "borrowed_from_retirement":       "Retired (D1I = Yes)",
    "cashed_out_retirement":          "Retired (D1I = Yes)",
    "turned_down_for_credit":         "Didn't apply for credit (A0 = No)",
    "avoided_applying_fear_denial":   "Didn't apply for credit (A0 = No)",
}

for col, reason in FILL_ZERO.items():
    before = distress_df[col].isna().sum()
    distress_df[col] = distress_df[col].fillna(0)
    after = distress_df[col].isna().sum()
    print(f"  {col}: filled {before - after} NaN -> 0 ({reason})")

print()

# Group 2: Bill payment columns  - missing means they paid all bills (EF5C = Yes)
BILL_COLS = ["bill_rent_mortgage", "bill_utilities", "bill_phone_internet", "bill_car_payment"]
for col in BILL_COLS:
    before = distress_df[col].isna().sum()
    distress_df[col] = distress_df[col].fillna(1)  # 1 = paid in full
    after = distress_df[col].isna().sum()
    print(f"  {col}: filled {before - after} NaN -> 1 (paid all bills, EF5C = Yes)")

print()

# Group 3: Conditional follow-ups where missing = positive outcome
# EF2: only asked if no emergency fund. If they HAVE one, they can cover 3 months.
before = distress_df["could_cover_3mo_if_lost_income"].isna().sum()
distress_df["could_cover_3mo_if_lost_income"] = distress_df["could_cover_3mo_if_lost_income"].fillna(1)
print(f"  could_cover_3mo_if_lost_income: filled {before} NaN -> 1 (has emergency fund, EF1 = Yes)")

# C4A: only asked if has credit card. No credit card = never carried a balance.
before = distress_df["frequency_carry_cc_balance"].isna().sum()
distress_df["frequency_carry_cc_balance"] = distress_df["frequency_carry_cc_balance"].fillna(0)
print(f"  frequency_carry_cc_balance: filled {before} NaN -> 0 (no credit card, C2A = No)")

# K0: only asked if not retired. Retired people -> NaN stays (not applicable)
# But "Don't know" responses are also NaN here  - leave as-is for the model.

print()

# Group 4: Dollar amounts  - not applicable means $0
before_rent = distress_df["monthly_rent_amount"].isna().sum()
distress_df["monthly_rent_amount"] = distress_df["monthly_rent_amount"].fillna(0)
print(f"  monthly_rent_amount: filled {before_rent} NaN -> 0 (not a renter)")

before_mort = distress_df["monthly_mortgage_amount"].isna().sum()
distress_df["monthly_mortgage_amount"] = distress_df["monthly_mortgage_amount"].fillna(0)
print(f"  monthly_mortgage_amount: filled {before_mort} NaN -> 0 (no mortgage)")

print()

# Group 5: Random split-ballot (X12 concern variables)  - stay NaN
# These respondents were randomly not asked. No way to infer values.
# Random Forest can handle NaN natively.
SPLIT_BALLOT = [
    "concern_job_security", "concern_price_increases", "concern_housing_costs",
    "concern_retirement_savings", "concern_making_ends_meet",
    "concern_medical_costs", "concern_student_loans",
]
split_missing = distress_df[SPLIT_BALLOT].isna().sum().iloc[0]
print(f"  X12 concern variables: {split_missing} NaN remain (random split-ballot, cannot infer)")
print()

# --- Summary after handling ---
feature_cols = [c for c in distress_df.columns if c not in ["target", "managing_financially"]]

print("=== Missing Values After Handling ===")
missing_pct = (distress_df[feature_cols].isna().sum() / len(distress_df) * 100).round(1)
has_missing = missing_pct[missing_pct > 0].sort_values(ascending=False)
if len(has_missing) > 0:
    for col, pct in has_missing.items():
        print(f"  {col:45s} {pct:5.1f}% missing")
else:
    print("  No missing values remain.")
print()

# Drop columns that still have missing values
cols_to_drop = has_missing.index.tolist()
distress_df = distress_df.drop(columns=cols_to_drop)
print(f"Dropped {len(cols_to_drop)} columns with remaining missing values:")
for col in cols_to_drop:
    print(f"  - {col}")
print()

feature_cols = [c for c in distress_df.columns if c not in ["target", "managing_financially", "survey_weight"]]

print(f"=== Final Dataset ===")
print(f"Respondents: {len(distress_df)}")
print(f"Features: {len(feature_cols)}")
print(f"Missing values: {distress_df[feature_cols].isna().sum().sum()}")
print()

# ---------------------------------------------------------------------------
# Step 5: Train Random Forest Regressor
#
# The model learns which features predict financial distress (B2 target)
# and how much each feature contributes. We use regression because the
# target is ordinal (1-4) and we want continuous predictions that can
# later be scaled to 0-100.
# ---------------------------------------------------------------------------

X = distress_df[feature_cols]
y = distress_df["target"]

# 80/20 train/test split, stratified to preserve target distribution
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training set: {len(X_train)} respondents")
print(f"Test set:     {len(X_test)} respondents")
print()

# Train the Random Forest
rf = RandomForestRegressor(
    n_estimators=200,
    max_depth=None,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1,
)

print("Training Random Forest...")
rf.fit(X_train, y_train)
print("Done.\n")

# Evaluate on test set
y_pred = rf.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"=== Model Performance (Test Set) ===")
print(f"  R-squared:          {r2:.4f}")
print(f"  Mean Absolute Error: {mae:.4f}")
print(f"  (Target scale: 1-4, so MAE of {mae:.2f} means predictions are off by ~{mae:.2f} levels on average)")
print()

# Feature importances  - what the model learned drives distress
importances = pd.Series(rf.feature_importances_, index=feature_cols)
importances = importances.sort_values(ascending=False)

print(f"=== All Feature Importances (ranked) ===")
for i, (feat, imp) in enumerate(importances.items(), 1):
    bar = "#" * int(imp * 200)
    print(f"  {i:2d}. {feat:45s} {imp:.4f}  {bar}")
print()
