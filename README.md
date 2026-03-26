<p align="center">
  <h1 align="center">repocheck</h1>
  <p align="center">AI-powered git analytics that measures what actually matters.</p>
</p>

<p align="center">
  <a href="https://github.com/deepweather/repocheck/releases/latest"><img src="https://img.shields.io/github/v/release/deepweather/repocheck?label=Download&style=for-the-badge&color=6c5ce7" alt="Download"></a>
  <a href="https://github.com/deepweather/repocheck/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/deepweather/repocheck"><img src="https://img.shields.io/github/stars/deepweather/repocheck?style=for-the-badge&color=fdcb6e" alt="Stars"></a>
</p>

<p align="center">
  <a href="https://github.com/deepweather/repocheck/releases/latest"><strong>Download for macOS</strong></a> · <a href="#run-from-source">Run from source</a> · <a href="#features">Features</a>
</p>

<br>

<p align="center">
  <img src="docs/screenshots/02-overview.png" width="800" alt="repocheck dashboard">
</p>

---

Point repocheck at any local git repository. It classifies every commit with AI (OpenAI or Anthropic), then computes per-developer **impact, reliability, velocity, and efficiency** — not vanity metrics like lines of code.

## Download

| Platform | Install |
|----------|---------|
| **macOS** | [Download .dmg](https://github.com/deepweather/repocheck/releases/latest) — drag to Applications, launch |
| **Linux / Windows** | [Run from source](#run-from-source) — Python + Node.js |

## Features

<table>
<tr>
<td width="50%">

**Developer leaderboard** — ranked by impact score with reliability, velocity, efficiency metrics. Expandable cards show full commit history per contributor.

</td>
<td width="50%">

<img src="docs/screenshots/04-contributors.png" alt="Contributors">

</td>
</tr>
<tr>
<td width="50%">

<img src="docs/screenshots/03-patterns.png" alt="Patterns">

</td>
<td width="50%">

**Commit heatmap** — weekday x hour activity grid. Click any cell to see exactly which commits happened, who authored them, and what type they are.

</td>
</tr>
</table>

- **AI commit classification** — every commit tagged as feature, bugfix, refactor, chore, docs, etc.
- **Code ownership** — bus factor per directory, bug hotspot files, knowledge map
- **Health trends** — bug ratio, complexity, and attrition signals over time
- **Contributor comparison** — radar chart for side-by-side analysis
- **3D code city** — Three.js visualization where each file is a building, height = activity
- **Diff viewer** — click any commit to see the full diff with syntax highlighting
- **Cmd+K palette** — search tabs, contributors, commits from anywhere
- **Persistent cache** — re-analysis is instant, auto-invalidates on new commits
- **Supports OpenAI and Anthropic** — configure in Settings, keys persist locally

## Run from source

```bash
git clone https://github.com/deepweather/repocheck.git
cd repocheck

# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Run
python run.py
```

Open [localhost:8484](http://localhost:8484). Set your API key in Settings (optional — works without using heuristic classification).

## How it works

1. **Extract** — reads git log via GitPython (commit metadata + file stats)
2. **Classify** — sends commits in parallel batches to OpenAI/Anthropic for semantic classification
3. **Compute** — calculates impact, reliability, velocity, efficiency, ownership, temporal patterns
4. **Visualize** — React + TypeScript dashboard with Chart.js and Three.js

## Metrics

| Metric | What it measures |
|--------|-----------------|
| Impact | Weighted composite: features x3, bugs x1, refactors x0.5, penalized by unreliability |
| Reliability | How rarely your features need bugfixes within 14 days |
| Efficiency | Features shipped per 1000 lines of code changed |
| Velocity | Commits and features per active week |
| Bus factor | % of files touched by only one contributor |
| Bug latency | Median hours from feature commit to first bugfix on same files |

## Build desktop app

```bash
pip install pyinstaller
npm install
./scripts/build-desktop.sh
```

Produces `dist/repocheck-0.1.0.dmg` (~105MB).

## Development

```bash
# Run backend
python run.py --no-browser --port 8484

# Run frontend dev server (hot reload)
cd frontend && npm run dev

# Tests
python -m pytest tests/ -v    # 52 tests
ruff check repocheck/         # lint
```

## License

MIT
