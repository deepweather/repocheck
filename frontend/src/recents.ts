const KEY = "repocheck:recent";
const MAX = 8;

export interface RecentRepo {
  path: string;
  name: string;
  branch: string;
  maxCommits: number;
  analyzedAt: number;
}

export function getRecents(): RecentRepo[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addRecent(repo: RecentRepo) {
  const list = getRecents().filter((r) => r.path !== repo.path);
  list.unshift(repo);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}
