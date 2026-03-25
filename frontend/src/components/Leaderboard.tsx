import { useMemo, useState } from "react";
import type { CommitInfo, ContributorMetrics, SortKey } from "../types";
import ContributorCard from "./ContributorCard";

interface Props {
  contributors: ContributorMetrics[];
  commits: CommitInfo[];
  onSelectCommit: (sha: string) => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "impact_score", label: "Impact" },
  { key: "features_shipped", label: "Features" },
  { key: "reliability_score", label: "Reliability" },
  { key: "velocity_per_week", label: "Velocity" },
  { key: "efficiency_score", label: "Efficiency" },
  { key: "bugs_fixed", label: "Bugs Fixed" },
  { key: "total_commits", label: "Total Commits" },
];

export default function Leaderboard({ contributors, commits, onSelectCommit }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("impact_score");

  const sorted = useMemo(
    () => [...contributors].sort((a, b) => b[sortBy] - a[sortBy]),
    [contributors, sortBy]
  );

  return (
    <section>
      <div className="leaderboard-header">
        <h2 className="section-title">Contributors</h2>
        <div className="sort-controls">
          <span className="sort-label">Sort by</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`sort-btn ${sortBy === opt.key ? "sort-btn--active" : ""}`}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="leaderboard">
        {sorted.map((c, i) => (
          <ContributorCard
            key={c.author_id}
            contributor={c}
            rank={i + 1}
            commits={commits}
            onSelectCommit={onSelectCommit}
          />
        ))}
      </div>
    </section>
  );
}
