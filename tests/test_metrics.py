"""Tests for the metrics computation engine."""

from __future__ import annotations

from datetime import datetime, timezone

from repocheck.classifier import ClassifiedCommit, CommitType
from repocheck.extractor import CommitData, FileChange
from repocheck.metrics import compute_metrics


def _cc(
    author: str = "dev",
    email: str = "dev@test.com",
    ctype: CommitType = CommitType.FEATURE,
    insertions: int = 50,
    deletions: int = 10,
    date: datetime | None = None,
    files: list[str] | None = None,
) -> ClassifiedCommit:
    d = date or datetime(2025, 3, 1, tzinfo=timezone.utc)
    file_changes = [
        FileChange(f, insertions // max(len(files or ["x"]), 1), 0)
        for f in (files or ["app.py"])
    ]
    commit = CommitData(
        sha="a" * 40,
        short_sha="a" * 8,
        author_name=author,
        author_email=email,
        authored_date=d,
        committer_name=author,
        committed_date=d,
        message=f"{ctype.value}: something",
        summary=f"{ctype.value}: something",
        files=file_changes,
        total_insertions=insertions,
        total_deletions=deletions,
        total_files_changed=len(file_changes),
        is_merge=False,
    )
    return ClassifiedCommit(
        commit=commit,
        commit_type=ctype,
        size="small",
        complexity_score=0.3,
        impact_summary="did something",
        is_ai_assisted=False,
        confidence=0.8,
    )


class TestComputeMetrics:
    def test_basic_counts(self):
        classified = [
            _cc(ctype=CommitType.FEATURE),
            _cc(ctype=CommitType.BUGFIX),
            _cc(ctype=CommitType.CHORE),
        ]
        m = compute_metrics(classified)
        assert m.total_commits == 3
        assert m.total_features == 1
        assert m.total_bugfixes == 1
        assert m.total_contributors == 1

    def test_multiple_contributors(self):
        classified = [
            _cc(author="alice", email="alice@t.com", ctype=CommitType.FEATURE),
            _cc(author="bob", email="bob@t.com", ctype=CommitType.FEATURE),
            _cc(author="bob", email="bob@t.com", ctype=CommitType.BUGFIX),
        ]
        m = compute_metrics(classified)
        assert m.total_contributors == 2
        assert m.total_features == 2

        alice = next(c for c in m.contributors if c.name == "alice")
        bob = next(c for c in m.contributors if c.name == "bob")
        assert alice.features_shipped == 1
        assert bob.features_shipped == 1
        assert bob.bugs_fixed == 1

    def test_feature_ratio(self):
        classified = [
            _cc(ctype=CommitType.FEATURE),
            _cc(ctype=CommitType.FEATURE),
            _cc(ctype=CommitType.CHORE),
            _cc(ctype=CommitType.CHORE),
        ]
        m = compute_metrics(classified)
        c = m.contributors[0]
        assert abs(c.feature_ratio - 0.5) < 0.01

    def test_empty_input(self):
        m = compute_metrics([])
        assert m.total_commits == 0
        assert m.total_contributors == 0
        assert m.contributors == []

    def test_commit_type_distribution(self):
        classified = [
            _cc(ctype=CommitType.FEATURE),
            _cc(ctype=CommitType.FEATURE),
            _cc(ctype=CommitType.BUGFIX),
        ]
        m = compute_metrics(classified)
        assert m.commit_type_distribution["feature"] == 2
        assert m.commit_type_distribution["bugfix"] == 1
