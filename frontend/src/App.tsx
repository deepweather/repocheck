import { useCallback, useEffect, useRef, useState } from "react";
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
import CodeCity from "./components/CodeCity";
import Settings from "./components/Settings";
import CommandPalette from "./components/CommandPalette";

type Tab = "overview" | "contributors" | "patterns" | "health" | "ownership" | "commits" | "city" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "contributors", label: "Contributors" },
  { id: "patterns", label: "Patterns" },
  { id: "health", label: "Health" },
  { id: "ownership", label: "Ownership" },
  { id: "commits", label: "Commits" },
  { id: "city", label: "City" },
  { id: "settings", label: "Settings" },
];

export default function App() {
  const [data, setData] = useState<RepoMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoPath, setRepoPath] = useState("");
  const [diffSha, setDiffSha] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [recents, setRecents] = useState<RecentRepo[]>(getRecents);
  const [tab, setTabState] = useState<Tab>(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    return TABS.some((t) => t.id === hash) ? hash : "overview";
  });
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    window.location.hash = t;
  }, []);
  const headerRef = useRef<HeaderHandle>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.has_openai_key && !data.has_anthropic_key) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {});

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleAnalyze = useCallback(async (repo: string, branch: string, maxCommits: number) => {
    setLoading(true);
    setError(null);
    setData(null);
    setRepoPath(repo);
    setTab("overview");
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
    setTab("overview");
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

      {(data || tab === "settings") && (
        <nav className="tab-bar">
          {TABS.filter((t) => data || t.id === "settings").map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "tab-btn--active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      <main className={tab === "city" && data ? "container container--full" : "container"}>
        {!data && tab !== "settings" && (
          <EmptyState
            loading={loading}
            error={error}
            onSelectRepo={handleSelectRepo}
            recents={recents}
            onSelectRecent={handleSelectRecent}
          />
        )}

        {data && tab === "overview" && (
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
          </>
        )}

        {data && tab === "contributors" && (
          <>
            <Leaderboard
              contributors={data.contributors}
              commits={reversedCommits}
              onSelectCommit={setDiffSha}
            />
            <Compare contributors={data.contributors} />
          </>
        )}

        {data && tab === "patterns" && data.analytics && (
          <Patterns temporal={data.analytics.temporal} commits={reversedCommits} onSelectCommit={setDiffSha} />
        )}

        {data && tab === "health" && data.analytics && (
          <Health health={data.analytics.health} />
        )}

        {data && tab === "ownership" && data.analytics && (
          <Ownership ownership={data.analytics.ownership} commits={reversedCommits} onSelectCommit={setDiffSha} />
        )}

        {data && tab === "commits" && (
          <CommitList
            commits={reversedCommits}
            onSelectCommit={setDiffSha}
            title="All Commits"
          />
        )}

        {data && tab === "city" && (
          <CodeCity commits={data.commits} />
        )}

        {tab === "settings" && (
          <Settings />
        )}
      </main>

      {diffSha && repoPath && (
        <DiffViewer repoPath={repoPath} sha={diffSha} onClose={() => setDiffSha(null)} />
      )}

      {showPalette && (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          onNavigateTab={(t) => setTab(t as Tab)}
          onSelectCommit={setDiffSha}
          contributors={data?.contributors || []}
          commits={reversedCommits}
        />
      )}

      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-modal">
            <Settings isOnboarding onSaved={() => setShowOnboarding(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
