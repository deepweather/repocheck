import { useEffect, useState } from "react";
import { fetchDiff } from "../api";
import type { DiffResult } from "../types";

interface Props {
  repoPath: string;
  sha: string;
  onClose: () => void;
}

const MAX_LINES = 2000;

interface DiffLine {
  text: string;
  type: string;
  lineNum: string;
}

function parseDiff(raw: string): DiffLine[] {
  const lines = raw.split("\n");
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (let i = 0; i < Math.min(lines.length, MAX_LINES); i++) {
    const line = lines[i];

    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ text: line, type: "diff-hunk", lineNum: "" });
    } else if (line.startsWith("+++") || line.startsWith("---")) {
      result.push({ text: line, type: "diff-meta", lineNum: "" });
    } else if (line.startsWith("+")) {
      result.push({ text: line, type: "diff-add", lineNum: String(newLine) });
      newLine++;
    } else if (line.startsWith("-")) {
      result.push({ text: line, type: "diff-del", lineNum: String(oldLine) });
      oldLine++;
    } else if (line.startsWith("diff ")) {
      result.push({ text: line, type: "diff-meta", lineNum: "" });
    } else {
      result.push({ text: line, type: "diff-ctx", lineNum: String(newLine) });
      oldLine++;
      newLine++;
    }
  }

  return result;
}

export default function DiffViewer({ repoPath, sha, onClose }: Props) {
  const [data, setData] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchDiff(repoPath, sha)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [repoPath, sha]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const diffLines = data ? parseDiff(data.diff) : [];
  const truncated = data && data.diff.split("\n").length > MAX_LINES;

  return (
    <div className="diff-overlay" onClick={onClose}>
      <div className="diff-modal" onClick={(e) => e.stopPropagation()}>
        <div className="diff-modal__header">
          <div>
            <h3>{data?.message?.split("\n")[0] || sha}</h3>
            {data && (
              <div className="diff-modal__meta">
                {data.author} · {new Date(data.date).toLocaleString()} · {data.sha.slice(0, 10)}
              </div>
            )}
          </div>
          <button className="diff-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="diff-loading">Loading diff…</div>}
        {error && <div className="diff-error">{error}</div>}

        {data && (
          <>
            {data.message && data.message.includes("\n") && (
              <pre className="diff-full-message">{data.message}</pre>
            )}
            {data.stat && <pre className="diff-stat">{data.stat}</pre>}
            <div className="diff-content">
              {diffLines.map((dl, i) => (
                <div key={i} className={`diff-line ${dl.type}`}>
                  <span className="diff-line-num">{dl.lineNum}</span>
                  <span className="diff-line-text">{dl.text}</span>
                </div>
              ))}
              {truncated && (
                <div className="diff-line diff-truncated">
                  Diff truncated — showing first {MAX_LINES} lines
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
