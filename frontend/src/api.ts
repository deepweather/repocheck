import type { RepoMetrics } from "./types";

const BASE = "";

export async function analyzeRepo(
  repo: string,
  branch?: string,
  maxCommits = 1000
): Promise<RepoMetrics> {
  const params = new URLSearchParams({ repo, max_commits: String(maxCommits) });
  if (branch) params.set("branch", branch);

  const res = await fetch(`${BASE}/api/analyze?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Analysis failed");
  }
  return res.json();
}

export interface BrowseEntry {
  name: string;
  path: string;
  is_repo: boolean;
}

export interface BrowseResult {
  current?: string;
  parent?: string;
  is_repo?: boolean;
  entries: BrowseEntry[];
}

export async function browsePath(path: string): Promise<BrowseResult> {
  const res = await fetch(`${BASE}/api/browse?path=${encodeURIComponent(path)}`);
  return res.json();
}

export async function fetchBranches(repo: string): Promise<{ active: string; branches: string[] }> {
  const res = await fetch(`${BASE}/api/branches?repo=${encodeURIComponent(repo)}`);
  return res.json();
}

export async function fetchDiff(repo: string, sha: string): Promise<import("./types").DiffResult> {
  const params = new URLSearchParams({ repo, sha });
  const res = await fetch(`${BASE}/api/diff?${params}`);
  if (!res.ok) throw new Error("Failed to load diff");
  return res.json();
}
