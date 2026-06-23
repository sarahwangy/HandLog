import { NextRequest, NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId, getAuthSession } from "@/lib/auth";
import { queryDatabase, findOrCreateMonthlyTablePage } from "@/lib/notion";
import { generateMonthlyTableBullets, type DayBullets } from "@/lib/claude";

// POST /api/table/monthly
// Body: { year: 2026, month: 5 }
// 读取该月所有周页面（"5-4-10" 格式）的「简短日常」，让 Claude 解析每天内容，生成 markdown 表格
// 注意：和月复盘一样，数据来源是周页面（三段标题），而不是单日页面
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { year, month } = await req.json() as { year: number; month: number };
  if (!year || !month) return NextResponse.json({ error: "Missing year or month" }, { status: 400 });

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 查询本月所有页面，筛选出周页面（三段标题，如 "5-4-10"）
    const allPages = await queryDatabase(token, {
      database_id: databaseId,
      filter: {
        property: "Name",
        title: { starts_with: `${month}-` },
      },
      sorts: [{ property: "Name", direction: "ascending" }],
    }) as { results: Array<{ properties: Record<string, unknown> }> };

    const weekPages = allPages.results.filter(p => {
      const props = p.properties as Record<string, { title?: { plain_text: string }[] }>;
      const name = props["Name"]?.title?.[0]?.plain_text ?? "";
      return name.split("-").length === 3;
    });

    if (weekPages.length === 0) {
      return NextResponse.json({ error: `${year}年${month}月没有找到日记内容` }, { status: 404 });
    }

    // 收集所有周的内容，一次 Claude 调用处理整月（省 75% token）
    const weeks = weekPages
      .map(p => {
        const props = p.properties as Record<string, {
          title?: { plain_text: string }[];
          rich_text?: { plain_text: string }[];
        }>;
        return {
          weekLabel: props["Name"]?.title?.[0]?.plain_text ?? "",
          dailySummary: props["简短日常"]?.rich_text?.[0]?.plain_text ?? "",
        };
      })
      .filter(w => w.weekLabel && w.dailySummary.trim());

    if (weeks.length === 0) {
      return NextResponse.json({ error: `${year}年${month}月没有找到日记内容` }, { status: 404 });
    }

    const allBullets: DayBullets[] = await generateMonthlyTableBullets(weeks, month);

    if (allBullets.length === 0) {
      return NextResponse.json({ error: `${year}年${month}月日记内容为空` }, { status: 404 });
    }

    const markdownTable = buildMarkdownTable(allBullets, year);

    // 生成时就找或建好目标页面，save 步骤直接用 ID（和 weekly 一样的流程）
    const monthlyTablePageId = await findOrCreateMonthlyTablePage(token, databaseId, year, month);
    return NextResponse.json({ markdownTable, monthlyTablePageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildMarkdownTable(
  rows: DayBullets[],
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
