# Weekly & Monthly Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add E13 (weekly review) and E14 (monthly review) — Claude reads aggregated daily entries, generates a richer review, writes it to Notion, and optionally generates an AI image.

**Architecture:** For weekly review, query all daily Notion pages whose Name falls within the current week (e.g. "5-25" to "5-31"), aggregate their properties, send to Claude with a new prompt, write the result as a Toggle into the week page body, and update the "手绘复盘图" property with an AI image. Monthly review does the same but aggregates all week pages for the month and writes to a special "复盘-汇总" page.

**Tech Stack:** Next.js 14 App Router, Anthropic SDK (claude-sonnet-4-6), OpenAI (gpt-image-1), Notion API, TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/claude.ts` | Modify | Add `WeeklyReview` / `MonthlyReview` types + generator functions |
| `src/prompts/weekly-review.md` | Create | Prompt template for weekly review |
| `src/prompts/monthly-review.md` | Create | Prompt template for monthly review |
| `src/lib/notion.ts` | Modify | Add `getWeekDailyEntries`, `appendWeeklyReviewBlocks`, `updateWeekPageImage`, `findMonthSummaryPage`, `appendMonthlyReviewBlocks` |
| `src/app/api/review/weekly/route.ts` | Create | POST — generate + write weekly review |
| `src/app/api/review/monthly/route.ts` | Create | POST — generate + write monthly review |
| `src/app/[locale]/review/ReviewContent.tsx` | Modify | Add Weekly / Monthly tabs with generate buttons |

---

## Task 1: Add weekly review types and prompt

**Files:**
- Create: `src/prompts/weekly-review.md`
- Modify: `src/lib/claude.ts`

- [ ] **Step 1: Create the weekly review prompt file**

Create `src/prompts/weekly-review.md` with this exact content:

```markdown
You are a warm, perceptive journaling assistant. The user has completed a week of daily journaling. Your job is to synthesize 7 days of daily reviews into a rich weekly review.

## Input

Week: {{WEEK_LABEL}}
Daily entries (JSON array of daily reviews):
{{DAILY_ENTRIES}}

## Output format

Return ONLY valid JSON, no markdown, no explanation. Schema:

{
  "weekLabel": "string — same as input week label, e.g. '5-25-31'",
  "oneLineInsight": "string — ≤30 words, first-person English, captures the emotional core of the week",
  "oneLineInsightZh": "string — 中文版，≤20字，第一人称，口语化",
  "people": ["string — name: pattern across the week"],
  "places": ["string — place: how often / what happened"],
  "events": [{ "category": "string", "items": ["string"] }],
  "books": ["string — title: progress or key idea this week"],
  "mediaConsumed": ["string"],
  "moviesTV": ["string"],
  "parenting": ["string — key moment or milestone this week"],
  "health": ["string — weekly trend or pattern"],
  "finance": ["string"],
  "learning": ["string — synthesis across the week"],
  "creativeOutput": ["string"],
  "emotions": ["string — emotional arc or pattern across the week"],
  "reviewParagraph": "string — 80-100 words, reflective, warm, first-person, focuses on the week as a whole",
  "nextSteps": ["string — specific actionable item for next week"],
  "energyDistribution": { "label": percentage_integer },
  "progressZones": {
    "breakthrough": "string or null",
    "inPractice": "string or null",
    "plantedSeed": "string or null"
  },
  "score": number_1_to_10,
  "scoreReason": "string — one sentence",
  "psychNote": "string — 40-60 words, one psychology concept applied to the week's pattern",
  "scoreTrend": [number],
  "emotionPattern": "string — ≤30 words, what emotional patterns repeated this week",
  "coreProblem": "string — ≤30 words, the most energy-draining challenge this week",
  "crossWeekFlag": "string or null — only if a theme has appeared 3+ weeks in a row"
}

