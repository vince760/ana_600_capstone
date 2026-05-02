"""Constants shared across expenshilo inference code."""

from backend.expenshilo_core import FEATURE_VERSION, MODEL_FEATURE_ORDER, MODEL_TARGET

REQUIRED_INPUT_FIELDS = (
    "primary_user_age_years",
    "num_children_under_18",
    "annual_household_income_usd",
    "total_household_debt_usd",
    "monthly_consumer_debt_payments_usd",
    "liquid_assets_usd",
    "credit_card_revolving_balance_usd",
    "monthly_grocery_spend_usd",
    "monthly_dining_spend_usd",
)
