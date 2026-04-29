"""
feature_plain_language.py
=========================
Plain-language dictionary for every feature used by the SCF overspending
classifier. This is the vocabulary the downstream LLM explanation step
will use when turning SHAP values into human-readable narratives.

Each entry provides:
  - label:           short UI-ready name (for chart axes, table headers)
  - description:     one-sentence explanation a non-expert can understand
  - high_means:      what a high value tells us about the household
  - low_means:       what a low value tells us about the household
  - units:           dollars / ratio / years / code
  - risk_direction:  how the feature typically relates to overspending risk
                     ("higher", "lower", "mixed"). This is the LLM's guide
                     for interpreting the SIGN of a SHAP value, NOT a
                     claim that the relationship is monotonic for every
                     household.
  - category:        grouping for the explanation layer

Source notes:
  - Dollar-amount and ratio features come from the SCF Summary Extract
    File (SCFP2022.csv). Definitions follow Federal Reserve Bulletin
    macro conventions.
  - Level mappings for categorical variables (FAMSTRUCT, EXPENSHILO)
    follow the SCF Summary Extract convention and should be verified
    against the Federal Reserve Bulletin macro documentation before any
    artifact using this dictionary is shared publicly.
  - The codebook at data/codebk2022.txt is the SCF question-level
    codebook and does NOT define these summary-extract variables directly.

Usage:
  from feature_plain_language import FEATURE_DICTIONARY, LEVEL_MAPPINGS
  entry = FEATURE_DICTIONARY['FOODHOME']
  print(entry['description'])
"""

from pathlib import Path
import csv


