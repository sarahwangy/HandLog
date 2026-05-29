# HandLog 项目开发时间线

> 项目开始日期：**2026 年 5 月 26 日**
> 当前状态：已上线 [hand-log.vercel.app](https://hand-log.vercel.app)

---

## 工具使用总览

| 时间 | 用了什么 | Skills 相关 | Agents 相关 |
|------|----------|-------------|-------------|
| 5/26 周二 | Claude Code CLI、Next.js、Tailwind、Notion SDK、Whisper API | `/frontend-design`、`/brainstorming`、`/writing-plans` | Explore Agent |
| 5/27 周三 | Recharts、gpt-image-1、Notion API | 无 | Explore Agent |
| 5/28 周四 | Google OAuth、NextAuth.js、Anthropic SDK | `/debugging` | Explore Agent |
| 5/29 周五 | Tailwind 响应式 | 无 | 无 |

**各天解决的主要问题：**

| 时间 | 解决的问题 |
|------|-----------|
| 5/26 周二 | Capture 页录音和自动保存问题；Notion 连接问题；UI 布局问题 |
| 5/27 周三 | Dashboard 数据读取问题；Timeline 卡片展示问题；AI 配图 API 接口问题 |
| 5/28 周四 | 周/月复盘 JSON 解析崩溃问题；Notion 写入超出 100 块限制问题；登录 URL 回调问题 |
| 5/29 周五 | 手机端布局问题；Timeline 以天展示改为以周展示问题；搜索搜不到内容问题 |

---

## Day 1 · 2026-05-26 · 项目启动 + 基础搭建

### 做了什么
- 用 `create-next-app` 初始化 Next.js 14 项目（App Router + TypeScript）
- 配置 shadcn/ui 组件库 + Tailwind CSS
- 配置 next-intl 国际化（中文/英文双语）
- 配置 next-themes 主题系统
- 加入 Vercel KV 工具函数（草稿自动保存用）
- 加入 Sentry 错误监控 + Vercel Analytics
- 设计全套 UI Mockup（8 个页面的 HTML 静态稿）
- 建立 Capture 页面：文字输入 + 草稿自动保存 + 恢复草稿
- 接入 OpenAI Whisper 语音转文字（替换浏览器原生 Web Speech API）
- 接入 Notion SDK：读写数据库、加密 Access Token 存入 Vercel KV
- 接入 Claude SDK：生成每日结构化复盘 JSON
- 建立 Review 页面：展示日复盘的所有字段

### 解决的问题
- Tailwind 和 shadcn/ui 兼容性冲突
- Notion OAuth 接入流程（NextAuth + Notion Provider）
- 草稿自动保存防抖逻辑（每 3 秒保存一次）
- Whisper API 自动识别语言（移除手动语言选择）

### 用到的工具 / Skills
| 工具 | 用途 |
|------|------|
| Claude Code CLI | 全程对话式开发，直接写文件 |
| `/frontend-design` skill | 生成 8 页 HTML UI Mockup，浏览器预览确认后再写代码 |
| `/brainstorming` skill | 梳理 MVP 功能范围，决定优先级 |
| `/writing-plans` skill | 生成逐步实现计划（T-101 到 T-308） |
| Explore Agent | 快速搜索现有代码，避免重复实现 |

---

## Day 2 · 2026-05-27 · 核心功能完成 + 设计系统

### 做了什么
- 全站统一 Autumn 暖棕色设计系统（#C4783A 主色 + #FDFAF6 背景）
- E6：接入 OpenAI gpt-image-1 生成每日手账风格图片，写入 Notion Toggle
- E7：Dashboard 页面上线（折线图 + 标签频率条形图 + 最近记录列表）
  - 从 Notion 实时读取数据，去掉 KV 缓存层
  - 用 Recharts 库绘制图表
- E8：把日复盘全部 18 个 section 写入 Notion（Toggle → Callout → 内容块）
- E11：Timeline 页面（彩色卡片墙 + 按月分组 + 渐变色 + 加载更多）
- 切换 Notion 认证方式：从 OAuth 改为 Internal Integration Token

### 解决的问题
- Notion 周标题格式解析（`5-25-31` → 解析出周一日期 → 按天展开）
- Dashboard 筛掉非周记录（`4月` 等月汇总页标题格式不一样）
- `gpt-image-1` 模型名（之前误用 `dall-e-3` 导致 API 报错）
- KV 在 Vercel 上偶发失败 → 改为直接读 Notion，更稳定

### 用到的工具 / Skills
| 工具 | 用途 |
|------|------|
| Claude Code CLI | 主力开发工具 |
| Explore Agent | 搜索 Notion SDK 用法、查找已有实现 |
| Recharts | 折线图 + 饼图组件库 |
| OpenAI gpt-image-1 | 生成日记配图 |
| Notion API | 读取数据库、写入复盘内容块 |

---

## Day 3 · 2026-05-28 · 周/月复盘 + Bug 修复 + Demo

### 做了什么
- E13/E14：周复盘 + 月复盘功能上线
  - Claude 读取当周/当月所有日记 → 生成结构化 JSON → UI 展示
  - 18 个 section 完整展示（人物、情绪弧线、精力分布、进展区等）
  - 历史日期选择器（可以查过去某一周/月的复盘）
- 分离 Generate 和 Save：Generate 只生成不保存，Save 按钮手动触发写 Notion
- 新建 `/api/review/weekly/save` 和 `/api/review/monthly/save` 两个独立路由
- 修复 Notion 100-block 限制（分批 append，每次最多 100 块）
- 修复 JSON 解析崩溃问题（两个 bug，见下）
- 接入 Google OAuth 登录（替换 Notion OAuth）+ 邮箱白名单
- 更新 README（项目介绍 + Mermaid 流程图）
- 制作 `handlog-demo.html`：纯 HTML 独立演示文件，给面试官看用

### 解决的问题

**Bug 1 — JSON 在 position 3424 崩溃**
- 原因：`sanitizeJson()` 在 `extractJson()` 之前执行，Claude 回复里的前置文字（含引号）打乱了字符串状态追踪
- 修复：先 `extractJson()` 提取 JSON 对象，再 `sanitizeJson()` 清洗

**Bug 2 — JSON 在 `「照顾好自己」` 附近崩溃**
- 原因：`sanitizeJson()` 把中文书名号 `「」`（U+300C/300D）当成 JSON 字符串分隔符处理
- 修复：把 `「」` 单独拆出来，保留为普通内容字符，不翻转 `inStr` 状态

**Bug 3 — Notion 写入报错 `body.children.length should be ≤ 100`**
- 原因：月复盘内容生成了 137 个 block，超过 Notion 单次 API 上限
- 修复：加 `batchAppend()` 辅助函数，把 block 分批（每批 ≤ 100）写入

**Bug 4 — Vercel 登录失败**
- 原因：`NEXTAUTH_URL` 设置的是 `http://localhost:3001`，生产环境回调 URL 错误
- 修复：在 Vercel Dashboard 把 `NEXTAUTH_URL` 改为 `https://hand-log.vercel.app`

### 用到的工具 / Skills
| 工具 | 用途 |
|------|------|
| Claude Code CLI | 主力开发工具 |
| `/debugging` skill | 系统化排查 JSON 解析 bug（复现 → 假设 → 验证 → 修复） |
| Explore Agent | 快速定位 `sanitizeJson` 函数位置 |
| Google OAuth | 替换 Notion OAuth 做登录认证 |
| NextAuth.js | Google 登录 + 邮箱白名单鉴权 |

---

## Day 4 · 2026-05-29 · 手机端 UI 优化 + Timeline 重构

### 做了什么
- 手机端全面适配：
  - AppNav：手机上隐藏顶部导航链接，新增底部固定 Tab Bar（4 个 tab + emoji 图标）
  - Capture 页：两列布局改为手机单列，Writing Tips 移至下方
  - Dashboard：StatCard 字号缩小适配手机，图表由并排改为单列堆叠
  - 全站 padding：`px-8` → `px-4 sm:px-8`，消除手机右侧白边
- Timeline 重构：从「按天展开」改为「以周为单位」
  - 每张卡片对应 Notion 一行（一周），展示日期范围、一句话感悟、评分、标签
  - 新增 `WeekEntry` 类型，新增 `toWeekEntries()` 函数
  - 默认展示最近 3 个月
- 修复 Timeline 搜索：补充搜索简短日常全文（之前只搜感悟和周标签）
- 更新 README 加入项目介绍和 Mermaid 技术流程图

### 解决的问题
- 手机上两列 grid 布局错位（Capture 页 Writing Tips 飘到右侧）
- Dashboard 饼图文字溢出容器
- Timeline 搜索搜不到日记内容（`dailySummary` 字段未加入搜索）

### 用到的工具 / Skills
| 工具 | 用途 |
|------|------|
| Claude Code CLI | 主力开发工具 |
| Tailwind CSS 响应式前缀 | `sm:` / `lg:` 断点做手机适配 |

---

## 项目总览

| 维度 | 内容 |
|------|------|
| 开发周期 | 4 天（2026-05-26 至 2026-05-29） |
| 总 commit 数 | 约 50 个 |
| 主要语言 | TypeScript + React (Next.js 14) |
| 核心 AI | Claude claude-sonnet-4-6（日/周/月复盘生成） |
| 其他 API | OpenAI Whisper（语音转文字）、gpt-image-1（配图生成）、Notion API |
| 部署 | Vercel（自动 CI/CD，每次 push 自动部署） |
| 主要 Skills 使用 | `/frontend-design`、`/brainstorming`、`/writing-plans`、`/debugging` |
| 主要 Agent 使用 | Explore Agent（代码搜索）、general-purpose Agent（复杂分析） |
