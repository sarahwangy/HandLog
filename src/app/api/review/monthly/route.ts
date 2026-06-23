import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId, getAuthSession } from "@/lib/auth";
import { generateMonthlyReview } from "@/lib/claude";
import { queryDatabase } from "@/lib/notion";

// POST /api/review/monthly
// Body: { year: 2026, month: 5 }
// 读取本月所有周页面的原始「简短日常」，生成月复盘 JSON（不自动写入 Notion，由前端 Save 按钮触发保存）
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { year, month } = await req.json() as { year: number; month: number };
  if (!year || !month) {
    return NextResponse.json({ error: "Missing year or month" }, { status: 400 });
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 1. 查询本月所有周页面（标题格式 "5-1-7", "5-8-14", "5-25-31" 等，3 段）
    const allPages = await queryDatabase(token, {
      database_id: databaseId,
      filter: {
        property: "Name",
        title: { starts_with: `${month}-` },
      },
      sorts: [{ property: "Name", direction: "ascending" }],
    }) as { results: Array<{ id: string; properties: Record<string, unknown> }> };

    // 只保留周页面（标题有 3 段，如 "5-25-31"）
    const weekPages = allPages.results.filter(p => {
      const props = p.properties as Record<string, { title?: { plain_text: string }[] }>;
      const name = props["Name"]?.title?.[0]?.plain_text ?? "";
      return name.split("-").length === 3;
    });

    if (weekPages.length === 0) {
      return NextResponse.json({ error: `本月（${year}-${month}）没有找到日记记录` }, { status: 404 });
    }

    // 2. 从每个周页面提取原始「简短日常」文字，构建 RawDailyEntry
    // 每个周页面的 dailySummary 包含 "一. 二. 三." 格式的全周原始内容
    const rawEntries = weekPages.map(p => {
      const props = p.properties as Record<string, {
        title?: { plain_text: string }[];
        number?: number | null;
        rich_text?: { plain_text: string }[];
      }>;
      return {
        date: props["Name"]?.title?.[0]?.plain_text ?? "",  // e.g. "5-25-31"
        dailySummary: props["简短日常"]?.rich_text?.[0]?.plain_text ?? "",
        score: props["打分"]?.number ?? null,
      };
    }).filter(e => e.dailySummary.trim() !== "");

    if (rawEntries.length === 0) {
      return NextResponse.json({ error: "本月所有周记录都没有「简短日常」内容" }, { status: 404 });
    }

    // 3. 构建日期范围和月份标签
    const lastDay = new Date(year, month, 0).getDate();
    const dateRange = `${month}月1日-${month}月${lastDay}日`;
    const monthLabel = `${year}年${month}月`;

    // 4. Claude 生成月复盘（完整 24 个 section）
    const review = await generateMonthlyReview(monthLabel, dateRange, rawEntries);

    // 返回复盘数据（不自动写入 Notion，由前端 Save 按钮触发保存）
    return NextResponse.json(review);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
