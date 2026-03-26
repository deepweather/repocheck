import { useEffect, useMemo, useRef, useState } from "react";
import type { ContributorMetrics } from "../types";

declare const Chart: any;

interface Props {
  contributors: ContributorMetrics[];
}

const DIMS = [
  { key: "features_shipped", label: "Features" },
  { key: "reliability_score", label: "Reliability" },
  { key: "velocity_per_week", label: "Velocity" },
  { key: "efficiency_score", label: "Efficiency" },
  { key: "avg_complexity", label: "Complexity" },
] as const;

const COLORS = [
  { border: "rgba(224,145,69,0.8)", bg: "rgba(224,145,69,0.15)" },
  { border: "rgba(244,112,103,0.8)", bg: "rgba(244,112,103,0.15)" },
  { border: "rgba(52,211,153,0.8)", bg: "rgba(52,211,153,0.15)" },
  { border: "rgba(229,184,68,0.8)", bg: "rgba(229,184,68,0.15)" },
];

export default function Compare({ contributors }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const maxes = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of DIMS) {
      m[d.key] = Math.max(...contributors.map((c) => (c as any)[d.key]), 0.001);
    }
    return m;
  }, [contributors]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  useEffect(() => {
    if (!canvasRef.current || selected.length === 0) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    const datasets = selected.map((id, i) => {
      const c = contributors.find((x) => x.author_id === id)!;
      const color = COLORS[i % COLORS.length];
      return {
        label: c.name,
        data: DIMS.map((d) => (c as any)[d.key] / maxes[d.key]),
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: color.border,
      };
    });

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "radar",
      data: { labels: DIMS.map((d) => d.label), datasets },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 1,
            ticks: { display: false, stepSize: 0.25 },
            grid: { color: "rgba(255,255,255,0.05)" },
            pointLabels: { color: "#9494a0", font: { family: "Inter, sans-serif", size: 12 } },
          },
        },
        plugins: {
          legend: { labels: { color: "#9494a0", font: { family: "Inter, sans-serif", size: 12 } } },
          tooltip: {
            backgroundColor: "#222226",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            titleColor: "#ececf0",
            bodyColor: "#9494a0",
            callbacks: {
              label: (ctx: any) => {
                const raw = selected.map((id) => {
                  const c = contributors.find((x) => x.author_id === id)!;
                  return (c as any)[DIMS[ctx.dataIndex].key];
                });
                return `${ctx.dataset.label}: ${raw[ctx.datasetIndex]?.toFixed?.(2) ?? raw[ctx.datasetIndex]}`;
              },
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [selected, contributors, maxes]);

  if (contributors.length < 2) return null;

  return (
    <section className="analytics-section">
      <div className="analytics-section__header">
        <h2 className="section-title">Compare</h2>
        <span className="compare-hint">{selected.length}/4 selected</span>
      </div>

      <div className="compare-chips">
        {contributors.map((c) => (
          <button
            key={c.author_id}
            className={`compare-chip ${selected.includes(c.author_id) ? "compare-chip--active" : ""}`}
            onClick={() => toggle(c.author_id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="compare-grid">
          <div className="compare-radar">
            <canvas ref={canvasRef} />
          </div>
          <div className="compare-table">
            <div className="compare-table__header">
              <span />
              {selected.map((id, i) => {
                const c = contributors.find((x) => x.author_id === id)!;
                return (
                  <span key={id} style={{ color: COLORS[i % COLORS.length].border }}>
                    {c.name.split(" ")[0]}
                  </span>
                );
              })}
            </div>
            {DIMS.map((d) => (
              <div key={d.key} className="compare-table__row">
                <span className="compare-table__dim">{d.label}</span>
                {selected.map((id) => {
                  const c = contributors.find((x) => x.author_id === id)!;
                  const val = (c as any)[d.key];
                  return <span key={id} className="compare-table__val">{typeof val === "number" ? val.toFixed(2) : val}</span>;
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <p className="compare-empty">Select contributors above to compare.</p>
      )}
    </section>
  );
}
