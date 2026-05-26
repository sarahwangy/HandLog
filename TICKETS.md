# Tickets — HandLog MVP

> PRD: `PRD.md`
> Unit: person-day (1d ≈ 6 focused hours)
> Priority: P0 must-do / P1 important / P2 defer

---

## Epic Overview

| Epic | Description | Days | Priority |
|---|---|---|---|
| E1 | Scaffolding & infrastructure | 2d | P0 |
| E2 | Auth & Notion integration | 3.5d | P0 |
| E3 | Capture page | 3.5d | P0 |
| E4 | AI processing (Claude) | 4d | P0 |
| E5 | Review page | 2.5d | P0 |
| E6 | HandLog image generation | 4d | P0 |
| E7 | Dashboard | 2d | P0 |
| E8 | Auto weekly/monthly review (Cron) | 5d | P0 |
| E9 | Deploy & docs | 1.5d | P0 |
| **Total** | | **~28 days** | |

---

## E1 — Scaffolding & Infrastructure ✅ Done

### Story 1.1: Project init
- **T-101** ✅ Create Next.js 14 project (App Router, TypeScript, ESLint)
- **T-102** ✅ Configure Tailwind CSS + shadcn/ui (Button, Input, Card, Dialog)
- **T-103** ✅ Set up next-intl (English only for MVP)
- **T-104** ✅ Configure theme (next-themes, light/dark)

### Story 1.2: Infrastructure
- **T-105** ✅ Vercel project + env vars (Anthropic key, Notion client id/secret, KV)
- **T-106** ✅ Vercel KV utils: `getDraft/setDraft/deleteDraft`, `getNotionCache/setNotionCache`, `getPendingSummary/setPendingSummary`
- **T-107** Vercel Analytics setup — 0.2d — P1

---

## E2 — Auth & Notion Integration ✅ Done

### Story 2.1: Notion OAuth
- **T-201** ✅ Create Notion integration in developer portal, configure redirect URL
- **T-202** ✅ Implement NextAuth with custom Notion OAuth provider
- **T-203** ✅ Encrypt and store access token in Vercel KV (AES-256-GCM)
- **T-204** ✅ Token refresh logic + NotionAuthError class for 401 detection

### Story 2.2: Notion API wrapper
- **T-205** ✅ Notion SDK wrapper: `createPage`, `queryDatabase`, `updatePage`, `getDatabase`, `appendBlocks`
- **T-206** ✅ Database field mapping (UI fields ↔ Notion properties), `buildNotionProperties()`

---

## E3 — Capture Page (in progress)

### Story 3.1: Layout ✅ Done
- **T-301** ✅ Create `/capture` route + page layout
- **T-302** ✅ AppNav component (Logo + tabs + avatar)

### Story 3.2: Text input ✅ Done
- **T-303** ✅ Textarea + character count
- **T-304** ✅ Autosave draft (debounce 3s + onBlur) to Vercel KV
- **T-305** ✅ Draft recovery on page load (GET /api/draft)

### Story 3.3: Voice input
- **T-306** `useSpeechRecognition` hook wrapping Web Speech API — 0.7d — P0
  - Start/stop recording
  - Real-time transcript via `onresult`
  - Language: `en-US` default
  - Error handling: not supported, permission denied, no speech
- **T-307** Mic button UI — 0.5d — P0
  - States: idle / recording / processing
  - Pulse animation while recording
  - Shows recording duration
