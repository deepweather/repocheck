"""Deep analytics — temporal patterns, ownership, health trends, comparisons."""

from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import timedelta

from .classifier import ClassifiedCommit, CommitType


def _week_key(dt) -> str:
    iso = dt.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


# ---------------------------------------------------------------------------
# Temporal patterns
# ---------------------------------------------------------------------------


@dataclass
class CadenceStats:
    median_gap_hours: float = 0.0
    p90_gap_hours: float = 0.0
    max_gap_days: float = 0.0
    burst_ratio: float = 0.0  # fraction of commits in top-20% densest days


@dataclass
class ContributorTemporal:
    author_id: str
    name: str
    weekday_hour: list[list[int]] = field(
        default_factory=lambda: [[0] * 24 for _ in range(7)]
    )
    cadence: CadenceStats = field(default_factory=CadenceStats)
    weekly_commits: dict[str, int] = field(default_factory=dict)
    weekly_features: dict[str, int] = field(default_factory=dict)
    velocity_trend: list[dict] = field(default_factory=list)


@dataclass
class TemporalPatterns:
    weekday_hour: list[list[int]] = field(
        default_factory=lambda: [[0] * 24 for _ in range(7)]
    )
    per_contributor: list[ContributorTemporal] = field(default_factory=list)


def compute_temporal_patterns(classified: list[ClassifiedCommit]) -> TemporalPatterns:
    result = TemporalPatterns()
    by_author: dict[str, list[ClassifiedCommit]] = defaultdict(list)

    for cc in classified:
        dt = cc.commit.authored_date
        wd = dt.weekday()
        hr = dt.hour
        result.weekday_hour[wd][hr] += 1
        by_author[cc.commit.author_id].append(cc)

    all_weeks = sorted({_week_key(cc.commit.authored_date) for cc in classified})

    for author_id, commits in by_author.items():
        ct = ContributorTemporal(
            author_id=author_id,
            name=commits[0].commit.author_name,
        )

        weekly_c: dict[str, int] = defaultdict(int)
        weekly_f: dict[str, int] = defaultdict(int)

        for cc in commits:
            dt = cc.commit.authored_date
            ct.weekday_hour[dt.weekday()][dt.hour] += 1
            wk = _week_key(dt)
            weekly_c[wk] += 1
            if cc.is_feature_work:
                weekly_f[wk] += 1

        ct.weekly_commits = dict(weekly_c)
        ct.weekly_features = dict(weekly_f)

        ct.velocity_trend = [
            {"week": w, "commits": weekly_c.get(w, 0), "features": weekly_f.get(w, 0)}
            for w in all_weeks
        ]

        sorted_commits = sorted(commits, key=lambda c: c.commit.authored_date)
        if len(sorted_commits) > 1:
            gaps_hours = []
            for i in range(1, len(sorted_commits)):
                delta = (
                    sorted_commits[i].commit.authored_date
                    - sorted_commits[i - 1].commit.authored_date
                )
                gaps_hours.append(delta.total_seconds() / 3600)

            gaps_hours.sort()
            ct.cadence = CadenceStats(
                median_gap_hours=round(statistics.median(gaps_hours), 1),
                p90_gap_hours=round(gaps_hours[int(len(gaps_hours) * 0.9)], 1),
                max_gap_days=round(max(gaps_hours) / 24, 1),
            )

            day_counts = defaultdict(int)
            for cc in sorted_commits:
                day_counts[cc.commit.authored_date.date()] += 1
            if day_counts:
                counts = sorted(day_counts.values(), reverse=True)
                top_20_days = max(1, len(counts) // 5)
                burst_commits = sum(counts[:top_20_days])
                ct.cadence.burst_ratio = round(burst_commits / len(sorted_commits), 2)

        result.per_contributor.append(ct)

    return result


# ---------------------------------------------------------------------------
# Bug latency (time-to-fix)
# ---------------------------------------------------------------------------


@dataclass
class BugLatency:
    median_hours: float = 0.0
    p90_hours: float = 0.0
    per_contributor: dict[str, float] = field(default_factory=dict)


def compute_bug_latency(classified: list[ClassifiedCommit]) -> BugLatency:
    """For each feature, find the first bugfix touching the same files within 30 days.
    Return median and p90 of those latencies.
    """
    features = [cc for cc in classified if cc.commit_type == CommitType.FEATURE]
    if not features:
        return BugLatency()

    latencies: list[float] = []
    per_author: dict[str, list[float]] = defaultdict(list)

    for feat in features:
        feat_files = {f.path for f in feat.commit.files}
        if not feat_files:
            continue
        feat_date = feat.commit.authored_date
        window_end = feat_date + timedelta(days=30)

        for other in classified:
            if other.commit.authored_date <= feat_date:
                continue
            if other.commit.authored_date > window_end:
                break
            if other.commit_type != CommitType.BUGFIX:
                continue
            fix_files = {f.path for f in other.commit.files}
            if feat_files & fix_files:
                hours = (other.commit.authored_date - feat_date).total_seconds() / 3600
                latencies.append(hours)
                per_author[feat.commit.author_id].append(hours)
                break

    if not latencies:
        return BugLatency()

    author_medians = {
        aid: round(statistics.median(lats), 1)
        for aid, lats in per_author.items()
        if lats
    }

    latencies.sort()
    return BugLatency(
        median_hours=round(statistics.median(latencies), 1),
        p90_hours=round(latencies[int(len(latencies) * 0.9)], 1),
        per_contributor=author_medians,
    )


# ---------------------------------------------------------------------------
# Code ownership and risk
# ---------------------------------------------------------------------------


@dataclass
class FileOwnership:
    path: str
    contributors: int
    top_contributor: str
    total_changes: int
    bug_changes: int


@dataclass
class DirectoryOwnership:
    path: str
    contributors: int
    top_contributors: list[dict] = field(default_factory=list)
    total_lines: int = 0


@dataclass
class OwnershipAnalysis:
    bus_factor_1_pct: float = 0.0
    total_files_analyzed: int = 0
    hotspot_files: list[FileOwnership] = field(default_factory=list)
    directory_ownership: list[DirectoryOwnership] = field(default_factory=list)


def compute_ownership(classified: list[ClassifiedCommit]) -> OwnershipAnalysis:
    file_authors: dict[str, set[str]] = defaultdict(set)
    file_changes: dict[str, int] = defaultdict(int)
    file_bug_changes: dict[str, int] = defaultdict(int)
    file_top_author: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    dir_authors: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    dir_lines: dict[str, int] = defaultdict(int)

    for cc in classified:
        author = cc.commit.author_name
        author_id = cc.commit.author_id
        for f in cc.commit.files:
            file_authors[f.path].add(author_id)
            file_changes[f.path] += 1
            file_top_author[f.path][author] += f.insertions + f.deletions

            if cc.is_fix:
                file_bug_changes[f.path] += 1

            top_dir = f.path.split("/")[0] if "/" in f.path else "."
            dir_authors[top_dir][author] += f.insertions + f.deletions
            dir_lines[top_dir] += f.insertions + f.deletions

    total_files = len(file_authors)
    bus_factor_1 = sum(1 for authors in file_authors.values() if len(authors) == 1)
    bus_factor_1_pct = round((bus_factor_1 / max(total_files, 1)) * 100, 1)

    hotspots = sorted(file_bug_changes.items(), key=lambda x: x[1], reverse=True)[:20]
    hotspot_files = []
    for fpath, bug_count in hotspots:
        authors_for_file = file_top_author.get(fpath, {})
        top = (
            max(authors_for_file, key=authors_for_file.get, default="unknown")
            if authors_for_file
            else "unknown"
        )
        hotspot_files.append(
            FileOwnership(
                path=fpath,
                contributors=len(file_authors.get(fpath, set())),
                top_contributor=top,
                total_changes=file_changes.get(fpath, 0),
                bug_changes=bug_count,
            )
        )

    dir_ownership = []
    for dpath, author_lines in sorted(
        dir_authors.items(), key=lambda x: dir_lines[x[0]], reverse=True
    )[:25]:
        sorted_authors = sorted(author_lines.items(), key=lambda x: x[1], reverse=True)
        top3 = [{"name": name, "lines": lines} for name, lines in sorted_authors[:3]]
        unique_authors = set()
        for cc in classified:
            for f in cc.commit.files:
                if (f.path.split("/")[0] if "/" in f.path else ".") == dpath:
                    unique_authors.add(cc.commit.author_id)
        dir_ownership.append(
            DirectoryOwnership(
                path=dpath,
                contributors=len(unique_authors),
                top_contributors=top3,
                total_lines=dir_lines[dpath],
            )
        )

    return OwnershipAnalysis(
        bus_factor_1_pct=bus_factor_1_pct,
        total_files_analyzed=total_files,
        hotspot_files=hotspot_files,
        directory_ownership=dir_ownership,
    )


# ---------------------------------------------------------------------------
# Health trends
# ---------------------------------------------------------------------------


@dataclass
class WeeklyHealth:
    week: str
    bug_ratio: float
    velocity: int
    features: int
    bugfixes: int
    complexity_avg: float
    contributors_active: int


@dataclass
class AttritionFlag:
    author_id: str
    name: str
    recent_velocity: float
    historical_velocity: float
    drop_pct: float


@dataclass
class HealthTrends:
    weekly: list[WeeklyHealth] = field(default_factory=list)
    attrition_flags: list[AttritionFlag] = field(default_factory=list)
    commit_size_distribution: dict[str, int] = field(default_factory=dict)


def compute_health_trends(classified: list[ClassifiedCommit]) -> HealthTrends:
    weekly: dict[str, dict] = defaultdict(
        lambda: {
            "commits": 0,
            "features": 0,
            "bugfixes": 0,
            "complexities": [],
            "authors": set(),
        }
    )

    size_dist: dict[str, int] = defaultdict(int)

    for cc in classified:
        wk = _week_key(cc.commit.authored_date)
        weekly[wk]["commits"] += 1
        weekly[wk]["complexities"].append(cc.complexity_score)
        weekly[wk]["authors"].add(cc.commit.author_id)
        if cc.is_feature_work:
            weekly[wk]["features"] += 1
        if cc.is_fix:
            weekly[wk]["bugfixes"] += 1
        size_dist[cc.size.value if hasattr(cc.size, "value") else str(cc.size)] += 1

    weeks_sorted = sorted(weekly.keys())
    health_weekly = []
    for w in weeks_sorted:
        d = weekly[w]
        total = d["commits"] or 1
        health_weekly.append(
            WeeklyHealth(
                week=w,
                bug_ratio=round(d["bugfixes"] / total, 3),
                velocity=d["commits"],
                features=d["features"],
                bugfixes=d["bugfixes"],
                complexity_avg=round(statistics.mean(d["complexities"]), 2)
                if d["complexities"]
                else 0,
                contributors_active=len(d["authors"]),
            )
        )

    # Attrition detection: last 4 weeks vs overall
    by_author: dict[str, list[ClassifiedCommit]] = defaultdict(list)
    for cc in classified:
        by_author[cc.commit.author_id].append(cc)

    attrition_flags = []
    if len(weeks_sorted) >= 6:
        recent_weeks = set(weeks_sorted[-4:])
        for author_id, commits in by_author.items():
            if len(commits) < 5:
                continue
            total_weeks_active = len(
                {_week_key(cc.commit.authored_date) for cc in commits}
            )
            if total_weeks_active < 3:
                continue
            name = commits[0].commit.author_name
            first = commits[0].commit.authored_date
            last = commits[-1].commit.authored_date
            span_weeks = max(1, (last - first).days / 7)
            historical_vel = len(commits) / span_weeks

            recent_count = sum(
                1
                for cc in commits
                if _week_key(cc.commit.authored_date) in recent_weeks
            )
            recent_vel = recent_count / 4

            if historical_vel > 0 and recent_vel < historical_vel * 0.5:
                drop = round((1 - recent_vel / historical_vel) * 100, 0)
                attrition_flags.append(
                    AttritionFlag(
                        author_id=author_id,
                        name=name,
                        recent_velocity=round(recent_vel, 1),
                        historical_velocity=round(historical_vel, 1),
                        drop_pct=drop,
                    )
                )

    attrition_flags.sort(key=lambda a: a.drop_pct, reverse=True)

    return HealthTrends(
        weekly=health_weekly,
        attrition_flags=attrition_flags,
        commit_size_distribution=dict(size_dist),
    )


# ---------------------------------------------------------------------------
# Comparison (radar data for selected contributors)
# ---------------------------------------------------------------------------


def compute_comparison(
    classified: list[ClassifiedCommit], author_ids: list[str]
) -> list[dict]:
    """Normalized 0-1 radar data for comparing contributors."""
    from .metrics import compute_metrics

    metrics = compute_metrics(classified)
    selected = [c for c in metrics.contributors if c.author_id in set(author_ids)]
    if not selected:
        return []

    dims = [
        "features_shipped",
        "reliability_score",
        "velocity_per_week",
        "efficiency_score",
        "avg_complexity",
    ]
    all_vals = {d: [getattr(c, d) for c in metrics.contributors] for d in dims}
    maxes = {d: max(vs) if vs and max(vs) > 0 else 1 for d, vs in all_vals.items()}

    result = []
    for c in selected:
        result.append(
            {
                "author_id": c.author_id,
                "name": c.name,
                "values": {d: round(getattr(c, d) / maxes[d], 3) for d in dims},
                "raw": {d: round(getattr(c, d), 2) for d in dims},
            }
        )
    return result


# ---------------------------------------------------------------------------
# Master entry point
# ---------------------------------------------------------------------------


def compute_all_analytics(classified: list[ClassifiedCommit]) -> dict:
    """Run all analytics and return a JSON-serializable dict."""
    temporal = compute_temporal_patterns(classified)
    bug_latency = compute_bug_latency(classified)
    ownership = compute_ownership(classified)
    health = compute_health_trends(classified)

    from dataclasses import asdict

    return {
        "temporal": asdict(temporal),
        "bug_latency": asdict(bug_latency),
        "ownership": asdict(ownership),
        "health": asdict(health),
    }
