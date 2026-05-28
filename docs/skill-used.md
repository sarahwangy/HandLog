# Skills & Tools Used Log

## 2026-05-27 / 2026-05-28

### 功能完成
- **E8** — Notion 全 18 个 section 写入（Toggle → Callout → 内容块）
- **E11** — Timeline 页面（卡片墙、按月分组、渐变色、load-more）
- **E12** — AI handlog 图片生成（gpt-image-1）
- **Google OAuth 登录** — next-auth v4 + GoogleProvider + 邮箱白名单

---

### Claude Code CLI 用法
- 在终端直接运行 `claude`，在项目目录里对话式开发
- 用 `/` 触发 skill（如 `/brainstorming`、`/writing-plans`）
- 代码修改通过 Edit / Write 工具直接写文件，不需要手动复制粘贴

### Agents 用法
- **Explore agent** — 快速搜索代码库（`find`、`grep`），不占用主对话上下文
- **general-purpose agent** — 复杂多步任务（文件搜索 + 分析）

### Skills 用法
- **superpowers:brainstorming** — 每个新功能开始前：梳理需求 → 提出 2-3 方案 → 写设计文档
- **superpowers:writing-plans** — 设计确认后：生成逐步实现计划（含具体文件路径和代码）

---

### 这次学到的关键技术

| 概念 | 说明 |
|---|---|
| Next.js Server Component vs Client Component | 默认服务端，`"use client"` 才是浏览器端 |
| SessionProvider 模式 | Context 只能在客户端运行，需要单独封装一个 `"use client"` 的 Provider 组件 |
| next-auth v4 环境变量 | 必须用 `NEXTAUTH_URL` 和 `NEXTAUTH_SECRET`，不是 `AUTH_URL` / `AUTH_SECRET` |
| Middleware + next-intl 冲突 | `/api` 路由必须 `NextResponse.next()` 跳过，否则 intl 会给回调 URL 加语言前缀导致 OAuth 失败 |
| OAuth 回调原理 | Google 登录完成后会回调 `/api/auth/callback/google`，路径必须和 Google Console 里配置的完全一致 |
| max_tokens 限制 | Claude Sonnet 4.6 上限 8192 tokens，超出会截断 JSON；需要在 prompt 里要求简洁输出 |
| optional chaining `?.` | 处理可能为 undefined 的嵌套字段，避免 `Cannot read properties of undefined` |

---

### 踩过的坑

1. **env 变量名拼写错误** — `.env.local` 用 `AUTH_*`，代码里读 `NEXTAUTH_*`，完全读不到
2. **`ALLOWED_EMAIL` 有多余空格** — `ALLOWED_EMAIL =xxx` 导致 Node 读到的 key 带空格，永远匹配失败
3. **`dall-e-3` 不存在** — OpenAI 图片生成要用 `gpt-image-1`
4. **Middleware 破坏 OAuth 回调** — next-intl middleware 对 `/api` 路径加了 locale 前缀，必须单独 bypass
5. **SessionProvider 缺失** — `useSession()` 必须在 `<SessionProvider>` 内部，缺少时报 Unhandled Runtime Error
