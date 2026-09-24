# Dashboard: "POV: a vc baddie's life"

Personal daily dashboard. Single-file HTML/CSS/JS app, no build step.

## Project setup

- **Working file:** `day-at-a-glance/public/dashboard.html` (relative to the repo root)
- **Live URL:** https://day-at-a-glance-beta.vercel.app/dashboard.html
- **Repo:** github.com/aymbs/day-at-a-glance (public)
- **Host:** Vercel Hobby plan, auto-deploys on push to `main`
- **Storage:** browser localStorage only, key `day_at_a_glance_aymbre`, plus optional cross-device sync (see Architecture)
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

- All state lives in one global object `S`, persisted by `save()` to localStorage, which also writes a rotating daily snapshot (`STORE_KEY + '_backup_' + date`, 30-day retention) for local recovery. Settings has "Restore from local backup" to roll back to any of those days.
- **Cross-device sync (rebuilt 2026-09) is a three-way MERGE, never a whole-state overwrite.** This replaced an earlier "last write wins" sync (`migrateFromCloud()`, pulling one Supabase blob and replacing all of localStorage) that caused a real data-loss incident and was fully removed. The old lesson stands — **never reintroduce whole-document last-write-wins sync** — but per-item merging is safe and is what's implemented now:
  - `S._syncBase` holds the state as of the last successful sync (what both sides last agreed on). Sync computes `syncMergeState(base, local, remote)` per collection: id-keyed arrays (tasks, weeklyPriorities, goals, reminders, stickyNotes, books, workouts) merge by `id`, date-keyed maps (notes, workoutLogs, intention, pomSessions, and each habit's `history`) merge by date key. Only fields that actually changed since `base` move; unrelated data is untouched. A field genuinely changed differently on both sides falls back to preferring local — the only "wins" behavior left, and scoped to one field on one item, not the whole document.
  - `calEvents`/`calLastFetch` and `settings.gcalToken`/`gcalConnected` are excluded from sync (device-local, re-fetched independently per device).
  - Backend: Next.js API route `src/app/api/sync/route.ts` (this repo is a real Next.js app — Vercel builds it, `public/dashboard.html` is just a static file inside it). It holds the Supabase **service role** key server-side only (env vars `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_*`) and enforces optimistic concurrency (rejects a push with 409 if the row moved since the client's last read; client retries).
  - Client access to that route is gated by a shared `SYNC_TOKEN` embedded in `dashboard.html` (`x-sync-token` header). This is obscurity, not real auth — acceptable for a single-user personal app, but don't mistake it for access control if this ever stops being single-user.
  - Sync is manual-only by design (Settings → "Sync now" button, plus once automatically on page load): no background polling. Earlier abandoned attempts at auto-pull-every-N-seconds sync are why — see git history around the sync rebuild.
  - The `dashboard_sync` Supabase table has RLS enabled with **no policies**, so only the service-role key (server-side) can touch it — the client-embedded `SYNC_TOKEN` is the only gate on the API route itself.
- Backups: Settings has Export (JSON download), Import (restore from JSON), and the local rotating backups above. Sync is a second copy of the data once configured, but treat localStorage as the source of truth for a single device.
- **Never commit data exports** (`dashboard-data-*.json`) or any personal data. The repo is public. Keep `dashboard-data-*.json` in `.gitignore`.

## Features

Daily view (tasks with carryover, habits, workout log, intention, quote, calendar events, currently reading), weekly view (calendar grid, priorities, workouts, reading), monthly view (3 auto-tracking goals, reading progress, reflection), consistency heatmap, journal, Pomodoro with bell, settings, sticky notes panel.

- **Journal and sticky notes are rich text.** Both use `contenteditable` with toolbars (bold, italic, underline, strikethrough, heading, bullets, numbers, clear) driven by `document.execCommand`. Content is stored as HTML.
- `noteToHtml()` handles backward compatibility: older entries are plain text and get escaped and converted. `noteToText()` strips HTML for previews and empty checks. Use both helpers for anything that reads note content.
- **Sticky notes are resizable** via CSS `resize: both`. A `ResizeObserver` saves each note's size to `n.w` / `n.h`.
- Book search uses the Open Library API. Books with no page count return 0, so the add-book modal accepts both current and total pages.

## Hard-won lessons

- **Deleting a carried-over task copy is not enough.** The original on the past date must go too, or `carryOverTasks()` recreates it next load. `S._deletedLabels` tracks deleted labels to prevent this.
- **`carryOverTasks()` must generate deterministic ids, not `uid()`.** It used to (bug found 2026-09-24): two devices carrying the same overdue task forward on a day they hadn't synced with each other each generated a different device-local id for it, so the sync merge (which matches by id) kept both as "different" tasks — a visible duplicate that then kept getting carried forward every day after, compounding. Fixed by deriving the carried copy's id from `oldTask.id + daysSinceEpoch(todayKey_) * 1000000` (same original + same day always produces the same id, converges on merge) instead of `uid()`. `dedupeTasks()` (collapses by label+date) now also runs at the start of every `carryOverTasks()` call as a self-healing backstop. If duplicate rows ever reappear, check whether some other id-generating code path (not just carried tasks) is creating device-local ids for what should be the same synced item.
- `DELETED_TASK_BLACKLIST` is a hardcoded list of zombie task labels from the old sync era, purged on init. `'email zero'` was removed from it on purpose: it's a real recurring task.
- **Missing null guards cascade.** One `document.getElementById(...)` returning null in `renderAll()` silently breaks every render after it. Guard DOM lookups.
- **Safari home-screen bookmarks get isolated localStorage.** Use Safari directly.

## Fixed preferences

- Name: **Aymbré**
- Title: **POV: a vc baddie's life**
- Both are hardcoded defaults and must never be overwritten with empty values.
- Match the existing palette and type (CSS variables in `:root`: sage, blush, cream, gold; Cormorant Garamond display, Jost body, DM Mono).
