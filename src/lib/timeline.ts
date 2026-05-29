import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// 一条周记录（对应 Notion 里的一行）
export interface WeekEntry {
  weekLabel: string;    // "5-25-31"（原始标题）
  dateRange: string;    // "5月25日 - 5月31日"（展示用）
  mondayDate: string;   // "2026-05-25"（用于排序/分组）
  score: number | null;
  insight: string;      // 一句话感悟
  labels: string[];
  weekPageId: string;   // Notion 页面 ID
}

// 保留 DayEntry 供其他模块使用（dashboard 等），但 timeline 不再用
export interface DayEntry {
  date: string;
  weekday: string;
  dailySummary: string;
  score: number | null;
  insight: string;
  labels: string[];
  weekPageId: string;
}

// 从周标题（如 "5-25-31"）解析出周一的日期
function parseMondayFromTitle(title: string): Date | null {
  const m = title.match(/^(\d{1,2})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const month = parseInt(m[1]);
  const day = parseInt(m[2]);
  const year = new Date().getFullYear();
  return new Date(year, month - 1, day);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 把周标题格式化为展示字符串，如 "5月25日 - 5月31日"
function formatDateRange(title: string): string {
  const m = title.match(/^(\d{1,2})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return title;
  return `${m[1]}月${m[2]}日 — ${m[1]}月${m[3]}日`;
}

// 主函数：每个 Notion 页面 → 一条 WeekEntry
export function toWeekEntries(pages: PageObjectResponse[]): WeekEntry[] {
  const entries: WeekEntry[] = [];

  for (const page of pages) {
    const props = page.properties as Record<string, unknown>;

    const titleProp = props["Name"] as { title?: { plain_text: string }[] } | undefined;
    const title = titleProp?.title?.[0]?.plain_text ?? "";
    const monday = parseMondayFromTitle(title);
    if (!monday) continue; // 跳过格式不匹配的行（如 "4月"）

    const scoreProp = props["打分"] as { number?: number } | undefined;
    const insightProp = props["一句话感悟"] as { rich_text?: { plain_text: string }[] } | undefined;
    const labelProp = props["label标签"] as { multi_select?: { name: string }[] } | undefined;

    entries.push({
      weekLabel: title,
      dateRange: formatDateRange(title),
      mondayDate: formatDate(monday),
      score: scoreProp?.number ?? null,
      insight: insightProp?.rich_text?.[0]?.plain_text ?? "",
      labels: labelProp?.multi_select?.map((t) => t.name) ?? [],
      weekPageId: page.id,
    });
  }

  // 最新的周在最前
  return entries.sort((a, b) => b.mondayDate.localeCompare(a.mondayDate));
}

// ── 保留旧函数供 dashboard 等使用 ──────────────────────────────────────────────

const CN_DAYS = ["一", "二", "三", "四", "五", "六", "七"];
const NUM_DAYS = ["1", "2", "3", "4", "5", "6", "7"];
const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function parseDailySummary(text: string): { dayIndex: number; text: string }[] {
  if (!text.trim()) return [];
  const results: { dayIndex: number; text: string }[] = [];
  const lines = text.split("\n");
  let current: { dayIndex: number; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cnMatch = trimmed.match(/^([一二三四五六七])[.．]\s*(.*)/);
    const numMatch = trimmed.match(/^([1-7])[.．]\s*(.*)/);
    if (cnMatch) {
      if (current) results.push({ dayIndex: current.dayIndex, text: current.lines.join("\n") });
      current = { dayIndex: CN_DAYS.indexOf(cnMatch[1]), lines: [cnMatch[2]] };
    } else if (numMatch) {
      if (current) results.push({ dayIndex: current.dayIndex, text: current.lines.join("\n") });
      current = { dayIndex: NUM_DAYS.indexOf(numMatch[1]), lines: [numMatch[2]] };
    } else if (current) {
      current.lines.push(trimmed);
    }
  }
  if (current) results.push({ dayIndex: current.dayIndex, text: current.lines.join("\n") });
  return results;
}

export function expandToDayEntries(pages: PageObjectResponse[]): DayEntry[] {
  const entries: DayEntry[] = [];
  for (const page of pages) {
    const props = page.properties as Record<string, unknown>;
    const titleProp = props["Name"] as { title?: { plain_text: string }[] } | undefined;
    const title = titleProp?.title?.[0]?.plain_text ?? "";
    const monday = parseMondayFromTitle(title);
    if (!monday) continue;
    const summaryProp = props["简短日常"] as { rich_text?: { plain_text: string }[] } | undefined;
    const summaryText = summaryProp?.rich_text?.[0]?.plain_text ?? "";
    const scoreProp = props["打分"] as { number?: number } | undefined;
    const insightProp = props["一句话感悟"] as { rich_text?: { plain_text: string }[] } | undefined;
    const labelProp = props["label标签"] as { multi_select?: { name: string }[] } | undefined;
    const score = scoreProp?.number ?? null;
    const insight = insightProp?.rich_text?.[0]?.plain_text ?? "";
    const labels = labelProp?.multi_select?.map((t) => t.name) ?? [];
    const days = parseDailySummary(summaryText);
    for (const { dayIndex, text } of days) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + dayIndex);
      entries.push({ date: formatDate(date), weekday: WEEKDAY_LABELS[dayIndex], dailySummary: text, score, insight, labels, weekPageId: page.id });
    }
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
