import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal } from "@/lib/auth";
import { appendTableToggle } from "@/lib/notion";

// POST /api/table/weekly/save
// Body: { markdownTable: string, weekPageId: string, weekLabel: string }
// 把表格以 Toggle > Notion 表格格式写入周页面 body，toggle 名称含当周时间
export async function POST(req: NextRequest) {
  const { markdownTable, weekPageId, weekLabel } = await req.json() as {
    markdownTable: string;
    weekPageId: string;
    weekLabel: string;
  };
  if (!markdownTable || !weekPageId) {
    return NextResponse.json({ error: "Missing markdownTable or weekPageId" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const toggleTitle = weekLabel ? `❤一周事件-表格-${weekLabel}` : "❤一周事件-表格";
    await appendTableToggle(token, weekPageId, markdownTable, toggleTitle);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
