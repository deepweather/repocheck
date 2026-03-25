import { useEffect, useState } from "react";
import { browsePath, type BrowseEntry } from "../api";
import type { RecentRepo } from "../recents";

interface Props {
  loading: boolean;
  error: string | null;
  onSelectRepo: (path: string) => void;
  recents: RecentRepo[];
  onSelectRecent: (r: RecentRepo) => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function EmptyState({ loading, error, onSelectRepo, recents, onSelectRecent }: Props) {
  const [repos, setRepos] = useState<BrowseEntry[]>([]);

  useEffect(() => {
    if (!loading && !error) {
      const paths = ["~/Projects", "~/repos", "~/code", "~/dev", "~/src", "~/work", "~/GitHub", "~"];
      Promise.all(paths.map((p) => browsePath(p).catch(() => ({ entries: [] as BrowseEntry[] }))))
        .then((results) => {
          const allRepos: BrowseEntry[] = [];
          const seen = new Set<string>();
          for (const r of results) {
            for (const e of r.entries) {
              if (e.is_repo && !seen.has(e.path)) {
                seen.add(e.path);
                allRepos.push(e);
              }
            }
          }
          setRepos(allRepos.slice(0, 12));
        });
    }
  }, [loading, error]);

  if (loading) {
    return (
      <div className="loading-view">
        <div className="loading-view__status">
          <div className="spinner" />
          <span>Analyzing repository…</span>
        </div>
        <div className="skeleton-container">
          <div className="skeleton-grid">
            <div className="skeleton skeleton--hero" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
          <div className="skeleton-charts">
            <div className="skeleton skeleton--chart" />
            <div className="skeleton skeleton--chart" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status">
        <p className="bad">{error}</p>
      </div>
    );
  }

  const recentPaths = new Set(recents.map((r) => r.path));

  return (
    <div className="status status--repos">
      {recents.length > 0 && (
        <div className="recents-section">
          <div className="recents-label">Recent</div>
          <div className="recents-list">
            {recents.map((r) => (
              <button key={r.path} className="recent-item" onClick={() => onSelectRecent(r)}>
                <span className="recent-item__name">{r.name}</span>
                <span className="recent-item__meta">
                  {r.branch || "main"} · {r.maxCommits.toLocaleString("en-US")} commits · {timeAgo(r.analyzedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {repos.length > 0 && (
        <>
          {recents.length > 0 && <div className="repos-divider" />}
          <div className="quick-repos">
            {repos
              .filter((r) => !recentPaths.has(r.path))
              .map((r) => (
                <button key={r.path} className="quick-repo" onClick={() => onSelectRepo(r.path)}>
                  <span className="quick-repo__name">{r.name}</span>
                  <span className="quick-repo__path">{r.path.replace(/^\/Users\/[^/]+/, "~")}</span>
                </button>
              ))}
          </div>
        </>
      )}

      {repos.length === 0 && recents.length === 0 && (
        <p>Browse to a local git repository to get started.</p>
      )}
    </div>
  );
}
