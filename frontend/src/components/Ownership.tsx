import { useMemo, useState } from "react";
import type { CommitInfo, OwnershipAnalysis } from "../types";

interface Props {
  ownership: OwnershipAnalysis;
  commits: CommitInfo[];
  onSelectCommit: (sha: string) => void;
}

function HotspotRow({ filePath, bugChanges, topContributor, contributors, commits, onSelectCommit }: {
  filePath: string;
  bugChanges: number;
  topContributor: string;
  contributors: number;
  commits: CommitInfo[];
  onSelectCommit: (sha: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const relatedBugs = useMemo(
    () => commits.filter((c) => c.type === "bugfix" && c.files.some((f) => f === filePath)),
    [commits, filePath]
  );

  return (
    <>
      <div className={`ownership-row ownership-row--clickable ${open ? "ownership-row--open" : ""}`} onClick={() => setOpen(!open)}>
        <span className="ownership-row__toggle">{open ? "▾" : "▸"}</span>
        <span className="ownership-row__file">{filePath}</span>
        <span className="ownership-row__bugs bad">{bugChanges} {bugChanges === 1 ? "fix" : "fixes"}</span>
        <span className="ownership-row__owner">{topContributor}</span>
        <span className="ownership-row__contribs">{contributors} devs</span>
      </div>
      {open && (
        <div className="hotspot-commits">
          {relatedBugs.length > 0 ? relatedBugs.map((c) => (
            <div key={c.sha} className="hotspot-commit" onClick={() => onSelectCommit(c.sha)}>
              <span className="hotspot-commit__sha">{c.short_sha}</span>
              <span className="hotspot-commit__msg">{c.message}</span>
              <span className="hotspot-commit__author">{c.author_name}</span>
              <span className="hotspot-commit__date">
                {new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          )) : (
            <div className="hotspot-commit hotspot-commit--empty">No matching commits in current data</div>
          )}
        </div>
      )}
    </>
  );
}

export default function Ownership({ ownership, commits, onSelectCommit }: Props) {
  return (
    <section className="analytics-section">
      <div className="analytics-section__header">
        <h2 className="section-title">Ownership & risk</h2>
        <div className="ownership-summary">
          <span className="ownership-stat">
            <strong className={ownership.bus_factor_1_pct > 50 ? "bad" : ownership.bus_factor_1_pct > 30 ? "warn" : ""}>
              {ownership.bus_factor_1_pct}%
            </strong> single-owner files
          </span>
          <span className="ownership-stat">{ownership.total_files_analyzed} files analyzed</span>
        </div>
      </div>

      <div className="ownership-grid">
        {ownership.directory_ownership.length > 0 && (
          <div className="ownership-card">
            <h3>Knowledge map</h3>
            <div className="ownership-table">
              {ownership.directory_ownership.map((d) => (
                <div key={d.path} className="ownership-row">
                  <span className="ownership-row__dir">{d.path}/</span>
                  <span className="ownership-row__contribs">{d.contributors}</span>
                  <div className="ownership-row__owners">
                    {d.top_contributors.map((tc, i) => (
                      <span key={i} className="ownership-owner" style={{ opacity: 1 - i * 0.25 }}>
                        {tc.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ownership.hotspot_files.length > 0 && (
          <div className="ownership-card">
            <h3>Bug hotspots</h3>
            <div className="ownership-table">
              {ownership.hotspot_files.filter((f) => f.bug_changes >= 2).map((f) => (
                <HotspotRow
                  key={f.path}
                  filePath={f.path}
                  bugChanges={f.bug_changes}
                  topContributor={f.top_contributor}
                  contributors={f.contributors}
                  commits={commits}
                  onSelectCommit={onSelectCommit}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
