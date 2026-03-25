import type { RepoMetrics } from "../types";

interface Props {
  data: RepoMetrics;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function StatsGrid({ data }: Props) {
  const period =
    data.analysis_period_start && data.analysis_period_end
      ? `${formatDate(data.analysis_period_start)} — ${formatDate(data.analysis_period_end)}`
      : "";

  const pct = (v: number) => (v * 100).toFixed(1) + "%";
  const topReliability = data.contributors.length
    ? Math.max(...data.contributors.map((c) => c.reliability_score))
    : 0;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Commits</div>
        <div className="stat-value">{data.total_commits.toLocaleString("en-US")}</div>
        <div className="stat-sub">{period}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Contributors</div>
        <div className="stat-value">{data.total_contributors}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Features</div>
        <div className="stat-value accent">{data.total_features}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Bugfixes</div>
        <div className="stat-value bad">{data.total_bugfixes}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Velocity</div>
        <div className="stat-value">{data.avg_team_velocity.toFixed(1)}<span className="stat-unit"> /wk/person</span></div>
      </div>
      <div className="stat-card">
        <div className="stat-label">AI-assisted</div>
        <div className="stat-value">{data.ai_assisted_percentage.toFixed(0)}%</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Reliability</div>
        <div className={`stat-value ${topReliability >= 0.9 ? "good" : topReliability >= 0.7 ? "warn" : "bad"}`}>
          {pct(topReliability)}
        </div>
      </div>
    </div>
  );
}
