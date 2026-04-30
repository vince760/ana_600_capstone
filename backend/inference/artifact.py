"""Artifact serialization helpers for expenshilo serving."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import json
from pathlib import Path
import pickle
from typing import Any

from .constants import FEATURE_VERSION, MODEL_FEATURE_ORDER, MODEL_TARGET
from .schemas import InferencePreprocessingConfig

ARTIFACT_VERSION = "expenshilo-artifact-v1"


@dataclass
class ExpenshiloArtifact:
    """Serialized serving bundle for prediction and SHAP explanation."""

    prediction_model: Any
    shap_model: Any
    prediction_model_name: str
    shap_model_name: str
    preprocessing: InferencePreprocessingConfig
    metrics: dict[str, Any]
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    artifact_version: str = ARTIFACT_VERSION
    feature_version: str = FEATURE_VERSION
    feature_order: tuple[str, ...] = MODEL_FEATURE_ORDER
    target_name: str = MODEL_TARGET
    source_dataset: str = "SCFP2022.csv"
    target_definition: str = (
        "target = (EXPENSHILO == 1) AND (SPEND_RATIO > dataset median)"
    )

    def save(self, path: str | Path) -> Path:
        artifact_path = Path(path)
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        with artifact_path.open("wb") as handle:
            pickle.dump(self, handle, protocol=pickle.HIGHEST_PROTOCOL)
        return artifact_path

    def summary(self) -> dict[str, Any]:
        summary = asdict(self)
        summary.pop("prediction_model", None)
        summary.pop("shap_model", None)
        return summary

    def write_summary(self, path: str | Path) -> Path:
        summary_path = Path(path)
        summary_path.parent.mkdir(parents=True, exist_ok=True)
        summary_path.write_text(
            json.dumps(self.summary(), indent=2),
            encoding="utf-8",
        )
        return summary_path


def load_artifact(path: str | Path) -> ExpenshiloArtifact:
    artifact_path = Path(path)
    with artifact_path.open("rb") as handle:
        artifact = pickle.load(handle)
    if not isinstance(artifact, ExpenshiloArtifact):
        raise TypeError(f"{artifact_path} does not contain an ExpenshiloArtifact")
    return artifact
