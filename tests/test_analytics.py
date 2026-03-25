"""Tests for the deep analytics module."""

from __future__ import annotations

from datetime import datetime, timezone

from repocheck.analytics import (
    compute_temporal_patterns,
    compute_bug_latency,
    compute_ownership,
    compute_health_trends,
    compute_all_analytics,
)
from repocheck.classifier import ClassifiedCommit, CommitType
from repocheck.extractor import CommitData, FileChange


def _cc(
    author: str = "dev",
    email: str = "dev@test.com",
    ctype: CommitType = CommitType.FEATURE,
    insertions: int = 50,
    deletions: int = 10,
    date: datetime | None = None,
    files: list[str] | None = None,
) -> ClassifiedCommit:
    d = date or datetime(2025, 3, 1, 12, 0, tzinfo=timezone.utc)
    file_changes = [
        FileChange(f, insertions // max(len(files or ["app.py"]), 1), 0)
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


class TestTemporalPatterns:
    def test_weekday_hour_matrix(self):
        # Saturday at 14:00 UTC
        d = datetime(2025, 3, 1, 14, 0, tzinfo=timezone.utc)
        classified = [_cc(date=d)]
        result = compute_temporal_patterns(classified)
        assert result.weekday_hour[d.weekday()][14] == 1

    def test_per_contributor_populated(self):
        classified = [
            _cc(author="alice", email="a@t.com"),
            _cc(author="bob", email="b@t.com"),
        ]
        result = compute_temporal_patterns(classified)
        assert len(result.per_contributor) == 2

    def test_cadence_stats(self):
        d1 = datetime(2025, 3, 1, 10, 0, tzinfo=timezone.utc)
        d2 = datetime(2025, 3, 1, 14, 0, tzinfo=timezone.utc)
        d3 = datetime(2025, 3, 2, 10, 0, tzinfo=timezone.utc)
        classified = [_cc(date=d1), _cc(date=d2), _cc(date=d3)]
        result = compute_temporal_patterns(classified)
        ct = result.per_contributor[0]
        assert ct.cadence.median_gap_hours > 0

    def test_velocity_trend(self):
        d1 = datetime(2025, 3, 1, 10, 0, tzinfo=timezone.utc)
        d2 = datetime(2025, 3, 8, 10, 0, tzinfo=timezone.utc)
        classified = [_cc(date=d1), _cc(date=d2)]
        result = compute_temporal_patterns(classified)
        assert len(result.per_contributor[0].velocity_trend) >= 2


class TestBugLatency:
    def test_no_bugs(self):
        classified = [_cc(ctype=CommitType.FEATURE)]
        result = compute_bug_latency(classified)
        assert result.median_hours == 0

    def test_bug_after_feature(self):
        d1 = datetime(2025, 3, 1, 10, 0, tzinfo=timezone.utc)
        d2 = datetime(2025, 3, 2, 10, 0, tzinfo=timezone.utc)
        classified = [
            _cc(ctype=CommitType.FEATURE, date=d1, files=["auth.py"]),
            _cc(ctype=CommitType.BUGFIX, date=d2, files=["auth.py"]),
        ]
        result = compute_bug_latency(classified)
        assert result.median_hours == 24.0

    def test_no_overlap_no_latency(self):
        d1 = datetime(2025, 3, 1, 10, 0, tzinfo=timezone.utc)
        d2 = datetime(2025, 3, 2, 10, 0, tzinfo=timezone.utc)
        classified = [
            _cc(ctype=CommitType.FEATURE, date=d1, files=["auth.py"]),
            _cc(ctype=CommitType.BUGFIX, date=d2, files=["other.py"]),
        ]
        result = compute_bug_latency(classified)
        assert result.median_hours == 0


class TestOwnership:
    def test_bus_factor(self):
        classified = [
            _cc(author="alice", email="a@t.com", files=["core/auth.py"]),
            _cc(author="bob", email="b@t.com", files=["core/db.py"]),
        ]
        result = compute_ownership(classified)
        assert result.bus_factor_1_pct == 100.0
        assert result.total_files_analyzed == 2

    def test_shared_file(self):
        classified = [
            _cc(author="alice", email="a@t.com", files=["shared.py"]),
            _cc(author="bob", email="b@t.com", files=["shared.py"]),
        ]
        result = compute_ownership(classified)
        assert result.bus_factor_1_pct == 0.0

    def test_hotspot_files(self):
        d1 = datetime(2025, 3, 1, 10, 0, tzinfo=timezone.utc)
        d2 = datetime(2025, 3, 2, 10, 0, tzinfo=timezone.utc)
        classified = [
            _cc(ctype=CommitType.BUGFIX, date=d1, files=["fragile.py"]),
            _cc(ctype=CommitType.BUGFIX, date=d2, files=["fragile.py"]),
            _cc(ctype=CommitType.FEATURE, date=d1, files=["stable.py"]),
        ]
        result = compute_ownership(classified)
        assert len(result.hotspot_files) > 0
        assert result.hotspot_files[0].path == "fragile.py"


class TestHealthTrends:
    def test_weekly_health(self):
        d1 = datetime(2025, 3, 1, 10, 0, tzinfo=timezone.utc)
        d2 = datetime(2025, 3, 8, 10, 0, tzinfo=timezone.utc)
        classified = [
            _cc(ctype=CommitType.FEATURE, date=d1),
            _cc(ctype=CommitType.BUGFIX, date=d2),
        ]
        result = compute_health_trends(classified)
        assert len(result.weekly) == 2

    def test_commit_size_distribution(self):
        classified = [_cc(), _cc(), _cc()]
        result = compute_health_trends(classified)
        assert sum(result.commit_size_distribution.values()) == 3

    def test_empty_input(self):
        result = compute_health_trends([])
        assert result.weekly == []


class TestComputeAll:
    def test_returns_all_sections(self):
        classified = [_cc()]
        result = compute_all_analytics(classified)
        assert "temporal" in result
        assert "bug_latency" in result
        assert "ownership" in result
        assert "health" in result
