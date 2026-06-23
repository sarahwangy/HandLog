import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId, getAuthSession } from "@/lib/auth";
import { findOrCreateWeekPage, getPage } from "@/lib/notion";
import { generateWeeklyTableBullets } from "@/lib/claude";

// POST /api/table/weekly
// Body: { weekLabel: "5-4-10" }
// 读取周页面的「简短日常」原始内容，让 Claude 解析每天内容并提取要点，生成 markdown 表格
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // 让 Claude 直接解析原始内容，不依赖固定格式
    const bulleted = await generateWeeklyTableBullets(weekLabel, dailySummary);

    if (bulleted.length === 0) {
      return NextResponse.json({ error: "无法从本周内容提取每日要点" }, { status: 404 });
    }

    const markdownTable = buildMarkdownTable(bulleted, year);
    return NextResponse.json({ markdownTable, weekPageId });
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