- **T-308** Append transcript to textarea (don't overwrite existing text) — 0.3d — P0
- **T-309** Safari fallback message (Web Speech API not available) — 0.2d — P1

---

## E4 — AI Processing (Claude)

### Story 4.1: Claude SDK setup
- **T-401** Install `@anthropic-ai/sdk`, write base call function with streaming — 0.5d — P0
- **T-402** Prompt file structure: `/src/prompts/daily-review.md`, `/src/prompts/weekly-review.md`, `/src/prompts/monthly-review.md` — 0.2d — P0

### Story 4.2: Daily review prompt
- **T-403** Write prompt for daily review — 1.5d — P0
  - Input: raw journal text + today's date + user's existing Notion labels
  - Output: structured JSON matching §4.1 of PRD
  - Sections: people, places, events, books, podcasts/bloggers, movies/TV, parenting, health, finance, learning, creative output, emotions, review paragraph, next steps, energy distribution, progress zones, score
  - Each section only included if content exists
  - Score: 1-10, AI suggests with brief reason
- **T-404** Prompt evaluation: run 10 historical journal entries through prompt, verify output quality — 0.5d — P0

### Story 4.3: API route
- **T-405** `/api/process` POST — 0.5d — P0
  - Auth check
  - Read draft from KV
  - Call Claude with daily review prompt
  - Stream response back to client
  - Store result in KV as `review:{userId}:{date}`
- **T-406** User API key support (Plan B): read `anthropic_key:{userId}` from KV, fall back to env var — 0.3d — P0

---

## E5 — Review Page

### Story 5.1: Layout
- **T-501** Create `/review/:draftId` route — 0.3d — P0
- **T-502** Display each review section as editable card — 1d — P0
  - One-line insight, review paragraph, next steps, score, labels — all editable
  - Sections for people/places/events/books/etc — read-only preview, collapsible
  - Progress zones display
  - Energy distribution display

### Story 5.2: Actions
- **T-503** "Regenerate" button per field (calls `/api/process` with field-specific prompt) — 0.5d — P1
- **T-504** Score adjustment slider (1-10) — 0.2d — P0
- **T-505** Label management: add/remove, new labels sync to Notion — 0.5d — P0
- **T-506** "Confirm → Generate HandLog Image" button → navigate to `/handlog/:entryId` — 0.2d — P0

---

## E6 — HandLog Image Generation

### Story 6.1: SVG templates
- **T-601** Design 3 Satori component templates — 1.5d — P0
  - Minimal: clean lines, serif font, warm cream background
  - Cute: rounded corners, soft colors, small icons
  - Vintage: aged paper texture effect, decorative borders
- **T-602** Template parameterization: date, keywords, one-line insight, score dots, next steps checklist, HandLog watermark — 0.5d — P0
- **T-603** Color theme per dominant tag (e.g. parenting → pink, learning → blue) — 0.3d — P0

### Story 6.2: Render & export
- **T-604** Integrate Satori + sharp: React component → SVG → PNG — 0.7d — P0
- **T-605** `/api/handlog/generate` POST: returns PNG buffer — 0.3d — P0
- **T-606** Client-side preview + style switcher (Minimal / Cute / Vintage) — 0.5d — P0

### Story 6.3: Upload & submit
- **T-607** Upload PNG to Vercel Blob, get public URL — 0.3d — P0
- **T-608** Upload PNG to Notion as page cover (use external URL from Blob) — 0.3d — P0
- **T-609** Write full daily entry to Notion main database — 0.3d — P0
  - Name (date), daily summary, labels, score, one-line insight, review blocks, next steps, image URL
- **T-610** Append structured review as Notion blocks to review summary page — 0.3d — P0
  - Use `appendBlocks()` with date heading + all sections
- **T-611** Success state: show "Saved to Notion ✓" + link to Notion page — 0.2d — P0

---

## E7 — Dashboard

### Story 7.1: Data layer
- **T-701** `/api/dashboard` GET: fetch all entries from Notion, cache 5min in KV — 0.5d — P0
- **T-702** Data transform utils: compute tag frequency, score series, daily entry count per date — 0.3d — P0

### Story 7.2: Charts
- **T-703** Create `/dashboard` route + page layout — 0.2d — P0
- **T-704** Tag distribution pie chart (Recharts `PieChart`) — 0.3d — P0
- **T-705** Score trend chart (Recharts `LineChart` or `BarChart`) — 0.3d — P0
- **T-706** Review frequency heatmap (GitHub-style, last 12 weeks) — 0.5d — P0
  - Each cell = one day; filled = entry exists; color intensity = score

---

## E8 — Auto Weekly / Monthly Review (Cron)

### Story 8.1: Completeness checker
- **T-801** `checkWeekCompleteness(userId, weekId)` — 0.3d — P0
  - Query Notion for entries in date range Mon–Sun
  - Return `{ filled: Date[], missing: Date[], canRun: boolean }`
  - `canRun = true` if missing ≤ 2 days
- **T-802** `checkMonthCompleteness(userId, yearMonth)` — 0.3d — P0
  - Same logic, threshold ≤ 20% of days missing

### Story 8.2: Pending state machine
- **T-803** KV schema: `pending_review:{userId}:{periodId}` → `{ type, missingDays, createdAt, expiresAt }` — 0.2d — P0
- **T-804** Expiry: week reviews expire following Wednesday; month reviews expire 5th of next month — 0.2d — P0

### Story 8.3: Weekly review prompt
- **T-805** Write weekly review prompt — 1.5d — P0
  - Input: all daily review JSONs for the week
  - Output: Markdown following PRD §4.2 template
  - Sections ①–④ + scores + week-in-one-line + quote
  - Dynamic section rule: add section if theme appears ≥3 times and doesn't fit existing sections (max 12 sections)
  - Cross-week pattern flag: if same pattern seen in previous weeks, call it out
- **T-806** Prompt evaluation: run 4 historical weeks, verify quality — 0.5d — P0

### Story 8.4: Monthly review prompt
- **T-807** Write monthly review prompt — 1d — P0
  - Input: all weekly review Markdowns for the month + all daily review JSONs
  - Output: Markdown following PRD §4.3 template
  - Sections ①–⑥ + completion rate + energy distribution + next month direction + quote
  - Cross-month pattern flag
- **T-808** Prompt evaluation: run 2 historical months — 0.5d — P0

### Story 8.5: Review image
- **T-809** Weekly review HandLog image template (Satori) — 0.7d — P0
  - Contains: keywords, score radar, week-in-one-line, top 3 next steps
- **T-810** Monthly review HandLog image template (Satori) — 0.7d — P0
  - Contains: keywords, top 6 highlights, month-in-one-line

### Story 8.6: Write back to Notion
- **T-811** Convert Markdown to Notion blocks array — 0.5d — P0
  - Handle: headings, bullet lists, numbered lists, blockquotes, tables, checkboxes
  - Use `@tryfabric/martian` library or custom parser
- **T-812** Write weekly review + image to Notion review summary page — 0.3d — P0
- **T-813** Write monthly review + image to Notion review summary page — 0.3d — P0

### Story 8.7: Cron jobs
- **T-814** `vercel.json` cron config — 0.2d — P0
  ```json
  { "path": "/api/cron/weekly-review",  "schedule": "0 13 * * 0"      },
  { "path": "/api/cron/monthly-review", "schedule": "0 13 28-31 * *"   },
  { "path": "/api/cron/retry-pending",  "schedule": "0 14 * * *"       }
  ```
- **T-815** `CRON_SECRET` env var + auth header check on all cron routes — 0.2d — P0
- **T-816** `/api/cron/weekly-review` — 0.5d — P0
  - For each user: check completeness → run or set pending
  - Generate review → generate image → write to Notion
- **T-817** `/api/cron/monthly-review` — 0.4d — P0
  - Check if today is last day of month (tomorrow = 1st)
  - Same flow as weekly
- **T-818** `/api/cron/retry-pending` — 0.4d — P0
  - Scan all `pending_review:*` keys
  - Re-check completeness; run if now eligible; mark expired if past deadline

### Story 8.8: Email notifications
- **T-819** Integrate Resend — 0.3d — P1
- **T-820** Email templates — 0.2d — P1
  - "Missing X days this week — fill in to get your review 🌱"
  - "Your weekly review is ready ✨"
  - "Week skipped — not enough entries"

---

## E9 — Deploy & Docs

- **T-901** Vercel production config (domain, env vars, KV, Blob) — 0.3d — P0
- **T-902** GitHub Actions CI (lint, type-check) — 0.3d — P0
- **T-903** README (setup instructions, env vars list, architecture diagram) — 0.5d — P0
- **T-904** `.env.example` with all required vars — 0.1d — P0

---

## Sprint Plan

### Sprint 1 (current) — Input loop
- ✅ E1, E2 done
- ✅ E3 Story 3.1, 3.2 done
- 🔲 E3 Story 3.3 (voice input)
- **Deliverable**: user can log in, connect Notion, type/speak, draft autosaves

### Sprint 2 — AI processing + Review
- E4 all
- E5 all
- **Deliverable**: full flow Capture → AI review → edit → confirm

### Sprint 3 — HandLog image + Notion write
- E6 all
- **Deliverable**: image generated, uploaded to Notion, daily entry complete

### Sprint 4 — Dashboard
- E7 all
- **Deliverable**: charts showing real Notion data

### Sprint 5 — Auto reviews
- E8 all
- **Deliverable**: Sunday cron generates weekly review; month-end generates monthly review

### Sprint 6 — Deploy
- E9 all
- **Deliverable**: live on Vercel

---

## Risk Register

| Ticket | Risk | Mitigation |
|---|---|---|
| T-306 | Web Speech API not supported on Safari iOS | Show fallback message, text input always available |
| T-403 | AI output doesn't match expected JSON schema | Strict JSON schema in prompt + zod validation on response |
| T-601 | Chinese font rendering in Satori | Test early; fallback to system-ui |
| T-608 | Notion doesn't accept direct file upload | Use Vercel Blob public URL as external file reference |
| T-811 | Markdown → Notion blocks edge cases | Use `@tryfabric/martian`; write test cases for all block types |
| T-814 | Monthly cron fires on days 28-31 every month | Code check: `new Date(year, month, 0).getDate() === today.getDate()` |
| T-816 | Cron timeout (Vercel hobby: 10s limit) | Use Vercel Pro (60s) or move to background queue |
