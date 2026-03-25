"""FastAPI server — serves the dashboard and analysis API."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse, Response
from git import Repo
from git.exc import GitCommandError

from .analytics import compute_all_analytics
from .cache import get_cached, put_cache, clear_cache
from .classifier import classify_commits
from .config import get_active_api_key, load_config, save_config
from .extractor import extract_commits
from .metrics import compute_metrics

log = logging.getLogger(__name__)

app = FastAPI(title="repocheck", version="0.1.0")

STATIC_DIR = Path(__file__).parent / "static"


def _json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def _build_commit_list(classified) -> list[dict]:
    """Build a lightweight commit list for the frontend."""
    return [
        {
            "sha": cc.commit.sha,
            "short_sha": cc.commit.short_sha,
            "author_name": cc.commit.author_name,
            "author_email": cc.commit.author_email,
            "author_id": cc.commit.author_id,
            "date": cc.commit.authored_date.isoformat(),
            "message": cc.commit.summary,
            "full_message": cc.commit.message[:1000],
            "type": cc.commit_type.value,
            "size": cc.size.value,
            "complexity": cc.complexity_score,
            "impact": cc.impact_summary,
            "ai_assisted": cc.is_ai_assisted,
            "insertions": cc.commit.total_insertions,
            "deletions": cc.commit.total_deletions,
            "files_changed": cc.commit.total_files_changed,
            "files": [f.path for f in cc.commit.files[:50]],
        }
        for cc in classified
    ]


@app.get("/api/analyze")
def analyze(
    repo: str = Query(..., description="Path to local git repository"),
    branch: Optional[str] = Query(None, description="Branch to analyze"),
    max_commits: int = Query(3000, ge=1, le=50000),
    model: str = Query("gpt-4o-mini", description="OpenAI model for classification"),
    nocache: bool = Query(False),
):
    repo_path = Path(repo).expanduser().resolve()
    repo_str = str(repo_path)

    if not (repo_path / ".git").exists():
        raise HTTPException(400, f"Not a git repository: {repo_path}")

    if not nocache:
        cached = get_cached(repo_str, branch, max_commits)
        if cached:
            return JSONResponse(cached)

    try:
        commits = extract_commits(repo_path, max_commits=max_commits, branch=branch)
    except Exception as e:
        raise HTTPException(400, f"Failed to read repository: {e}")

    provider, api_key, resolved_model = get_active_api_key()

    classified = classify_commits(
        commits,
        openai_api_key=api_key if provider == "openai" else None,
        anthropic_api_key=api_key if provider == "anthropic" else None,
        model=resolved_model or model,
        provider=provider or "openai",
    )

    metrics = compute_metrics(classified, repo_path=repo_str)
    result = json.loads(json.dumps(asdict(metrics), default=_json_serial))

    result["commits"] = _build_commit_list(classified)
    result["analytics"] = compute_all_analytics(classified)

    put_cache(repo_str, branch, max_commits, result)

    return JSONResponse(result)


@app.get("/api/diff")
def get_diff(
    repo: str = Query(...),
    sha: str = Query(..., description="Full or short commit SHA"),
):
    """Fetch the diff for a single commit."""
    repo_path = Path(repo).expanduser().resolve()
    if not (repo_path / ".git").exists():
        raise HTTPException(400, "Not a git repository")

    try:
        r = Repo(str(repo_path))
        commit = r.commit(sha)
        if commit.parents:
            diff_text = r.git.diff(
                commit.parents[0].hexsha,
                commit.hexsha,
                stat=False,
                no_color=True,
                unified=4,
            )
        else:
            diff_text = r.git.show(commit.hexsha, format="", no_color=True)

        stat_text = (
            r.git.diff(
                commit.parents[0].hexsha if commit.parents else commit.hexsha,
                commit.hexsha,
                stat=True,
                no_color=True,
            )
            if commit.parents
            else ""
        )

        return {
            "sha": commit.hexsha,
            "message": commit.message.strip(),
            "author": commit.author.name,
            "date": datetime.fromtimestamp(commit.authored_date).isoformat(),
            "stat": stat_text[:5000],
            "diff": diff_text[:200000],
        }
    except (GitCommandError, Exception) as e:
        raise HTTPException(400, f"Could not get diff: {e}")


@app.get("/api/branches")
async def list_branches(repo: str = Query(...)):
    """List branches for a repo. Returns active branch + all branch names."""
    repo_path = Path(repo).expanduser().resolve()
    if not (repo_path / ".git").exists():
        raise HTTPException(400, "Not a git repository")
    try:
        r = Repo(str(repo_path))
        active = r.active_branch.name
        branches = sorted([b.name for b in r.branches], key=lambda b: (b != active, b))
        return {"active": active, "branches": branches}
    except Exception as e:
        return {"active": "main", "branches": [], "error": str(e)}


@app.get("/api/health")
async def health():
    provider, key, model = get_active_api_key()
    return {
        "status": "ok",
        "has_api_key": bool(key),
        "provider": provider,
        "model": model,
    }


@app.get("/api/settings")
async def get_settings():
    cfg = load_config()
    return {
        "provider": cfg.get("provider", ""),
        "has_openai_key": bool(cfg.get("openai_api_key")),
        "has_anthropic_key": bool(cfg.get("anthropic_api_key")),
        "model": cfg.get("model", ""),
    }


@app.post("/api/settings")
async def update_settings(
    provider: str = Query(""),
    openai_api_key: str = Query(""),
    anthropic_api_key: str = Query(""),
    model: str = Query(""),
):
    updates = {}
    if provider:
        updates["provider"] = provider
    if openai_api_key:
        updates["openai_api_key"] = openai_api_key
    if anthropic_api_key:
        updates["anthropic_api_key"] = anthropic_api_key
    if model is not None:
        updates["model"] = model
    save_config(updates)
    return {"ok": True}


@app.get("/api/browse")
async def browse(path: str = Query("~", description="Directory path to list")):
    try:
        target = Path(path).expanduser().resolve()
        if not target.exists():
            parent = target.parent
            prefix = target.name.lower()
            if parent.is_dir():
                entries = []
                for p in sorted(parent.iterdir()):
                    if (
                        p.is_dir()
                        and not p.name.startswith(".")
                        and p.name.lower().startswith(prefix)
                    ):
                        is_repo = (p / ".git").exists()
                        entries.append(
                            {"name": p.name, "path": str(p), "is_repo": is_repo}
                        )
                return {"parent": str(parent), "entries": entries[:30]}
            return {"parent": str(parent), "entries": []}

        if not target.is_dir():
            return {"parent": str(target.parent), "entries": []}

        entries = []
        is_repo = (target / ".git").exists()
        for p in sorted(target.iterdir()):
            if p.is_dir() and not p.name.startswith("."):
                child_is_repo = (p / ".git").exists()
                entries.append(
                    {"name": p.name, "path": str(p), "is_repo": child_is_repo}
                )
        return {"current": str(target), "is_repo": is_repo, "entries": entries[:50]}
    except PermissionError:
        return {"entries": []}


@app.post("/api/cache/clear")
async def api_clear_cache():
    count = clear_cache()
    return {"cleared": count}


_SUFFIX_MAP = {
    ".js": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
}

if STATIC_DIR.exists():

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            ct = _SUFFIX_MAP.get(file_path.suffix, "text/html")
            return Response(file_path.read_bytes(), media_type=ct)
        index = STATIC_DIR / "index.html"
        if index.exists():
            return HTMLResponse(index.read_text())
        raise HTTPException(404)
