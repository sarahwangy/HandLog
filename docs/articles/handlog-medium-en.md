# I Built an AI Journal That Thinks With Me — A Vibe Coding Story

*How I went from "I want to reflect on my week" to a full-stack AI app in a few weeks, using Claude Code, Notion API, and a lot of vibing.*

---

## What Is HandLog?

HandLog is a personal AI journaling app that turns your raw daily notes into structured reflections — automatically.

Every day, I voice-record what happened. HandLog transcribes it, writes it into my Notion database, then uses Claude to generate a structured review: key people, events, emotions, energy distribution, growth zones, next steps, and a hand-drawn-style summary image. At the end of the week or month, it aggregates everything into a weekly or monthly review — and now, a visual summary table.

![HandLog Login Page — Sign in with Google to connect your Notion workspace](screenshot-login.png)
*The login page. One tap with Google, and your Notion workspace connects automatically.*

---

**The core loop:**

```
Voice / Text Input
      ↓
Whisper (OpenAI) — transcription
      ↓
Notion — stored in your own database
      ↓
Claude (Anthropic) — generates structured review JSON
      ↓
Review Page — rendered beautifully in the app
      ↓
Save back to Notion — toggle + callout blocks
      ↓
Weekly / Monthly Table — date + bullet points summary
```

![HandLog Flow Diagram — from voice input to structured Notion review](screenshot-flow.png)
*The full pipeline: your voice goes in, a structured life review comes out — all saved to your own Notion.*

---

## The Problem I Was Solving

I kept a Notion journal, but reviewing it was painful. I had to manually read through a week of notes, try to find patterns, write a summary. It took 30–60 minutes and I often skipped it.

