import { useMemo, useState } from "react";
import type { CommitInfo, TemporalPatterns } from "../types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  temporal: TemporalPatterns;
  commits: CommitInfo[];
  onSelectCommit: (sha: string) => void;
}

export default function Patterns({ temporal, commits, onSelectCommit }: Props) {
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ day: number; hour: number } | null>(null);

  const grid = useMemo(() => {
    if (selectedAuthor === "all") return temporal.weekday_hour;
    const ct = temporal.per_contributor.find((c) => c.author_id === selectedAuthor);
    return ct?.weekday_hour || temporal.weekday_hour;
  }, [temporal, selectedAuthor]);

  const max = Math.max(...grid.flat(), 1);
  const selectedCt = temporal.per_contributor.find((c) => c.author_id === selectedAuthor);
  const activeCell = hoveredCell || selectedCell;
  const activeCellCount = activeCell ? grid[activeCell.day][activeCell.hour] : null;

  const cellCommits = useMemo(() => {
    if (!selectedCell) return [];
    return commits.filter((c) => {
      const d = new Date(c.date);
      const wd = (d.getDay() + 6) % 7; // JS Sunday=0 → Monday=0
      return wd === selectedCell.day && d.getHours() === selectedCell.hour
        && (selectedAuthor === "all" || c.author_id === selectedAuthor);
    });
  }, [commits, selectedCell, selectedAuthor]);

  const cellContributors = useMemo(() => {
    if (!cellCommits.length) return [];
    const map = new Map<string, { name: string; count: number }>();
    for (const c of cellCommits) {
      const existing = map.get(c.author_id);
      if (existing) existing.count++;
      else map.set(c.author_id, { name: c.author_name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [cellCommits]);

  const cellTypes = useMemo(() => {
    if (!cellCommits.length) return [];
    const map = new Map<string, number>();
    for (const c of cellCommits) map.set(c.type, (map.get(c.type) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [cellCommits]);

  return (
    <section className="analytics-section">
      <div className="analytics-section__header">
        <h2 className="section-title">Patterns</h2>
        <div className="patterns-controls">
          {activeCell !== null && (
            <span className="heatmap-tooltip">
              {DAYS[activeCell.day]} {activeCell.hour}:00 — <strong>{activeCellCount}</strong> commits
            </span>
          )}
          <select
            className="analytics-select"
            value={selectedAuthor}
            onChange={(e) => { setSelectedAuthor(e.target.value); setSelectedCell(null); }}
          >
            <option value="all">All contributors</option>
            {temporal.per_contributor.map((c) => (
              <option key={c.author_id} value={c.author_id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="heatmap-card">
        <div className="heatmap-hours">
          <div className="heatmap-day-label" />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="heatmap-hour-label">
              {h % 3 === 0 ? `${h}` : ""}
            </div>
          ))}
        </div>
        {grid.map((row, dayIdx) => (
          <div key={dayIdx} className="heatmap-row">
            <div className="heatmap-day-label">{DAYS[dayIdx]}</div>
            {row.map((val, hourIdx) => {
              const intensity = max > 0 ? val / max : 0;
              const isHovered = hoveredCell?.day === dayIdx && hoveredCell?.hour === hourIdx;
              const isSelected = selectedCell?.day === dayIdx && selectedCell?.hour === hourIdx;
              return (
                <div
                  key={hourIdx}
                  className={`heatmap-cell ${isHovered ? "heatmap-cell--hover" : ""} ${isSelected ? "heatmap-cell--selected" : ""}`}
                  style={{ opacity: val === 0 ? 0.04 : 0.15 + intensity * 0.85 }}
                  onMouseEnter={() => setHoveredCell({ day: dayIdx, hour: hourIdx })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => setSelectedCell(
                    selectedCell?.day === dayIdx && selectedCell?.hour === hourIdx ? null : { day: dayIdx, hour: hourIdx }
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      {selectedCell && cellCommits.length > 0 && (
        <div className="heatmap-detail">
          <div className="heatmap-detail__header">
            <h3>{DAYS[selectedCell.day]} {selectedCell.hour}:00–{selectedCell.hour}:59</h3>
            <span>{cellCommits.length} commits</span>
          </div>

          <div className="heatmap-detail__meta">
            {cellContributors.length > 0 && (
              <div className="heatmap-detail__contributors">
                {cellContributors.map((c) => (
                  <span key={c.name} className="heatmap-detail__contributor">
                    {c.name} <span className="heatmap-detail__count">{c.count}</span>
                  </span>
                ))}
              </div>
            )}
            {cellTypes.length > 0 && (
              <div className="heatmap-detail__types">
                {cellTypes.map(([type, count]) => (
                  <span key={type} className="heatmap-detail__type">{type} {count}</span>
                ))}
              </div>
            )}
          </div>

          <div className="heatmap-detail__commits">
            {cellCommits.slice(0, 20).map((c) => (
              <div key={c.sha} className="heatmap-detail__commit" onClick={() => onSelectCommit(c.sha)}>
                <span className="heatmap-detail__commit-sha">{c.short_sha}</span>
                <span className="heatmap-detail__commit-msg">{c.message}</span>
                <span className="heatmap-detail__commit-author">{c.author_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCt && !selectedCell && (
        <div className="cadence-row">
          <div className="cadence-stat">
            <span className="cadence-stat__val">{selectedCt.cadence.median_gap_hours}h</span>
            <span className="cadence-stat__label">median gap</span>
          </div>
          <div className="cadence-stat">
            <span className="cadence-stat__val">{selectedCt.cadence.p90_gap_hours}h</span>
            <span className="cadence-stat__label">p90 gap</span>
          </div>
          <div className="cadence-stat">
            <span className="cadence-stat__val">{selectedCt.cadence.max_gap_days}d</span>
            <span className="cadence-stat__label">longest gap</span>
          </div>
          <div className="cadence-stat">
            <span className="cadence-stat__val">{Math.round(selectedCt.cadence.burst_ratio * 100)}%</span>
            <span className="cadence-stat__label">burst ratio</span>
          </div>
        </div>
      )}
    </section>
  );
}
