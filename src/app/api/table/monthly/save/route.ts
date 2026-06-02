import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal } from "@/lib/auth";
import { appendTableToggle } from "@/lib/notion";

// POST /api/table/monthly/save
// Body: { markdownTable: string, monthlyTablePageId: string, year: number, month: number }
// 和 weekly save 一样：pageId 由 generate 步骤提前取得，save 直接用，不做额外 DB 查询
export async function POST(req: NextRequest) {
  const { markdownTable, monthlyTablePageId, year, month } = await req.json() as {
    markdownTable: string;
    monthlyTablePageId: string;
    year: number;
    month: number;
  };
  if (!markdownTable || !monthlyTablePageId) {
    return NextResponse.json({ error: "Missing markdownTable or monthlyTablePageId" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    await appendTableToggle(token, monthlyTablePageId, markdownTable, `❤月事件-表格-${year}-${month}`);
    return NextResponse.json({ success: true, pageTitle: `月度-table-${year}-${String(month).padStart(2, "0")}`, pageId: monthlyTablePageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