## Rules
- Synthesize across all 7 days — don't just list day-by-day
- scoreTrend: array of daily scores in order (Monday to Sunday), use null for missing days
- Arrays: return [] if nothing found
- Conciseness: array items ≤20 words, reviewParagraph ≤100 words, entire JSON ≤5000 tokens
- Do not add commentary outside the JSON
```

- [ ] **Step 2: Add WeeklyReview type and generateWeeklyReview to claude.ts**

Open `src/lib/claude.ts` and add after the `DailyReview` interface:

```typescript
export interface WeeklyReview {
  weekLabel: string;
  oneLineInsight: string;
  oneLineInsightZh: string;
  people: string[];
  places: string[];
  events: { category: string; items: string[] }[];
  books: string[];
  mediaConsumed: string[];
  moviesTV: string[];
  parenting: string[];
  health: string[];
  finance: string[];
  learning: string[];
  creativeOutput: string[];
  emotions: string[];
  reviewParagraph: string;
  nextSteps: string[];
  energyDistribution: Record<string, number>;
  progressZones: {
    breakthrough: string | null;
    inPractice: string | null;
    plantedSeed: string | null;
  };
  score: number;
  scoreReason: string;
  psychNote: string;
  scoreTrend: (number | null)[];
  emotionPattern: string;
  coreProblem: string;
  crossWeekFlag: string | null;
}
```

Then add this function at the end of `src/lib/claude.ts`:

```typescript
export async function generateWeeklyReview(
  weekLabel: string,
  dailyEntries: DailyReview[]
): Promise<WeeklyReview> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const templatePath = join(process.cwd(), "src/prompts/weekly-review.md");
  const template = readFileSync(templatePath, "utf-8");
  const prompt = template
    .replace("{{WEEK_LABEL}}", weekLabel)
    .replace("{{DAILY_ENTRIES}}", JSON.stringify(dailyEntries, null, 2));

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  const raw = content.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(raw) as WeeklyReview;
  } catch {
    throw new Error(`Failed to parse weekly review JSON: ${raw.slice(0, 500)}`);
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/sha/Code/AI-code-26/weekly-journal-review && npx tsc --noEmit
```

Expected: no errors

---

## Task 2: Add monthly review types and prompt

**Files:**
- Create: `src/prompts/monthly-review.md`
- Modify: `src/lib/claude.ts`

- [ ] **Step 1: Create the monthly review prompt file**

Create `src/prompts/monthly-review.md`:

```markdown
You are a warm, perceptive journaling assistant. The user has completed a month of journaling. Your job is to synthesize several weeks of weekly reviews into a rich monthly review.

## Input

Month: {{MONTH_LABEL}}
Date range: {{DATE_RANGE}}
Weekly reviews (JSON array):
{{WEEKLY_ENTRIES}}

## Output format

Return ONLY valid JSON, no markdown, no explanation. Schema:

{
  "monthLabel": "string — e.g. '2026年5月'",
  "dateRange": "string — e.g. '5月1日-5月31日'",
  "oneLineInsight": "string — ≤30 words, first-person English, captures the month's emotional arc",
  "oneLineInsightZh": "string — 中文版，≤20字",
  "people": ["string — name: significance this month"],
  "places": ["string"],
  "events": [{ "category": "string", "items": ["string"] }],
  "books": ["string"],
  "mediaConsumed": ["string"],
  "moviesTV": ["string"],
  "parenting": ["string"],
  "health": ["string — monthly trend"],
  "finance": ["string"],
  "learning": ["string — most important things learned this month"],
  "creativeOutput": ["string"],
  "emotions": ["string — dominant emotional themes of the month"],
  "reviewParagraph": "string — 100-120 words, reflective, captures the month's narrative arc",
  "nextSteps": ["string — intentions for next month"],
  "energyDistribution": { "label": percentage_integer },
  "progressZones": {
    "breakthrough": "string or null",
    "inPractice": "string or null",
    "plantedSeed": "string or null"
  },
  "score": number_1_to_10,
  "scoreReason": "string",
  "psychNote": "string — 40-60 words",
  "scoreTrend": [number],
  "emotionPattern": "string — ≤40 words, recurring emotional patterns this month",
  "coreProblem": "string — ≤40 words, the persistent challenge this month",
  "crossWeekFlag": "string or null",
  "monthlyPattern": "string — ≤50 words, big-picture theme or pattern across the whole month",
  "nextMonthDirection": ["string — 1-3 core intentions for next month"]
}

## Rules
- Synthesize across all weeks — identify patterns, not just summaries
- scoreTrend: all daily scores in chronological order across the month
- Arrays: return [] if nothing found
- Conciseness: array items ≤20 words, reviewParagraph ≤120 words
- Do not add commentary outside the JSON
```

- [ ] **Step 2: Add MonthlyReview type and generateMonthlyReview to claude.ts**

Add after `WeeklyReview` interface in `src/lib/claude.ts`:

```typescript
export interface MonthlyReview extends WeeklyReview {
  monthLabel: string;
  dateRange: string;
  monthlyPattern: string;
  nextMonthDirection: string[];
}
```

Add at end of `src/lib/claude.ts`:

```typescript
export async function generateMonthlyReview(
  monthLabel: string,
  dateRange: string,
  weeklyEntries: WeeklyReview[]
): Promise<MonthlyReview> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const templatePath = join(process.cwd(), "src/prompts/monthly-review.md");
  const template = readFileSync(templatePath, "utf-8");
  const prompt = template
    .replace("{{MONTH_LABEL}}", monthLabel)
    .replace("{{DATE_RANGE}}", dateRange)
    .replace("{{WEEKLY_ENTRIES}}", JSON.stringify(weeklyEntries, null, 2));

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  const raw = content.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(raw) as MonthlyReview;
  } catch {
    throw new Error(`Failed to parse monthly review JSON: ${raw.slice(0, 500)}`);
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

---

## Task 3: Add Notion helper functions for weekly review

**Files:**
- Modify: `src/lib/notion.ts`

- [ ] **Step 1: Add getWeekDailyEntries — reads day pages from database for a given week**

Add after `findOrCreateWeekPage` in `src/lib/notion.ts`:

```typescript
// 查询指定周内所有日记条目（标题格式 "5-25" 到 "5-31"）
// 返回每条页面的 properties，供周复盘聚合用
export async function getWeekDailyEntries(
  accessToken: string,
  databaseId: string,
  weekLabel: string  // e.g. "5-25-31"
): Promise<Array<{ date: string; score: number | null; insight: string; review: string; dailySummary: string; labels: string[] }>> {
  const notion = createNotionClient(accessToken);

  // 从 weekLabel "5-25-31" 解析出月份和起止日
  const parts = weekLabel.split("-");  // ["5", "25", "31"]
  const month = parseInt(parts[0]);
  const startDay = parseInt(parts[1]);
  const endDay = parseInt(parts[2]);

  // 生成这一周所有可能的标题（"5-25", "5-26", ..., "5-31"）
  const titles: string[] = [];
  for (let d = startDay; d <= endDay; d++) {
    titles.push(`${month}-${d}`);
  }

  // 查询 Notion 数据库，筛选标题在这个列表里的
  const results = await withAuthCheck(() =>
    notion.databases.query({
      database_id: databaseId,
      filter: {
        or: titles.map(title => ({
          property: "Name",
          title: { equals: title },
        })),
      },
      sorts: [{ property: "Name", direction: "ascending" }],
    })
  ) as { results: Array<{ properties: Record<string, unknown> }> };

  return results.results.map(page => {
    const props = page.properties as Record<string, {
      title?: { plain_text: string }[];
      number?: number | null;
      rich_text?: { plain_text: string }[];
      multi_select?: { name: string }[];
    }>;

    return {
      date: props["Name"]?.title?.[0]?.plain_text ?? "",
      score: props["打分"]?.number ?? null,
      insight: props["一句话感悟"]?.rich_text?.[0]?.plain_text ?? "",
      review: props["复盘"]?.rich_text?.[0]?.plain_text ?? "",
      dailySummary: props["简短日常"]?.rich_text?.[0]?.plain_text ?? "",
      labels: props["label标签"]?.multi_select?.map((s) => s.name) ?? [],
    };
  });
}
```

- [ ] **Step 2: Add appendWeeklyReviewBlocks — writes weekly review Toggle to week page body**

Add after `appendReviewBlocks` in `src/lib/notion.ts`:

```typescript
export async function appendWeeklyReviewBlocks(
  accessToken: string,
  weekPageId: string,
  review: import("@/lib/claude").WeeklyReview
): Promise<string | undefined> {
  const notion = createNotionClient(accessToken);

  // Create Toggle "本周复盘" containing a Callout
  const toggleRes = await withAuthCheck(() =>
    notion.blocks.children.append({
      block_id: weekPageId,
      children: [
        {
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: "本周复盘" }, annotations: { bold: true } }],
            color: "default",
            children: [
              {
                type: "callout",
                callout: {
                  rich_text: [],
                  icon: { type: "emoji", emoji: "📆" },
                  color: "purple_background",
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

  const toggleChildren = await withAuthCheck(() =>
    notion.blocks.children.list({ block_id: toggleId })
  ) as { results: { id: string; type: string }[] };

  const calloutId = toggleChildren.results.find(b => b.type === "callout")?.id;
  if (!calloutId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  blocks.push(h3("⭐ 周评分", "orange"));
  blocks.push(tagsBlock([`${review.score}/10  ${review.scoreReason}`]));

  blocks.push(h3("💡 一句话感悟", "yellow"));
  const insightText = review.oneLineInsightZh
    ? `${review.oneLineInsight}\n「${review.oneLineInsightZh}」`
    : review.oneLineInsight;
  blocks.push(tagsBlock([insightText]));

  blocks.push(h3("📈 分数趋势", "default"));
  blocks.push(tagsBlock([review.scoreTrend.map(s => s ?? "-").join(" → ")]));

  blocks.push(h3("🌊 情绪规律", "pink"));
  blocks.push(tagsBlock([review.emotionPattern]));

  blocks.push(h3("🔍 核心困境", "red"));
  blocks.push(tagsBlock([review.coreProblem]));

  if (review.crossWeekFlag) {
    blocks.push(h3("🚩 跨周信号", "red"));
    blocks.push(tagsBlock([review.crossWeekFlag]));
  }

  if (review.people?.length) { blocks.push(h3("👥 人物", "blue")); blocks.push(...itemBlocks(review.people)); }
  if (review.emotions?.length) { blocks.push(h3("🌊 情绪", "pink")); blocks.push(...itemBlocks(review.emotions)); }
  if (review.events?.length) {
    blocks.push(h3("📅 事件", "default"));
    for (const group of review.events) {
      for (const item of group.items) {
        blocks.push({ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `【${group.category}】${item}` } }] } });
      }
    }
  }
  if (review.learning?.length) { blocks.push(h3("🧠 学到的", "default")); blocks.push(...itemBlocks(review.learning)); }
  if (review.health?.length) { blocks.push(h3("💪 健康", "green")); blocks.push(...itemBlocks(review.health)); }
  if (review.books?.length) { blocks.push(h3("📚 在读的书", "default")); blocks.push(...itemBlocks(review.books)); }
  if (review.energyDistribution && Object.keys(review.energyDistribution).length) {
    blocks.push(h3("⚡ 精力分布", "default"));
    blocks.push(tagsBlock([Object.entries(review.energyDistribution).map(([k, v]) => `${k} ${v}%`).join("、")]));
  }
  const pz = review.progressZones;
  if (pz && (pz.breakthrough || pz.inPractice || pz.plantedSeed)) {
    blocks.push(h3("🌱 成长区域", "default"));
    if (pz.breakthrough) blocks.push(tagsBlock([`🟢 突破：${pz.breakthrough}`]));
    if (pz.inPractice)   blocks.push(tagsBlock([`🟡 练习中：${pz.inPractice}`]));
    if (pz.plantedSeed)  blocks.push(tagsBlock([`🔵 种下的种子：${pz.plantedSeed}`]));
  }

  blocks.push(h3("🪞 周复盘", "brown"));
  blocks.push(tagsBlock([review.reviewParagraph]));

  if (review.nextSteps.length > 0) {
    blocks.push(h3("🎯 下周计划", "green"));
    for (const step of review.nextSteps) {
      blocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: step } }], checked: false } });
    }
  }

  if (review.psychNote) {
    blocks.push(h3("🧘 正能量", "purple"));
    blocks.push(tagsBlock([review.psychNote]));
  }

  await withAuthCheck(() =>
    notion.blocks.children.append({ block_id: calloutId, children: blocks })
  );

  return calloutId;
}
```

- [ ] **Step 3: Add updateWeekPageImage — updates 手绘复盘图 property on the week page**

Add after `appendWeeklyReviewBlocks`:

```typescript
export async function updateWeekPageImage(
  accessToken: string,
  weekPageId: string,
  imageUrl: string
): Promise<void> {
  const notion = createNotionClient(accessToken);
  await withAuthCheck(() =>
    notion.pages.update({
      page_id: weekPageId,
      properties: {
        手绘复盘图: {
          files: [{ name: "weekly-review.png", type: "external", external: { url: imageUrl } }],
        },
      } as UpdatePageParameters["properties"],
    })
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

---

## Task 4: Add Notion helper functions for monthly review

**Files:**
- Modify: `src/lib/notion.ts`

- [ ] **Step 1: Add findMonthSummaryPage — finds "复盘-汇总" row in the database**

Add after `updateWeekPageImage`:

```typescript
// 找到数据库里标题为"复盘-汇总"的特殊行，返回其 pageId
export async function findMonthSummaryPage(
  accessToken: string,
  databaseId: string
): Promise<string | null> {
  const notion = createNotionClient(accessToken);
  const res = await withAuthCheck(() =>
    notion.databases.query({
      database_id: databaseId,
      filter: { property: "Name", title: { equals: "复盘-汇总" } },
      page_size: 1,
    })
  ) as { results: { id: string }[] };

  return res.results[0]?.id ?? null;
}
```

- [ ] **Step 2: Add appendMonthlyReviewBlocks — writes monthly review Toggle to 复盘-汇总 page**

Add after `findMonthSummaryPage`:

```typescript
export async function appendMonthlyReviewBlocks(
  accessToken: string,
  summaryPageId: string,
  review: import("@/lib/claude").MonthlyReview
): Promise<string | undefined> {
  const notion = createNotionClient(accessToken);

  // Toggle title includes the date range, e.g. "5月1日-5月31日复盘"
  const toggleTitle = `${review.dateRange}复盘`;

  const toggleRes = await withAuthCheck(() =>
    notion.blocks.children.append({
      block_id: summaryPageId,
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
                  icon: { type: "emoji", emoji: "🗓" },
                  color: "green_background",
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

  const toggleChildren = await withAuthCheck(() =>
    notion.blocks.children.list({ block_id: toggleId })
  ) as { results: { id: string; type: string }[] };

  const calloutId = toggleChildren.results.find(b => b.type === "callout")?.id;
  if (!calloutId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  blocks.push(h3("⭐ 月评分", "orange"));
  blocks.push(tagsBlock([`${review.score}/10  ${review.scoreReason}`]));

  blocks.push(h3("💡 一句话感悟", "yellow"));
  const insightText = review.oneLineInsightZh
    ? `${review.oneLineInsight}\n「${review.oneLineInsightZh}」`
    : review.oneLineInsight;
  blocks.push(tagsBlock([insightText]));

  blocks.push(h3("📊 本月规律", "default"));
  blocks.push(tagsBlock([review.monthlyPattern]));

  blocks.push(h3("🌊 情绪规律", "pink"));
  blocks.push(tagsBlock([review.emotionPattern]));

  blocks.push(h3("🔍 核心困境", "red"));
  blocks.push(tagsBlock([review.coreProblem]));

  if (review.crossWeekFlag) {
    blocks.push(h3("🚩 持续信号", "red"));
    blocks.push(tagsBlock([review.crossWeekFlag]));
  }

  if (review.learning?.length) { blocks.push(h3("🧠 学到的", "default")); blocks.push(...itemBlocks(review.learning)); }
  if (review.health?.length) { blocks.push(h3("💪 健康", "green")); blocks.push(...itemBlocks(review.health)); }
  if (review.books?.length) { blocks.push(h3("📚 在读的书", "default")); blocks.push(...itemBlocks(review.books)); }

  const pz = review.progressZones;
  if (pz && (pz.breakthrough || pz.inPractice || pz.plantedSeed)) {
    blocks.push(h3("🌱 成长区域", "default"));
    if (pz.breakthrough) blocks.push(tagsBlock([`🟢 突破：${pz.breakthrough}`]));
    if (pz.inPractice)   blocks.push(tagsBlock([`🟡 练习中：${pz.inPractice}`]));
    if (pz.plantedSeed)  blocks.push(tagsBlock([`🔵 种下的种子：${pz.plantedSeed}`]));
  }

  blocks.push(h3("🪞 月复盘", "brown"));
  blocks.push(tagsBlock([review.reviewParagraph]));

  if (review.nextMonthDirection?.length) {
    blocks.push(h3("🧭 下月方向", "green"));
    for (const step of review.nextMonthDirection) {
      blocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: step } }], checked: false } });
    }
  }

  if (review.psychNote) {
    blocks.push(h3("🧘 正能量", "purple"));
    blocks.push(tagsBlock([review.psychNote]));
  }

  await withAuthCheck(() =>
    notion.blocks.children.append({ block_id: calloutId, children: blocks })
  );

  return calloutId;
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

