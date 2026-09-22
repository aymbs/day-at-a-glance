# Dashboard: "POV: a vc baddie's life"

Personal daily dashboard. Single-file HTML/CSS/JS app, no build step.

## Project setup

- **Working file:** `day-at-a-glance/public/dashboard.html` (relative to the repo root)
- **Live URL:** https://day-at-a-glance-beta.vercel.app/dashboard.html
- **Repo:** github.com/aymbs/day-at-a-glance (public)
- **Host:** Vercel Hobby plan, auto-deploys on push to `main`
- **Storage:** browser localStorage only, key `day_at_a_glance_aymbre`
- **Git author MUST be:** `aymbs` / `aymbre@mendozaimpact.org`. Vercel Hobby refuses to build commits from any other author. Check with `git config user.name` and `git config user.email` before committing. If a commit goes out wrong: `git commit --amend --reset-author` then push.

## Deploying

Edit `day-at-a-glance/public/dashboard.html` directly, then:

```
git add . && git commit -m "short description" && git push
```

Force a redeploy without file changes: `git commit --allow-empty -m "redeploy" && git push`

After deploying, confirm the live version in the browser console (F12 > Console) by checking `typeof` on a function added in that change.

## Before every deploy

Extract the inline `<script>` block and run `node --check` on it. Two past outages came from quote-escaping bugs in generated `onclick` handlers inside template strings.

## Architecture

- All state lives in one global object `S`, persisted by `save()` to localStorage. `save()` does nothing else.
- **No cloud sync.** Supabase sync was removed on purpose after causing a data-loss bug (tasks vanishing as devices overwrote each other). Do not reintroduce sync.
- `migrateFromCloud()` runs once on load: pulls the last Supabase snapshot into localStorage, then sets `S._cloudMigrated = true` and never contacts the cloud again. On network failure it leaves the flag unset so it retries.
- Backups: Settings has Export (JSON download) and Import (restore from JSON). localStorage is the only copy of the data.
- **Never commit data exports** (`dashboard-data-*.json`) or any personal data. The repo is public. Keep `dashboard-data-*.json` in `.gitignore`.

## Features

Daily view (tasks with carryover, habits, workout log, intention, quote, calendar events, currently reading), weekly view (calendar grid, priorities, workouts, reading), monthly view (3 auto-tracking goals, reading progress, reflection), consistency heatmap, journal, Pomodoro with bell, settings, sticky notes panel.

- **Journal and sticky notes are rich text.** Both use `contenteditable` with toolbars (bold, italic, underline, strikethrough, heading, bullets, numbers, clear) driven by `document.execCommand`. Content is stored as HTML.
- `noteToHtml()` handles backward compatibility: older entries are plain text and get escaped and converted. `noteToText()` strips HTML for previews and empty checks. Use both helpers for anything that reads note content.
- **Sticky notes are resizable** via CSS `resize: both`. A `ResizeObserver` saves each note's size to `n.w` / `n.h`.
- Book search uses the Open Library API. Books with no page count return 0, so the add-book modal accepts both current and total pages.

## Hard-won lessons

- **Deleting a carried-over task copy is not enough.** The original on the past date must go too, or `carryOverTasks()` recreates it next load. `S._deletedLabels` tracks deleted labels to prevent this.
- `DELETED_TASK_BLACKLIST` is a hardcoded list of zombie task labels from the old sync era, purged on init. `'email zero'` was removed from it on purpose: it's a real recurring task.
- **Missing null guards cascade.** One `document.getElementById(...)` returning null in `renderAll()` silently breaks every render after it. Guard DOM lookups.
- **Safari home-screen bookmarks get isolated localStorage.** Use Safari directly.

## Fixed preferences

- Name: **Aymbré**
- Title: **POV: a vc baddie's life**
- Both are hardcoded defaults and must never be overwritten with empty values.
- Match the existing palette and type (CSS variables in `:root`: sage, blush, cream, gold; Cormorant Garamond display, Jost body, DM Mono).
