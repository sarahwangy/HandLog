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
    await appendTableToggle(token, pageId, markdownTable, "❤月事件-表格-时间");
    return NextResponse.json({ success: true, pageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