# ═══════════════════════════════════════════════════════════════════════
# FEATURE DICTIONARY
# ═══════════════════════════════════════════════════════════════════════
FEATURE_DICTIONARY = {
    # ----- Raw dollar-amount features -----
    'INCOME': {
        'label': 'Total Household Income',
        'description': 'Total annual household income from all sources (wages, investments, benefits) for the past year.',
        'high_means': 'the household earns a lot each year.',
        'low_means': 'the household earns little each year.',
        'units': 'dollars',
        'risk_direction': 'mixed',
        'category': 'raw_dollar',
    },
    'DEBT': {
        'label': 'Total Debt',
        'description': 'Total amount the household owes across all debts (mortgages, loans, credit cards, etc.).',
        'high_means': 'the household carries a large amount of debt.',
        'low_means': 'the household carries little or no debt.',
        'units': 'dollars',
        'risk_direction': 'higher',
        'category': 'raw_dollar',
    },
    'LIQ': {
        'label': 'Liquid Assets',
        'description': 'Cash-like savings the household could access quickly (checking, savings, and money-market balances).',
        'high_means': 'the household has a large cash cushion.',
        'low_means': 'the household has little cash on hand.',
        'units': 'dollars',
        'risk_direction': 'lower',
        'category': 'raw_dollar',
    },
    'ASSET': {
        'label': 'Total Assets',
        'description': 'Total value of everything the household owns (home, vehicles, retirement accounts, investments, and cash).',
        'high_means': 'the household owns substantial wealth.',
        'low_means': 'the household owns little wealth.',
        'units': 'dollars',
        'risk_direction': 'lower',
        'category': 'raw_dollar',
    },
    'CCBAL': {
        'label': 'Credit Card Balance',
        'description': 'Balance carried on credit cards from month to month (revolving balance, not total charges).',
        'high_means': 'the household is carrying a large revolving credit-card balance.',
        'low_means': 'the household pays off its credit cards or carries little balance.',
        'units': 'dollars',
        'risk_direction': 'higher',
        'category': 'raw_dollar',
    },
    'CONSPAY': {
        'label': 'Monthly Consumer Debt Payments',
        'description': 'Total monthly payments the household makes on consumer debts such as credit cards, auto loans, and personal loans.',
        'high_means': 'large share of monthly cash flow goes to servicing consumer debt.',
        'low_means': 'monthly consumer-debt payments are small or zero.',
        'units': 'dollars',
        'risk_direction': 'higher',
        'category': 'raw_dollar',
    },
    'FOODHOME': {
        'label': 'Food Spending at Home',
        'description': 'Annual spending on groceries and food consumed at home.',
        'high_means': 'the household spends a lot on groceries annually.',
        'low_means': 'the household spends little on groceries annually.',
        'units': 'dollars',
        'risk_direction': 'mixed',
        'category': 'raw_dollar',
    },
    'FOODAWAY': {
        'label': 'Food Spending Away from Home',
        'description': 'Annual spending on restaurants, takeout, and food eaten away from home.',
        'high_means': 'the household eats out or orders in frequently.',
        'low_means': 'the household rarely eats out.',
        'units': 'dollars',
        'risk_direction': 'higher',
        'category': 'raw_dollar',
    },

    # ----- Demographic / categorical features -----
    'AGE': {
        'label': 'Age (Reference Person)',
        'description': 'Age of the primary respondent (reference person) for the household.',
        'high_means': 'the household head is older.',
        'low_means': 'the household head is younger.',
        'units': 'years',
        'risk_direction': 'mixed',
        'category': 'demographic',
    },
    'FAMSTRUCT': {
        'label': 'Family Structure',
        'description': 'Household composition (partnered status, presence of children, age group).',
        'high_means': 'higher codes generally correspond to married couples without dependent children.',
        'low_means': 'lower codes generally correspond to single-parent or single-adult households with children.',
        'units': 'code (1-5, see LEVEL_MAPPINGS)',
        'risk_direction': 'mixed',
        'category': 'categorical',
    },

    # ----- Engineered ratio features -----
    'DTI': {
        'label': 'Debt-to-Income Ratio',
        'description': 'Total debt divided by total annual income; a standard measure of how heavy a household\'s debt load is relative to what it earns.',
        'high_means': 'debt is large relative to income.',
        'low_means': 'debt is small relative to income (or there is no debt).',
        'units': 'ratio',
        'risk_direction': 'higher',
        'category': 'ratio',
    },
    'PAYMENT_TO_INC': {
        'label': 'Payment-to-Income Ratio',
        'description': 'Annualized consumer-debt payments as a share of annual income; captures how much of each dollar earned goes to servicing consumer debt.',
        'high_means': 'a large share of income is spent on monthly debt payments.',
        'low_means': 'little of income goes to monthly debt payments.',
        'units': 'ratio',
        'risk_direction': 'higher',
        'category': 'ratio',
    },
    'CC_TO_INC': {
        'label': 'Credit Card Balance to Income',
        'description': 'Credit card balance divided by annual income; measures revolving credit pressure relative to what the household earns.',
        'high_means': 'credit card balance is large relative to income.',
        'low_means': 'credit card balance is small or zero relative to income.',
        'units': 'ratio',
        'risk_direction': 'higher',
        'category': 'ratio',
    },

    # ----- Interaction features -----
    'FOODHOME_X_AGE': {
        'label': 'Grocery Spending x Age',
        'description': 'Interaction between grocery spending and the reference person\'s age, capturing how the risk weight of grocery spending shifts with life stage.',
        'high_means': 'large grocery spending at an older age, or very large grocery spending at a younger age.',
        'low_means': 'low grocery spending, regardless of age.',
        'units': 'interaction (dollars x years)',
        'risk_direction': 'mixed',
        'category': 'interaction',
    },
    'DTI_X_AGE': {
        'label': 'Debt Burden x Age',
        'description': 'Interaction between debt-to-income ratio and age, reflecting that the same DTI level can mean different things at different life stages.',
        'high_means': 'high debt-to-income combined with older age, indicating late-life financial stress.',
        'low_means': 'low DTI, or high DTI at a younger age where career growth may still absorb the debt.',
        'units': 'interaction (ratio x years)',
        'risk_direction': 'higher',
        'category': 'interaction',
    },
    'LIQ_SQUEEZE': {
        'label': 'Liquid Cushion, Net of Debt Drag',
        'description': 'Liquid assets multiplied by (1 - DTI, capped at 1). Captures how much of the household\'s cash cushion is effectively available once the drag of debt is taken into account.',
        'high_means': 'the household has substantial cash available AND low debt pressure.',
        'low_means': 'either little cash on hand, or cash that is largely offset by heavy debt.',
        'units': 'dollars (interaction)',
        'risk_direction': 'lower',
        'category': 'interaction',
    },
    'FOOD_DISCRETIONARY': {
        'label': 'Share of Food Spending on Eating Out',
        'description': 'Share of total food budget spent at restaurants and takeout rather than on groceries. A lifestyle signal that is independent of absolute food spending.',
        'high_means': 'most of the household\'s food budget goes to eating out.',
        'low_means': 'most of the household\'s food budget goes to groceries.',
        'units': 'ratio (0 to 1)',
        'risk_direction': 'higher',
        'category': 'interaction',
    },

    # ----- Three-bin AGE dummies (under-35 is the reference category) -----
    'IS_PRIME_EARNING': {
        'label': 'Prime Earning (35-54)',
        'description': 'Indicator that the reference person is in the prime earning life stage (age 35-54). Captures peak-income, family-formation years.',
        'high_means': 'the household head is in their peak earning years.',
        'low_means': 'the household head is either younger (under 35) or older (55+).',
        'units': 'binary (0/1)',
        'risk_direction': 'mixed',
        'category': 'demographic',
    },
    'IS_PRE_RETIREMENT': {
        'label': 'Pre-Retirement (55+)',
        'description': 'Indicator that the reference person is age 55 or older. Captures households in the late-career, draw-down, or retirement life stage.',
        'high_means': 'the household head is 55 or older.',
        'low_means': 'the household head is under 55.',
        'units': 'binary (0/1)',
        'risk_direction': 'mixed',
        'category': 'demographic',
    },
    'FOODHOME_X_PRE_RETIREMENT': {
        'label': 'Grocery Spending x Pre-Retirement',
        'description': 'Interaction between grocery spending and the pre-retirement (55+) indicator. Captures how the risk weight of grocery spending shifts for households in the draw-down life stage.',
        'high_means': 'large grocery spending in a 55+ household.',
        'low_means': 'low grocery spending, or any grocery spending in a household under 55.',
        'units': 'interaction (dollars x indicator)',
        'risk_direction': 'mixed',
        'category': 'interaction',
    },
    'DTI_X_PRE_RETIREMENT': {
        'label': 'Debt Burden x Pre-Retirement',
        'description': 'Interaction between debt-to-income ratio and the pre-retirement (55+) indicator. Same DTI carries more risk later in life when fewer earning years remain to absorb the debt.',
        'high_means': 'high debt-to-income in a 55+ household, indicating late-life financial stress.',
        'low_means': 'low DTI, or any DTI in a household under 55.',
        'units': 'interaction (ratio x indicator)',
        'risk_direction': 'higher',
        'category': 'interaction',
    },
    'INCOME_SHORTFALL': {
        'label': 'Income Shortfall vs Normal Year',
        'description': 'Current-year income relative to the household\'s normal-year income, expressed as a fraction of normal income. Positive values mean the household earned less than usual; negative values mean a windfall year. Captures transitory income shocks that the consumption-smoothing literature identifies as a key driver of overspending.',
        'high_means': 'the household had a bad year (current income well below their normal income).',
        'low_means': 'the household had a good year (current income above their normal income).',
        'units': 'ratio (clipped to [-1, 1])',
        'risk_direction': 'higher',
        'category': 'ratio',
    },
}


