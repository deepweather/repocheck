import { useState } from "react";
import type { CommitInfo, ContributorMetrics } from "../types";
import CommitList from "./CommitList";

const TYPE_COLORS: Record<string, string> = {
  feature: "#8b7cf6",
  bugfix: "#f47067",
  refactor: "#56d4c8",
  docs: "#5e5e6e",
  test: "#e5b844",
  chore: "#4a4a56",
  style: "#6e6e80",
  perf: "#34d399",
  revert: "#d44040",
  unknown: "#3a3a44",
};

function pct(v: number) {
  return (v * 100).toFixed(1) + "%";
}

function scoreColor(v: number, good: number, warn: number) {
  if (v >= good) return "good";
  if (v >= warn) return "warn";
  return "bad";
}

interface Props {
  contributor: ContributorMetrics;
  rank: number;
  commits: CommitInfo[];
  onSelectCommit: (sha: string) => void;
}

const DETAIL_ITEMS: { label: string; key: string; format: (c: ContributorMetrics) => string; color?: (c: ContributorMetrics) => string }[] = [
  { label: "Total Commits", key: "tc", format: (c) => String(c.total_commits) },
  { label: "Bugs Fixed", key: "bf", format: (c) => String(c.bugs_fixed), color: () => "bad" },
  { label: "Refactors", key: "rf", format: (c) => String(c.refactors) },
  { label: "Bug Fix Ratio", key: "br", format: (c) => pct(c.bugfix_ratio), color: (c) => scoreColor(1 - c.bugfix_ratio, 0.85, 0.7) },
  { label: "Lines Added", key: "la", format: (c) => `+${c.total_insertions.toLocaleString()}` },
  { label: "Lines Deleted", key: "ld", format: (c) => `-${c.total_deletions.toLocaleString()}` },
  { label: "Avg Commit Size", key: "as", format: (c) => `${c.avg_commit_size.toFixed(0)} lines` },
  { label: "Code Churn", key: "cc", format: (c) => c.code_churn_rate.toFixed(2) },
  { label: "Avg Complexity", key: "cx", format: (c) => c.avg_complexity.toFixed(2) },
  { label: "AI-Assisted", key: "ai", format: (c) => pct(c.ai_assisted_ratio) },
  { label: "Active Days", key: "ad", format: (c) => String(c.active_days) },
  { label: "Features / Week", key: "fw", format: (c) => c.features_per_week.toFixed(2) },
];

export default function ContributorCard({ contributor: c, rank, commits, onSelectCommit }: Props) {
  const [open, setOpen] = useState(false);

  const typeEntries = Object.entries(c.commit_types || {}).sort((a, b) => b[1] - a[1]);
  const total = typeEntries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className={`dev-card ${open ? "dev-card--open" : ""}`}>
      <div className="dev-card__main" onClick={() => setOpen(!open)}>
        <div className={`dev-rank ${rank <= 3 ? `rank-${rank}` : ""}`}>#{rank}</div>
        <div className="dev-info">
          <h4>
            {c.name}
            {c.ai_assisted_ratio > 0.3 && <span className="badge badge-ai">AI-heavy</span>}
          </h4>
          <div className="dev-email">{c.email}</div>
          <div className="type-bar">
            {typeEntries.map(([type, count]) => (
              <div
                key={type}
                className="type-bar__segment"
                style={{
                  width: `${((count / total) * 100).toFixed(1)}%`,
                  backgroundColor: TYPE_COLORS[type] || TYPE_COLORS.unknown,
                }}
                title={`${type}: ${count}`}
              />
            ))}
          </div>
        </div>
        <div className="dev-metrics">
          <div className="dev-metric">
            <div className="dev-metric__val accent">{c.features_shipped}</div>
            <div className="dev-metric__label">Features</div>
          </div>
          <div className="dev-metric">
            <div className={`dev-metric__val ${scoreColor(c.reliability_score, 0.9, 0.7)}`}>
              {pct(c.reliability_score)}
            </div>
            <div className="dev-metric__label">Reliability</div>
          </div>
          <div className="dev-metric">
            <div className="dev-metric__val">{c.velocity_per_week.toFixed(1)}</div>
            <div className="dev-metric__label">Commits/wk</div>
          </div>
          <div className="dev-metric">
            <div className="dev-metric__val">{c.efficiency_score.toFixed(2)}</div>
            <div className="dev-metric__label">Efficiency</div>
          </div>
          <div className="dev-metric">
            <div className="dev-metric__val">{c.impact_score.toFixed(1)}</div>
            <div className="dev-metric__label">Impact</div>
          </div>
        </div>
      </div>

      {open && (
        <div className="dev-detail">
          <div className="detail-grid">
            {DETAIL_ITEMS.map((item) => (
              <div className="detail-stat" key={item.key}>
                <div className="detail-stat__label">{item.label}</div>
                <div className={`detail-stat__value ${item.color?.(c) ?? ""}`}>
                  {item.format(c)}
                </div>
              </div>
            ))}
          </div>
          <CommitList
            commits={commits}
            authorFilter={c.author_id}
            onSelectCommit={onSelectCommit}
            title={`${c.name}'s Commits`}
          />
        </div>
      )}
    </div>
  );
}
