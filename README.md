# repocheck

Git analytics that measures what actually matters. Classifies every commit with AI, computes developer impact, reliability, and efficiency — not vanity metrics like lines of code.

## Features

- **AI commit classification** — OpenAI or Anthropic classifies each commit as feature, bugfix, refactor, chore, etc.
- **Developer leaderboard** — impact score, reliability, velocity, efficiency per contributor
- **Temporal patterns** — weekday/hour heatmap, cadence analysis, velocity trends
- **Code ownership** — bus factor, bug hotspot files, knowledge map by directory
- **Health trends** — bug ratio, complexity, attrition signals over time
- **Contributor comparison** — radar chart overlay for side-by-side analysis
- **3D code city** — Three.js visualization of the codebase, height by commits/lines/recency/bugs
- **Commit drill-down** — full commit list with filters, search, and diff viewer
- **Cmd+K command palette** — search tabs, contributors, commits from anywhere
- **Persistent disk cache** — re-analysis is instant, invalidates on new commits
- **Desktop app** — Electron .dmg for macOS with native menu bar

## Quick Start

```bash
# Install
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..

# Configure (optional — works without, but AI mode is much better)
export OPENAI_API_KEY=sk-...
# or
export ANTHROPIC_API_KEY=sk-ant-...

# Run
python run.py
```

Open `http://localhost:8484`. Select a repo and hit Analyze.

You can also configure API keys in the Settings tab — they persist at `~/.repocheck/config.json`.

## Desktop App

Build a macOS .dmg:

```bash
pip install pyinstaller
npm install
./scripts/build-desktop.sh
```

Output: `dist/repocheck-0.1.0.dmg` (~105MB). Drag to Applications, launch. The app bundles the Python backend and opens a native window.

## Architecture

```
repocheck/
  extractor.py    — git log extraction (metadata + file stats, no diffs)
  classifier.py   — OpenAI/Anthropic batch classification + heuristic fallback
  metrics.py      — per-contributor and repo-wide metric computation
  analytics.py    — temporal patterns, ownership, health trends, comparisons
  cache.py        — persistent disk cache keyed by repo + HEAD SHA
  config.py       — user settings at ~/.repocheck/config.json
  server.py       — FastAPI serving API + React frontend
frontend/
  src/components/  — React + TypeScript dashboard with Chart.js and Three.js
electron/
  main.js          — Electron shell (spawns backend, creates window)
```

## Metrics

| Metric | What it measures |
|---|---|
| **Impact** | Weighted composite: features x3, bugs x1, refactors x0.5, penalized by unreliability |
| **Reliability** | 1 - (features that needed bugfixes within 14 days / total features) |
| **Efficiency** | Features shipped per 1000 lines changed |
| **Velocity** | Commits and features per active week |
| **Bug latency** | Median hours from feature to first bugfix on same files |
| **Bus factor** | % of files touched by only one contributor |
| **AI-assisted** | Detected from bot authors, bulk inserts, AI tool mentions |

## Without an API Key

Works with heuristic classification (regex on commit messages). AI mode is significantly more accurate — it understands context from file paths, change stats, and commit messages to classify correctly.

## Tests

```bash
pip install pytest ruff
python -m pytest tests/ -v   # 52 tests
ruff check repocheck/        # lint
ruff format repocheck/       # format
```
