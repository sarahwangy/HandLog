# Generate Table Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Generate Table" buttons to the Weekly and Monthly tabs of the Review page, letting users generate a two-column date+bullet-point summary table from their Notion daily entries, then save it to Notion as toggle+callout.

**Architecture:** New Claude function `generateTableBullets` takes daily entries and returns per-day bullet points in one API call. New Notion helpers (`getMonthDailyEntries`, `appendTableToggle`, `findOrCreateMonthlyTablePage`) handle data fetching and block writing. Four new API routes wire the Claude+Notion logic; `ReviewContent.tsx` gets new state and UI sections in the weekly and monthly tabs.

**Tech Stack:** Next.js App Router API routes, Anthropic SDK (claude-haiku-4-5), `@notionhq/client`, React state (no new libraries needed).

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/claude.ts` | Add `generateTableBullets` function |
| Modify | `src/lib/notion.ts` | Add `getMonthDailyEntries`, `appendTableToggle`, `findOrCreateMonthlyTablePage` |
| Create | `src/app/api/table/weekly/route.ts` | Fetch weekly entries + call Claude + build markdown table |
| Create | `src/app/api/table/weekly/save/route.ts` | Write weekly table to week page via Notion |
| Create | `src/app/api/table/monthly/route.ts` | Fetch monthly entries + call Claude + build markdown table |
| Create | `src/app/api/table/monthly/save/route.ts` | Write monthly table to 月度-table page via Notion |
| Modify | `src/app/[locale]/review/ReviewContent.tsx` | Add state + handlers + UI sections for both tables |

---

## Task 1: Add `generateTableBullets` to `src/lib/claude.ts`

**Files:**
- Modify: `src/lib/claude.ts` (append to end of file)

- [ ] **Step 1: Add the function**

Open `src/lib/claude.ts` and append after the last export:

```typescript
// ── Generate Table Bullets ─────────────────────────────────────────────────
// 输入多天日记内容，返回每天 2-4 个关键事项 bullet points
// 用 haiku 模型节省 token，单次批量处理所有天，不逐天调用

export interface DayBullets {
  date: string;      // e.g. "6-2"
  bullets: string[]; // e.g. ["完成API开发", "和老师视频通话"]
}

export async function generateTableBullets(
  entries: Array<{ date: string; dailySummary: string }>
): Promise<DayBullets[]> {
  const client = new Anthropic();

  const prompt = `你是一个日记助手。以下是用户多天的日记简短日常内容。
对每一天，提取 2-4 个最重要的事项，每个事项用简短短语（不超过 15 字）表达。

以 JSON 数组格式输出，结构如下：
[{"date": "6-2", "bullets": ["事项1", "事项2"]}]

只输出 JSON，不要任何其他文字。

日记内容：
${entries.map(e => `日期：${e.date}\n内容：${e.dailySummary}`).join("\n\n")}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
  return JSON.parse(text) as DayBullets[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/sha/Code/AI-code-26/3-weekly-journal-review
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to `claude.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/claude.ts
git commit -m "feat(table): add generateTableBullets function to claude.ts"
```

---

## Task 2: Add three helper functions to `src/lib/notion.ts`

**Files:**
- Modify: `src/lib/notion.ts` (append to end of file)

- [ ] **Step 1: Add `getMonthDailyEntries`**

Append to end of `src/lib/notion.ts`:

```typescript
// ── Table Feature Helpers ──────────────────────────────────────────────────

// 查询某月所有单日页面（标题格式 "M-D"，两段，如 "6-2"）
// 月复盘用的是周页面（三段标题），这里专门查日页面
export async function getMonthDailyEntries(
  accessToken: string,
  databaseId: string,
  month: number
): Promise<Array<{ date: string; dailySummary: string }>> {
  const notion = createNotionClient(accessToken);

  // 用 starts_with 先过滤同月的所有页面，再筛选出两段标题（日页面）
  const results = await withAuthCheck(() =>
    notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "Name",
        title: { starts_with: `${month}-` },
      },
      sorts: [{ property: "Name", direction: "ascending" }],
    })
  ) as { results: Array<{ properties: Record<string, unknown> }> };

  return results.results
    .map(page => {
      const props = page.properties as Record<string, {
        title?: { plain_text: string }[];
        rich_text?: { plain_text: string }[];
      }>;
      return {
        date: props["Name"]?.title?.[0]?.plain_text ?? "",
        dailySummary: props["简短日常"]?.rich_text?.[0]?.plain_text ?? "",
      };
    })
    // 只保留两段标题的日页面（"6-2"），排除周页面（"6-2-8"）
    .filter(e => e.date.split("-").length === 2 && e.dailySummary.trim());
}

