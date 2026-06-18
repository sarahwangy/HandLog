# 我用 AI 造了一个会思考的日记本 — 一个 Vibe Coding 的故事

*从"我想复盘我的一周"到一个完整的全栈 AI 应用，用 Claude Code、Notion API 和大量"跟着感觉走"的编程方式，花了几周时间。*

---

## HandLog 是什么？

HandLog 是一个个人 AI 日记应用，能把你每天的零散笔记自动变成结构化的复盘。

我每天用语音记录发生了什么。HandLog 转录语音，写入我的 Notion 数据库，然后用 Claude 生成结构化复盘：关键人物、事件、情绪、精力分布、成长区域、下一步行动，以及一张手绘风格的总结图。一周或一个月结束时，自动汇总成周复盘或月复盘——现在还能生成可视化的大事记表格。

**核心流程：**

```
语音 / 文字输入
      ↓
Whisper（OpenAI）— 语音转文字
      ↓
Notion — 存入你自己的数据库
      ↓
Claude（Anthropic）— 生成结构化复盘 JSON
      ↓
Review 页面 — 在 App 里漂亮地展示
      ↓
保存回 Notion — Toggle + Callout 块结构
      ↓
周/月大事记表格 — 日期 + 重点事项汇总
```

---

## 我在解决什么问题

我一直用 Notion 记日记，但回顾起来很痛苦。我得手动读完一周的笔记，找规律，写总结。每次要花 30–60 分钟，经常直接跳过。

我想要一个能做到以下事情的工具：
1. 快速倾倒想法（语音或文字）
2. 自动结构化整理
3. 挖掘我手动会漏掉的规律
4. 所有数据留在我自己的 Notion 里

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14（App Router）|
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 认证 | NextAuth.js（Google OAuth）|
| 存储 | Vercel KV（Redis）|
| 数据库 | Notion（用户自己的工作区）|
| AI — 文本 | Claude Haiku / Sonnet（Anthropic API）|
| AI — 语音 | Whisper（OpenAI API）|
| AI — 图片 | gpt-image-1（OpenAI API）|
| 部署 | Vercel |
| 监控 | Vercel Analytics + Sentry |
| 图表 | Recharts |
| 图片渲染 | Satori + @resvg/resvg-js |

---

## 用到的 API

### Anthropic Claude API
App 的大脑，用于：
- **日复盘生成** — 输入原始日记文字，输出结构化 JSON（人物、事件、情绪、评分、下一步等）
- **周复盘** — 把 7 天数据汇总成规律和趋势
- **月复盘** — 完整的月度回顾
- **大事记提取** — `generateWeeklyTableBullets` 和 `generateMonthlyTableBullets` 提取每天 2–4 个要点

使用的模型：
- `claude-sonnet-4-6` 用于复杂复盘（22 个 section 的结构化输出）
- `claude-haiku-4-5` 用于表格要点提取（更便宜、更快）

关键技巧：**Prompt 缓存** — 系统提示被 Anthropic 基础设施缓存，重复调用时大幅降低 token 费用。

### OpenAI API
两个用途：
- **Whisper** — 语音转录（`/api/transcribe`）。把 30 秒语音备忘录变成文字再交给 Claude 处理。
- **gpt-image-1** — 为每条日复盘生成手绘风格的总结图，存储在 Notion 里。

### Notion API（`@notionhq/client`）
作为持久化数据库使用。每条日记、复盘和表格都存在用户自己的 Notion 工作区。关键操作：
- `databases.query` — 按日期范围查询条目
- `pages.create` — 创建新日记条目
- `blocks.children.append` — 把复盘内容写为嵌套块（Toggle → Callout → 内容）

### Vercel KV（Redis）
用于存储：
- 用户的 Notion token（加密存储）
- 用户的数据库字段映射（哪个 Notion 字段对应哪个功能）
- 跨会话的 Chat 记忆

---

## AI 技巧与能力

### 1. 结构化 JSON 输出
每次 Claude 调用都返回结构化 JSON，而不是散文。例如，日复盘返回：

