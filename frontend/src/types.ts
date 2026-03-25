export interface ContributorMetrics {
  name: string;
  email: string;
  author_id: string;
  total_commits: number;
  features_shipped: number;
  bugs_fixed: number;
  refactors: number;
  maintenance_commits: number;
  total_insertions: number;
  total_deletions: number;
  total_files_touched: number;
  first_commit: string | null;
  last_commit: string | null;
  active_days: number;
  feature_ratio: number;
  bugfix_ratio: number;
  reliability_score: number;
  efficiency_score: number;
  avg_commit_size: number;
  velocity_per_week: number;
  features_per_week: number;
  code_churn_rate: number;
  avg_complexity: number;
  ai_assisted_ratio: number;
  trivial_commit_ratio: number;
  impact_score: number;
  commit_types: Record<string, number>;
  weekly_commits: Record<string, number>;
  weekly_features: Record<string, number>;
}

export interface WeeklyData {
  commits: number;
  features: number;
  bugfixes: number;
  insertions: number;
  deletions: number;
}

export interface RepoMetrics {
  repo_path: string;
  total_commits: number;
  total_contributors: number;
  analysis_period_start: string | null;
  analysis_period_end: string | null;
  total_features: number;
  total_bugfixes: number;
  overall_bug_ratio: number;
  avg_team_velocity: number;
  ai_assisted_percentage: number;
  contributors: ContributorMetrics[];
  weekly_timeline: Record<string, WeeklyData>;
  commit_type_distribution: Record<string, number>;
  commits: CommitInfo[];
  analytics: Analytics;
}

export interface CommitInfo {
  sha: string;
  short_sha: string;
  author_name: string;
  author_email: string;
  author_id: string;
  date: string;
  message: string;
  full_message: string;
  type: string;
  size: string;
  complexity: number;
  impact: string;
  ai_assisted: boolean;
  insertions: number;
  deletions: number;
  files_changed: number;
  files: string[];
}

export interface DiffResult {
  sha: string;
  message: string;
  author: string;
  date: string;
  stat: string;
  diff: string;
}

// --- Analytics types ---

export interface CadenceStats {
  median_gap_hours: number;
  p90_gap_hours: number;
  max_gap_days: number;
  burst_ratio: number;
}

export interface ContributorTemporal {
  author_id: string;
  name: string;
  weekday_hour: number[][];
  cadence: CadenceStats;
  weekly_commits: Record<string, number>;
  weekly_features: Record<string, number>;
  velocity_trend: { week: string; commits: number; features: number }[];
}

export interface TemporalPatterns {
  weekday_hour: number[][];
  per_contributor: ContributorTemporal[];
}

export interface BugLatency {
  median_hours: number;
  p90_hours: number;
  per_contributor: Record<string, number>;
}

export interface FileOwnershipInfo {
  path: string;
  contributors: number;
  top_contributor: string;
  total_changes: number;
  bug_changes: number;
}

export interface DirectoryOwnershipInfo {
  path: string;
  contributors: number;
  top_contributors: { name: string; lines: number }[];
  total_lines: number;
}

export interface OwnershipAnalysis {
  bus_factor_1_pct: number;
  total_files_analyzed: number;
  hotspot_files: FileOwnershipInfo[];
  directory_ownership: DirectoryOwnershipInfo[];
}

export interface WeeklyHealth {
  week: string;
  bug_ratio: number;
  velocity: number;
  features: number;
  bugfixes: number;
  complexity_avg: number;
  contributors_active: number;
}

export interface AttritionFlag {
  author_id: string;
  name: string;
  recent_velocity: number;
  historical_velocity: number;
  drop_pct: number;
}

export interface HealthTrends {
  weekly: WeeklyHealth[];
  attrition_flags: AttritionFlag[];
  commit_size_distribution: Record<string, number>;
}

export interface Analytics {
  temporal: TemporalPatterns;
  bug_latency: BugLatency;
  ownership: OwnershipAnalysis;
  health: HealthTrends;
}

export type SortKey =
  | "impact_score"
  | "features_shipped"
  | "reliability_score"
  | "velocity_per_week"
  | "efficiency_score"
  | "bugs_fixed"
  | "total_commits";
