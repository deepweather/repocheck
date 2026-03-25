"""User config — stored at ~/.repocheck/config.json."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

log = logging.getLogger(__name__)

CONFIG_DIR = Path.home() / ".repocheck"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULTS = {
    "provider": "",  # "openai" | "anthropic" | ""
    "openai_api_key": "",
    "anthropic_api_key": "",
    "model": "",  # auto-selected if empty
}


def _ensure_dir():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    _ensure_dir()
    if CONFIG_FILE.exists():
        try:
            data = json.loads(CONFIG_FILE.read_text())
            return {**DEFAULTS, **data}
        except Exception:
            pass
    return dict(DEFAULTS)


def save_config(data: dict) -> None:
    _ensure_dir()
    current = load_config()
    current.update(data)
    CONFIG_FILE.write_text(json.dumps(current, indent=2))
    log.info("Config saved to %s", CONFIG_FILE)


def get_active_api_key() -> tuple[str, str, str]:
    """Return (provider, api_key, model) from config or env vars."""
    cfg = load_config()
    provider = cfg.get("provider", "")
    model = cfg.get("model", "")

    if provider == "anthropic":
        key = cfg.get("anthropic_api_key") or os.environ.get("ANTHROPIC_API_KEY", "")
        return ("anthropic", key, model or "claude-sonnet-4-20250514")

    if provider == "openai":
        key = cfg.get("openai_api_key") or os.environ.get("OPENAI_API_KEY", "")
        return ("openai", key, model or "gpt-4o-mini")

    # Auto-detect from env
    env_openai = os.environ.get("OPENAI_API_KEY", "")
    env_anthropic = os.environ.get("ANTHROPIC_API_KEY", "")

    if env_openai:
        return ("openai", env_openai, model or "gpt-4o-mini")
    if env_anthropic:
        return ("anthropic", env_anthropic, model or "claude-sonnet-4-20250514")

    # Check config keys even without provider set
    if cfg.get("openai_api_key"):
        return ("openai", cfg["openai_api_key"], model or "gpt-4o-mini")
    if cfg.get("anthropic_api_key"):
        return (
            "anthropic",
            cfg["anthropic_api_key"],
            model or "claude-sonnet-4-20250514",
        )

    return ("", "", "")
