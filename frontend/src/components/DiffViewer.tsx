import { useEffect, useState } from "react";
import { fetchDiff } from "../api";
import type { DiffResult } from "../types";

interface Props {
  repoPath: string;
  sha: string;
  onClose: () => void;
}

function classifyLine(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "diff-meta";
  if (line.startsWith("@@")) return "diff-hunk";
  if (line.startsWith("+")) return "diff-add";
  if (line.startsWith("-")) return "diff-del";
  return "diff-ctx";
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
              {data.diff.split("\n").map((line, i) => (
                <div key={i} className={`diff-line ${classifyLine(line)}`}>
                  <span className="diff-line-num">{i + 1}</span>
                  <span className="diff-line-text">{line}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