// 在页面 body 里追加一个 Toggle，Toggle 内包含 Callout，Callout 里存 markdown 表格
// 每行 markdown 存为单独的 paragraph block，避开 Notion rich_text 2000 字符限制
export async function appendTableToggle(
  accessToken: string,
  pageId: string,
  markdownTable: string,
  toggleTitle: string
): Promise<void> {
  const notion = createNotionClient(accessToken);

  // Step 1：建 Toggle，内含空 Callout
  const toggleRes = await withAuthCheck(() =>
    notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: toggleTitle }, annotations: { bold: true } }],
            color: "default",
            children: [
              {
                type: "callout",
                callout: {
                  rich_text: [],
                  icon: { type: "emoji", emoji: "📅" },
                  color: "gray_background",
                },
              } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
            ],
          },
        } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
      ],
    })
  ) as { results: { id: string; type: string }[] };

  const toggleId = toggleRes.results[0]?.id;
  if (!toggleId) return;

  // Step 2：找到 Callout 的 ID
  const toggleChildren = await withAuthCheck(() =>
    notion.blocks.children.list({ block_id: toggleId })
  ) as { results: { id: string; type: string }[] };

  const calloutId = toggleChildren.results.find(b => b.type === "callout")?.id;
  if (!calloutId) return;

  // Step 3：每行 markdown 存为一个 paragraph block（避免超过 2000 字符限制）
  const lines = markdownTable.split("\n").filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = lines.map(line => ({
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: line.slice(0, 2000) } }],
    },
  }));

  await batchAppend(notion, calloutId, blocks);
}

// 在主数据库中查找或创建标题为 "YYYY-MM-月度-table" 的页面
// 例如 "2026-06-月度-table"
export async function findOrCreateMonthlyTablePage(
  accessToken: string,
  databaseId: string,
  year: number,
  month: number
): Promise<string> {
  const notion = createNotionClient(accessToken);
  const title = `${year}-${String(month).padStart(2, "0")}-月度-table`;

  const res = await withAuthCheck(() =>
    notion.databases.query({
      database_id: databaseId,
      filter: { property: "Name", title: { equals: title } },
      page_size: 1,
    })
  );

  if (res.results.length > 0) return res.results[0].id;

  // 不存在则新建一行
  const page = await withAuthCheck(() =>
    notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
      } as CreatePageParameters["properties"],
    })
  );
  return page.id;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/notion.ts
git commit -m "feat(table): add getMonthDailyEntries, appendTableToggle, findOrCreateMonthlyTablePage"
```

---

## Task 3: Create `/api/table/weekly/route.ts`

**Files:**
- Create: `src/app/api/table/weekly/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { getWeekDailyEntries, findOrCreateWeekPage } from "@/lib/notion";
import { generateTableBullets } from "@/lib/claude";

