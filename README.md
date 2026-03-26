# repocheck

Git analytics that measures what actually matters. Classifies every commit with AI, computes developer impact, reliability, and efficiency — not vanity metrics like lines of code.

![Overview](docs/screenshots/02-overview.png)

## Features

- **AI commit classification** — OpenAI or Anthropic classifies each commit as feature, bugfix, refactor, chore, etc.
- **Developer leaderboard** — impact score, reliability, velocity, efficiency per contributor
- **Temporal patterns** — weekday/hour heatmap with drill-down to actual commits
- **Code ownership** — bus factor, bug hotspot files, knowledge map by directory
- **Health trends** — bug ratio, complexity, attrition signals over time
- **Contributor comparison** — radar chart overlay for side-by-side analysis
- **3D code city** — Three.js visualization of the codebase, height by commits/lines/recency/bugs
- **Commit drill-down** — full commit list with filters, search, and diff viewer
- **Cmd+K command palette** — search tabs, contributors, commits from anywhere
- **Persistent disk cache** — re-analysis is instant, invalidates on new commits
- **Desktop app** — Electron .dmg for macOS with native menu bar

### Contributors

![Contributors](docs/screenshots/04-contributors.png)

### Patterns

![Patterns](docs/screenshots/03-patterns.png)

## Install

```bash
git clone https://github.com/deepweather/repocheck.git
cd repocheck

# Python backend
pip install -r requirements.txt

# React frontend
cd frontend && npm install && npm run build && cd ..

# Run
python run.py
```

Open `http://localhost:8484`. Select a repo and hit Analyze.

Configure API keys in the Settings tab or via environment:

```bash
export OPENAI_API_KEY=sk-...
# or
export ANTHROPIC_API_KEY=sk-ant-...
```

Keys persist at `~/.repocheck/config.json` when saved in Settings.

## Desktop App

Download the [latest .dmg from Releases](https://github.com/deepweather/repocheck/releases), or build it:

```bash
pip install pyinstaller
npm install
./scripts/build-desktop.sh
```

## Architecture

```
repocheck/
  extractor.py    — git log extraction (metadata + file stats)
  classifier.py   — OpenAI/Anthropic batch classification + heuristic fallback
  metrics.py      — per-contributor and repo-wide metric computation
  analytics.py    — temporal patterns, ownership, health trends, comparisons
  cache.py        — persistent disk cache keyed by repo + HEAD SHA
  config.py       — user settings at ~/.repocheck/config.json
  server.py       — FastAPI serving API + React frontend
frontend/
  src/components/  — React + TypeScript with Chart.js and Three.js
electron/
  main.js          — Electron shell for macOS desktop app
```

## Metrics

| Metric | Description |
|---|---|
| **Impact** | Features x3 + bugs x1 + refactors x0.5, penalized by unreliability |
| **Reliability** | 1 - (features needing bugfixes within 14 days / total features) |
| **Efficiency** | Features shipped per 1000 lines changed |
| **Velocity** | Commits and features per active week |
| **Bug latency** | Median hours from feature to first bugfix on same files |
| **Bus factor** | % of files touched by only one contributor |

## Tests

```bash
pip install pytest ruff
python -m pytest tests/ -v   # 52 tests
ruff check repocheck/        # lint
```

## License

MIT
