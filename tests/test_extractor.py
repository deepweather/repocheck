"""Tests for the git extractor — uses the repocheck repo itself as test data."""

from pathlib import Path

import pytest

from repocheck.extractor import extract_commits


REPO_ROOT = Path(__file__).parent.parent


def _has_commits():
    try:
        from git import Repo

        r = Repo(str(REPO_ROOT))
        r.active_branch
        list(r.iter_commits(max_count=1))
        return True
    except Exception:
        return False


@pytest.mark.skipif(
    not (REPO_ROOT / ".git").exists() or not _has_commits(),
    reason="No git history available",
)
class TestExtractor:
    def test_extracts_commits(self):
        commits = extract_commits(REPO_ROOT, max_commits=10)
        assert len(commits) > 0
        assert len(commits) <= 10

    def test_commit_has_required_fields(self):
        commits = extract_commits(REPO_ROOT, max_commits=1)
        c = commits[0]
        assert c.sha and len(c.sha) == 40
        assert c.short_sha and len(c.short_sha) == 8
        assert c.author_name
        assert c.author_email
        assert c.summary
        assert c.authored_date is not None

    def test_chronological_order(self):
        commits = extract_commits(REPO_ROOT, max_commits=20)
        if len(commits) > 1:
            dates = [c.authored_date for c in commits]
            assert dates == sorted(dates)
