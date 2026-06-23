# HandLog — Development Timeline

> Project start: **2026-05-26**
> Status: Live at [hand-log.vercel.app](https://hand-log.vercel.app)

---

## Tools Overview

| Date | Tools Used | Skills | Agents |
|------|-----------|--------|--------|
| 5/26 Tue | Claude Code CLI, Next.js, Tailwind, Notion SDK, Whisper API | `/frontend-design`, `/brainstorming`, `/writing-plans` | Explore Agent |
| 5/27 Wed | Recharts, gpt-image-1, Notion API | — | Explore Agent |
| 5/28 Thu | Google OAuth, NextAuth.js, Anthropic SDK | `/debugging` | Explore Agent |
| 5/29 Fri | Tailwind responsive design | — | — |

**Key problems solved per day:**

| Date | Problems Solved |
|------|----------------|
| 5/26 Tue | Voice recording + auto-save on Capture page; Notion connection; UI layout |
| 5/27 Wed | Dashboard data fetching; Timeline card display; AI image API integration |
| 5/28 Thu | Weekly/monthly review JSON parse crash; Notion 100-block write limit; Login callback URL |
| 5/29 Fri | Mobile layout; Timeline restructured from daily to weekly; Search not finding content |

---

## Day 1 · 2026-05-26 · Project Setup

### What was built
- Initialised Next.js 14 project (App Router + TypeScript)
- Set up shadcn/ui + Tailwind CSS
- Configured next-intl for i18n (Chinese/English)
- Configured next-themes for dark/light mode
- Added Vercel KV utilities for draft auto-save
- Added Sentry error monitoring + Vercel Analytics
- Designed full UI Mockup (8 pages as static HTML)
- Built Capture page: text input + draft auto-save + restore draft
- Integrated OpenAI Whisper for voice transcription
- Integrated Notion SDK: read/write database, encrypt access token in Vercel KV
- Integrated Claude SDK: generate structured daily review JSON
- Built Review page: display all daily review fields

### Problems solved
- Tailwind and shadcn/ui compatibility conflict
- Notion OAuth flow (NextAuth + Notion Provider)
- Draft auto-save debounce logic (save every 3 seconds)
- Whisper API auto language detection (removed manual language selector)

### Tools used
| Tool | Purpose |
|------|---------|
| Claude Code CLI | Full conversation-driven development |
| `/frontend-design` skill | Generated 8-page HTML UI Mockup for browser preview before coding |
| `/brainstorming` skill | Defined MVP scope and prioritised features |
| `/writing-plans` skill | Generated step-by-step implementation plan (T-101 to T-308) |
| Explore Agent | Fast code search to avoid duplicate implementations |

---

## Day 2 · 2026-05-27 · Core Features + Design System

### What was built
- Unified Autumn warm-brown design system (#C4783A primary + #FDFAF6 background)
- E6: Integrated OpenAI gpt-image-1 to generate daily journal-style images, saved to Notion Toggle
- E7: Dashboard page (line chart + tag frequency bar chart + recent entries list)
  - Real-time data from Notion, removed KV cache layer
  - Charts built with Recharts
- E8: Write all 18 daily review sections to Notion (Toggle → Callout → content blocks)
- E11: Timeline page (colour card wall + grouped by month + gradient colours + load more)
- Switched Notion auth: from OAuth to Internal Integration Token

### Problems solved
- Parsing Notion week title format (`5-25-31` → extract Monday date → expand by day)
- Dashboard filtering out non-weekly entries (monthly summary pages have different title format)
- `gpt-image-1` model name (previously used `dall-e-3` which caused API error)
- KV occasional failures on Vercel → switched to direct Notion reads for stability

---

## Day 3 · 2026-05-28 · Weekly/Monthly Reviews + Bug Fixes

### What was built
- E13/E14: Weekly + monthly review features live
  - Claude reads current week/month entries → generates structured JSON → UI display
  - All 18 sections displayed (people, mood arc, energy distribution, progress zone, etc.)
  - Historical date selector (view reviews for any past week/month)
- Separated Generate and Save: Generate only produces output, Save button triggers Notion write
- Created `/api/review/weekly/save` and `/api/review/monthly/save` as separate routes
- Fixed Notion 100-block limit (batch append, max 100 blocks per request)
- Fixed JSON parse crash (2 bugs, see below)
- Integrated Google OAuth login (replaced Notion OAuth) + email whitelist
- Updated README (project intro + Mermaid flow diagram)
- Created `handlog-demo.html`: standalone HTML demo file for interviewers

### Bugs fixed

**Bug 1 — JSON crash at position 3424**
- Cause: `sanitizeJson()` ran before `extractJson()`, preamble text from Claude with quotes confused string state tracking
- Fix: Run `extractJson()` first to extract the JSON object, then `sanitizeJson()` to clean it

**Bug 2 — JSON crash near `「照顾好自己」`**
- Cause: `sanitizeJson()` treated Chinese book-title brackets `「」` (U+300C/300D) as JSON string delimiters
- Fix: Extracted `「」` as a special case, preserved as plain content characters, does not toggle `inStr` state

**Bug 3 — Notion write error: `body.children.length should be ≤ 100`**
- Cause: Monthly review generated 137 blocks, exceeding Notion's single API call limit
- Fix: Added `batchAppend()` helper to split blocks into batches (≤ 100 per batch)

**Bug 4 — Vercel login failure**
- Cause: `NEXTAUTH_URL` was set to `http://localhost:3001`, causing wrong callback URL in production
- Fix: Updated `NEXTAUTH_URL` in Vercel Dashboard to `https://hand-log.vercel.app`

---

## Day 4 · 2026-05-29 · Mobile UI + Timeline Refactor

### What was built
- Full mobile responsiveness:
  - AppNav: hide top nav links on mobile, added fixed bottom Tab Bar (4 tabs + emoji icons)
  - Capture page: two-column layout → single column on mobile, Writing Tips moved below
  - Dashboard: StatCard font size reduced for mobile, charts stacked vertically
  - Global padding: `px-8` → `px-4 sm:px-8`, fixed right-side overflow on mobile
- Timeline refactor: from "expand by day" to "one card per week"
  - Each card maps to one Notion row (one week), shows date range, one-liner insight, score, tags
  - Added `WeekEntry` type and `toWeekEntries()` function
  - Default: show last 3 months
- Fixed Timeline search: added full daily summary text to search index

### Problems solved
- Two-column grid misalignment on mobile (Writing Tips floating to the right on Capture page)
- Dashboard donut chart text overflowing container
- Timeline search missing journal content (`dailySummary` field not included in search)

---

## Project Summary

| Dimension | Details |
|-----------|---------|
| Development time | 4 days (2026-05-26 to 2026-05-29) |
| Total commits | ~50 |
| Primary language | TypeScript + React (Next.js 14) |
| Core AI | Claude Sonnet (daily/weekly/monthly review generation) |
| Other APIs | OpenAI Whisper (voice transcription), gpt-image-1 (image generation), Notion API |
| Deployment | Vercel (auto CI/CD on every push) |
| Skills used | `/frontend-design`, `/brainstorming`, `/writing-plans`, `/debugging` |
| Agents used | Explore Agent (code search), general-purpose Agent (complex analysis) |
