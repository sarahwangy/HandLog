# HandLog ✍️

**HandLog** is an AI-powered journaling and reflection tool that transforms your daily notes into structured daily / weekly / monthly reviews, automatically saved to Notion.

🔗 **Live Demo**: [hand-log.vercel.app](https://hand-log.vercel.app)\
📄 **Static Demo**: Open [`handlog-demo.html`](./handlog-demo.html) locally to preview all pages\
📝 **Read the Story**: [I Built an AI Journal That Thinks With Me](https://medium.com/@sarahwang9/i-built-an-ai-journal-that-thinks-with-me-a-vibe-coding-story-1f62ebb31e42)\
🇨🇳 **中文文档**: [README_CN.md](./README_CN.md)

---

## Why I Built This

I used to spend 10–15 minutes every night trying to recall what actually happened during the day — writing fragmented notes that never turned into anything useful. I wanted a tool that could take my raw, messy thoughts and turn them into something structured I could actually reflect on.

HandLog was born from that frustration. You speak or type freely, and the AI does the hard work: organizing your thoughts into a daily review with mood scores, key people, events, and reflections — then saving everything to Notion automatically. At the end of the week or month, one click generates a review that shows you patterns you wouldn't have noticed on your own.

---

## Features

### ✍️ Capture

Speak or type freely — HandLog handles the structure. Voice input is transcribed via Whisper, then Claude generates a structured daily review with mood score, key people, notable events, and a personal reflection. Everything auto-saves to your Notion database.

- Voice recording with real-time Whisper transcription
- AI-generated daily review: mood (1–10), energy, key people, events, reflection
- Auto-save to Notion with one click
- Edit any field before saving

---

### 📅 Review

One click generates a weekly or monthly review by reading your past Notion entries. No manual summarising — Claude reads your week and surfaces patterns you wouldn't have noticed.

- Weekly review: mood arc, progress highlights, next week intentions
- Monthly review: recurring themes, energy patterns, month-in-review narrative
- Generated reviews saved back to Notion as separate pages

---

### 📊 Dashboard

Visual overview of your journaling data pulled live from Notion.

```
┌────────────────────────────────────────┐
│  Your Journal                          │
│                                        │
│  📝 42 entries   😊 Avg mood: 7.2      │
│                                        │
│  Mood over time        Energy split    │
│  ┌──────────────┐      ┌────────────┐  │
│  │  Line chart  │      │   Donut    │  │
│  │  (Recharts)  │      │   chart    │  │
│  └──────────────┘      └────────────┘  │
└────────────────────────────────────────┘
```

- Mood score line chart over time
- Energy distribution donut chart
- Total entry count and streaks

---

### 🕐 Timeline

Browse every journal entry in reverse-chronological order. Each card shows the date, mood score, key people, and a preview of the reflection.

- Paginated entry list
- Click any entry to expand the full daily review
- Filter by date range

---

## Architecture

```mermaid
flowchart TD
    A([User Login\nGoogle OAuth]) --> B[Capture Page]

    B --> B1[Text Input]
    B --> B2[Voice Recording]
    B2 -->|Whisper API| B3[Transcription]
    B3 --> B1

    B1 -->|POST /api/handlog/generate| C{Claude AI\nDaily Review}
    C -->|Structured JSON| D[Display Review Card\nMood / People / Events / Reflection]
    D -->|Auto Save| E[(Notion Database\nDaily Page)]

    E --> F[Review Page]

    F --> G[Weekly Review]
    F --> H[Monthly Review]

    G -->|Fetch 7 days\nPOST /api/review/weekly| I{Claude AI\nWeekly Review}
    I -->|Structured JSON| J[Display Weekly Review\nMood Arc / Progress / Next Week Plan]
    J -->|Save\nPOST /api/review/weekly/save| K[(Notion\nWeekly Page)]

    H -->|Fetch current month\nPOST /api/review/monthly| L{Claude AI\nMonthly Review}
    L -->|Structured JSON| M[Display Monthly Review\nPatterns / Energy / Next Month Goals]
    M -->|Save\nPOST /api/review/monthly/save| N[(Notion\nMonthly Page)]

    E --> O[Dashboard Page]
    O --> O1[Mood Score Line Chart]
    O --> O2[Energy Distribution Donut Chart]

    E --> P[Timeline Page]
    P --> P1[Browse entries by date]
```

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org) (App Router)
- **Language**: TypeScript
- **AI**: [Claude Sonnet](https://anthropic.com) — structured daily / weekly / monthly review generation
- **Voice Transcription**: OpenAI Whisper API
- **Storage**: [Notion API](https://developers.notion.com) — journal database + review pages
- **Auth**: NextAuth.js (Google OAuth + email whitelist)
- **Deployment**: [Vercel](https://vercel.com)

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=

# OpenAI Whisper (voice transcription)
OPENAI_API_KEY=

# Notion integration
NOTION_TOKEN=
NOTION_DATABASE_ID=

# NextAuth (Google OAuth)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Email whitelist
ALLOWED_EMAIL=

# Encryption key (run: openssl rand -hex 32)
ENCRYPTION_KEY=

# Notion OAuth (if using OAuth flow)
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/callback/notion
```

---

## Project Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── capture/        # Journal entry page
│   │   ├── review/         # Weekly / monthly review page
│   │   ├── dashboard/      # Data dashboard
│   │   └── timeline/       # Timeline view
│   └── api/
│       ├── handlog/generate/    # Daily review generation
│       ├── review/weekly/       # Weekly review generation
│       ├── review/weekly/save/  # Save weekly review to Notion
│       ├── review/monthly/      # Monthly review generation
│       ├── review/monthly/save/ # Save monthly review to Notion
│       ├── transcribe/          # Voice to text
│       ├── dashboard/           # Dashboard data
│       └── timeline/            # Timeline data
├── lib/
│   ├── claude.ts           # Claude API + JSON parsing
│   └── notion.ts           # Notion read/write helpers
└── prompts/
    ├── daily-review.md     # Daily review prompt template
    ├── weekly-review.md    # Weekly review prompt template
    └── monthly-review.md   # Monthly review prompt template
```

---

## Roadmap

- [x] AI daily review generation (Claude)
- [x] Voice transcription (Whisper)
- [x] Auto-save to Notion
- [x] Weekly & monthly review generation
- [x] Dashboard: mood chart, energy donut
- [x] Timeline: browse all entries
- [x] Google OAuth + email whitelist
- [x] Auth guard on all AI API routes
- [ ] Streak tracking and journaling reminders
- [ ] Notion template share link for one-click setup
- [ ] Export to PDF / markdown
- [ ] Mobile-optimised capture flow

---

## License

MIT