---

## Task 5: Create /api/review/weekly route

**Files:**
- Create: `src/app/api/review/weekly/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { generateWeeklyReview } from "@/lib/claude";
import {
  findOrCreateWeekPage,
  getWeekDailyEntries,
  appendWeeklyReviewBlocks,
  updateWeekPageImage,
} from "@/lib/notion";

// POST /api/review/weekly
// Body: { weekLabel: "5-25-31" }
// Reads daily entries for the week, generates weekly review, writes to Notion
export async function POST(req: NextRequest) {
  const { weekLabel } = await req.json() as { weekLabel: string };
  if (!weekLabel) {
    return NextResponse.json({ error: "Missing weekLabel" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 1. Read all daily entries for this week from Notion
    const dailyEntries = await getWeekDailyEntries(token, databaseId, weekLabel);
    if (dailyEntries.length === 0) {
      return NextResponse.json({ error: "No daily entries found for this week" }, { status: 404 });
    }

    // 2. Generate weekly review via Claude
    // Build minimal DailyReview-shaped objects from Notion properties
    const reviewInputs = dailyEntries.map(e => ({
      date: e.date,
      oneLineInsight: e.insight,
      oneLineInsightZh: "",
      reviewParagraph: e.review,
      score: e.score ?? 5,
      scoreReason: "",
      people: [], places: [], events: [], books: [], mediaConsumed: [],
      moviesTV: [], parenting: [], health: [], finance: [], learning: [],
      creativeOutput: [], emotions: [], nextSteps: [], psychNote: "",
      energyDistribution: {},
      progressZones: { breakthrough: null, inPractice: null, plantedSeed: null },
    }));

    const review = await generateWeeklyReview(weekLabel, reviewInputs);

    // 3. Write review to Notion week page body
    const weekPageId = await findOrCreateWeekPage(token, databaseId, `2026-${weekLabel.split("-")[0].padStart(2,"0")}-${weekLabel.split("-")[1].padStart(2,"0")}`);
    const calloutId = await appendWeeklyReviewBlocks(token, weekPageId, review);

    // 4. Generate AI image and store in 手绘复盘图 property
    let imageUrl: string | null = null;
    try {
      const imgRes = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/api/handlog/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review: { oneLineInsight: review.oneLineInsight, score: review.score, emotions: review.emotions },
          calloutId: null, // don't store in callout for weekly
          storeInProperty: true,
        }),
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json() as { imageUrl?: string };
        imageUrl = imgData.imageUrl ?? null;
      }
    } catch { /* image generation failure is non-fatal */ }

    if (imageUrl) {
      await updateWeekPageImage(token, weekPageId, imageUrl);
    }

    return NextResponse.json({ ...review, calloutId, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

---

## Task 6: Create /api/review/monthly route

**Files:**
- Create: `src/app/api/review/monthly/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { generateMonthlyReview } from "@/lib/claude";
import {
  queryDatabase,
  findMonthSummaryPage,
  appendMonthlyReviewBlocks,
  appendImageBlock,
} from "@/lib/notion";

