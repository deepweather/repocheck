import { useMemo, useState } from "react";
import type { TemporalPatterns } from "../types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  temporal: TemporalPatterns;
}

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0;
  return (
    <div
      className="heatmap-cell"
      style={{ opacity: value === 0 ? 0.05 : 0.15 + intensity * 0.85 }}
      title={`${value} commits`}
    />
  );
}

export default function Patterns({ temporal }: Props) {
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");

  const grid = useMemo(() => {
    if (selectedAuthor === "all") return temporal.weekday_hour;
    const ct = temporal.per_contributor.find((c) => c.author_id === selectedAuthor);
    return ct?.weekday_hour || temporal.weekday_hour;
  }, [temporal, selectedAuthor]);

  const max = Math.max(...grid.flat(), 1);

  const selectedCt = temporal.per_contributor.find((c) => c.author_id === selectedAuthor);

  return (
    <section className="analytics-section">
      <div className="analytics-section__header">
        <h2 className="section-title">Patterns</h2>
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

      <div className="patterns-grid">
        <div className="heatmap-card">
          <h3>Commit activity</h3>
          <div className="heatmap">
            <div className="heatmap__labels-y">
              {DAYS.map((d) => <div key={d} className="heatmap__label-y">{d}</div>)}
            </div>
            <div className="heatmap__grid">
              <div className="heatmap__labels-x">
                {HOURS.filter((h) => h % 3 === 0).map((h) => (
                  <div key={h} className="heatmap__label-x" style={{ gridColumn: h + 1 }}>{h}h</div>
                ))}
              </div>
              {grid.map((row, dayIdx) => (
                <div key={dayIdx} className="heatmap__row">
                  {row.map((val, hourIdx) => (
                    <HeatmapCell key={hourIdx} value={val} max={max} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedCt && (
          <div className="cadence-card">
            <h3>Cadence</h3>
            <div className="cadence-stats">
              <div className="cadence-stat">
                <div className="cadence-stat__val">{selectedCt.cadence.median_gap_hours}h</div>
                <div className="cadence-stat__label">median gap</div>
              </div>
              <div className="cadence-stat">
                <div className="cadence-stat__val">{selectedCt.cadence.p90_gap_hours}h</div>
                <div className="cadence-stat__label">p90 gap</div>
              </div>
              <div className="cadence-stat">
                <div className="cadence-stat__val">{selectedCt.cadence.max_gap_days}d</div>
                <div className="cadence-stat__label">longest gap</div>
              </div>
              <div className="cadence-stat">
                <div className="cadence-stat__val">{Math.round(selectedCt.cadence.burst_ratio * 100)}%</div>
                <div className="cadence-stat__label">burst ratio</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
