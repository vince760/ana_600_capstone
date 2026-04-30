"""Prediction and SHAP explanation helpers for expenshilo artifacts."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import pandas as pd
import shap

from backend.feature_plain_language import FEATURE_DICTIONARY

from .artifact import ExpenshiloArtifact
from .features import build_feature_snapshot
from .schemas import AssessmentInput, FeatureSnapshot


@dataclass(frozen=True)
class ShapDriver:
    feature_key: str
    display_name: str
    normalized_value: float
    shap_value: float
    effect: str
    plain_description: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class PredictionResult:
    probability: float
    feature_version: str
    model_version: str
    prediction_model_name: str
    shap_model_name: str
    snapshot: FeatureSnapshot
    drivers: list[ShapDriver]

    def to_dict(self) -> dict[str, Any]:
        return {
            "probability": self.probability,
            "feature_version": self.feature_version,
            "model_version": self.model_version,
            "prediction_model_name": self.prediction_model_name,
            "shap_model_name": self.shap_model_name,
            "snapshot": self.snapshot.to_dict(),
            "drivers": [driver.to_dict() for driver in self.drivers],
        }


def _select_positive_class_shap_values(shap_values: Any):
    if isinstance(shap_values, list):
        return shap_values[1]
    if getattr(shap_values, "ndim", None) == 3:
        return shap_values[:, :, 1]
    return shap_values


class ExpenshiloPredictor:
    """Loads a saved artifact and serves probability plus SHAP drivers."""

    def __init__(self, artifact: ExpenshiloArtifact) -> None:
        self.artifact = artifact
        self._explainer = shap.TreeExplainer(self.artifact.shap_model)

    def _build_feature_frame(self, snapshot: FeatureSnapshot) -> pd.DataFrame:
        ordered_values = [snapshot.model_features[name] for name in self.artifact.feature_order]
        return pd.DataFrame([ordered_values], columns=list(self.artifact.feature_order))

    def explain(self, snapshot: FeatureSnapshot, top_k: int = 5) -> list[ShapDriver]:
        feature_frame = self._build_feature_frame(snapshot)
        shap_values = _select_positive_class_shap_values(
            self._explainer.shap_values(feature_frame)
        )
        row_values = shap_values[0]

        ranked = sorted(
            zip(self.artifact.feature_order, row_values),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )

        drivers: list[ShapDriver] = []
        for feature_key, shap_value in ranked[:top_k]:
            entry = FEATURE_DICTIONARY.get(feature_key, {})
            drivers.append(
                ShapDriver(
                    feature_key=feature_key,
                    display_name=entry.get("label", feature_key),
                    normalized_value=float(snapshot.model_features[feature_key]),
                    shap_value=float(shap_value),
                    effect=(
                        "increases_probability"
                        if float(shap_value) >= 0
                        else "decreases_probability"
                    ),
                    plain_description=entry.get("description", feature_key),
                )
            )
        return drivers

    def predict(
        self,
        assessment_input: AssessmentInput,
        top_k: int = 5,
    ) -> PredictionResult:
        snapshot = build_feature_snapshot(
            assessment_input,
            preprocessing=self.artifact.preprocessing,
        )
        feature_frame = self._build_feature_frame(snapshot)
        probability = float(self.artifact.prediction_model.predict_proba(feature_frame)[0, 1])
        drivers = self.explain(snapshot, top_k=top_k)

        return PredictionResult(
            probability=probability,
            feature_version=self.artifact.feature_version,
            model_version=self.artifact.artifact_version,
            prediction_model_name=self.artifact.prediction_model_name,
            shap_model_name=self.artifact.shap_model_name,
            snapshot=snapshot,
            drivers=drivers,
        )