// POST /api/review/monthly
// Body: { year: 2026, month: 5 }
// Reads all week pages for the month, generates monthly review, writes to 复盘-汇总
export async function POST(req: NextRequest) {
  const { year, month } = await req.json() as { year: number; month: number };
  if (!year || !month) {
    return NextResponse.json({ error: "Missing year or month" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 1. Query all week pages for this month (titles like "5-1-7", "5-8-14", etc.)
    // Week page titles start with "{month}-"
    const allPages = await queryDatabase(token, {
      database_id: databaseId,
      filter: {
        property: "Name",
        title: { starts_with: `${month}-` },
      },
      sorts: [{ property: "Name", direction: "ascending" }],
    }) as { results: Array<{ id: string; properties: Record<string, unknown> }> };

    // Filter to pages that look like week pages (format: "5-25-31", 3 parts)
    const weekPages = allPages.results.filter(p => {
      const name = (p.properties["Name"] as { title?: { plain_text: string }[] })?.title?.[0]?.plain_text ?? "";
      return name.split("-").length === 3;
    });

    if (weekPages.length === 0) {
      return NextResponse.json({ error: `No week pages found for ${year}-${month}` }, { status: 404 });
    }

    // 2. Build minimal WeeklyReview objects from week page properties
    const weeklyInputs = weekPages.map(p => {
      const props = p.properties as Record<string, {
        title?: { plain_text: string }[];
        rich_text?: { plain_text: string }[];
      }>;
      const weekLabel = props["Name"]?.title?.[0]?.plain_text ?? "";
      return {
        weekLabel,
        oneLineInsight: props["一句话感悟"]?.rich_text?.[0]?.plain_text ?? "",
        oneLineInsightZh: "",
        reviewParagraph: props["复盘"]?.rich_text?.[0]?.plain_text ?? "",
        score: 5, scoreReason: "", people: [], places: [], events: [], books: [],
        mediaConsumed: [], moviesTV: [], parenting: [], health: [], finance: [],
        learning: [], creativeOutput: [], emotions: [], nextSteps: [],
        energyDistribution: {}, psychNote: "",
        progressZones: { breakthrough: null, inPractice: null, plantedSeed: null },
        scoreTrend: [], emotionPattern: "", coreProblem: "", crossWeekFlag: null,
      };
    });

    // 3. Build date range string (e.g. "5月1日-5月31日")
    const lastDay = new Date(year, month, 0).getDate();
    const dateRange = `${month}月1日-${month}月${lastDay}日`;
    const monthLabel = `${year}年${month}月`;

    // 4. Generate monthly review
    const review = await generateMonthlyReview(monthLabel, dateRange, weeklyInputs);

    // 5. Find 复盘-汇总 page and write the review
    const summaryPageId = await findMonthSummaryPage(token, databaseId);
    if (!summaryPageId) {
      return NextResponse.json({ error: "复盘-汇总 page not found in Notion database" }, { status: 404 });
    }

    const calloutId = await appendMonthlyReviewBlocks(token, summaryPageId, review);

    // 6. Generate AI image and store inside the monthly toggle callout
    let imageUrl: string | null = null;
    if (calloutId) {
      try {
        const imgRes = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/api/handlog/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review: { oneLineInsight: review.oneLineInsight, score: review.score, emotions: review.emotions },
            calloutId: null,
            storeInProperty: false,
          }),
        });
        if (imgRes.ok) {
          const imgData = await imgRes.json() as { imageUrl?: string };
          imageUrl = imgData.imageUrl ?? null;
        }
      } catch { /* non-fatal */ }

      if (imageUrl) {
        await appendImageBlock(token, calloutId, imageUrl);
      }
    }

    return NextResponse.json({ ...review, calloutId, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

---

## Task 7: Update Review page UI

**Files:**
- Modify: `src/app/[locale]/review/ReviewContent.tsx`

- [ ] **Step 1: Add state and helper for weekly/monthly review at the top of ReviewContent**

After existing state declarations, add:

```typescript
const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
const [weekLabel, setWeekLabel] = useState<string>(() => {
  // Auto-compute current week label from today
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.getMonth() + 1}-${mon.getDate()}-${sun.getDate()}`;
});
const [weekReview, setWeekReview] = useState<import("@/lib/claude").WeeklyReview | null>(null);
const [weekLoading, setWeekLoading] = useState(false);
const [weekError, setWeekError] = useState<string | null>(null);
const [monthReview, setMonthReview] = useState<import("@/lib/claude").MonthlyReview | null>(null);
const [monthLoading, setMonthLoading] = useState(false);
const [monthError, setMonthError] = useState<string | null>(null);
```

- [ ] **Step 2: Add generate functions for weekly and monthly**

After the existing `generate` function:

```typescript
const generateWeekly = async () => {
  setWeekLoading(true);
  setWeekError(null);
  try {
    const res = await fetch("/api/review/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekLabel }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed");
    setWeekReview(data);
  } catch (err) {
    setWeekError(err instanceof Error ? err.message : "Something went wrong");
  } finally {
    setWeekLoading(false);
  }
};

