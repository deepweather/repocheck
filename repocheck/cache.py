"""Persistent disk cache for analysis results.

Cache key = repo_path + HEAD sha + max_commits.
Automatically invalidates when new commits are pushed.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from git import Repo

log = logging.getLogger(__name__)

CACHE_DIR = Path.home() / ".cache" / "repocheck"


def _ensure_dir():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_key(repo_path: str, branch: str | None, max_commits: int) -> str:
    repo = Repo(repo_path)
    rev = branch or repo.active_branch.name
    head_sha = repo.commit(rev).hexsha

    raw = f"{repo_path}:{rev}:{head_sha}:{max_commits}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def get_cached(repo_path: str, branch: str | None, max_commits: int) -> dict | None:
    """Return cached result dict or None."""
    try:
        _ensure_dir()
        key = _cache_key(repo_path, branch, max_commits)
        path = CACHE_DIR / f"{key}.json"
        if path.exists():
            log.info("Cache HIT for %s (%s)", repo_path, key[:8])
            return json.loads(path.read_text())
    except Exception as e:
        log.debug("Cache lookup failed: %s", e)
    return None


def put_cache(repo_path: str, branch: str | None, max_commits: int, data: dict) -> None:
    """Persist analysis result to disk."""
    try:
        _ensure_dir()
        key = _cache_key(repo_path, branch, max_commits)
        path = CACHE_DIR / f"{key}.json"
        path.write_text(json.dumps(data))
        log.info(
            "Cache WRITE for %s (%s, %.1f KB)",
            repo_path,
            key[:8],
            len(path.read_bytes()) / 1024,
        )
    except Exception as e:
        log.warning("Cache write failed: %s", e)


def clear_cache() -> int:
    """Remove all cached results. Returns count deleted."""
    _ensure_dir()
    count = 0
    for f in CACHE_DIR.glob("*.json"):
        f.unlink()
        count += 1
    return count
