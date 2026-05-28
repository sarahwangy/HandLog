import { Client } from "@notionhq/client";
import type {
  CreatePageParameters,
  QueryDatabaseParameters,
  UpdatePageParameters,
  AppendBlockChildrenParameters,
} from "@notionhq/client/build/src/api-endpoints";

// ── Notion 客户端工厂 ───────────────────────────────
// 每个用户有自己的 access token，所以每次调用都传入 token 创建独立客户端
// 这是多用户 SaaS 的标准做法：不共享客户端实例
export function createNotionClient(accessToken: string) {
  return new Client({ auth: accessToken });
}

// ── Token 失效检测（T-204）──────────────────────────
// Notion token 不会定期过期，但用户可能在 Notion 后台手动撤销授权
// 撤销后调用 API 会返回 401，这里统一处理这种情况
export class NotionAuthError extends Error {
  constructor() {
    super("Notion 授权已失效，请重新连接");
    this.name = "NotionAuthError";
  }
}

// 包装所有 Notion API 调用，统一捕获 401 错误
async function withAuthCheck<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    // Notion SDK 的错误对象带有 status 字段
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status: number }).status === 401
    ) {
      // 抛出我们自定义的错误，上层可以判断是否需要引导用户重新授权
      throw new NotionAuthError();
    }
    throw error;
  }
}

// ── T-205：Notion SDK 核心操作封装 ─────────────────

// 查询数据库（获取日记列表、人物卡列表等）
export async function queryDatabase(
  accessToken: string,
  params: QueryDatabaseParameters
) {
  const notion = createNotionClient(accessToken);
  return withAuthCheck(() => notion.databases.query(params));
}

// 获取数据库结构（字段名称、字段类型等）
export async function getDatabase(accessToken: string, databaseId: string) {
  const notion = createNotionClient(accessToken);
  return withAuthCheck(() => notion.databases.retrieve({ database_id: databaseId }));
}

// 创建新页面（写入一条日记 / 人物卡 / 育儿记录等）
export async function createPage(
  accessToken: string,
  params: CreatePageParameters
) {
  const notion = createNotionClient(accessToken);
  return withAuthCheck(() => notion.pages.create(params));
}

// 更新已有页面（追加人物卡内容、修改打分等）
export async function updatePage(
  accessToken: string,
  params: UpdatePageParameters
) {
  const notion = createNotionClient(accessToken);
  return withAuthCheck(() => notion.pages.update(params));
}

// 获取单个页面（读取某条日记的完整内容）
export async function getPage(accessToken: string, pageId: string) {
  const notion = createNotionClient(accessToken);
  return withAuthCheck(() => notion.pages.retrieve({ page_id: pageId }));
}

// 中文星期数字映射
const CN_DAY = ["一", "二", "三", "四", "五", "六", "日"];

// 根据日期计算本周周一的日期字符串，格式 "2026-05-25"
function getWeekMonday(dateStr: string): Date {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=日,1=一,...,6=六
  const diff = day === 0 ? -6 : 1 - day; // 调整到周一
  d.setDate(d.getDate() + diff);
  return d;
}

