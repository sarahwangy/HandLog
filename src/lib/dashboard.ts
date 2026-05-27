// Dashboard 数据转换工具
// 把从 Notion 拿到的原始页面列表，转成图表需要的格式

export interface DashboardEntry {
  date: string;        // "2026-05-26"
  score: number;       // 1-10
  labels: string[];    // multi-select 标签
  insight: string;     // 一句话感悟
}

export interface DashboardData {
  entries: DashboardEntry[];
  scoreTrend: { date: string; score: number }[];
  labelFrequency: { label: string; count: number }[];
  avgScore: number;
  totalEntries: number;
  currentStreak: number;   // 连续写日记天数
}

// 从 Notion API 返回的页面列表提取 Dashboard 数据
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformNotionPages(pages: any[], fieldMapping: {
  name: string;
  score: string;
  labels: string;
  insight: string;
}): DashboardData {
  const entries: DashboardEntry[] = [];

  for (const page of pages) {
    const props = page.properties;

    // 提取日期：从 title 字段（格式如 "5-25" 或 "2026-05-25"）
    const titleArr = props[fieldMapping.name]?.title;
    const rawName: string = titleArr?.[0]?.plain_text ?? "";

    // 提取分数
    const score: number = props[fieldMapping.score]?.number ?? 0;
    if (!score) continue; // 没有分数的条目跳过

    // 提取标签
    const labelArr = props[fieldMapping.labels]?.multi_select ?? [];
    const labels: string[] = labelArr.map((l: { name: string }) => l.name);

    // 提取感悟
    const insightArr = props[fieldMapping.insight]?.rich_text ?? [];
    const insight: string = insightArr[0]?.plain_text ?? "";

    // 从 page.created_time 或 rawName 解析日期
    const date = page.created_time?.slice(0, 10) ?? rawName;

    entries.push({ date, score, labels, insight });
  }

  // 按日期升序排列
  entries.sort((a, b) => a.date.localeCompare(b.date));

  // 分数趋势：最近 30 条
  const scoreTrend = entries.slice(-30).map(e => ({ date: e.date, score: e.score }));

  // 标签频率统计
  const labelMap: Record<string, number> = {};
  for (const e of entries) {
    for (const l of e.labels) {
      labelMap[l] = (labelMap[l] ?? 0) + 1;
    }
  }
  const labelFrequency = Object.entries(labelMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // 最多显示 8 个标签

  // 平均分
  const avgScore = entries.length
    ? Math.round((entries.reduce((s, e) => s + e.score, 0) / entries.length) * 10) / 10
    : 0;

  // 连续写日记天数
  const streak = calcStreak(entries.map(e => e.date));

  return {
    entries,
    scoreTrend,
    labelFrequency,
    avgScore,
    totalEntries: entries.length,
    currentStreak: streak,
  };
}

// 计算连续写日记天数（从今天往前数）
function calcStreak(dates: string[]): number {
  const dateSet = new Set(dates);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak++;
    } else if (i > 0) {
      break; // 中断就停
    }
  }
  return streak;
}
