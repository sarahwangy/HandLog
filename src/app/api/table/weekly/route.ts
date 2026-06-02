import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { findOrCreateWeekPage, getPage } from "@/lib/notion";
import { generateTableBullets } from "@/lib/claude";

// POST /api/table/weekly
// Body: { weekLabel: "5-4-10" }
// 读取周页面的「简短日常」（格式："一. 内容\n二. 内容"），解析每天内容，生成 markdown 表格
// 注意：日记存在周页面（"5-4-10"）而不是单日页面（"5-4"），与周复盘读取方式相同
export async function POST(req: NextRequest) {
  const { weekLabel } = await req.json() as { weekLabel: string };
  if (!weekLabel) return NextResponse.json({ error: "Missing weekLabel" }, { status: 400 });

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    const parts = weekLabel.split("-");
    const year = new Date().getFullYear();
    const dateForLookup = `${year}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    const weekPageId = await findOrCreateWeekPage(token, databaseId, dateForLookup);

    // 读取周页面的「简短日常」属性（和周复盘 API 相同来源）
    const page = await getPage(token, weekPageId) as {
      properties: Record<string, { rich_text?: { plain_text: string }[] }>;
    };
    const dailySummary = page.properties["简短日常"]?.rich_text?.[0]?.plain_text ?? "";

    if (!dailySummary.trim()) {
      return NextResponse.json({ error: "本周还没有日记内容，请先写日记再生成 Table" }, { status: 404 });
    }

    // 把 "一. 内容\n二. 内容" 格式解析成每天的独立条目
    const dayEntries = parseWeekDailySummary(weekLabel, dailySummary);

    if (dayEntries.length === 0) {
      return NextResponse.json({ error: "无法解析本周日记内容格式" }, { status: 404 });
    }

    const bulleted = await generateTableBullets(dayEntries);
    const markdownTable = buildMarkdownTable(bulleted, year);
    return NextResponse.json({ markdownTable, weekPageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 把周页面「简短日常」里的 "一. 内容\n二. 内容" 解析成每天条目
// weekLabel 格式 "5-4-10"，一=周一=5月4日，二=周二=5月5日，以此类推
function parseWeekDailySummary(
  weekLabel: string,
  dailySummary: string
): Array<{ date: string; dailySummary: string }> {
  const CN_DAYS = ["一", "二", "三", "四", "五", "六", "日"];
  const parts = weekLabel.split("-");
  const month = parseInt(parts[0]);
  const startDay = parseInt(parts[1]);

  const entries: Array<{ date: string; dailySummary: string }> = [];

  for (let i = 0; i < CN_DAYS.length; i++) {
    const dayChar = CN_DAYS[i];
    const marker = `${dayChar}.`;
    const startIdx = dailySummary.indexOf(marker);
    if (startIdx === -1) continue;

    const contentStart = startIdx + marker.length;
    // 找下一个天字符的位置作为结束
    let contentEnd = dailySummary.length;
    for (let j = i + 1; j < CN_DAYS.length; j++) {
      const nextIdx = dailySummary.indexOf(`${CN_DAYS[j]}.`, contentStart);
      if (nextIdx !== -1) { contentEnd = nextIdx; break; }
    }

    const content = dailySummary.slice(contentStart, contentEnd).trim();
    if (!content) continue;

    entries.push({ date: `${month}-${startDay + i}`, dailySummary: content });
  }

  return entries;
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
