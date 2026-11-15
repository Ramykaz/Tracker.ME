# Tracker.ME

A fast, no-nonsense personal tracker: **habits, weight, Quran and journal** in one place.

- **Zero dependencies, no build step.** Plain HTML/CSS/JS, about 100 KB total before compression. Charts are hand-drawn SVG. Switching screens takes about 5 ms.
- **Works offline and installs to your phone.** It's a PWA: open it, then use "Add to Home Screen".
- **Cloud sync and backup.** Log in with your email and your data syncs between your phone and laptop, and survives a lost phone. It also works offline: changes you make offline sync when you're back online.

## What it tracks

| | |
|---|---|
| **Habits** | Build (yes/no), Build (amount, e.g. 8 glasses) or Quit. Frequencies: every day, **every N days** (e.g. every 2 days), certain weekdays, or X times per week. Streaks, best streak, 30-day rate, a calendar heatmap (tap a day to backfill it), and weekly charts. |
| **Weight** | Daily log, trend chart with a 7-day average and goal line, ranges (30D/90D/1Y/All), change, lowest, distance to goal, and BMI if you add your height. |
| **Quran** | Log pages per day. Your page, juz and khatm progress update automatically (604-page mushaf). Daily goal, streak, 30-day chart. |
| **Journal** | Mood plus free text for each day, a 60-day mood chart, and searchable entries. |

Every screen has a day picker, so you can log or fix past days.

## Turn on sync (one time, about 3 minutes)

1. Create a free project at [supabase.com](https://supabase.com) (New project, any name and region).
2. **SQL Editor → New query**: paste [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. **Authentication → URL Configuration**: set **Site URL** to your app's address (e.g. `https://ramykaz.github.io/Tracker.ME/`).
4. **Authentication → Email Templates → Magic Link**: add `{{ .Token }}` to the email body, so the email also contains a 6-digit code. This matters on iPhone, where a link opens Safari instead of the installed app.
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key. Put them in `config.js` (or paste them in the app under Settings → Sync).
6. In the app: **Settings → Sync**, enter your email, then type the code. Do the same on every device.

How it works: each entry (one weight, one habit check, one journal day…) syncs on its own, so editing on two devices doesn't overwrite unrelated changes. Row-level security means only your login can read or write your rows. The anon key is safe to make public.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy (GitHub Pages)

The workflow in `.github/workflows/pages.yml` deploys on every push to `main`.
One-time setup: **Settings → Pages → Source: GitHub Actions**.

When you ship changes, bump `VERSION` in `sw.js` so installed copies pick up the update.