```json
{
  "people": ["导师 Chloe", "同事 Mia"],
  "emotions": ["充满活力", "专注"],
  "events": [{"category": "学习", "items": ["完成 API 模块"]}],
  "score": 8,
  "scoreReason": "高产出，进入心流状态",
  "nextSteps": ["周四前提交 PR", "晨跑连续打卡第 5 天"],
  "reviewParagraph": "今天是充实而有活力的一天..."
}
```

这让 UI 能把每个字段渲染成独立的卡片、标签云或图表。

### 2. 批量处理以节省 Token

月度大事记表格原本对每周调用一次 Claude（4–5 次），改成把所有周合并成一个 prompt：

```
// 之前：4-5 次 Claude 调用
for 每一周 → Claude 调用 → 提取要点

// 之后：1 次 Claude 调用
所有周内容合并 → Claude 调用 → 所有要点
```

**结果：月度表格 token 费用降低约 75%。**

### 3. 格式控制的 Prompt 工程
Prompt 里包含明确的 JSON 示例，让 Claude 总是返回可解析的格式：

```
以 JSON 数组格式输出，结构如下：
[{"date": "5-4", "bullets": ["事项1", "事项2"]}]
只输出 JSON，不要任何其他文字。
```

### 4. 容错 JSON 解析
Claude 有时会把 JSON 包在 markdown 代码块里。App 使用 `extractJson()` + `sanitizeJson()` 辅助函数在解析前清理：

```typescript
const start = text.indexOf("[");
const end = text.lastIndexOf("]");
const arrayText = text.slice(start, end + 1);
return JSON.parse(sanitizeJson(arrayText));
```

### 5. 流式 Chat
`/api/chat` 路由使用 Claude 的流式 API，在 Chat 页面实现实时响应。用 `AbortController` 让用户能中途停止生成。

### 6. 情绪感知对话
用户在聊天前选择心情 emoji（😊 😔 😤 😴），传给后端并注入 Claude 系统提示，自动调整回复的语气。

---

## Vibe Coding 的过程

这个项目用 **Claude Code**（Anthropic 的命令行编程助手）构建，用一种我称之为"跟着感觉走编程"（vibe coding）的方式：用自然语言描述我想要什么，让 AI 处理实现，然后审查和迭代。

### 工作流程

```
用自然语言描述功能
          ↓
Brainstorming 技能 — 探索意图、需求、设计方案
          ↓
Writing Plans 技能 — 生成逐步实施计划
          ↓
Subagent-Driven Development — 每个任务一个全新的 AI Agent
          ↓
Spec Review — 实现是否符合规格？
          ↓
Code Quality Review — 代码质量是否过关？
          ↓
推送到 Vercel
```

### 用到的 Superpowers 技能

Claude Code 有一个叫 **Superpowers** 的插件系统，提供专门的技能：

- **`superpowers:brainstorming`** — 在任何新功能之前，先进行头脑风暴，探索用户意图、边缘情况和设计选项。强制你在动手之前先想清楚。
- **`superpowers:writing-plans`** — 把设计转化为详细的实施计划，包含精确的文件路径、代码片段和测试命令。
- **`superpowers:subagent-driven-development`** — 每个任务分派一个全新的 AI Agent。每个 Agent 都没有前序任务的上下文污染。每个任务完成后，由规格合规审查员和代码质量审查员检查工作。
- **`superpowers:systematic-debugging`** — 出现 bug 时，强制进行结构化根因分析，而不是直接跳到修复。
- **`superpowers:verification-before-completion`** — 在声称"完成"之前，必须运行实际验证命令。不允许假阳性。

### Vibe Coding 实际长什么样

**例子：构建周大事记表格功能**

我说：*"我需要在 Review 页面加一个生成表格的按钮，有周和月两个版本。从 Notion 读取，提取每天的关键事项作为要点，显示成表格，保存回 Notion。"*

头脑风暴环节：3 个澄清问题 → 设计获批

Writing Plans：生成了包含每一步精确代码的 9 个任务计划

Subagent 执行：
- 任务 1 → 全新 Agent → 在 `claude.ts` 里写 `generateTableBullets` → 规格审查 ✅ → 质量审查发现缺少错误处理 → 修复 → 通过
- 任务 2 → 全新 Agent → 写 3 个 Notion 辅助函数 → 审查通过 ✅
- 任务 3–6 → 创建 4 个 API 路由并审查
- 任务 7 → 修改 `ReviewContent.tsx` 的 UI

