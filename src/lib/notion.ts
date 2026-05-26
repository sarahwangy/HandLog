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
