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