# ═══════════════════════════════════════════════════════════════════════
# CATEGORICAL LEVEL MAPPINGS
# ═══════════════════════════════════════════════════════════════════════
# These follow SCF Summary Extract convention. VERIFY against the
# Federal Reserve Bulletin macro documentation before publication.
# ═══════════════════════════════════════════════════════════════════════
LEVEL_MAPPINGS = {
    'FAMSTRUCT': {
        1: 'Unmarried with children',
        2: 'Unmarried, no children, under 55',
        3: 'Unmarried, no children, 55 or older',
        4: 'Married/LWP with children',
        5: 'Married/LWP, no children',
    },
    'EXPENSHILO': {
        1: 'Spent more than income',
        2: 'Spent about the same as income',
        3: 'Spent less than income',
    },
}


# ═══════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════
def describe_value(feature, value):
    """Return a short natural-language description of a feature's value.

    For dollar features, formats as currency. For ratios, formats as a
    percentage or decimal. For categorical features, looks up the level
    mapping.
    """
    entry = FEATURE_DICTIONARY.get(feature)
    if entry is None:
        return f"{feature}={value}"

    cat = entry['category']
    units = entry['units']

    if cat == 'raw_dollar' or units.startswith('dollars'):
        return f"${value:,.0f}"
    if cat == 'ratio' or units == 'ratio':
        return f"{value:.2f}"
    if cat == 'categorical':
        mapping = LEVEL_MAPPINGS.get(feature, {})
        label = mapping.get(int(value), f"code {value}")
        return label
    if feature == 'AGE':
        return f"{int(value)} years old"
    return f"{value}"


def export_csv(path='outputs/feature_plain_language.csv'):
    """Dump FEATURE_DICTIONARY to CSV for human review."""
    out_path = Path(path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'feature', 'label', 'description', 'high_means', 'low_means',
            'units', 'risk_direction', 'category',
        ])
        for feat, entry in FEATURE_DICTIONARY.items():
            writer.writerow([
                feat, entry['label'], entry['description'],
                entry['high_means'], entry['low_means'],
                entry['units'], entry['risk_direction'], entry['category'],
            ])
    return out_path


if __name__ == '__main__':
    out = export_csv()
    print(f"Exported plain-language dictionary ({len(FEATURE_DICTIONARY)} features) to {out}")
    print(f"Level mappings defined for: {list(LEVEL_MAPPINGS.keys())}")
