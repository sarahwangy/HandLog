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
