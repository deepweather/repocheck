"""Extract structured commit data from a git repository."""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from git import Repo

log = logging.getLogger(__name__)


@dataclass
class FileChange:
    path: str
    insertions: int
    deletions: int
    is_rename: bool = False


@dataclass
class CommitData:
    sha: str
    short_sha: str
    author_name: str
    author_email: str
    authored_date: datetime
    committer_name: str
    committed_date: datetime
    message: str
    summary: str
    files: list[FileChange] = field(default_factory=list)
    total_insertions: int = 0
    total_deletions: int = 0
    total_files_changed: int = 0
    is_merge: bool = False

    @property
    def net_lines(self) -> int:
        return self.total_insertions - self.total_deletions

    @property
    def author_id(self) -> str:
        return hashlib.md5(self.author_email.lower().strip().encode()).hexdigest()[:12]

    @property
    def file_paths_str(self) -> str:
        return ", ".join(f.path for f in self.files[:30])


def extract_commits(
    repo_path: str | Path,
    max_commits: int = 5000,
    branch: str | None = None,
) -> list[CommitData]:
    """Walk git log and return structured commit data.

    Only extracts commit metadata + file stats (no diffs).
    This keeps extraction fast: ~1-2s for 1000 commits.
    """
    repo = Repo(str(repo_path))
    if repo.bare:
        raise ValueError(f"Repository at {repo_path} is bare")

    rev = branch or repo.active_branch.name
    log.info(
        "Extracting up to %d commits from %s (rev=%s)", max_commits, repo_path, rev
    )

    commits: list[CommitData] = []

    for commit in repo.iter_commits(rev, max_count=max_commits):
        summary = commit.message.strip().split("\n")[0]
        is_merge = len(commit.parents) > 1

        files: list[FileChange] = []
        total_ins = 0
        total_del = 0

        try:
            for fpath, stat in commit.stats.files.items():
                ins = stat.get("insertions", 0)
                dels = stat.get("deletions", 0)
                files.append(
                    FileChange(
                        path=fpath,
                        insertions=ins,
                        deletions=dels,
                        is_rename=bool("{" in fpath and "=>" in fpath),
                    )
                )
                total_ins += ins
                total_del += dels
        except Exception:
            log.debug("Could not get stats for %s", commit.hexsha[:8])

        commits.append(
            CommitData(
                sha=commit.hexsha,
                short_sha=commit.hexsha[:8],
                author_name=commit.author.name or "unknown",
                author_email=commit.author.email or "unknown",
                authored_date=datetime.fromtimestamp(
                    commit.authored_date, tz=timezone.utc
                ),
                committer_name=commit.committer.name or "unknown",
                committed_date=datetime.fromtimestamp(
                    commit.committed_date, tz=timezone.utc
                ),
                message=commit.message.strip(),
                summary=summary,
                files=files,
                total_insertions=total_ins,
                total_deletions=total_del,
                total_files_changed=len(files),
                is_merge=is_merge,
            )
        )

    commits.reverse()
    log.info("Extracted %d commits", len(commits))
    return commits