// POST /api/table/weekly
// Body: { weekLabel: "6-2-8" }
// 读取本周每日页面的「简短日常」，用 Claude 提取要点，生成 markdown 表格
export async function POST(req: NextRequest) {
  const { weekLabel } = await req.json() as { weekLabel: string };
  if (!weekLabel) return NextResponse.json({ error: "Missing weekLabel" }, { status: 400 });

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 找到本周页面 ID（用于 save 步骤）
    const parts = weekLabel.split("-");
    const year = new Date().getFullYear();
    const dateForLookup = `${year}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    const weekPageId = await findOrCreateWeekPage(token, databaseId, dateForLookup);

    // 查询本周所有日记条目（每日页面，标题如 "6-2"）
    const entries = await getWeekDailyEntries(token, databaseId, weekLabel);
    const filtered = entries.filter(e => e.dailySummary.trim());

    if (filtered.length === 0) {
      return NextResponse.json({ error: "本周没有日记内容，请先写日记再生成 Table" }, { status: 404 });
    }

    // 调用 Claude 提取每天的关键事项
    const bulleted = await generateTableBullets(
      filtered.map(e => ({ date: e.date, dailySummary: e.dailySummary }))
    );

    // 拼装 markdown 表格
    const markdownTable = buildMarkdownTable(bulleted, year);
    return NextResponse.json({ markdownTable, weekPageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 把 {date, bullets} 数组拼成 markdown 表格字符串
function buildMarkdownTable(
  rows: Array<{ date: string; bullets: string[] }>,
  year: number
): string {
  const CN_WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const header = "| 日期 | 重点事项 |\n|------|--------|";
  const lines = rows.map(row => {
    const [month, day] = row.date.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const weekday = CN_WEEKDAY[d.getDay()];
    const dateStr = `${month}月${day}日 ${weekday}`;
    const bulletStr = row.bullets.map(b => `• ${b}`).join("  ");
    return `| ${dateStr} | ${bulletStr} |`;
  });
  return [header, ...lines].join("\n");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/table/weekly/route.ts
git commit -m "feat(table): add POST /api/table/weekly route"
```

---

## Task 4: Create `/api/table/weekly/save/route.ts`

**Files:**
- Create: `src/app/api/table/weekly/save/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal } from "@/lib/auth";
import { appendTableToggle } from "@/lib/notion";

// POST /api/table/weekly/save
// Body: { markdownTable: string, weekPageId: string }
// 把 markdown 表格以 Toggle > Callout 格式写入周页面 body
export async function POST(req: NextRequest) {
  const { markdownTable, weekPageId } = await req.json() as {
    markdownTable: string;
    weekPageId: string;
  };
  if (!markdownTable || !weekPageId) {
    return NextResponse.json({ error: "Missing markdownTable or weekPageId" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    await appendTableToggle(token, weekPageId, markdownTable, "📅 一周大事记");
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/table/weekly/save/route.ts
git commit -m "feat(table): add POST /api/table/weekly/save route"
```

---

## Task 5: Create `/api/table/monthly/route.ts`

**Files:**
- Create: `src/app/api/table/monthly/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { getMonthDailyEntries } from "@/lib/notion";
import { generateTableBullets } from "@/lib/claude";

// POST /api/table/monthly
// Body: { year: 2026, month: 6 }
// 读取该月所有日页面的「简短日常」，生成 markdown 表格
export async function POST(req: NextRequest) {
  const { year, month } = await req.json() as { year: number; month: number };
  if (!year || !month) return NextResponse.json({ error: "Missing year or month" }, { status: 400 });

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    const entries = await getMonthDailyEntries(token, databaseId, month);

    if (entries.length === 0) {
      return NextResponse.json({ error: `${year}年${month}月没有找到日记内容` }, { status: 404 });
    }

    const bulleted = await generateTableBullets(
      entries.map(e => ({ date: e.date, dailySummary: e.dailySummary }))
    );

    const markdownTable = buildMarkdownTable(bulleted, year);
    return NextResponse.json({ markdownTable });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildMarkdownTable(
  rows: Array<{ date: string; bullets: string[] }>,
  year: number
): string {
  const CN_WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const header = "| 日期 | 重点事项 |\n|------|--------|";
  const lines = rows.map(row => {
    const [month, day] = row.date.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const weekday = CN_WEEKDAY[d.getDay()];
    const dateStr = `${month}月${day}日 ${weekday}`;
    const bulletStr = row.bullets.map(b => `• ${b}`).join("  ");
    return `| ${dateStr} | ${bulletStr} |`;
  });
  return [header, ...lines].join("\n");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/table/monthly/route.ts
git commit -m "feat(table): add POST /api/table/monthly route"
```

---

## Task 6: Create `/api/table/monthly/save/route.ts`

**Files:**
- Create: `src/app/api/table/monthly/save/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { appendTableToggle, findOrCreateMonthlyTablePage } from "@/lib/notion";

// POST /api/table/monthly/save
// Body: { markdownTable: string, year: number, month: number }
// 找或建 "YYYY-MM-月度-table" 页面，写入 Toggle > Callout 格式的 markdown 表格
export async function POST(req: NextRequest) {
  const { markdownTable, year, month } = await req.json() as {
    markdownTable: string;
    year: number;
    month: number;
  };
  if (!markdownTable || !year || !month) {
    return NextResponse.json({ error: "Missing markdownTable, year, or month" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 找或建 "2026-06-月度-table" 这一行
    const pageId = await findOrCreateMonthlyTablePage(token, databaseId, year, month);
    await appendTableToggle(token, pageId, markdownTable, "📅 月度大事记");
    return NextResponse.json({ success: true, pageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/table/monthly/save/route.ts
git commit -m "feat(table): add POST /api/table/monthly/save route"
```

---

## Task 7: Update `ReviewContent.tsx` — state + handlers + UI

**Files:**
- Modify: `src/app/[locale]/review/ReviewContent.tsx`

- [ ] **Step 1: Add new state variables**

Find this block (around line 39-41):
```typescript
  const [monthYear, setMonthYear] = useState(() => new Date().getFullYear());
  const [monthMonth, setMonthMonth] = useState(() => new Date().getMonth() + 1);
```

Add after it:
```typescript
  // Weekly Table state
  const [weekTable, setWeekTable] = useState<string | null>(null);
  const [weekTableLoading, setWeekTableLoading] = useState(false);
  const [weekTableError, setWeekTableError] = useState<string | null>(null);
  const [weekTableSaving, setWeekTableSaving] = useState(false);
  const [weekTableSaved, setWeekTableSaved] = useState(false);
  const [weekTablePageId, setWeekTablePageId] = useState<string | null>(null);

  // Monthly Table state
  const [monthTable, setMonthTable] = useState<string | null>(null);
  const [monthTableLoading, setMonthTableLoading] = useState(false);
  const [monthTableError, setMonthTableError] = useState<string | null>(null);
  const [monthTableSaving, setMonthTableSaving] = useState(false);
  const [monthTableSaved, setMonthTableSaved] = useState(false);
```

- [ ] **Step 2: Add handler functions**

Find the `saveMonthly` function (around line 211). Add these four functions after it, before the first `if (!review && activeTab === "daily")`:

```typescript
  const generateWeekTable = async () => {
    setWeekTableLoading(true);
    setWeekTableError(null);
    setWeekTable(null);
    setWeekTableSaved(false);
    try {
      const res = await fetch("/api/table/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel }),
      });
      const data = await res.json() as { markdownTable?: string; weekPageId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setWeekTable(data.markdownTable ?? null);
      setWeekTablePageId(data.weekPageId ?? null);
    } catch (err) {
      setWeekTableError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWeekTableLoading(false);
    }
  };

  const saveWeekTable = async () => {
    if (!weekTable || !weekTablePageId) return;
    setWeekTableSaving(true);
    setWeekTableError(null);
    try {
      const res = await fetch("/api/table/weekly/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownTable: weekTable, weekPageId: weekTablePageId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setWeekTableSaved(true);
    } catch (err) {
      setWeekTableError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setWeekTableSaving(false);
    }
  };

  const generateMonthTable = async () => {
    setMonthTableLoading(true);
    setMonthTableError(null);
    setMonthTable(null);
    setMonthTableSaved(false);
    try {
      const res = await fetch("/api/table/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: monthYear, month: monthMonth }),
      });
      const data = await res.json() as { markdownTable?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMonthTable(data.markdownTable ?? null);
    } catch (err) {
      setMonthTableError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMonthTableLoading(false);
    }
  };

  const saveMonthTable = async () => {
    if (!monthTable) return;
    setMonthTableSaving(true);
    setMonthTableError(null);
    try {
      const res = await fetch("/api/table/monthly/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownTable: monthTable, year: monthYear, month: monthMonth }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMonthTableSaved(true);
    } catch (err) {
      setMonthTableError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setMonthTableSaving(false);
    }
  };
```

- [ ] **Step 3: Add Weekly Table UI section**

Find the closing of the weekly tab content (the line `)}` that closes `{weekReview && (` block, around line 619-621):
```typescript
          )}
        </div>
      )}

      {/* Monthly Tab */}
```

Insert the weekly table section **between** the `{weekReview && ...}` closing `)}` and the `</div>` that closes the weekly tab:

```tsx
          {/* ── Weekly Table Section ─────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-[#E4D4C0]">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-[14px] font-semibold text-[#2C1F14]">📅 一周大事记 Table</span>
              <button
                type="button"
                onClick={generateWeekTable}
                disabled={weekTableLoading}
                className="h-[34px] px-5 bg-[#2C1F14] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#4A3324] transition-colors disabled:bg-[#E4D4C0] disabled:text-[#8B6B4A] disabled:cursor-not-allowed"
              >
                {weekTableLoading ? "Generating..." : "📊 Generate Table"}
              </button>
              {weekTable && (
                <button
                  type="button"
                  onClick={saveWeekTable}
                  disabled={weekTableSaving || weekTableSaved}
                  className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#C4783A] text-[#C4783A] hover:bg-[#FDF0E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {weekTableSaved ? "✓ Saved to Notion" : weekTableSaving ? "Saving..." : "💾 Save to Notion"}
                </button>
              )}
            </div>
            {weekTableError && <p className="text-[#C4783A] text-[13px]">{weekTableError}</p>}
            {weekTable && (
              <div className="mt-3 bg-white border border-[#E4D4C0] rounded-[12px] p-4 overflow-x-auto">
                <pre className="text-[13px] text-[#4A3324] whitespace-pre font-mono leading-relaxed">{weekTable}</pre>
              </div>
            )}
          </div>
```

- [ ] **Step 4: Add Monthly Table UI section**

Find the closing of the monthly tab content, the `)}` that closes `{monthReview && (`, then the `</div>` and `)}` closing the monthly tab. The monthly tab ends around line 790+.

Insert the monthly table section inside the monthly tab's `<div className="space-y-4">`, after the `{monthReview && ...}` block closes:

```tsx
          {/* ── Monthly Table Section ────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-[#E4D4C0]">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-[14px] font-semibold text-[#2C1F14]">📅 月度大事记 Table</span>
              <button
                type="button"
                onClick={generateMonthTable}
                disabled={monthTableLoading}
                className="h-[34px] px-5 bg-[#2C1F14] text-white rounded-[8px] text-[13px] font-medium hover:bg-[#4A3324] transition-colors disabled:bg-[#E4D4C0] disabled:text-[#8B6B4A] disabled:cursor-not-allowed"
              >
                {monthTableLoading ? "Generating..." : "📊 Generate Table"}
              </button>
              {monthTable && (
                <button
                  type="button"
                  onClick={saveMonthTable}
                  disabled={monthTableSaving || monthTableSaved}
                  className="h-[34px] px-5 rounded-[8px] text-[13px] font-medium border border-[#C4783A] text-[#C4783A] hover:bg-[#FDF0E6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {monthTableSaved ? "✓ Saved to Notion" : monthTableSaving ? "Saving..." : "💾 Save to Notion"}
                </button>
              )}
            </div>
            {monthTableError && <p className="text-[#C4783A] text-[13px]">{monthTableError}</p>}
            {monthTable && (
              <div className="mt-3 bg-white border border-[#E4D4C0] rounded-[12px] p-4 overflow-x-auto">
                <pre className="text-[13px] text-[#4A3324] whitespace-pre font-mono leading-relaxed">{monthTable}</pre>
              </div>
            )}
          </div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/review/ReviewContent.tsx
git commit -m "feat(table): add Generate Table UI sections to weekly and monthly tabs"
```

---

## Task 8: Manual Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test Weekly Table**

1. Go to `http://localhost:3001/en/review`
2. Click the **Weekly** tab
3. Make sure the week input shows the current week (e.g. `6-2-8`)
4. Scroll to the bottom of the weekly tab — you should see the "📅 一周大事记 Table" section with a "📊 Generate Table" button
5. Click "📊 Generate Table"
6. After ~5-10 seconds, a monospace table preview should appear with dates (e.g. "6月2日 周一") and bullet points
7. Click "💾 Save to Notion"
8. Button should change to "✓ Saved to Notion"
9. Open Notion → go to the week page (e.g. "6-2-8") → verify a new toggle "📅 一周大事记" exists at the bottom, with a callout inside containing the table rows

- [ ] **Step 3: Test Monthly Table**

1. Click the **Monthly** tab
2. Scroll to the bottom — you should see "📅 月度大事记 Table" section
3. Select year 2026, month 6 (or whichever month has data)
4. Click "📊 Generate Table"
5. Table preview appears
6. Click "💾 Save to Notion"
7. Open Notion → verify a new page titled "2026-06-月度-table" appeared in the main database, with a toggle "📅 月度大事记" containing the table

- [ ] **Step 4: Test error state**

1. Enter a week with no data (e.g. `1-1-7`)
2. Click "📊 Generate Table"
3. Should show error message "本周没有日记内容，请先写日记再生成 Table" in orange text

---

## Task 9: Update learning notes

- [ ] **Step 1: Append to `docs/learning-notes.md`**

```markdown
### T-Generate-Table - 生成 Table 功能

- 学到的核心概念：
  - Notion block 嵌套：Toggle > Callout > Paragraph 的三层结构，先 append toggle，再读取 toggle 的 children 拿到 callout ID，再往 callout 里 append 内容
  - Notion rich_text 有 2000 字符限制，所以把 markdown 每行存为独立 paragraph block 而不是一整段
  - Claude 批量调用：把所有天的日记一次性传给 Claude，比逐天调用节省 token
- 用到的关键 API/函数：
  - `notion.blocks.children.append` + `notion.blocks.children.list` (读取刚建 block 的 children ID)
  - `generateTableBullets` (新增) — 批量提取日记要点
  - `getMonthDailyEntries` (新增) — 用 `starts_with` 过滤 + 两段标题筛选日页面
- 容易踩的坑：
  - 周复盘的"简短日常"是存在周页面（如 "5-25-31"）上的，而月度大事记 table 需要读的是每个单日页面（如 "6-2"）的简短日常，两者数据来源不同
  - `findOrCreateWeekPage` 和 `findOrCreateMonthlyTablePage` 模式相同，但月度 table 是新创建一个 "YYYY-MM-月度-table" 行，不是周页面
- 一句话总结：用 Claude batch 提取要点 + Notion toggle/callout block 嵌套结构存储，是这个项目"生成 → 预览 → 保存"流程的标准延伸。
```

- [ ] **Step 2: Commit**

```bash
git add docs/learning-notes.md
git commit -m "docs: add learning notes for Generate Table feature"
```
