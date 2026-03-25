import { useCallback, useRef, useState } from "react";
import type { RepoMetrics } from "./types";
import { analyzeRepo } from "./api";
import { addRecent, getRecents, type RecentRepo } from "./recents";
import Header, { type HeaderHandle } from "./components/Header";
import EmptyState from "./components/EmptyState";
import StatsGrid from "./components/StatsGrid";
import {
  TypeDistributionChart,
  VelocityChart,
  FeatureBugChart,
  ImpactChart,
} from "./components/Charts";
import Leaderboard from "./components/Leaderboard";
import CommitList from "./components/CommitList";
import DiffViewer from "./components/DiffViewer";
import Patterns from "./components/Patterns";
import Ownership from "./components/Ownership";
import Compare from "./components/Compare";
import Health from "./components/Health";

export default function App() {
  const [data, setData] = useState<RepoMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoPath, setRepoPath] = useState("");
  const [diffSha, setDiffSha] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentRepo[]>(getRecents);
  const headerRef = useRef<HeaderHandle>(null);

  const handleAnalyze = useCallback(async (repo: string, branch: string, maxCommits: number) => {
    setLoading(true);
    setError(null);
    setData(null);
    setRepoPath(repo);
    try {
      const result = await analyzeRepo(repo, branch || undefined, maxCommits);
      setData(result);
      const name = repo.split("/").pop() || repo;
      const recent: RecentRepo = { path: repo, name, branch, maxCommits, analyzedAt: Date.now() };
      addRecent(recent);
      setRecents(getRecents());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setData(null);
    setError(null);
    setRepoPath("");
  }, []);

  const handleSelectRepo = useCallback((path: string) => {
    headerRef.current?.setRepoAndLoad(path);
    handleAnalyze(path, "", 1000);
  }, [handleAnalyze]);

  const handleSelectRecent = useCallback((r: RecentRepo) => {
    headerRef.current?.setRepoAndLoad(r.path);
    handleAnalyze(r.path, r.branch, r.maxCommits);
  }, [handleAnalyze]);

  const reversedCommits = data?.commits ? [...data.commits].reverse() : [];

  return (
    <div className="app">
      <Header ref={headerRef} onAnalyze={handleAnalyze} onReset={handleReset} loading={loading} />

      <main className="container">
        {!data && (
          <EmptyState
            loading={loading}
            error={error}
            onSelectRepo={handleSelectRepo}
            recents={recents}
            onSelectRecent={handleSelectRecent}
          />
        )}

        {data && (
          <>
            <StatsGrid data={data} />

            <div className="charts-row">
              <TypeDistributionChart data={data} />
              <VelocityChart data={data} />
            </div>

            <div className="charts-row">
              <FeatureBugChart data={data} />
              <ImpactChart data={data} />
            </div>

            <Leaderboard
              contributors={data.contributors}
              commits={reversedCommits}
              onSelectCommit={setDiffSha}
            />

            {data.analytics && (
              <>
                <Compare contributors={data.contributors} />
                <Patterns temporal={data.analytics.temporal} />
                <Health health={data.analytics.health} />
                <Ownership ownership={data.analytics.ownership} />
              </>
            )}

            <CommitList
              commits={reversedCommits}
              onSelectCommit={setDiffSha}
              title="All Commits"
            />
          </>
        )}
      </main>

      {diffSha && repoPath && (
        <DiffViewer repoPath={repoPath} sha={diffSha} onClose={() => setDiffSha(null)} />
      )}

      <footer className="footer">repocheck</footer>
    </div>
  );
}
