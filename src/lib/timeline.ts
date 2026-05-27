// 把 Notion 周记录的「简短日常」按天拆开，返回每天一条记录
// 简短日常格式：
//   "1. Wheeler hills\n2. Ben toy library\n三. 预定clayton..."
// 同时兼容阿拉伯数字（历史数据）和中文数字（新写入数据）

import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface DayEntry {
  date: string;          // "2026-05-27"
  weekday: string;       // "周三"
  dailySummary: string;  // 当天日记原文
  score: number | null;
  insight: string;       // 一句话感悟
  labels: string[];
  weekPageId: string;    // 来源周页面 ID，备用
}

// 中文数字映射，index 0 = 周一
const CN_DAYS = ["一", "二", "三", "四", "五", "六", "七"];
// 阿拉伯数字 1-7 对应周一到周日
const NUM_DAYS = ["1", "2", "3", "4", "5", "6", "7"];

// 从周标题（如 "5-25-31"）解析出周一的日期
function parseMondayFromTitle(title: string): Date | null {
  // 格式：月-周一日-周日日，如 "5-25-31" 或 "12-30-5"
  const m = title.match(/^(\d{1,2})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const month = parseInt(m[1]);
  const day = parseInt(m[2]);
  const year = new Date().getFullYear(); // 假设当年，后续可按需扩展
  return new Date(year, month - 1, day);
}

// 把简短日常文字按天拆分，返回 [{ dayIndex: 0-6, text: "..." }]
// dayIndex 0 = 周一，6 = 周日
function parseDailySummary(text: string): { dayIndex: number; text: string }[] {
  if (!text.trim()) return [];

  const results: { dayIndex: number; text: string }[] = [];

  // 同时匹配 "1." "1．" "一." "一．" 开头的行
  const lines = text.split("\n");
  let current: { dayIndex: number; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检查是否是新的一天开始（中文或数字 + 点号）
    const cnMatch = trimmed.match(/^([一二三四五六七])[.．]\s*(.*)/);
    const numMatch = trimmed.match(/^([1-7])[.．]\s*(.*)/);

    if (cnMatch) {
      if (current) results.push({ dayIndex: current.dayIndex, text: current.lines.join("\n") });
      const dayIndex = CN_DAYS.indexOf(cnMatch[1]);
      current = { dayIndex, lines: [cnMatch[2]] };
    } else if (numMatch) {
      if (current) results.push({ dayIndex: current.dayIndex, text: current.lines.join("\n") });
      const dayIndex = NUM_DAYS.indexOf(numMatch[1]);
      current = { dayIndex, lines: [numMatch[2]] };
    } else if (current) {
      // 续行（没有新的天标记，追加到当前天）
      current.lines.push(trimmed);
    }
  }

  if (current) results.push({ dayIndex: current.dayIndex, text: current.lines.join("\n") });
  return results;
}

// 格式化日期为 "2026-05-27"
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

// 主函数：把 Notion 页面数组转成按天展开的 DayEntry 数组
export function expandToDayEntries(pages: PageObjectResponse[]): DayEntry[] {
  const entries: DayEntry[] = [];

  for (const page of pages) {
    const props = page.properties as Record<string, unknown>;

    // 读取标题（周起止日期）
    const titleProp = props["Name"] as { title?: { plain_text: string }[] } | undefined;
    const title = titleProp?.title?.[0]?.plain_text ?? "";
    const monday = parseMondayFromTitle(title);
    if (!monday) continue; // 跳过格式不对的页面（如"4月"）

    // 读取简短日常
    const summaryProp = props["简短日常"] as { rich_text?: { plain_text: string }[] } | undefined;
    const summaryText = summaryProp?.rich_text?.[0]?.plain_text ?? "";

    // 读取评分
    const scoreProp = props["打分"] as { number?: number } | undefined;
    const score = scoreProp?.number ?? null;

    // 读取一句话感悟
    const insightProp = props["一句话感悟"] as { rich_text?: { plain_text: string }[] } | undefined;
    const insight = insightProp?.rich_text?.[0]?.plain_text ?? "";

    // 读取标签
    const labelProp = props["label标签"] as { multi_select?: { name: string }[] } | undefined;
    const labels = labelProp?.multi_select?.map((t) => t.name) ?? [];

    // 按天拆分
    const days = parseDailySummary(summaryText);
    for (const { dayIndex, text } of days) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + dayIndex);

      entries.push({
        date: formatDate(date),
        weekday: WEEKDAY_LABELS[dayIndex],
        dailySummary: text,
        score,
        insight,
        labels,
        weekPageId: page.id,
      });
    }
  }

  // 按日期倒序（最新在前）
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
