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

export type SortKey =
  | "impact_score"
  | "features_shipped"
  | "reliability_score"
  | "velocity_per_week"
  | "efficiency_score"
  | "bugs_fixed"
  | "total_commits";
