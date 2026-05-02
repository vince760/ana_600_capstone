"""CLI entrypoint for building expenshilo inference features from JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .features import build_feature_snapshot
from .schemas import AssessmentInput, ValidationError


def _load_payload(args: argparse.Namespace) -> dict[str, Any]:
    if args.input_json:
        return json.loads(args.input_json)

    if args.input_file:
        return json.loads(Path(args.input_file).read_text(encoding="utf-8"))

    raise SystemExit("Provide either --input-json or --input-file")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build normalized expenshilo model features from a JSON payload."
    )
    parser.add_argument("--input-json", help="Inline JSON object with assessment input.")
    parser.add_argument("--input-file", help="Path to a JSON file with assessment input.")
    args = parser.parse_args()

    try:
        payload = _load_payload(args)
        assessment_input = AssessmentInput.from_mapping(payload)
        snapshot = build_feature_snapshot(assessment_input)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON: {exc}") from exc
    except ValidationError as exc:
        raise SystemExit(f"Validation failed: {exc}") from exc

    print(json.dumps(snapshot.to_dict(), indent=2))


if __name__ == "__main__":
    main()
