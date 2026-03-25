import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type FormEvent } from "react";
import { browsePath, fetchBranches, type BrowseEntry } from "../api";

interface Props {
  onAnalyze: (repo: string, branch: string, maxCommits: number) => void;
  onReset: () => void;
  loading: boolean;
}

export interface HeaderHandle {
  setRepoAndLoad: (path: string) => void;
}

const COMMIT_PRESETS = [
  { label: "500", value: 500 },
  { label: "1k", value: 1000 },
  { label: "2k", value: 2000 },
  { label: "5k", value: 5000 },
];

const Header = forwardRef<HeaderHandle, Props>(function Header({ onAnalyze, onReset, loading }, ref) {
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [maxCommits, setMaxCommits] = useState(1000);

  // File browser state
  const [suggestions, setSuggestions] = useState<BrowseEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Branch state
  const [branches, setBranches] = useState<string[]>([]);
  const [activeBranch, setActiveBranch] = useState("");
  const [showBranches, setShowBranches] = useState(false);

  const skipNextSuggest = useRef(false);

  useImperativeHandle(ref, () => ({
    setRepoAndLoad(path: string) {
      skipNextSuggest.current = true;
      setRepo(path);
      setShowSuggestions(false);
      setBrowseOpen(false);
      loadBranches(path);
    },
  }));

  const doFetch = useCallback(async (path: string) => {
    try {
      const result = await browsePath(path);
      if (result.is_repo && result.entries.length === 0) {
        setSuggestions([{ name: "Use this repo", path: result.current || path, is_repo: true }]);
      } else {
        setSuggestions(result.entries);
      }
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const fetchSuggestionsDebounced = useCallback((path: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!path || path.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => doFetch(path), 150);
  }, [doFetch]);

  useEffect(() => {
    if (skipNextSuggest.current) { skipNextSuggest.current = false; return; }
    if (repo) fetchSuggestionsDebounced(repo);
  }, [repo, fetchSuggestionsDebounced]);

  // When a repo is selected, fetch its branches
  const loadBranches = useCallback(async (repoPath: string) => {
    try {
      const result = await fetchBranches(repoPath);
      setBranches(result.branches);
      setActiveBranch(result.active);
      setBranch(result.active);
    } catch {
      setBranches([]);
    }
  }, []);

  const selectSuggestion = (entry: BrowseEntry) => {
    skipNextSuggest.current = true;
    setRepo(entry.path);
    setShowSuggestions(false);
    setBrowseOpen(false);
    if (entry.is_repo) {
      loadBranches(entry.path);
      inputRef.current?.blur();
    } else {
      skipNextSuggest.current = false;
      doFetch(entry.path + "/");
    }
  };

  const openBrowser = () => {
    setBrowseOpen(true);
    doFetch(repo || "~/");
    inputRef.current?.focus();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setBrowseOpen(false);
    if (repo.trim()) onAnalyze(repo.trim(), branch.trim(), maxCommits);
  };

  const showDropdown = (showSuggestions || browseOpen) && suggestions.length > 0;

  return (
    <header className="header">
      <a className="logo" onClick={onReset}>
        repo<span>check</span>
      </a>
      <form className="input-row" onSubmit={submit}>
        <div className="input-wrapper">
          <div className="input-with-btn">
            <input
              ref={inputRef}
              type="text"
              placeholder="Select a repository…"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              onFocus={() => { if (repo) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => { setShowSuggestions(false); setBrowseOpen(false); }, 200)}
              spellCheck={false}
              className="input-repo"
              autoComplete="off"
            />
            <button type="button" className="browse-btn" onClick={openBrowser} title="Browse folders">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3.5A1.5 1.5 0 013.5 2h2.879a1.5 1.5 0 011.06.44l.622.62a.5.5 0 00.354.147H12.5A1.5 1.5 0 0114 4.707V12.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
          </div>
          {showDropdown && (
            <div className="suggestions">
              {suggestions.map((s) => (
                <div
                  key={s.path}
                  className={`suggestion ${s.is_repo ? "suggestion--repo" : ""}`}
                  onMouseDown={() => selectSuggestion(s)}
                >
                  <span className="suggestion__icon">{s.is_repo ? "◆" : "›"}</span>
                  <span className="suggestion__name">{s.name}</span>
                  {s.is_repo && <span className="suggestion__tag">repo</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="branch-wrapper">
          <button
            type="button"
            className="branch-select"
            onClick={() => setShowBranches(!showBranches)}
            onBlur={() => setTimeout(() => setShowBranches(false), 200)}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M5 3v6.5a2.5 2.5 0 005 0V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="10" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
            <span>{branch || activeBranch || "branch"}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
          {showBranches && branches.length > 0 && (
            <div className="branch-dropdown">
              {branches.map((b) => (
                <div
                  key={b}
                  className={`branch-option ${b === branch ? "branch-option--active" : ""}`}
                  onMouseDown={() => { setBranch(b); setShowBranches(false); }}
                >
                  {b}
                  {b === activeBranch && <span className="branch-default">default</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="commit-presets">
          {COMMIT_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`preset-btn ${maxCommits === p.value ? "preset-btn--active" : ""}`}
              onClick={() => setMaxCommits(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !repo.trim()}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </form>
    </header>
  );
});

export default Header;
