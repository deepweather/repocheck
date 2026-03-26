import { useMemo, useState } from "react";
import type { CommitInfo } from "../types";

const TYPE_COLORS: Record<string, string> = {
  feature: "rgba(224,145,69,0.2)",
  bugfix: "rgba(244,112,103,0.2)",
  refactor: "rgba(86,212,200,0.15)",
  docs: "rgba(94,94,110,0.2)",
  test: "rgba(229,184,68,0.2)",
  chore: "rgba(74,74,86,0.3)",
  style: "rgba(110,110,128,0.2)",
  perf: "rgba(52,211,153,0.2)",
  revert: "rgba(212,64,64,0.2)",
  unknown: "rgba(58,58,68,0.3)",
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  feature: "#f0a860",
  bugfix: "#f47067",
  refactor: "#56d4c8",
  docs: "#9494a0",
  test: "#e5b844",
  chore: "#6e6e80",
  style: "#9494a0",
  perf: "#34d399",
  revert: "#d44040",
  unknown: "#5e5e6e",
};

const TYPES = ["all", "feature", "bugfix", "chore", "refactor", "docs", "test", "style", "perf", "revert", "unknown"];

interface Props {
  commits: CommitInfo[];
  authorFilter?: string;
  onSelectCommit: (sha: string) => void;
  title?: string;
}

export default function CommitList({ commits, authorFilter, onSelectCommit, title }: Props) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 40;

  const filtered = useMemo(() => {
    let list = commits;
    if (authorFilter) list = list.filter((c) => c.author_id === authorFilter);
    if (typeFilter !== "all") list = list.filter((c) => c.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.message.toLowerCase().includes(q) || c.author_name.toLowerCase().includes(q) || c.files.some((f) => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [commits, authorFilter, typeFilter, search]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="commit-list">
      <div className="commit-list__header">
        <h3 className="section-title">{title || "Commits"}</h3>
        <span className="commit-list__count">{filtered.length} commits</span>
      </div>

      <div className="commit-list__filters">
        <div className="type-filters">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`type-filter-btn ${typeFilter === t ? "type-filter-btn--active" : ""}`}
              style={t !== "all" && typeFilter === t ? { background: TYPE_COLORS[t], borderColor: TYPE_COLORS[t] } : {}}
              onClick={() => { setTypeFilter(t); setPage(0); }}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="commit-search"
          placeholder="Search messages, authors, files…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          spellCheck={false}
        />
      </div>

      <div className="commit-table">
        {paged.map((c) => (
          <div key={c.sha} className="commit-row" onClick={() => onSelectCommit(c.sha)}>
            <span
              className="commit-type-badge"
              style={{ background: TYPE_COLORS[c.type] || TYPE_COLORS.unknown, color: TYPE_TEXT_COLORS[c.type] || TYPE_TEXT_COLORS.unknown }}
            >
              {c.type}
            </span>
            <span className="commit-sha">{c.short_sha}</span>
            <span className="commit-msg">{c.message}</span>
            {!authorFilter && <span className="commit-author">{c.author_name}</span>}
            <span className="commit-stats">
              <span className="commit-ins">+{c.insertions}</span>
              <span className="commit-del">-{c.deletions}</span>
            </span>
            <span className="commit-date">
              {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            {c.ai_assisted && <span className="commit-ai-dot" title="Likely AI-assisted" />}
          </div>
        ))}
        {paged.length === 0 && <div className="commit-row commit-row--empty">No commits match filters</div>}
      </div>

      {totalPages > 1 && (
        <div className="commit-pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
