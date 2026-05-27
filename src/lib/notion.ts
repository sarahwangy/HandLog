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
  const mon = getWeekMonday(dateStr);
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
export async function appendReviewBlocks(
  accessToken: string,
  pageId: string,
  dateStr: string,
  review: {
    oneLineInsight: string;
    reviewParagraph: string;
    nextSteps: string[];
    psychNote: string;
    score: number;
  }
): Promise<void> {
  const notion = createNotionClient(accessToken);

  const d = new Date(dateStr);
  const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const dayChar = CN_DAY[dayIndex];

  // Toggle 内部的 block 列表
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const innerBlocks: any[] = [
    // ⭐ 评分
    { type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "⭐ 评分" }, annotations: { bold: true, color: "orange" } }] } },
    { type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `${review.score}/10` } }] } },

    // 💡 一句话感悟
    { type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "💡 一句话感悟" }, annotations: { bold: true, color: "yellow" } }] } },
    { type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: review.oneLineInsight } }] } },

    // 🪞 复盘
    { type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "🪞 复盘" }, annotations: { bold: true, color: "brown" } }] } },
    { type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: review.reviewParagraph } }] } },
  ];

  // 🎯 下一步（todo list）
  if (review.nextSteps.length > 0) {
    innerBlocks.push({ type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "🎯 下一步" }, annotations: { bold: true, color: "green" } }] } });
    for (const step of review.nextSteps) {
      innerBlocks.push({ type: "to_do", to_do: { rich_text: [{ type: "text", text: { content: step } }], checked: false } });
    }
  }

  // 🧘 正能量
  if (review.psychNote) {
    innerBlocks.push({ type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "🧘 正能量" }, annotations: { bold: true, color: "purple" } }] } });
    innerBlocks.push({ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: review.psychNote } }] } });
  }

  await withAuthCheck(() =>
    notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          type: "toggle",
          toggle: {
            rich_text: [{ type: "text", text: { content: `周${dayChar}复盘` }, annotations: { bold: true } }],
            color: "default",
            children: innerBlocks,
          },
        } as Parameters<typeof notion.blocks.children.append>[0]["children"][0],
      ],
    })
  );
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
