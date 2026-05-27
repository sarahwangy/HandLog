import { NextResponse } from "next/server";
import { getNotionTokenInternal, getNotionDatabaseId } from "@/lib/auth";
import { queryDatabase } from "@/lib/notion";
import { DEFAULT_FIELD_MAPPING } from "@/lib/notion-schema";
import { transformNotionPages } from "@/lib/dashboard";

// GET /api/dashboard
// 返回 DashboardData JSON，供前端图表使用
export async function GET() {
  // 开发环境默认返回 mock 数据
  // 设置 NOTION_REAL_DATA=true 可强制读取真实 Notion 数据
  if (process.env.NODE_ENV === "development" && process.env.NOTION_REAL_DATA !== "true") {
    return NextResponse.json(buildMockData());
  }

  try {
    const token = getNotionTokenInternal();
    const databaseId = getNotionDatabaseId();

    // 拉取全部周记录（最多 100 条，约 2 年数据）
    const response = await queryDatabase(token, {
      database_id: databaseId,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 100,
    });

    const data = transformNotionPages(response.results, {
      name: DEFAULT_FIELD_MAPPING.name,
      score: DEFAULT_FIELD_MAPPING.score,
      labels: DEFAULT_FIELD_MAPPING.labels,
      insight: DEFAULT_FIELD_MAPPING.insight,
    });

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 开发环境 mock 数据，让图表可以正常渲染
function buildMockData() {
  const entries = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const labels = [
      ["Learning", "Health"][i % 2],
      ["Focus", "Social", "Creative"][i % 3],
    ];
    return {
      date: d.toISOString().slice(0, 10),
      score: 5 + Math.round(Math.sin(i * 0.4) * 2.5 + Math.random() * 1.5),
      labels,
      insight: "A good day of reflection.",
    };
  });

  const labelMap: Record<string, number> = {};
  for (const e of entries) {
    for (const l of e.labels) labelMap[l] = (labelMap[l] ?? 0) + 1;
  }
  const labelFrequency = Object.entries(labelMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    entries,
    scoreTrend: entries.map(e => ({ date: e.date, score: e.score })),
    labelFrequency,
    avgScore: 7.2,
    totalEntries: 30,
    currentStreak: 12,
  };
}
