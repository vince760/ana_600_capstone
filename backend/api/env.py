"""Small .env loader for backend local development."""

from __future__ import annotations

import os
from pathlib import Path


_ENV_LOADED = False


def _parse_env_value(raw_value: str) -> str:
    value = raw_value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue

        key, raw_value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        values[key] = _parse_env_value(raw_value)

    return values


def load_backend_env() -> None:
    """Loads repo-level and backend-level .env files without overriding real env vars."""

    global _ENV_LOADED
    if _ENV_LOADED:
        return

    backend_root = Path(__file__).resolve().parents[1]
    repo_root = backend_root.parent

    merged_values: dict[str, str] = {}
    for candidate in (repo_root / ".env", backend_root / ".env"):
        merged_values.update(_read_env_file(candidate))

    for key, value in merged_values.items():
        os.environ.setdefault(key, value)

    _ENV_LOADED = True
