import { useEffect, useRef } from "react";
import type { RepoMetrics } from "../types";

declare const Chart: any;

const TYPE_COLORS: Record<string, string> = {
  feature: "#8b7cf6",
  bugfix: "#f47067",
  refactor: "#56d4c8",
  docs: "#5e5e6e",
  test: "#e5b844",
  chore: "#4a4a56",
  style: "#6e6e80",
  perf: "#34d399",
  revert: "#d44040",
  unknown: "#3a3a44",
};

const CHART_DEFAULTS = {
  color: "#5e5e6e",
  borderColor: "transparent",
  plugins: {
    legend: { labels: { color: "#5e5e6e", font: { family: "Inter, sans-serif", size: 12 }, boxWidth: 10, padding: 16 } },
    tooltip: {
      backgroundColor: "#222226",
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      titleColor: "#ececf0",
      bodyColor: "#9494a0",
      cornerRadius: 6,
      padding: 10,
      titleFont: { family: "Inter, sans-serif", size: 13, weight: "600" },
      bodyFont: { family: "Inter, sans-serif", size: 12 },
    },
  },
  scales: {
    x: { ticks: { color: "#5e5e6e", font: { size: 11 } }, grid: { display: false } },
    y: { ticks: { color: "#5e5e6e", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.04)" } },
  },
};

function useChart(factory: () => any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = factory();
    return () => { chartRef.current?.destroy(); };
  });

  return canvasRef;
}

interface Props {
  data: RepoMetrics;
}

export function TypeDistributionChart({ data }: Props) {
  const entries = Object.entries(data.commit_type_distribution).sort((a, b) => b[1] - a[1]);

  const ref = useChart(() => new Chart(ref.current, {
    type: "doughnut",
    data: {
      labels: entries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map(([k]) => TYPE_COLORS[k] || TYPE_COLORS.unknown),
        borderWidth: 0,
        spacing: 2,
      }],
    },
    options: {
      responsive: true,
      cutout: "68%",
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { position: "right", labels: { ...CHART_DEFAULTS.plugins.legend.labels, padding: 12 } },
      },
    },
  }));

  return (
    <div className="chart-card">
      <h3>Types</h3>
      <canvas ref={ref} />
    </div>
  );
}

export function VelocityChart({ data }: Props) {
  const weeks = Object.keys(data.weekly_timeline).sort();

  const ref = useChart(() => new Chart(ref.current, {
    type: "bar",
    data: {
      labels: weeks,
      datasets: [
        {
          label: "Commits",
          data: weeks.map((w) => data.weekly_timeline[w].commits),
          backgroundColor: "rgba(139,124,246,0.5)",
          borderRadius: 3,
          yAxisID: "y",
        },
        {
          label: "Lines changed",
          data: weeks.map((w) => data.weekly_timeline[w].insertions + data.weekly_timeline[w].deletions),
          type: "line",
          borderColor: "rgba(139,124,246,0.25)",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.35,
          yAxisID: "y1",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      scales: {
        ...CHART_DEFAULTS.scales,
        x: { ...CHART_DEFAULTS.scales.x, ticks: { ...CHART_DEFAULTS.scales.x.ticks, maxTicksLimit: 12, maxRotation: 0 } },
        y: { ...CHART_DEFAULTS.scales.y, position: "left" },
        y1: { position: "right", ticks: { color: "#3a3a44", font: { size: 10 } }, grid: { display: false } },
      },
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
    },
  }));

  return (
    <div className="chart-card">
      <h3>Velocity</h3>
      <canvas ref={ref} />
    </div>
  );
}

export function FeatureBugChart({ data }: Props) {
  const weeks = Object.keys(data.weekly_timeline).sort();

  const ref = useChart(() => new Chart(ref.current, {
    type: "line",
    data: {
      labels: weeks,
      datasets: [
        {
          label: "Features",
          data: weeks.map((w) => data.weekly_timeline[w].features),
          borderColor: "#8b7cf6",
          backgroundColor: "rgba(139,124,246,0.06)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Bugfixes",
          data: weeks.map((w) => data.weekly_timeline[w].bugfixes),
          borderColor: "#f47067",
          backgroundColor: "rgba(244,112,103,0.06)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        ...CHART_DEFAULTS.scales,
        x: { ...CHART_DEFAULTS.scales.x, ticks: { ...CHART_DEFAULTS.scales.x.ticks, maxTicksLimit: 12, maxRotation: 0 } },
      },
      plugins: CHART_DEFAULTS.plugins,
    },
  }));

  return (
    <div className="chart-card">
      <h3>Features / bugs</h3>
      <canvas ref={ref} />
    </div>
  );
}

export function ImpactChart({ data }: Props) {
  const top = data.contributors.slice(0, 12);
  const labels = top.map((c) => c.name.length > 18 ? c.name.slice(0, 17) + "…" : c.name);
  const scores = top.map((c) => Math.round(c.impact_score * 10) / 10);

  const ref = useChart(() => new Chart(ref.current, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Impact",
        data: scores,
        backgroundColor: scores.map((_, i) => `rgba(139,124,246,${0.8 - i * 0.05})`),
        borderRadius: 3,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      scales: {
        x: { ...CHART_DEFAULTS.scales.y, grid: { color: "rgba(255,255,255,0.03)" } },
        y: { ticks: { color: "#9494a0", font: { family: "Inter, sans-serif", size: 12 } }, grid: { display: false } },
      },
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
    },
  }));

  return (
    <div className="chart-card">
      <h3>Impact</h3>
      <canvas ref={ref} />
    </div>
  );
}