const generateMonthly = async () => {
  const now = new Date();
  setMonthLoading(true);
  setMonthError(null);
  try {
    const res = await fetch("/api/review/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: now.getFullYear(), month: now.getMonth() + 1 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed");
    setMonthReview(data);
  } catch (err) {
    setMonthError(err instanceof Error ? err.message : "Something went wrong");
  } finally {
    setMonthLoading(false);
  }
};
```

- [ ] **Step 3: Add tab bar at the top of the rendered JSX**

Replace the existing `<div className="mb-5">` header block with:

```tsx
{/* Tab bar */}
<div className="flex gap-2 mb-6">
  {(["daily", "weekly", "monthly"] as const).map(tab => (
    <button
      key={tab}
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-[6px] rounded-full text-[13px] font-medium transition-colors ${
        activeTab === tab
          ? "bg-[#2C1F14] text-white"
          : "bg-white border border-[#E4D4C0] text-[#8B6B4A] hover:border-[#C4A98A]"
      }`}
    >
      {tab === "daily" ? "Daily" : tab === "weekly" ? "Weekly" : "Monthly"}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Add Weekly tab content after the daily review JSX**

At the end of the return statement, before the closing `</div>`, add:

```tsx
{/* Weekly Review Tab */}
{activeTab === "weekly" && (
  <div className="space-y-4">
    <div className="mb-5">
      <h2 className="text-[26px] font-semibold text-[#2C1F14] tracking-tight">Weekly Review</h2>
      <p className="text-[14px] text-[#8B6B4A] mt-1">Week of {weekLabel}</p>
    </div>
    {!weekReview ? (
      <div className="text-center py-16">
        <p className="text-[#8B6B4A] mb-6 text-[14px]">Generate a summary of your week from all daily entries.</p>
        <button
          type="button"
          onClick={generateWeekly}
          disabled={weekLoading}
          className="h-[48px] px-8 bg-[#C4783A] text-white rounded-[8px] text-[15px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
        >
          {weekLoading ? "Generating..." : "✨ Generate weekly review"}
        </button>
        {weekError && <p className="text-[#C4783A] mt-4 text-[13px]">{weekError}</p>}
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        <RCard full warm>
          <Label en="💡 Weekly insight" zh="本周感悟" />
          <p className="text-[18px] font-semibold text-[#2C1F14] italic leading-relaxed">{weekReview.oneLineInsight}</p>
          {weekReview.oneLineInsightZh && <p className="text-[13px] text-[#8B6B4A] mt-1">「{weekReview.oneLineInsightZh}」</p>}
        </RCard>
        <RCard>
          <Label en="📈 Score trend" zh="分数趋势" />
          <p className="text-[15px] text-[#2C1F14]">{weekReview.scoreTrend.map(s => s ?? "-").join(" → ")}</p>
          <p className="text-[13px] text-[#8B6B4A] mt-1">Week avg: {weekReview.score}/10</p>
        </RCard>
        <RCard>
          <Label en="🌊 Emotion pattern" zh="情绪规律" />
          <p className="text-[14px] text-[#2C1F14]">{weekReview.emotionPattern}</p>
        </RCard>
        <RCard>
          <Label en="🔍 Core challenge" zh="核心困境" />
          <p className="text-[14px] text-[#2C1F14]">{weekReview.coreProblem}</p>
        </RCard>
        {weekReview.crossWeekFlag && (
          <RCard full>
            <Label en="🚩 Cross-week signal" zh="跨周信号" />
            <p className="text-[14px] text-[#2C1F14]">{weekReview.crossWeekFlag}</p>
          </RCard>
        )}
        <RCard full>
          <Label en="🪞 Review" zh="周复盘" />
          <p className="text-[14px] text-[#2C1F14] leading-relaxed">{weekReview.reviewParagraph}</p>
        </RCard>
        {weekReview.nextSteps.length > 0 && (
          <RCard full>
            <Label en="🎯 Next week" zh="下周计划" />
            <ul className="space-y-1 mt-1">
              {weekReview.nextSteps.map((s, i) => <li key={i} className="text-[13px] text-[#2C1F14] flex gap-2"><span className="text-[#C4783A]">→</span>{s}</li>)}
            </ul>
          </RCard>
        )}
      </div>
    )}
  </div>
)}

{/* Monthly Review Tab */}
{activeTab === "monthly" && (
  <div className="space-y-4">
    <div className="mb-5">
      <h2 className="text-[26px] font-semibold text-[#2C1F14] tracking-tight">Monthly Review</h2>
      <p className="text-[14px] text-[#8B6B4A] mt-1">{new Date().toLocaleString("en", { month: "long", year: "numeric" })}</p>
    </div>
    {!monthReview ? (
      <div className="text-center py-16">
        <p className="text-[#8B6B4A] mb-6 text-[14px]">Generate a monthly synthesis from all weekly reviews.</p>
        <button
          type="button"
          onClick={generateMonthly}
          disabled={monthLoading}
          className="h-[48px] px-8 bg-[#C4783A] text-white rounded-[8px] text-[15px] font-medium hover:bg-[#A85E28] transition-colors disabled:bg-[#EDD4BC] disabled:cursor-not-allowed"
        >
          {monthLoading ? "Generating..." : "✨ Generate monthly review"}
        </button>
        {monthError && <p className="text-[#C4783A] mt-4 text-[13px]">{monthError}</p>}
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-3">
        <RCard full warm>
          <Label en="💡 Monthly insight" zh="本月感悟" />
          <p className="text-[18px] font-semibold text-[#2C1F14] italic leading-relaxed">{monthReview.oneLineInsight}</p>
          {monthReview.oneLineInsightZh && <p className="text-[13px] text-[#8B6B4A] mt-1">「{monthReview.oneLineInsightZh}」</p>}
        </RCard>
        <RCard>
          <Label en="📊 Monthly pattern" zh="本月规律" />
          <p className="text-[14px] text-[#2C1F14]">{monthReview.monthlyPattern}</p>
        </RCard>
        <RCard>
          <Label en="🌊 Emotion pattern" zh="情绪规律" />
          <p className="text-[14px] text-[#2C1F14]">{monthReview.emotionPattern}</p>
        </RCard>
        <RCard>
          <Label en="🔍 Core challenge" zh="核心困境" />
          <p className="text-[14px] text-[#2C1F14]">{monthReview.coreProblem}</p>
        </RCard>
        <RCard full>
          <Label en="🪞 Review" zh="月复盘" />
          <p className="text-[14px] text-[#2C1F14] leading-relaxed">{monthReview.reviewParagraph}</p>
        </RCard>
        {monthReview.nextMonthDirection?.length > 0 && (
          <RCard full>
            <Label en="🧭 Next month" zh="下月方向" />
            <ul className="space-y-1 mt-1">
              {monthReview.nextMonthDirection.map((s, i) => <li key={i} className="text-[13px] text-[#2C1F14] flex gap-2"><span className="text-[#C4783A]">→</span>{s}</li>)}
            </ul>
          </RCard>
        )}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Make sure daily review content is conditionally shown only when activeTab === "daily"**

Wrap the existing daily review JSX (`{!review ? ... : <div className="space-y-3">...}`) with:
```tsx
{activeTab === "daily" && ( ... existing daily JSX ... )}
```

- [ ] **Step 6: TypeScript check and dev server test**

```bash
npx tsc --noEmit
```

Then open http://localhost:3001/en/review and verify:
- Three tab buttons appear at top: Daily / Weekly / Monthly
- Daily tab shows existing review UI
- Weekly tab shows "Generate weekly review" button
- Monthly tab shows "Generate monthly review" button

---

## Task 8: Commit

- [ ] **Step 1: Commit all changes**

```bash
git add \
  src/lib/claude.ts \
  src/lib/notion.ts \
  src/prompts/weekly-review.md \
  src/prompts/monthly-review.md \
  src/app/api/review/weekly/route.ts \
  src/app/api/review/monthly/route.ts \
  src/app/[locale]/review/ReviewContent.tsx \
  docs/superpowers/plans/2026-05-28-weekly-monthly-review.md

git commit -m "feat: add weekly and monthly review (E13/E14)"
```