// 根据日期生成本周页面标题，格式 "5-25-31"
function getWeekTitle(dateStr: string): string {
  const mon = getWeekMonday(dateStr);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.getMonth() + 1}-${mon.getDate()}-${sun.getDate()}`;
}

// 查找本周的 Notion 页面，找不到则创建
export async function findOrCreateWeekPage(
  accessToken: string,
  databaseId: string,
  dateStr: string
): Promise<string> { // 返回 pageId
  const notion = createNotionClient(accessToken);
  const title = getWeekTitle(dateStr);

  // 查询数据库，筛选标题等于本周标题的页面
  const res = await withAuthCheck(() =>
    notion.databases.query({
      database_id: databaseId,
      filter: { property: "Name", title: { equals: title } },
      page_size: 1,
    })
  );

  if (res.results.length > 0) {
    return res.results[0].id;
  }

  // 不存在则创建新页面
  const page = await withAuthCheck(() =>
    notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
      } as CreatePageParameters["properties"],
    })
  );
  return page.id;
}

// 把当天录音/文字追加到「简短日常」属性
// 格式：原有内容 + "\n三. [新内容]"
export async function appendDailySummary(
  accessToken: string,
  pageId: string,
  dateStr: string,
  content: string
): Promise<void> {
  const notion = createNotionClient(accessToken);

  // 读取当前「简短日常」值
  const page = await withAuthCheck(() => notion.pages.retrieve({ page_id: pageId })) as { properties: Record<string, { rich_text?: { plain_text: string }[] }> };
  const existing = page.properties["简短日常"]?.rich_text?.[0]?.plain_text ?? "";

  // 计算今天是周几（中文）
  const d = new Date(dateStr);
  const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=周一
  const dayChar = CN_DAY[dayIndex];

  const newContent = existing
    ? `${existing}\n${dayChar}. ${content}`
    : `${dayChar}. ${content}`;

  // 更新属性（Notion rich_text 最多 2000 字，超出截断）
  await withAuthCheck(() =>
    notion.pages.update({
      page_id: pageId,
      properties: {
        简短日常: {
          rich_text: [{ text: { content: newContent.slice(0, 2000) } }],
        },
      } as UpdatePageParameters["properties"],
    })
  );
}

// 把复盘写入页面 body，结构：Toggle > Callout
// 中文为主体，英文小字在括号里
// 辅助：把一个字符串格式化为【标题】内容，冒号前面用【】括起来
function formatItem(item: string): string {
  const colonIdx = item.search(/[:：]/);
  if (colonIdx > 0) {
    const title = item.slice(0, colonIdx).trim();
    const body = item.slice(colonIdx + 1).trim();
    return `【${title}】${body}`;
  }
  return item;
}

// Notion API 每次 append 最多 100 个 block，超过会报错。这个函数自动分批处理。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function batchAppend(notion: ReturnType<typeof createNotionClient>, blockId: string, blocks: any[]) {
  const CHUNK = 100;
  for (let i = 0; i < blocks.length; i += CHUNK) {
    await withAuthCheck(() =>
      notion.blocks.children.append({ block_id: blockId, children: blocks.slice(i, i + CHUNK) })
    );
  }
}

// 辅助：把字符串数组转成多个 paragraph 块，每条单独一行，冒号前用【】括起来
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function itemBlocks(items: string[]): any[] {
  return items.map(item => ({
    type: "paragraph",
    paragraph: { rich_text: [{ type: "text", text: { content: formatItem(item) } }] },
  }));
}

// 辅助：单条文字的 paragraph 块（用于评分、一句话感悟等单值字段）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tagsBlock(items: string[]): any {
  return { type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: items.join("、") } }] } };
}

// 辅助：生成带颜色的 heading_3 块
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function h3(text: string, color = "default"): any {
  return { type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: text }, annotations: { bold: true, color } }] } };
}

export async function appendReviewBlocks(
  accessToken: string,
  pageId: string,
  dateStr: string,
  review: {
    oneLineInsight: string;
    oneLineInsightZh?: string;
    reviewParagraph: string;
    nextSteps: string[];
    psychNote: string;
    score: number;
    scoreReason?: string;
    people?: string[];
    places?: string[];
    events?: { category: string; items: string[] }[];
    books?: string[];
    mediaConsumed?: string[];
    moviesTV?: string[];
    parenting?: string[];
    health?: string[];
    finance?: string[];
    learning?: string[];
    creativeOutput?: string[];
    emotions?: string[];
    energyDistribution?: Record<string, number>;
    progressZones?: { breakthrough: string | null; inPractice: string | null; plantedSeed: string | null };
  }
): Promise<string | undefined> {
  const notion = createNotionClient(accessToken);

  const d = new Date(dateStr);
  const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const dayChar = CN_DAY[dayIndex];

  // Step 1：建 Toggle，Toggle 里包一个空 Callout（作为内容容器）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleRes = await withAuthCheck(() =>
    notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: `周${dayChar}复盘` }, annotations: { bold: true } }],
            color: "default",
            children: [
              {
                type: "callout",
                callout: {
                  rich_text: [],          // 空标题，内容在子块里
                  icon: { type: "emoji", emoji: "📋" },
                  color: "blue_background",
                },
              } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
            ],
          },
        } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
      ],
    })
  ) as { results: { id: string; type: string }[] };

  // Step 2：找到刚建的 Toggle 里的 Callout ID
  const toggleId = toggleRes.results[0]?.id;
  if (!toggleId) return;

  const toggleChildren = await withAuthCheck(() =>
    notion.blocks.children.list({ block_id: toggleId })
  ) as { results: { id: string; type: string }[] };

  const calloutId = toggleChildren.results.find(b => b.type === "callout")?.id;
  if (!calloutId) return;

  // Step 3：把复盘内容块追加到 Callout 里（有内容才写，空的跳过）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: any[] = [];

  // ── 评分 ──────────────────────────────────────────
  contentBlocks.push(h3("⭐ 评分", "orange"));
  contentBlocks.push(tagsBlock([`${review.score}/10${review.scoreReason ? `  ${review.scoreReason}` : ""}`]));

  // ── 一句话感悟 ────────────────────────────────────
  contentBlocks.push(h3("💡 一句话感悟", "yellow"));
  const insightText = review.oneLineInsightZh
    ? `${review.oneLineInsight}\n「${review.oneLineInsightZh}」`
    : review.oneLineInsight;
  contentBlocks.push(tagsBlock([insightText]));

  // ── 人物 ─────────────────────────────────────────
  if (review.people?.length) {
    contentBlocks.push(h3("👥 人物", "blue"));
    contentBlocks.push(...itemBlocks(review.people));
  }

  // ── 情绪 ─────────────────────────────────────────
  if (review.emotions?.length) {
    contentBlocks.push(h3("🌊 情绪", "pink"));
    contentBlocks.push(...itemBlocks(review.emotions));
  }

  // ── 事件（按分类，每个分类单独一行） ──────────────────
  if (review.events?.length) {
    contentBlocks.push(h3("📅 事件", "default"));
    for (const group of review.events) {
      for (const item of group.items) {
        contentBlocks.push({ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `【${group.category}】${item}` } }] } });
      }
    }
  }

  // ── 去了哪里 ─────────────────────────────────────
  if (review.places?.length) {
    contentBlocks.push(h3("📍 去了哪里", "default"));
    contentBlocks.push(...itemBlocks(review.places));
  }

  // ── 学到的 ────────────────────────────────────────
  if (review.learning?.length) {
    contentBlocks.push(h3("🧠 学到的", "default"));
    contentBlocks.push(...itemBlocks(review.learning));
  }

  // ── 健康 ─────────────────────────────────────────
  if (review.health?.length) {
    contentBlocks.push(h3("💪 健康", "green"));
    contentBlocks.push(...itemBlocks(review.health));
  }

  // ── 书 ───────────────────────────────────────────
  if (review.books?.length) {
    contentBlocks.push(h3("📚 在读的书", "default"));
    contentBlocks.push(...itemBlocks(review.books));
  }

  // ── 播客 / 文章 ───────────────────────────────────
  if (review.mediaConsumed?.length) {
    contentBlocks.push(h3("🎙 播客 · 文章", "default"));
    contentBlocks.push(...itemBlocks(review.mediaConsumed));
  }

  // ── 影视 ─────────────────────────────────────────
  if (review.moviesTV?.length) {
    contentBlocks.push(h3("🎬 影视", "default"));
    contentBlocks.push(...itemBlocks(review.moviesTV));
  }

  // ── 育儿 ─────────────────────────────────────────
  if (review.parenting?.length) {
    contentBlocks.push(h3("👶 育儿", "default"));
    contentBlocks.push(...itemBlocks(review.parenting));
  }

  // ── 理财 ─────────────────────────────────────────
  if (review.finance?.length) {
    contentBlocks.push(h3("💰 理财", "default"));
    contentBlocks.push(...itemBlocks(review.finance));
  }

  // ── 创作输出 ──────────────────────────────────────
  if (review.creativeOutput?.length) {
    contentBlocks.push(h3("✍️ 创作输出", "default"));
    contentBlocks.push(...itemBlocks(review.creativeOutput));
  }

  // ── 精力分布 ──────────────────────────────────────
  if (review.energyDistribution && Object.keys(review.energyDistribution).length > 0) {
    contentBlocks.push(h3("⚡ 精力分布", "default"));
    const energyText = Object.entries(review.energyDistribution).map(([k, v]) => `${k} ${v}%`).join("、");
    contentBlocks.push(tagsBlock([energyText]));
  }

  // ── 成长区域 ──────────────────────────────────────
  const pz = review.progressZones;
  if (pz && (pz.breakthrough || pz.inPractice || pz.plantedSeed)) {
    contentBlocks.push(h3("🌱 成长区域", "default"));
    if (pz.breakthrough) contentBlocks.push(tagsBlock([`🟢 突破：${pz.breakthrough}`]));
    if (pz.inPractice)   contentBlocks.push(tagsBlock([`🟡 练习中：${pz.inPractice}`]));
    if (pz.plantedSeed)  contentBlocks.push(tagsBlock([`🔵 种下的种子：${pz.plantedSeed}`]));
  }

  // ── 复盘 ─────────────────────────────────────────
  contentBlocks.push(h3("🪞 复盘", "brown"));
  contentBlocks.push(tagsBlock([review.reviewParagraph]));

  // ── 下一步（checkbox） ────────────────────────────
  if (review.nextSteps.length > 0) {
    contentBlocks.push(h3("🎯 下一步", "green"));
    for (const step of review.nextSteps) {
      contentBlocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: step } }], checked: false } });
    }
  }

  // ── 正能量 ────────────────────────────────────────
  if (review.psychNote) {
    contentBlocks.push(h3("🧘 正能量", "purple"));
    contentBlocks.push(tagsBlock([review.psychNote]));
  }

  await withAuthCheck(() =>
    notion.blocks.children.append({ block_id: calloutId, children: contentBlocks })
  );

  // 返回 calloutId，方便后续追加手账图
  return calloutId;
}

// 把一次日记提交写入 Notion 数据库
// 标题格式 "5-27"（月-日），与现有周记录格式兼容
export async function createJournalEntry(
  accessToken: string,
  databaseId: string,
  entry: {
    date: string;        // "2026-05-27"
    score: number;
    labels: string[];
    insight: string;
    review: string;
    dailySummary: string; // 原始日记文字
    nextSteps?: string;
    psychNote?: string;
  }
) {
  const notion = createNotionClient(accessToken);

  // 从 "2026-05-27" 提取 "5-27" 作为标题
  const [, m, d] = entry.date.split("-");
  const title = `${parseInt(m)}-${parseInt(d)}`;

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: title } }] },
    打分: { number: entry.score },
    "label标签": { multi_select: entry.labels.map(name => ({ name })) },
    一句话感悟: { rich_text: [{ text: { content: entry.insight } }] },
    复盘: { rich_text: [{ text: { content: entry.review } }] },
    简短日常: { rich_text: [{ text: { content: entry.dailySummary } }] },
  };

  if (entry.nextSteps) {
    properties["下一步Action"] = { rich_text: [{ text: { content: entry.nextSteps } }] };
  }
  if (entry.psychNote) {
    properties["心理学正能量话"] = { rich_text: [{ text: { content: entry.psychNote } }] };
  }

  return withAuthCheck(() =>
    notion.pages.create({
      parent: { database_id: databaseId },
      properties: properties as CreatePageParameters["properties"],
    })
  );
}

// 把 DALL-E 3 生成的图片 URL 追加到指定 block（callout）里
export async function appendImageBlock(
  accessToken: string,
  blockId: string,
  imageUrl: string
): Promise<void> {
  const notion = createNotionClient(accessToken);
  await withAuthCheck(() =>
    notion.blocks.children.append({
      block_id: blockId,
      children: [
        {
          type: "image",
          image: { type: "external", external: { url: imageUrl } },
        } as AppendBlockChildrenParameters["children"][0],
      ],
    })
  );
}

// 追加内容到页面（用于给人物卡的"关键信息"字段追加新事件）
export async function appendBlocks(
  accessToken: string,
  blockId: string,
  children: AppendBlockChildrenParameters["children"]
) {
  const notion = createNotionClient(accessToken);
  return withAuthCheck(() =>
    notion.blocks.children.append({ block_id: blockId, children })
  );
}

// 查询指定周内所有日记条目（标题格式 "5-25" 到 "5-31"）
// 返回每条页面的 properties，供周复盘聚合用
export async function getWeekDailyEntries(
  accessToken: string,
  databaseId: string,
  weekLabel: string  // e.g. "5-25-31"
): Promise<Array<{ date: string; score: number | null; insight: string; review: string; dailySummary: string; labels: string[] }>> {
  const notion = createNotionClient(accessToken);

  // 从 weekLabel "5-25-31" 解析出月份和起止日
  const parts = weekLabel.split("-");  // ["5", "25", "31"]
  const month = parseInt(parts[0]);
  const startDay = parseInt(parts[1]);
  const endDay = parseInt(parts[2]);

  // 生成这一周所有可能的标题（"5-25", "5-26", ..., "5-31"）
  const titles: string[] = [];
  for (let d = startDay; d <= endDay; d++) {
    titles.push(`${month}-${d}`);
  }

  // 查询 Notion 数据库，筛选标题在这个列表里的
  const results = await withAuthCheck(() =>
    notion.databases.query({
      database_id: databaseId,
      filter: {
        or: titles.map(title => ({
          property: "Name",
          title: { equals: title },
        })),
      },
      sorts: [{ property: "Name", direction: "ascending" }],
    })
  ) as { results: Array<{ properties: Record<string, unknown> }> };

  return results.results.map(page => {
    const props = page.properties as Record<string, {
      title?: { plain_text: string }[];
      number?: number | null;
      rich_text?: { plain_text: string }[];
      multi_select?: { name: string }[];
    }>;

    return {
      date: props["Name"]?.title?.[0]?.plain_text ?? "",
      score: props["打分"]?.number ?? null,
      insight: props["一句话感悟"]?.rich_text?.[0]?.plain_text ?? "",
      review: props["复盘"]?.rich_text?.[0]?.plain_text ?? "",
      dailySummary: props["简短日常"]?.rich_text?.[0]?.plain_text ?? "",
      labels: props["label标签"]?.multi_select?.map((s) => s.name) ?? [],
    };
  });
}

export async function appendWeeklyReviewBlocks(
  accessToken: string,
  weekPageId: string,
  review: import("@/lib/claude").WeeklyReview
): Promise<string | undefined> {
  const notion = createNotionClient(accessToken);

  const toggleRes = await withAuthCheck(() =>
    notion.blocks.children.append({
      block_id: weekPageId,
      children: [
        {
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: "本周复盘" }, annotations: { bold: true } }],
            color: "default",
            children: [
              {
                type: "callout",
                callout: {
                  rich_text: [],
                  icon: { type: "emoji", emoji: "📆" },
                  color: "purple_background",
                },
              } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
            ],
          },
        } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
      ],
    })
  ) as { results: { id: string; type: string }[] };

  const toggleId = toggleRes.results[0]?.id;
  if (!toggleId) return;

  const toggleChildren = await withAuthCheck(() =>
    notion.blocks.children.list({ block_id: toggleId })
  ) as { results: { id: string; type: string }[] };

  const calloutId = toggleChildren.results.find(b => b.type === "callout")?.id;
  if (!calloutId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  blocks.push(h3("⭐ 周评分", "orange"));
  blocks.push(tagsBlock([`${review.score}/10  ${review.scoreReason}`]));

  blocks.push(h3("💡 一句话感悟", "yellow"));
  const insightText = review.oneLineInsightZh
    ? `${review.oneLineInsight}\n「${review.oneLineInsightZh}」`
    : review.oneLineInsight;
  blocks.push(tagsBlock([insightText]));

  if (review.scoreTrend?.length) {
    blocks.push(h3("📈 分数趋势", "default"));
    blocks.push(tagsBlock([review.scoreTrend.map(s => s ?? "-").join(" → ")]));
  }

  if (review.people?.length) { blocks.push(h3("👥 人物", "blue")); blocks.push(...itemBlocks(review.people)); }
  if (review.emotions?.length) { blocks.push(h3("🌊 情绪", "pink")); blocks.push(...itemBlocks(review.emotions)); }
  if (review.places?.length) { blocks.push(h3("📍 去了哪里", "default")); blocks.push(...itemBlocks(review.places)); }
  if (review.events?.length) {
    blocks.push(h3("📅 本周事件", "default"));
    for (const group of review.events) {
      for (const item of group.items) {
        blocks.push({ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `【${group.category}】${item}` } }] } });
      }
    }
  }
  if (review.learning?.length) { blocks.push(h3("🧠 学到的", "default")); blocks.push(...itemBlocks(review.learning)); }
  if (review.health?.length) { blocks.push(h3("💪 健康", "green")); blocks.push(...itemBlocks(review.health)); }
  if (review.books?.length) { blocks.push(h3("📚 在读的书", "default")); blocks.push(...itemBlocks(review.books)); }
  if (review.mediaConsumed?.length) { blocks.push(h3("🎙 播客 · 文章", "default")); blocks.push(...itemBlocks(review.mediaConsumed)); }
  if (review.moviesTV?.length) { blocks.push(h3("🎬 影视", "default")); blocks.push(...itemBlocks(review.moviesTV)); }
  if (review.parenting?.length) { blocks.push(h3("👶 育儿", "default")); blocks.push(...itemBlocks(review.parenting)); }
  if (review.finance?.length) { blocks.push(h3("💰 理财 · 消费", "default")); blocks.push(...itemBlocks(review.finance)); }
  if (review.creativeOutput?.length) { blocks.push(h3("✍️ 创作输出", "default")); blocks.push(...itemBlocks(review.creativeOutput)); }

  if (review.energyDistribution && Object.keys(review.energyDistribution).length) {
    blocks.push(h3("⚡ 精力分布", "default"));
    blocks.push(tagsBlock([Object.entries(review.energyDistribution).map(([k, v]) => `${k} ${v}%`).join("、")]));
  }
  const pz = review.progressZones;
  if (pz && (pz.breakthrough || pz.inPractice || pz.plantedSeed)) {
    blocks.push(h3("🌱 成长区域", "default"));
    if (pz.breakthrough) blocks.push(tagsBlock([`🟢 突破：${pz.breakthrough}`]));
    if (pz.inPractice)   blocks.push(tagsBlock([`🟡 练习中：${pz.inPractice}`]));
    if (pz.plantedSeed)  blocks.push(tagsBlock([`🔵 种下的种子：${pz.plantedSeed}`]));
  }

  blocks.push(h3("🌊 情绪规律", "pink"));
  blocks.push(tagsBlock([review.emotionPattern]));

  blocks.push(h3("🔍 核心困境", "red"));
  blocks.push(tagsBlock([review.coreProblem]));

  if (review.crossWeekFlag) {
    blocks.push(h3("🚩 跨周信号", "red"));
    blocks.push(tagsBlock([review.crossWeekFlag]));
  }

  if (review.dueDates?.length) {
    blocks.push(h3("📌 待办日期", "default"));
    for (const d of review.dueDates) {
      const content = d.note ? `${d.date}  ${d.title}（${d.note}）` : `${d.date}  ${d.title}`;
      blocks.push({ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content } }] } });
    }
  }

  if (review.nextSteps?.length) {
    blocks.push(h3("🎯 下周计划", "green"));
    for (const step of review.nextSteps) {
      blocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: step } }], checked: false } });
    }
  }

  blocks.push(h3("🪞 周复盘", "brown"));
  blocks.push(tagsBlock([review.reviewParagraph]));

  if (review.psychNote) {
    blocks.push(h3("🧘 正能量", "purple"));
    blocks.push(tagsBlock([review.psychNote]));
  }

  await batchAppend(notion, calloutId, blocks);

  return calloutId;
}

export async function updateWeekPageImage(
  accessToken: string,
  weekPageId: string,
  imageUrl: string
): Promise<void> {
  const notion = createNotionClient(accessToken);
  await withAuthCheck(() =>
    notion.pages.update({
      page_id: weekPageId,
      properties: {
        手绘复盘图: {
          files: [{ name: "weekly-review.png", type: "external", external: { url: imageUrl } }],
        },
      } as UpdatePageParameters["properties"],
    })
  );
}

// 找到数据库里标题为"复盘-汇总"的特殊行，返回其 pageId
export async function findMonthSummaryPage(
  accessToken: string,
  databaseId: string
): Promise<string | null> {
  const notion = createNotionClient(accessToken);
  const res = await withAuthCheck(() =>
    notion.databases.query({
      database_id: databaseId,
      filter: { property: "Name", title: { equals: "复盘-汇总" } },
      page_size: 1,
    })
  ) as { results: { id: string }[] };

  return res.results[0]?.id ?? null;
}

export async function appendMonthlyReviewBlocks(
  accessToken: string,
  summaryPageId: string,
  review: import("@/lib/claude").MonthlyReview
): Promise<string | undefined> {
  const notion = createNotionClient(accessToken);

  // Toggle title includes the date range, e.g. "5月1日-5月31日复盘"
  const toggleTitle = `${review.dateRange}复盘`;

  const toggleRes = await withAuthCheck(() =>
    notion.blocks.children.append({
      block_id: summaryPageId,
      children: [
        {
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: toggleTitle }, annotations: { bold: true } }],
            color: "default",
            children: [
              {
                type: "callout",
                callout: {
                  rich_text: [],
                  icon: { type: "emoji", emoji: "🗓" },
                  color: "green_background",
                },
              } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
            ],
          },
        } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
      ],
    })
  ) as { results: { id: string; type: string }[] };

  const toggleId = toggleRes.results[0]?.id;
  if (!toggleId) return;

  const toggleChildren = await withAuthCheck(() =>
    notion.blocks.children.list({ block_id: toggleId })
  ) as { results: { id: string; type: string }[] };

  const calloutId = toggleChildren.results.find(b => b.type === "callout")?.id;
  if (!calloutId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  blocks.push(h3("⭐ 月评分", "orange"));
  blocks.push(tagsBlock([`${review.score}/10  ${review.scoreReason}`]));

  blocks.push(h3("💡 一句话感悟", "yellow"));
  const insightText = review.oneLineInsightZh
    ? `${review.oneLineInsight}\n「${review.oneLineInsightZh}」`
    : review.oneLineInsight;
  blocks.push(tagsBlock([insightText]));

  if (review.scoreTrend?.length) {
    blocks.push(h3("📈 分数趋势", "default"));
    blocks.push(tagsBlock([review.scoreTrend.map(s => s ?? "-").join(" → ")]));
  }

  if (review.people?.length) { blocks.push(h3("👥 人物", "blue")); blocks.push(...itemBlocks(review.people)); }
  if (review.emotions?.length) { blocks.push(h3("🌊 情绪", "pink")); blocks.push(...itemBlocks(review.emotions)); }
  if (review.places?.length) { blocks.push(h3("📍 去了哪里", "default")); blocks.push(...itemBlocks(review.places)); }
  if (review.events?.length) {
    blocks.push(h3("📅 本月事件", "default"));
    for (const group of review.events) {
      for (const item of group.items) {
        blocks.push({ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `【${group.category}】${item}` } }] } });
      }
    }
  }
  if (review.learning?.length) { blocks.push(h3("🧠 学到的", "default")); blocks.push(...itemBlocks(review.learning)); }
  if (review.health?.length) { blocks.push(h3("💪 健康", "green")); blocks.push(...itemBlocks(review.health)); }
  if (review.books?.length) { blocks.push(h3("📚 在读的书", "default")); blocks.push(...itemBlocks(review.books)); }
  if (review.mediaConsumed?.length) { blocks.push(h3("🎙 播客 · 文章", "default")); blocks.push(...itemBlocks(review.mediaConsumed)); }
  if (review.moviesTV?.length) { blocks.push(h3("🎬 影视", "default")); blocks.push(...itemBlocks(review.moviesTV)); }
  if (review.parenting?.length) { blocks.push(h3("👶 育儿", "default")); blocks.push(...itemBlocks(review.parenting)); }
  if (review.finance?.length) { blocks.push(h3("💰 理财 · 消费", "default")); blocks.push(...itemBlocks(review.finance)); }
  if (review.creativeOutput?.length) { blocks.push(h3("✍️ 创作输出", "default")); blocks.push(...itemBlocks(review.creativeOutput)); }

  if (review.energyDistribution && Object.keys(review.energyDistribution).length) {
    blocks.push(h3("⚡ 精力分布", "default"));
    blocks.push(tagsBlock([Object.entries(review.energyDistribution).map(([k, v]) => `${k} ${v}%`).join("、")]));
  }

  const pz = review.progressZones;
  if (pz && (pz.breakthrough || pz.inPractice || pz.plantedSeed)) {
    blocks.push(h3("🌱 成长区域", "default"));
    if (pz.breakthrough) blocks.push(tagsBlock([`🟢 突破：${pz.breakthrough}`]));
    if (pz.inPractice)   blocks.push(tagsBlock([`🟡 练习中：${pz.inPractice}`]));
    if (pz.plantedSeed)  blocks.push(tagsBlock([`🔵 种下的种子：${pz.plantedSeed}`]));
  }

  blocks.push(h3("📊 本月规律", "default"));
  blocks.push(tagsBlock([review.monthlyPattern]));

  blocks.push(h3("🌊 情绪规律", "pink"));
  blocks.push(tagsBlock([review.emotionPattern]));

  blocks.push(h3("🔍 核心困境", "red"));
  blocks.push(tagsBlock([review.coreProblem]));

  if (review.crossWeekFlag) {
    blocks.push(h3("🚩 持续信号", "red"));
    blocks.push(tagsBlock([review.crossWeekFlag]));
  }

  if (review.dueDates?.length) {
    blocks.push(h3("📌 待办日期", "default"));
    for (const d of review.dueDates) {
      const content = d.note ? `${d.date}  ${d.title}（${d.note}）` : `${d.date}  ${d.title}`;
      blocks.push({ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content } }] } });
    }
  }

  if (review.nextSteps?.length) {
    blocks.push(h3("🎯 下一步行动", "green"));
    for (const step of review.nextSteps) {
      blocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: step } }], checked: false } });
    }
  }

  blocks.push(h3("🪞 月复盘", "brown"));
  blocks.push(tagsBlock([review.reviewParagraph]));

  if (review.nextMonthDirection?.length) {
    blocks.push(h3("🧭 下月方向", "green"));
    for (const step of review.nextMonthDirection) {
      blocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: step } }], checked: false } });
    }
  }

  if (review.psychNote) {
    blocks.push(h3("🧘 正能量", "purple"));
    blocks.push(tagsBlock([review.psychNote]));
  }

  await batchAppend(notion, calloutId, blocks);

  return calloutId;
}