**从描述到功能可用的总时间：约 45 分钟。**

---

## 应用页面

### Capture（`/capture`）
输入页面，支持：
- 文字输入
- 浏览器语音识别
- Whisper 转录（上传音频）

写入 Notion 当前周页面的 `简短日常` 字段。

### Review（`/review`）
三个标签页：
- **Daily** — 今天的 AI 复盘，每个维度各一张卡片
- **Weekly** — 聚合的周复盘 + 生成/保存周大事记表格
- **Monthly** — 月复盘 + 生成/保存月大事记表格

### Dashboard（`/dashboard`）
统计视图：日记内容词云、评分趋势、最频繁出现的人物和地点。

### Timeline（`/timeline`）
卡片墙，展示每天的日记内容，从周条目解析出来，按时间顺序显示。

### Chat（`/chat`）
一个读过你 Notion 日记的 AI 助手。可以问："我五月份压力大的原因是什么？" 或 "我的精力规律是什么？"

### History（`/history`）
复盘历史 — 所有之前生成过的复盘记录。

---

## 实例：周大事记表格是怎么生成的

**输入：** 周标签 "5-4-10"（5月4日至10日）

**第 1 步：** API 从 Notion 读取周页面的 `简短日常` 字段：
```
一. 晨跑5公里，整理4月复盘，和朋友 Mia 喝咖啡
二. 瑜伽课，完成4月复盘并获AI建议，为本周备餐
三. 预定6月水彩课程，整理AI项目创意数据库
```

**第 2 步：** 发给 Claude Haiku，prompt 说："识别每天内容，提取 2–4 个要点，返回 JSON 数组。"

**第 3 步：** Claude 返回：
```json
[
  {"date": "5-4", "bullets": ["晨跑5公里", "整理4月复盘", "与 Mia 喝咖啡"]},
  {"date": "5-5", "bullets": ["瑜伽课", "完成复盘获AI建议", "备餐"]},
  ...
]
```

**第 4 步：** 格式化为 markdown 表格，在 App 里渲染：

| 日期 | 重点事项 |
|------|--------|
| 5月4日 周一 | • 晨跑5公里 • 整理4月复盘 • 与 Mia 喝咖啡 |
| 5月5日 周二 | • 瑜伽课 • 完成复盘获AI建议 • 备餐 |

**第 5 步：** 用户点击 Save → 写入 Notion，成为 Toggle 块包含原生表格。

---

## 踩过的坑

### 1. Notion 的块结构很特殊
Notion 的块层级（页面 → Toggle → Callout → Paragraph）需要多次顺序 API 调用。不能一次性创建嵌套块。我花了很多时间调试"为什么 Toggle 创建了但里面是空的"。

### 2. JSON 解析比看起来难
Claude 有时会把 JSON 包在 markdown 代码块里（```json...```），有时会加前言，有时返回数组而不是对象。最终需要专门的辅助函数来处理所有这些情况。

### 3. 数据存在哪里不直观
我的日记存在**周页面**（如 "5-4-10"），不是单独的日页面。这意味着周大事记需要从周页面读取，而不是像我最初设计的那样从每日页面读取。调了好几次才理解这个结构。

### 4. Vibe Coding 需要结构才能扩展
纯粹的"让 AI 写代码"在小功能上很好用，但一旦功能变复杂，没有设计计划很容易写出互相冲突的代码。Brainstorm → Plan → Subagent 的流程解决了这个问题。

### 5. Token 费用出乎意料
月度表格最初对每周调用一次 Claude，一个月生成一次就花了不少。把它改成一次批量调用后，费用降了 75%，质量没有明显下降。

---

## 自己搭建

这个项目为个人使用而建，需要你自己的 Notion 工作区。需要准备：
- Anthropic API key（Claude）
- OpenAI API key（Whisper + 图片生成）
- Notion 集成 token + 数据库 ID
- Vercel 账号用于部署

整个技术栈都是无服务器的，每天运行成本只需几分钱，所有数据都留在你自己的 Notion 里。

---

*用 Claude Code 构建，全程 vibe coding。*
