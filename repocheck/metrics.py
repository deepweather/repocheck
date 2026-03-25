"""Compute developer and repository metrics from classified commits.

This is where the Jeff Dean mindset lives: measuring what actually matters.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from .classifier import ClassifiedCommit, CommitSize, CommitType


@dataclass
class ContributorMetrics:
    name: str
    email: str
    author_id: str

    total_commits: int = 0
    features_shipped: int = 0
    bugs_fixed: int = 0
    refactors: int = 0
    maintenance_commits: int = 0

    total_insertions: int = 0
    total_deletions: int = 0
    total_files_touched: int = 0

    first_commit: datetime | None = None
    last_commit: datetime | None = None
    active_days: int = 0

    # The good stuff
    feature_ratio: float = 0.0  # features / total commits
    bugfix_ratio: float = 0.0  # bugfixes / total commits
    reliability_score: float = 0.0  # 1 - (bugfixes following own features / features)
    efficiency_score: float = 0.0  # features / (insertions + deletions) * 1000
    avg_commit_size: float = 0.0  # avg lines per commit
    velocity_per_week: float = 0.0  # commits per active week
    features_per_week: float = 0.0  # features per active week
    code_churn_rate: float = 0.0  # deletions / insertions (high = lots of rewriting)
    avg_complexity: float = 0.0  # average complexity score
    ai_assisted_ratio: float = 0.0  # fraction of commits likely AI-generated
    trivial_commit_ratio: float = 0.0  # fraction of trivial/small commits
    impact_score: float = 0.0  # composite score (the headline number)

    commit_types: dict[str, int] = field(default_factory=dict)
    weekly_commits: dict[str, int] = field(default_factory=dict)  # "2024-W03" -> count
    weekly_features: dict[str, int] = field(default_factory=dict)


@dataclass
class RepoMetrics:
    repo_path: str
    total_commits: int = 0
    total_contributors: int = 0
    analysis_period_start: datetime | None = None
    analysis_period_end: datetime | None = None
    total_features: int = 0
    total_bugfixes: int = 0
    overall_bug_ratio: float = 0.0
    avg_team_velocity: float = 0.0
    ai_assisted_percentage: float = 0.0
    contributors: list[ContributorMetrics] = field(default_factory=list)
    weekly_timeline: dict[str, dict] = field(default_factory=dict)
    commit_type_distribution: dict[str, int] = field(default_factory=dict)


def _week_key(dt: datetime) -> str:
    iso = dt.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _compute_reliability(
    author_commits: list[ClassifiedCommit],
    all_commits: list[ClassifiedCommit],
    author_id: str,
) -> float:
    """Reliability = how rarely your features need subsequent bugfixes.

    Look at each feature commit by this author, then check if a bugfix
    touching the same files appears within 14 days (by anyone).
    """
    features = [c for c in author_commits if c.commit_type == CommitType.FEATURE]
    if not features:
        return 1.0

    broken_features = 0
    for feat in features:
        feat_files = {f.path for f in feat.commit.files}
        feat_date = feat.commit.authored_date
        window_end = feat_date + timedelta(days=14)

        for other in all_commits:
            if other.commit.authored_date <= feat_date:
                continue
            if other.commit.authored_date > window_end:
                break
            if other.commit_type != CommitType.BUGFIX:
                continue
            fix_files = {f.path for f in other.commit.files}
            if feat_files & fix_files:
                broken_features += 1
                break

    return 1.0 - (broken_features / len(features))


def compute_metrics(
    classified: list[ClassifiedCommit],
    repo_path: str = "",
) -> RepoMetrics:
    """Aggregate classified commits into per-contributor and repo-wide metrics."""

    by_author: dict[str, list[ClassifiedCommit]] = defaultdict(list)
    for cc in classified:
        by_author[cc.commit.author_id].append(cc)

    contributors: list[ContributorMetrics] = []
    all_type_dist: dict[str, int] = defaultdict(int)
    weekly_global: dict[str, dict] = defaultdict(
        lambda: {
            "commits": 0,
            "features": 0,
            "bugfixes": 0,
            "insertions": 0,
            "deletions": 0,
        }
    )

    for author_id, commits in by_author.items():
        c0 = commits[0].commit
        m = ContributorMetrics(
            name=c0.author_name,
            email=c0.author_email,
            author_id=author_id,
        )

        active_dates = set()
        complexities = []
        ai_count = 0
        trivial_count = 0
        type_counts: dict[str, int] = defaultdict(int)
        weekly_c: dict[str, int] = defaultdict(int)
        weekly_f: dict[str, int] = defaultdict(int)

        for cc in commits:
            c = cc.commit
            m.total_commits += 1
            m.total_insertions += c.total_insertions
            m.total_deletions += c.total_deletions
            m.total_files_touched += c.total_files_changed

            active_dates.add(c.authored_date.date())
            complexities.append(cc.complexity_score)

            wk = _week_key(c.authored_date)
            weekly_c[wk] += 1
            weekly_global[wk]["commits"] += 1
            weekly_global[wk]["insertions"] += c.total_insertions
            weekly_global[wk]["deletions"] += c.total_deletions

            type_counts[cc.commit_type.value] += 1
            all_type_dist[cc.commit_type.value] += 1

            if cc.is_feature_work:
                m.features_shipped += 1
                weekly_f[wk] += 1
                weekly_global[wk]["features"] += 1
            elif cc.is_fix:
                m.bugs_fixed += 1
                weekly_global[wk]["bugfixes"] += 1
            elif cc.commit_type == CommitType.REFACTOR:
                m.refactors += 1
            if cc.is_maintenance:
                m.maintenance_commits += 1

            if cc.is_ai_assisted:
                ai_count += 1
            if cc.size in (CommitSize.TRIVIAL, CommitSize.SMALL):
                trivial_count += 1

            if m.first_commit is None or c.authored_date < m.first_commit:
                m.first_commit = c.authored_date
            if m.last_commit is None or c.authored_date > m.last_commit:
                m.last_commit = c.authored_date

        m.active_days = len(active_dates)
        m.commit_types = dict(type_counts)
        m.weekly_commits = dict(weekly_c)
        m.weekly_features = dict(weekly_f)

        n = m.total_commits or 1
        total_lines = m.total_insertions + m.total_deletions or 1

        m.feature_ratio = m.features_shipped / n
        m.bugfix_ratio = m.bugs_fixed / n
        m.avg_commit_size = total_lines / n
        m.avg_complexity = statistics.mean(complexities) if complexities else 0
        m.ai_assisted_ratio = ai_count / n
        m.trivial_commit_ratio = trivial_count / n
        m.code_churn_rate = m.total_deletions / max(m.total_insertions, 1)

        m.efficiency_score = (m.features_shipped / total_lines) * 1000

        if m.first_commit and m.last_commit:
            span_weeks = max(1, (m.last_commit - m.first_commit).days / 7)
            m.velocity_per_week = m.total_commits / span_weeks
            m.features_per_week = m.features_shipped / span_weeks
        else:
            m.velocity_per_week = float(m.total_commits)
            m.features_per_week = float(m.features_shipped)

        m.reliability_score = _compute_reliability(commits, classified, author_id)

        # Impact score: weighted composite
        m.impact_score = (
            (
                m.features_shipped * 3.0
                + m.bugs_fixed * 1.0
                + m.refactors * 0.5
                - m.bugs_fixed * (1 - m.reliability_score) * 2.0
            )
            * (1 + m.avg_complexity)
            / max(1, n**0.3)
        )

        contributors.append(m)

    contributors.sort(key=lambda c: c.impact_score, reverse=True)

    total = len(classified)
    total_features = sum(c.features_shipped for c in contributors)
    total_bugfixes = sum(c.bugs_fixed for c in contributors)
    total_ai = sum(1 for cc in classified if cc.is_ai_assisted)

    dates = [cc.commit.authored_date for cc in classified]

    return RepoMetrics(
        repo_path=repo_path,
        total_commits=total,
        total_contributors=len(contributors),
        analysis_period_start=min(dates) if dates else None,
        analysis_period_end=max(dates) if dates else None,
        total_features=total_features,
        total_bugfixes=total_bugfixes,
        overall_bug_ratio=total_bugfixes / max(total, 1),
        avg_team_velocity=statistics.mean([c.velocity_per_week for c in contributors])
        if contributors
        else 0,
        ai_assisted_percentage=(total_ai / max(total, 1)) * 100,
        contributors=contributors,
        weekly_timeline=dict(weekly_global),
        commit_type_distribution=dict(all_type_dist),
    )
