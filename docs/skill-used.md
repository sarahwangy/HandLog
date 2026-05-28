# Skills & Tools Used Log

---

## 可用工具全览

### Claude Code CLI
在终端运行 `claude`，在项目目录里对话式开发。代码修改通过内置工具直接写文件，不需要手动复制粘贴。

### Agents（子代理）
| Agent | 用途 |
|---|---|
| **Explore** | 快速搜索代码库（find、grep），不占用主对话上下文 |
| **general-purpose** | 复杂多步任务，文件搜索 + 分析 |
| **claude-code-guide** | 问 Claude Code 本身的用法、API、SDK 问题 |
| **Plan** | 设计实现策略，列出关键文件和架构权衡 |

### Superpowers Skills（`/` 触发）
| Skill | 何时用 | 做什么 |
|---|---|---|
| `/brainstorming` | 有新需求时，**第一步** | 梳理需求 → 提出 2-3 方案 + 权衡 → 写设计文档到 `docs/superpowers/specs/` |
| `/writing-plans` | 设计确认后，**第二步** | 生成逐步实现计划，含具体文件路径、完整代码、测试命令 |
| `/frontend-design` | 需要设计 UI 组件/页面时 | 生成 HTML mockup，在浏览器里预览，确认后再写代码 |
| `/ultrareview` | PR 提交前做代码审查 | 多 agent 并行审查整个 branch，给出改进建议 |
| `/debugging` | 有 bug 找不到原因时 | 系统化排查：复现 → 假设 → 验证 → 修复 |

### 什么情况下我会自动触发 skills

| 你说的话 | 触发的 skill |
|---|---|
| "我想加一个新功能：..." | `/brainstorming` |
| "开始写代码" / "开始实现" | `/writing-plans` |
| "帮我设计这个页面的 UI" | `/frontend-design` |
| "帮我 review 这个 PR" | `/ultrareview` |
| "我有个 bug 找不到原因" | `/debugging` |

**关键原则：** 新需求 → 先问方案 → 再写计划 → 最后写代码。不直接动手。

### 其他可集成工具（尚未在本项目使用）
| 工具 | 用途 | 何时用 |
|---|---|---|
| **Playwright** | 浏览器自动化测试，模拟用户点击/填表/截图 | 需要验证 UI 交互流程时 |
| **Firecrawl** | 抓取网页内容（转成 markdown） | 研究竞品或抓取外部数据时 |
| **Context7 MCP** | 实时拉取最新库文档 | 遇到 API 报错、不确定某个库最新用法时 |

### Context7 怎么用
直接告诉我：
> "用 Context7 查一下 Notion SDK appendBlocks 的最新用法"

我会调用 context7 工具拉取官方最新文档，而不是靠训练数据里的旧知识回答。

**这个项目需要用吗？** 目前用的库（Next.js 14、Notion SDK、next-auth v4、Anthropic SDK）比较稳定，平时不强制用。但如果遇到"按你说的写了但 API 报错"的情况，用 Context7 查一下最新文档会很有帮助。

---

## writing-plans 生成的 plan 文件有什么用

`docs/superpowers/plans/` 目录下的计划文件是**给执行阶段用的地图**：
- 按 Task 1 → Task 2 → ... 顺序执行
- 每个 Task 完成后打勾 `- [x]`
- 执行时参考计划里的完整代码，不用重新思考
- 遇到问题时对照计划检查是否偏离

**两种执行方式：**
- **Inline Execution** — 在当前对话里按计划逐步写代码（适合边写边学）
- **Subagent-Driven** — 每个 Task 派一个独立子 agent 执行，速度更快（适合任务明确时）

---

## 新需求时怎么用 brainstorming + writing-plans

**场景举例：** 我想加一个"情绪趋势图"

**步骤：**

```
1. 在对话里描述需求：
   "我想在 Dashboard 里加一个情绪趋势折线图，
    展示过去 30 天的评分变化"

2. Claude 自动触发 /brainstorming：
   - 先读现有代码，了解 Dashboard 的数据结构
   - 问你 1 个问题（一次只问一个）：
     "数据来源用现有的 score 字段，还是需要新字段？"
   - 提出 2-3 个方案：
     A. 用 Recharts 库（主流，社区大）
     B. 用 CSS 纯手写折线（轻量，不引入依赖）
     C. 用 Chart.js（功能全但偏重）
   - 写好设计文档 → 让你确认

3. 你说"好的"后，触发 /writing-plans：
   - 列出要改哪些文件（精确到行数）
   - 每一步都有完整代码
   - 包含如何手动验证

4. 按计划一步一步做，每步可验证
```

**关键原则：** brainstorming 阶段不写代码，只做设计和决策；writing-plans 阶段才落地到具体实现。这样不会走弯路。

---

## 进度日志

### 2026-05-27 / 2026-05-28

**完成功能：**
- E8 — Notion 全 18 个 section 写入（Toggle → Callout → 内容块）
- E11 — Timeline 页面（卡片墙、按月分组、渐变色、load-more）
- E12 — AI handlog 图片生成（gpt-image-1）
- Google OAuth 登录 — next-auth v4 + GoogleProvider + 邮箱白名单

**学到的关键技术：**

| 概念 | 说明 |
|---|---|
| Server vs Client Component | 默认服务端，`"use client"` 才是浏览器端 |
| SessionProvider 模式 | Context 只能客户端运行，需单独封装 `"use client"` Provider 组件 |
| next-auth v4 环境变量 | 必须用 `NEXTAUTH_URL` 和 `NEXTAUTH_SECRET` |
| Middleware + next-intl 冲突 | `/api` 路由必须 `NextResponse.next()` 跳过，否则 OAuth 回调 URL 被加 locale 前缀 |
| max_tokens 限制 | Claude Sonnet 4.6 上限 8192 tokens，超出截断 JSON |
| optional chaining `?.` | 处理可能为 undefined 的嵌套字段 |

**踩过的坑：**
1. env 变量名拼写错误 — `.env.local` 用 `AUTH_*`，代码里读 `NEXTAUTH_*`，完全读不到
2. `ALLOWED_EMAIL` 有多余空格 — `ALLOWED_EMAIL =xxx` 导致 key 带空格，邮箱匹配永远失败
3. `dall-e-3` 不存在 — OpenAI 图片生成要用 `gpt-image-1`
4. Middleware 破坏 OAuth 回调 — next-intl 给 `/api` 加了 locale 前缀
5. SessionProvider 缺失 — `useSession()` 必须在 `<SessionProvider>` 内部
