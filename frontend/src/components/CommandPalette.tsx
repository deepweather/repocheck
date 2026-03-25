import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CommitInfo, ContributorMetrics } from "../types";

interface PaletteItem {
  id: string;
  label: string;
  detail?: string;
  action: () => void;
}

interface Props {
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectCommit: (sha: string) => void;
  contributors: ContributorMetrics[];
  commits: CommitInfo[];
}

export default function CommandPalette({ onClose, onNavigateTab, onSelectCommit, contributors, commits }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo((): PaletteItem[] => {
    const q = query.toLowerCase().trim();
    const results: PaletteItem[] = [];

    const tabs = [
      { id: "overview", label: "Overview" },
      { id: "contributors", label: "Contributors" },
      { id: "patterns", label: "Patterns" },
      { id: "health", label: "Health" },
      { id: "ownership", label: "Ownership" },
      { id: "commits", label: "Commits" },
      { id: "city", label: "City" },
      { id: "settings", label: "Settings" },
    ];

    for (const t of tabs) {
      if (!q || t.label.toLowerCase().includes(q)) {
        results.push({
          id: `tab-${t.id}`,
          label: t.label,
          detail: "tab",
          action: () => { onNavigateTab(t.id); onClose(); },
        });
      }
    }

    if (q.length >= 2) {
      for (const c of contributors) {
        if (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) {
          results.push({
            id: `contrib-${c.author_id}`,
            label: c.name,
            detail: `${c.total_commits} commits · ${c.features_shipped} features`,
            action: () => { onNavigateTab("contributors"); onClose(); },
          });
        }
      }

      let commitMatches = 0;
      for (const c of commits) {
        if (commitMatches >= 10) break;
        if (c.message.toLowerCase().includes(q) || c.short_sha.includes(q)) {
          commitMatches++;
          results.push({
            id: `commit-${c.sha}`,
            label: c.message.slice(0, 80),
            detail: `${c.short_sha} · ${c.author_name}`,
            action: () => { onSelectCommit(c.sha); onClose(); },
          });
        }
      }
    }

    return results;
  }, [query, contributors, commits, onClose, onNavigateTab, onSelectCommit]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[selectedIdx]) {
      e.preventDefault();
      items[selectedIdx].action();
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [items, selectedIdx, onClose]);

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__input"
          type="text"
          placeholder="Search tabs, contributors, commits…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          spellCheck={false}
        />
        <div className="palette__results">
          {items.slice(0, 15).map((item, i) => (
            <div
              key={item.id}
              className={`palette__item ${i === selectedIdx ? "palette__item--active" : ""}`}
              onClick={item.action}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span className="palette__item-label">{item.label}</span>
              {item.detail && <span className="palette__item-detail">{item.detail}</span>}
            </div>
          ))}
          {items.length === 0 && query && (
            <div className="palette__empty">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
