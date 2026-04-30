"""Train and export a reusable expenshilo serving artifact."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.inference.artifact import ARTIFACT_VERSION
from backend.inference.training import DEFAULT_DATA_PATH, train_expenshilo_artifact


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train and export the expenshilo model artifact."
    )
    parser.add_argument(
        "--data-path",
        default=str(DEFAULT_DATA_PATH),
        help="Path to the SCF training CSV.",
    )
    parser.add_argument(
        "--output-dir",
        default="backend/artifacts",
        help="Directory where the artifact bundle will be written.",
    )
    parser.add_argument(
        "--artifact-name",
        default="expenshilo_artifact",
        help="Base filename for exported artifact files.",
    )
    args = parser.parse_args()

    data_path = Path(args.data_path)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Training expenshilo artifact from {data_path} ...")
    artifact = train_expenshilo_artifact(data_path)

    artifact_path = output_dir / f"{args.artifact_name}.pkl"
    summary_path = output_dir / f"{args.artifact_name}.summary.json"
    artifact.save(artifact_path)
    artifact.write_summary(summary_path)

    print(f"Artifact version: {ARTIFACT_VERSION}")
    print(f"Saved artifact: {artifact_path}")
    print(f"Saved summary:  {summary_path}")
    print(f"Prediction model: {artifact.prediction_model_name}")
    print(f"SHAP model:       {artifact.shap_model_name}")


if __name__ == "__main__":
    main()
