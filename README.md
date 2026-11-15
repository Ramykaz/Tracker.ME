# Tracker.ME

A fast, no-nonsense personal tracker: **habits, weight, Quran and journal** in one place.

- **Zero dependencies, no build step.** Plain HTML/CSS/JS, about 60 KB total. Charts are hand-drawn SVG. Switching screens takes about 5 ms.
- **Works offline and installs to your phone.** It's a PWA: open it, then use "Add to Home Screen".
- **Your data stays on your device** in `localStorage`. Use **Settings → Export backup** now and then.

## What it tracks

| | |
|---|---|
| **Habits** | Build (yes/no), Build (amount, e.g. 8 glasses) or Quit. Frequencies: every day, **every N days** (e.g. every 2 days), certain weekdays, or X times per week. Streaks, best streak, 30-day rate, a calendar heatmap (tap a day to backfill it), and weekly charts. |
| **Weight** | Daily log, trend chart with a 7-day average and goal line, ranges (30D/90D/1Y/All), change, lowest, distance to goal, and BMI if you add your height. |
| **Quran** | Log pages per day. Your page, juz and khatm progress update automatically (604-page mushaf). Daily goal, streak, 30-day chart. |
| **Journal** | Mood plus free text for each day, a 60-day mood chart, and searchable entries. |

Every screen has a day picker, so you can log or fix past days.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy (GitHub Pages)

The workflow in `.github/workflows/pages.yml` deploys on every push to `main`.
One-time setup: **Settings → Pages → Source: GitHub Actions**.

When you ship changes, bump `VERSION` in `sw.js` so installed copies pick up the update.
