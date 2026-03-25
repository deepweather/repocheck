#!/usr/bin/env python3
"""repocheck — AI-powered git analytics.

Usage:
    python run.py                   # start dashboard server
    python run.py --repo /path      # analyze immediately and start server
    python run.py --port 8484       # custom port
"""

import logging
import os
import webbrowser
from threading import Timer

import click
import uvicorn
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)


@click.command()
@click.option("--repo", default=None, help="Path to git repo to auto-analyze on start")
@click.option("--branch", default=None, help="Branch to analyze")
@click.option("--port", default=8484, help="Port for the dashboard server")
@click.option("--host", default="127.0.0.1", help="Host to bind to")
@click.option("--no-browser", is_flag=True, help="Don't auto-open browser")
@click.option("--max-commits", default=3000, help="Max commits to analyze")
def main(repo, branch, port, host, no_browser, max_commits):
    """Start the repocheck dashboard server."""

    has_key = bool(os.environ.get("OPENAI_API_KEY"))
    click.echo("\n  repocheck v0.1.0")
    click.echo(
        f"  OpenAI API key: {'configured' if has_key else 'not set (using heuristic mode)'}"
    )
    click.echo(f"  Dashboard: http://{host}:{port}\n")

    if not has_key:
        click.echo(
            "  Tip: export OPENAI_API_KEY=sk-... for AI-powered commit classification\n"
        )

    if repo:
        from repocheck.extractor import extract_commits
        from repocheck.classifier import classify_commits
        from repocheck.metrics import compute_metrics
        from repocheck.server import _cache
        from dataclasses import asdict
        from datetime import datetime
        import json

        click.echo(f"  Pre-analyzing {repo}...")
        commits = extract_commits(repo, max_commits=max_commits, branch=branch)
        classified = classify_commits(commits, model="gpt-4o-mini")
        metrics = compute_metrics(classified, repo_path=repo)
        cache_key = f"{repo}:{branch}:{max_commits}"

        def _serial(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Not serializable: {type(obj)}")

        _cache[cache_key] = json.loads(json.dumps(asdict(metrics), default=_serial))
        click.echo(f"  Done! {len(commits)} commits analyzed.\n")

    if not no_browser:
        url = f"http://{host}:{port}"
        if repo:
            url += f"#repo={repo}"
        Timer(1.5, lambda: webbrowser.open(url)).start()

    uvicorn.run("repocheck.server:app", host=host, port=port, log_level="warning")


if __name__ == "__main__":
    main()
