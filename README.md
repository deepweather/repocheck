# repocheck

AI-powered git analytics dashboard. Measures what actually matters — not lines of code.

## Metrics

| Metric | What it measures |
|---|---|
| **Impact Score** | Weighted composite: features shipped, reliability, complexity |
| **Reliability** | How rarely your features require subsequent bugfixes (14-day window) |
| **Efficiency** | Features delivered per lines of code changed |
| **Velocity** | Commits and features per week |
| **Code Churn** | Ratio of deletions to insertions (high = lots of rewriting) |
| **AI-Assisted %** | Fraction of commits that appear AI/Copilot-generated |
| **Commit Classification** | Each commit categorized: feature, bugfix, refactor, docs, test, chore, etc. |

## Quick Start

```bash
pip install -r requirements.txt

# Optional: enable AI classification (highly recommended)
export OPENAI_API_KEY=sk-...

# Start the dashboard
python run.py

# Or pre-analyze a repo
python run.py --repo /path/to/any/git/repo
```

Open `http://localhost:8484`, paste any local repo path, hit Analyze.

## How It Works

1. **Extract** — walks git log via GitPython, extracts commits with diffs, stats, and metadata
2. **Classify** — sends commit batches to OpenAI (gpt-4o-mini) for semantic classification. Falls back to regex heuristics if no API key
3. **Compute** — calculates per-contributor and repo-wide metrics with reliability tracking, efficiency scoring, and impact ranking
4. **Visualize** — serves a dark-themed interactive dashboard with Chart.js

## Without an OpenAI Key

Repocheck works without an API key using heuristic classification (regex on commit messages). The AI mode is significantly more accurate — it reads actual diffs, detects AI-generated code, and understands context.
