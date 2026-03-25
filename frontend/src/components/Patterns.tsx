import { useMemo, useState } from "react";
import type { TemporalPatterns } from "../types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  temporal: TemporalPatterns;
}

export default function Patterns({ temporal }: Props) {
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  const grid = useMemo(() => {
    if (selectedAuthor === "all") return temporal.weekday_hour;
    const ct = temporal.per_contributor.find((c) => c.author_id === selectedAuthor);
    return ct?.weekday_hour || temporal.weekday_hour;
  }, [temporal, selectedAuthor]);

  const max = Math.max(...grid.flat(), 1);
  const selectedCt = temporal.per_contributor.find((c) => c.author_id === selectedAuthor);

  const hovered = hoveredCell ? grid[hoveredCell.day][hoveredCell.hour] : null;

  return (
    <section className="analytics-section">
      <div className="analytics-section__header">
        <h2 className="section-title">Patterns</h2>
        <div className="patterns-controls">
          {hoveredCell !== null && (
            <span className="heatmap-tooltip">
              {DAYS[hoveredCell.day]} {hoveredCell.hour}:00 — <strong>{hovered}</strong> commits
            </span>
          )}
          <select
            className="analytics-select"
            value={selectedAuthor}
            onChange={(e) => setSelectedAuthor(e.target.value)}
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
              return (
                <div
                  key={hourIdx}
                  className={`heatmap-cell ${isHovered ? "heatmap-cell--hover" : ""}`}
                  style={{ opacity: val === 0 ? 0.04 : 0.15 + intensity * 0.85 }}
                  onMouseEnter={() => setHoveredCell({ day: dayIdx, hour: hourIdx })}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {selectedCt && (
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
