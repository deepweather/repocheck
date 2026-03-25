import { useEffect, useRef } from "react";
import type { HealthTrends } from "../types";

declare const Chart: any;

interface Props {
  health: HealthTrends;
}

function useChart(deps: any[], factory: () => any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = factory();
    return () => { chartRef.current?.destroy(); };
  }, deps);

  return canvasRef;
}

const TOOLTIP = {
  backgroundColor: "#222226",
  borderColor: "rgba(255,255,255,0.1)",
  borderWidth: 1,
  titleColor: "#ececf0",
  bodyColor: "#9494a0",
  cornerRadius: 6,
  padding: 10,
};

export default function Health({ health }: Props) {
  const weeks = health.weekly.map((w) => w.week);

  const bugRatioRef = useChart([health], () => new Chart(bugRatioRef.current, {
    type: "line",
    data: {
      labels: weeks,
      datasets: [{
        data: health.weekly.map((w) => w.bug_ratio),
        borderColor: "#f47067",
        backgroundColor: "rgba(244,112,103,0.06)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#f47067",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { ticks: { color: "#5e5e6e", font: { size: 10 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false } },
        y: { beginAtZero: true, max: 1, ticks: { color: "#5e5e6e", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
      },
      plugins: { legend: { display: false }, tooltip: TOOLTIP },
    },
  }));

  const complexityRef = useChart([health], () => new Chart(complexityRef.current, {
    type: "line",
    data: {
      labels: weeks,
      datasets: [{
        data: health.weekly.map((w) => w.complexity_avg),
        borderColor: "#8b7cf6",
        backgroundColor: "rgba(139,124,246,0.06)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#8b7cf6",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { ticks: { color: "#5e5e6e", font: { size: 10 }, maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: "#5e5e6e", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
      },
      plugins: { legend: { display: false }, tooltip: TOOLTIP },
    },
  }));

  const sizeEntries = Object.entries(health.commit_size_distribution);
  const sizeOrder = ["trivial", "small", "medium", "large", "massive"];
  sizeEntries.sort((a, b) => sizeOrder.indexOf(a[0]) - sizeOrder.indexOf(b[0]));

  const sizeRef = useChart([health], () => new Chart(sizeRef.current, {
    type: "bar",
    data: {
      labels: sizeEntries.map(([k]) => k),
      datasets: [{
        data: sizeEntries.map(([, v]) => v),
        backgroundColor: sizeEntries.map(([k]) => {
          const colors: Record<string, string> = { trivial: "#3a3a44", small: "#4a4a56", medium: "#8b7cf6", large: "#a498ff", massive: "#f47067" };
          return colors[k] || "#4a4a56";
        }),
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: { ticks: { color: "#5e5e6e", font: { size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: "#5e5e6e", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
      },
      plugins: { legend: { display: false }, tooltip: TOOLTIP },
    },
  }));

  // Only show meaningful attrition flags (not -100% which just means inactive)
  const meaningfulFlags = health.attrition_flags.filter((a) => a.drop_pct < 100 && a.historical_velocity > 0.5);

  return (
    <section className="analytics-section">
      <h2 className="section-title">Health</h2>

      {meaningfulFlags.length > 0 && (
        <div className="attrition-alerts">
          {meaningfulFlags.map((a) => (
            <div key={a.author_id} className="attrition-alert">
              <span className="attrition-alert__name">{a.name}</span>
              <span className="attrition-alert__drop bad">-{a.drop_pct}%</span>
              <span className="attrition-alert__detail">
                {a.recent_velocity}/wk vs {a.historical_velocity}/wk avg
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="health-charts">
        <div className="chart-card">
          <h3>Bug ratio</h3>
          <canvas ref={bugRatioRef} />
        </div>
        <div className="chart-card">
          <h3>Complexity</h3>
          <canvas ref={complexityRef} />
        </div>
        <div className="chart-card">
          <h3>Commit sizes</h3>
          <canvas ref={sizeRef} />
        </div>
      </div>
    </section>
  );
}