I wanted something that could:
1. Let me dump thoughts quickly (voice or text)
2. Automatically structure them
3. Surface patterns I'd miss manually
4. Keep everything in my existing Notion setup

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js (Google OAuth) |
| Storage | Vercel KV (Redis) |
| Database | Notion (user's own workspace) |
| AI — Text | Claude Haiku / Sonnet (Anthropic API) |
| AI — Speech | Whisper (OpenAI API) |
| AI — Images | gpt-image-1 (OpenAI API) |
| Deployment | Vercel |
| Analytics | Vercel Analytics + Sentry |
| Charts | Recharts |
| Image render | Satori + @resvg/resvg-js |

---

## APIs Used

### Anthropic Claude API
The brain of the app. Used for:
- **Daily review generation** — takes raw journal text, returns structured JSON (people, events, emotions, score, next steps, etc.)
- **Weekly review** — aggregates 7 days of data into patterns and trends
- **Monthly review** — full month retrospective
- **Table bullet extraction** — `generateWeeklyTableBullets` and `generateMonthlyTableBullets` extract 2–4 key points per day

Models used:
- `claude-sonnet-4-6` for complex reviews (22-section structured output)
- `claude-haiku-4-5` for table bullet extraction (cheaper, faster)

Key technique: **prompt caching** — the system prompt is cached by Anthropic's infrastructure, reducing token costs on repeat calls.

### OpenAI API
Two use cases:
- **Whisper** — voice transcription (`/api/transcribe`). Turns 30-second voice memos into text before Claude processes them.
- **gpt-image-1** — generates a hand-drawn-style summary image for each daily review, stored in Notion.

### Notion API (`@notionhq/client`)
Used as the persistent database. Every journal entry, review, and table is stored in the user's own Notion workspace. Key operations:
- `databases.query` — fetch entries by date range
- `pages.create` — create new journal entries
- `blocks.children.append` — write review content as nested blocks (Toggle → Callout → content)

### Vercel KV (Redis)
Used to store:
- User's Notion token (encrypted)
- User's database schema mapping (which Notion field is which)
- Cross-session chat memory

---

## AI Skills & Techniques

### 1. Structured JSON Output
Every Claude call returns structured JSON, not prose. For example, the daily review returns:

```json
{
  "people": ["mentor Chloe", "colleague Mia"],
  "emotions": ["energized", "focused"],
  "events": [{"category": "Learning", "items": ["Finished API module"]}],
  "score": 8,
  "scoreReason": "High output, felt in flow state",
  "nextSteps": ["Submit PR by Thursday", "Morning run streak day 5"],
  "reviewParagraph": "Today was a productive and energizing day..."
}
```

This lets the UI render each field as a separate card, tag cloud, or chart.

### 2. Batch Processing to Save Tokens
For the monthly table, instead of calling Claude once per week (4–5 calls), all weeks are combined into one prompt:

```
// Before: 4-5 Claude calls
for each week → Claude call → bullets

// After: 1 Claude call
all weeks combined → Claude call → all bullets
```
**Result: ~75% token cost reduction for monthly tables.**

### 3. Prompt Engineering for Format Control
Prompts include explicit JSON schema examples so Claude always returns parseable output:

```
Output as a JSON array with the following structure:
[{"date": "5-4", "bullets": ["item 1", "item 2"]}]
Output JSON only, no other text.
```

### 4. Error-Resilient JSON Parsing
Claude sometimes wraps JSON in markdown code fences. The app uses `extractJson()` + `sanitizeJson()` helpers to strip the wrapping before parsing:

```typescript
const start = text.indexOf("[");
const end = text.lastIndexOf("]");
const arrayText = text.slice(start, end + 1);
return JSON.parse(sanitizeJson(arrayText));
```

### 5. Streaming Chat
The `/api/chat` route uses Claude's streaming API for real-time responses in the Chat page. Uses `AbortController` so the user can stop generation mid-stream.

### 6. Emotion-Aware Chat
When the user selects a mood emoji before chatting (😊 😔 😤 😴), it's passed to the backend and injected into the Claude system prompt to adjust tone.

---

## The Vibe Coding Process

This project was built using **Claude Code** — Anthropic's CLI coding assistant — in a style I'd call "vibe coding": describing what I want in natural language, letting the AI handle implementation, then reviewing and iterating.

### The Workflow

```
User describes feature in natural language
          ↓
Brainstorming skill — explore intent, requirements, design
          ↓
Writing Plans skill — create step-by-step implementation plan
          ↓
Subagent-Driven Development — fresh AI agent per task
          ↓
Spec Review — did implementation match the spec?
          ↓
Code Quality Review — is the code clean?
          ↓
Push to Vercel
```

### Superpowers Skills Used

Claude Code has a plugin system called **Superpowers** that provides specialized skills:

- **`superpowers:brainstorming`** — Before any new feature, a brainstorming session explores user intent, edge cases, and design options. Forces you to think before you code.
- **`superpowers:writing-plans`** — Converts a design into a detailed implementation plan with exact file paths, code snippets, and test commands.
- **`superpowers:subagent-driven-development`** — Dispatches a fresh AI agent per task. Each agent has zero context pollution from previous tasks. After each task, a spec compliance reviewer and code quality reviewer check the work.
- **`superpowers:systematic-debugging`** — When a bug appears, this skill forces structured root-cause analysis before jumping to fixes.
- **`superpowers:verification-before-completion`** — Before claiming "done", requires running actual verification commands. No false positives.

### What "Vibe Coding" Actually Looks Like

**Example: Building the weekly table feature**

Me: *"I need a Generate Table button in the Review page, weekly and monthly versions. Read from Notion, extract key daily events as bullet points, show as a table, save back to Notion."*

Brainstorming session: 3 clarifying questions → design approved

Writing Plans: 9-task plan with exact code for every step

Subagent execution:
- Task 1 → fresh agent → writes `generateTableBullets` in `claude.ts` → spec review ✅ → quality review finds missing error handling → fix → approved
- Task 2 → fresh agent → writes 3 Notion helper functions → reviewed ✅
- Tasks 3–6 → 4 API routes created and reviewed
- Task 7 → UI changes to `ReviewContent.tsx`

Total time from description to working feature: ~45 minutes.

---

## App Pages

![HandLog Daily Review Page — emotions, energy distribution, next steps](screenshot-review.png)
*The Daily Review tab: AI breaks your journal entry into emotions, energy usage, people, and next steps — rendered as cards.*

### Capture (`/capture`)
The input page. Supports:
- Text input
- Voice recording (browser speech recognition)
- Whisper transcription (upload audio)

Writes to Notion's `简短日常` field on the current week's page.

### Review (`/review`)
Three tabs:
- **Daily** — today's AI-generated review with cards for every dimension
- **Weekly** — aggregated weekly review + generate/save weekly table
- **Monthly** — monthly retrospective + generate/save monthly table

### Dashboard (`/dashboard`)
Stats view: word cloud from journal content, score trends, top people and places.

### Timeline (`/timeline`)
A card wall showing every day of journal content, parsed from weekly entries, displayed chronologically.

![HandLog Profile Page — journal stats, Notion connection, settings](screenshot-profile.png)
*The Me page: your journaling stats (entries, weeks, average score), Notion connection status, and preferences.*

### Chat (`/chat`)
An AI assistant that has read your Notion journal as context. Ask it questions like "What was I stressed about in May?" or "What are my patterns around energy?"

### History (`/history`)
Review history — all previously generated reviews.

---

## Example: How a Weekly Table Is Generated

**Input:** Week "5-4-10" (May 4–10)

**Step 1:** API reads the week page's `简短日常` field from Notion:
```
一. Morning run 5km, April retrospective review, coffee catchup with friend Mia
二. Yoga session, completed April retrospective with AI suggestions, meal prep for the week
三. Booked June watercolor workshop, organized AI project ideas database
```

**Step 2:** Sent to Claude Haiku with prompt: *"Identify each day's content, extract 2–4 key points per day, return JSON array."*

**Step 3:** Claude returns:
```json
[
  {"date": "5-4", "bullets": ["Morning run 5km", "April retrospective review", "Coffee with Mia"]},
  {"date": "5-5", "bullets": ["Yoga session", "Completed retrospective with AI suggestions"]},
  ...
]
```

**Step 4:** Formatted as markdown table and rendered in the app

**Step 5:** User clicks Save → written to Notion as Toggle block containing a native table

---

## What I Learned

1. **Notion as a database is powerful but quirky.** The block hierarchy (page → toggle → callout → paragraph) requires multiple sequential API calls. You can't create nested blocks in one shot.

2. **Prompt engineering is real engineering.** Getting Claude to always return valid, parseable JSON took several iterations of prompt design and error handling.

3. **Vibe coding works best with structure.** The Superpowers brainstorm → plan → subagent loop prevented a lot of wasted work. The spec review step caught missing requirements before they became bugs.

4. **Token cost adds up fast.** Switching monthly table from 4–5 Claude calls to 1 batch call cut costs ~75% with the same output quality.

5. **The hardest part wasn't AI — it was data modeling.** Understanding where Notion stores data (week page vs daily page, properties vs blocks) was the main source of bugs.

---

## Try It Yourself

The project is built for personal use with your own Notion workspace. You'll need:
- Anthropic API key (Claude)
- OpenAI API key (Whisper + image generation)
- Notion integration token + database ID
- Vercel account for deployment

The whole stack is serverless, costs pennies per day to run, and keeps all your data in your own Notion.

---

*Built with Claude Code, vibing all the way.*
