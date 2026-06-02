# Generate Table Feature Design

**Date:** 2026-06-02  
**Status:** Approved

## Overview

Add a "Generate Table" feature to the existing Review page. Users can generate a weekly or monthly summary table from their Notion daily journal entries (`简短日常` field). The table has two columns: date (日期) and key events (重点事项, as bullet points). The generated table is saved back to Notion in toggle + callout format.

## UI Changes

### Location
`src/app/[locale]/review/ReviewContent.tsx`

**Weekly tab** — add a new section below the existing weekly review area:
- `Generate Weekly Table` button (independent of the existing "Generate Weekly Review" button)
- After generation: show markdown table preview rendered with react-markdown
- `Save to Notion` button → writes to the existing week page body

**Monthly tab** — add a new section below the existing monthly review area:
- `Generate Monthly Table` button
- After generation: show markdown table preview
- `Save to Notion` button → writes to a new "月度-table" Notion page

### State variables to add in ReviewContent.tsx
```
weekTable: string | null
weekTableLoading: boolean
weekTableError: string | null
weekTableSaving: boolean
weekTableSaved: boolean

monthTable: string | null
monthTableLoading: boolean
monthTableError: string | null
monthTableSaving: boolean
monthTableSaved: boolean
monthTablePageId: string | null
```

## Table Format

```markdown
| 日期 | 重点事项 |
|------|--------|
| 6月2日 周一 | • 完成 XXX • 开会讨论 YYY |
| 6月3日 周二 | • 健身 • 写了博客草稿 |
```

- Column 1: `M月D日 周X` format (e.g. "6月2日 周一")
- Column 2: 2–4 bullet points extracted by Claude from `简短日常`, each preceded by `•`
- Days with no journal entry are skipped

## API Design

### POST /api/table/weekly
**Input:** `{ weekLabel: "6-2-8" }`  
**Logic:**
1. Parse weekLabel to get Mon–Sun date range
2. Query main database for pages in that week (filter by `Name` date range)
3. For each day: read `简短日常` property
4. Call Claude with all days' content → returns per-day bullet points
5. Build markdown table string  
**Output:** `{ markdownTable: string, weekPageId: string }`

### POST /api/table/weekly/save
**Input:** `{ markdownTable: string, weekPageId: string }`  
**Logic:** Call `appendTableToggle(token, weekPageId, markdownTable, "📅 一周大事记")`  
**Output:** `{ success: true }`

### POST /api/table/monthly
**Input:** `{ year: number, month: number }`  
**Logic:**
1. Query main database for all pages in the given month
2. For each day: read `简短日常`
3. Call Claude with all days' content → per-day bullet points
4. Build markdown table string  
**Output:** `{ markdownTable: string }`

### POST /api/table/monthly/save
**Input:** `{ markdownTable: string, year: number, month: number }`  
**Logic:**
1. Call `findOrCreateMonthlyTablePage(token, databaseId, year, month)` → pageId with title `"YYYY-MM-月度-table"`
2. Call `appendTableToggle(token, pageId, markdownTable, "📅 月度大事记")`  
**Output:** `{ success: true, pageId: string }`

## Notion Layer (src/lib/notion.ts)

### New function: `appendTableToggle`
```typescript
async function appendTableToggle(
  token: string,
  pageId: string,
  markdownTable: string,
  toggleTitle: string
): Promise<void>
```
- Creates a toggle block with `toggleTitle` as title
- Inside toggle: one callout block
- Callout content: the markdown table as rich_text (plain text, since Notion doesn't render markdown natively — the table is stored as raw markdown text inside the callout)

### New function: `findOrCreateMonthlyTablePage`
```typescript
async function findOrCreateMonthlyTablePage(
  token: string,
  databaseId: string,
  year: number,
  month: number
): Promise<string> // returns pageId
```
- Searches main database for a page titled `"YYYY-MM-月度-table"` (e.g. `"2026-06-月度-table"`)
- If not found, creates it as a new row in the main database with that title
- Returns the page ID

## Claude Prompt (src/lib/claude.ts or inline in API)

Prompt for extracting bullet points:

```
以下是用户某一天的日记简短日常内容。请提取 2-4 个最重要的事项，每个事项用一个简短短语表达（不超过 15 字），用 • 开头。只输出 bullet points，不要其他文字。

日期：{date}
内容：{dailySummary}
```

Called once per day, or batched if feasible.

## New Files

| File | Purpose |
|------|---------|
| `src/app/api/table/weekly/route.ts` | Generate weekly table API |
| `src/app/api/table/weekly/save/route.ts` | Save weekly table to Notion |
| `src/app/api/table/monthly/route.ts` | Generate monthly table API |
| `src/app/api/table/monthly/save/route.ts` | Save monthly table to Notion |

## Modified Files

| File | Change |
|------|--------|
| `src/app/[locale]/review/ReviewContent.tsx` | Add Generate Table UI sections to weekly and monthly tabs |
| `src/lib/notion.ts` | Add `appendTableToggle` and `findOrCreateMonthlyTablePage` |

## Key Concepts (for learning notes)

- **Notion block types**: toggle contains children blocks; callout is a block with an icon and rich_text content
- **Markdown in Notion**: Notion doesn't render markdown — the table is stored as plain text inside the callout. The app renders it for preview using react-markdown.
- **Batch Claude calls**: each day's summary is sent to Claude; could be batched into one call to save tokens
