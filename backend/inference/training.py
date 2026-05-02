"""Training and artifact export helpers for expenshilo models."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
import warnings

import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, f1_score, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold, cross_val_score
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

from backend.expenshilo_core import (
    FEATURE_VERSION,
    MODEL_FEATURE_ORDER,
    add_engineered_columns,
    add_household_id,
    add_target_columns,
    get_model_feature_columns,
    preprocess_training_features,
)
from .artifact import ExpenshiloArtifact

warnings.filterwarnings("ignore")

DEFAULT_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "SCFP2022.csv"
RANDOM_STATE = 42
TEST_SIZE = 0.2


def _prepare_dataset(data_path: Path = DEFAULT_DATA_PATH):
    df = pd.read_csv(data_path)
    df = add_household_id(df)
    df, target_metadata = add_target_columns(df)
    df = add_engineered_columns(df)

    feature_cols = get_model_feature_columns(df)
    X, preprocessing, preprocessing_summary = preprocess_training_features(df, feature_cols)
    y = df["target"].astype(int)
    groups = df["household_id"]

    dataset_metadata = {
        "dataset_path": str(data_path),
        "records": int(len(df)),
        "households": int(groups.nunique()),
        "positive_rate": float(y.mean()),
        "median_spend_ratio_cutoff": target_metadata["median_spend_ratio_cutoff"],
        "feature_version": FEATURE_VERSION,
        "feature_names": feature_cols,
        "target_stats": target_metadata,
        "preprocessing_summary": preprocessing_summary,
    }

    return X, y, groups, preprocessing, dataset_metadata


def _model_templates():
    return {
        "Logistic Regression": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "model",
                    LogisticRegression(
                        max_iter=1000,
                        random_state=RANDOM_STATE,
                        class_weight="balanced",
                    ),
                ),
            ]
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=5,
            random_state=RANDOM_STATE,
            n_jobs=1,
            class_weight="balanced",
        ),
        "XGBoost": xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=RANDOM_STATE,
            eval_metric="logloss",
            n_jobs=1,
            use_label_encoder=False,
        ),
        "Neural Network (MLP)": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "model",
                    MLPClassifier(
                        hidden_layer_sizes=(64, 32),
                        max_iter=500,
                        random_state=RANDOM_STATE,
                        early_stopping=True,
                        validation_fraction=0.15,
                    ),
                ),
            ]
        ),
    }


def train_expenshilo_artifact(data_path: Path = DEFAULT_DATA_PATH) -> ExpenshiloArtifact:
    X, y, groups, preprocessing, dataset_metadata = _prepare_dataset(data_path)

    gss = GroupShuffleSplit(
        n_splits=1,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
    )
    train_idx, test_idx = next(gss.split(X, y, groups=groups))

    X_train = X.iloc[train_idx]
    X_test = X.iloc[test_idx]
    y_train = y.iloc[train_idx]
    y_test = y.iloc[test_idx]
    groups_train = groups.iloc[train_idx]
    groups_test = groups.iloc[test_idx]

    cv_splitter = StratifiedGroupKFold(
        n_splits=5,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    templates = _model_templates()
    results: dict[str, dict[str, object]] = {}

    for name, template in templates.items():
        estimator = clone(template)
        cv_scores = cross_val_score(
            estimator,
            X_train,
            y_train,
            cv=cv_splitter,
            groups=groups_train,
            scoring="roc_auc",
            n_jobs=1,
        )
        estimator.fit(X_train, y_train)
        y_pred = estimator.predict(X_test)
        y_prob = estimator.predict_proba(X_test)[:, 1]

        results[name] = {
            "estimator": estimator,
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "auc_roc": float(roc_auc_score(y_test, y_prob)),
            "cv_auc_mean": float(cv_scores.mean()),
            "cv_auc_std": float(cv_scores.std()),
            "f1": float(f1_score(y_test, y_pred)),
            "f1_macro": float(f1_score(y_test, y_pred, average="macro")),
            "brier": float(brier_score_loss(y_test, y_prob)),
        }

    best_name = max(results, key=lambda model_name: results[model_name]["cv_auc_mean"])

    base_for_calibration = clone(templates[best_name])
    cal_splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.2,
        random_state=RANDOM_STATE + 1,
    )
    model_train_idx, cal_idx = next(
        cal_splitter.split(X_train, y_train, groups=groups_train)
    )

    base_for_calibration.fit(X_train.iloc[model_train_idx], y_train.iloc[model_train_idx])
    calibrated = CalibratedClassifierCV(
        FrozenEstimator(base_for_calibration),
        method="isotonic",
    )
    calibrated.fit(X_train.iloc[cal_idx], y_train.iloc[cal_idx])

    cal_prob = calibrated.predict_proba(X_test)[:, 1]
    cal_pred = calibrated.predict(X_test)

    tree_model_names = ("Random Forest", "XGBoost")
    shap_model_name = (
        best_name
        if best_name in tree_model_names
        else max(tree_model_names, key=lambda model_name: results[model_name]["auc_roc"])
    )
    shap_model = results[shap_model_name]["estimator"]

    metrics = {
        "dataset": dataset_metadata,
        "split": {
            "train_records": int(len(X_train)),
            "test_records": int(len(X_test)),
            "train_households": int(groups_train.nunique()),
            "test_households": int(groups_test.nunique()),
            "train_positive_rate": float(y_train.mean()),
            "test_positive_rate": float(y_test.mean()),
        },
        "model_selection": {
            "best_prediction_model": best_name,
            "shap_model_name": shap_model_name,
        },
        "calibration": {
            "method": "group_aware_prefit_isotonic",
            "calibrated_auc_roc": float(roc_auc_score(y_test, cal_prob)),
            "calibrated_accuracy": float(accuracy_score(y_test, cal_pred)),
            "calibrated_brier": float(brier_score_loss(y_test, cal_prob)),
        },
        "all_model_results": {
            name: {
                key: value
                for key, value in result.items()
                if key != "estimator"
            }
            for name, result in results.items()
        },
        "preprocessing": asdict(preprocessing),
    }

    return ExpenshiloArtifact(
        prediction_model=calibrated,
        shap_model=shap_model,
        prediction_model_name=best_name,
        shap_model_name=shap_model_name,
        preprocessing=preprocessing,
        metrics=metrics,
    )
