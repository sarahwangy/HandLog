# HandLog Tickets

---

## ✅ E8 — Capture 写入 Notion（已完成）

- 找到/创建本周页面（标题格式 `5-25-31`）
- 追加简短日常属性：`三. [当天内容]`
- 复盘写入页面 body，结构：Toggle > heading_3 + to_do
- 标题彩色加粗，下一步用 checkbox，正能量用紫色标题

---

## E9 — 部署 Vercel（上线）

**目标：** 把 HandLog 部署到 Vercel，用真实域名访问，不依赖本地 `npm run dev`。

### 步骤

1. `vercel login` + `vercel link`
2. 在 Vercel Dashboard 设置所有环境变量（同 `.env.local`）
3. `vercel --prod` 部署
4. 验证生产环境 dashboard、capture、review 全部正常

### 涉及环境变量

- `NOTION_TOKEN` / `NOTION_DATABASE_ID`
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`（Vercel KV）
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`

---

## E10 — Dashboard 词云卡片

**目标：** 在 Dashboard 页面新增词云卡片，从「简短日常」和「复盘」字段提取高频词。

**不花钱：** 纯前端文字处理，不调用 Claude / Whisper。

### 实现思路

1. Dashboard API 读取每条记录的 `简短日常` + `复盘` 文字
2. 按标点/空格分词，统计词频，过滤停用词（的/了/我/在/是）
3. 返回 `wordFrequency: { word: string; count: number }[]`
4. 前端用气泡样式渲染，词越频繁字越大

### 涉及文件

- `src/lib/dashboard.ts` — 加 `wordFrequency` 字段和分词逻辑
- `src/app/api/dashboard/route.ts` — 读取简短日常/复盘字段
- `src/app/[locale]/dashboard/DashboardContent.tsx` — 新增词云卡片

---

## E11 — 时间轴页面（Timeline）

**目标：** 新增「时间轴」页面，把每周「简短日常」按天拆开，展示成每天一张卡片的日记墙。

**不花钱：** 只读 Notion API，不调用 AI。

### 数据解析逻辑

每条 Notion 周记录的「简短日常」格式：
```
一. Wheeler hills，看书，...
二. ben toy library，...
三. 预定clayton...
```
- 按 `\n中文数字.` 拆分成最多 7 条（一二三四五六七）
- 周一 = 标题开始日（如 `5-25-31` → 5月25日）+ 0天
- 周二 = +1天，以此类推

### 涉及文件

- `src/app/api/timeline/route.ts` — 新 API，按天展开条目
- `src/lib/timeline.ts` — 解析简短日常、计算每天日期
- `src/app/[locale]/timeline/page.tsx` — 时间轴页面
- `src/app/[locale]/timeline/TimelineContent.tsx` — 卡片墙 + 筛选 + 搜索
- `src/components/layout/AppNav.tsx` — 导航加「时间轴」入口

### 页面功能（参考 mockup）

- 按月分组，"2026 年 5 月 · N 条记录"
- 3列卡片网格（手机 1 列）
- 顶部标签筛选栏 + 搜索框
- 每张卡片：日期大字、评分、一句话感悟（来自当天 AI 复盘）、标签
- 右下角「+ 记录今天」跳转 Capture

---

## ✅ E12 — AI 生成日复盘手账图（已完成）

**模型：** `gpt-image-1`（OpenAI 最新图像模型）

### 图片存储规则（三层结构）

| 复盘类型 | 图片存在哪里 | 形式 |
|---------|------------|------|
| **日复盘图** | 当天 Toggle 的 Callout 里 | image block |
| **周复盘图** | 那一周行的「手绘复盘图」属性 | Files & media 属性 |
| **月复盘图** | 「复盘-汇总」行的页面 body 里 | Toggle（标题写"X月X日-X月X日复盘"） |

---

## E13 — 周复盘

**目标：** 每周结束时，汇总本周7天内容，生成周复盘 + AI 图片。

### 存储
- 复盘文字：写入本周 Notion 页面 body（Toggle 形式，标题"本周复盘"）
- 复盘图片：更新本周行的「手绘复盘图」属性（Files & media）

---

## E14 — 月复盘

**目标：** 每月结束时，汇总本月所有周记录，生成月复盘 + AI 图片。

### 存储
- 在 Notion 数据库里找到「复盘-汇总」那一行
- 在该页面 body 里追加一个 Toggle，标题格式：`5月1日-5月31日复盘`
- Toggle 里写入月复盘内容 + AI 生成图片（image block）

---

## 待做顺序

1. **E10** — Dashboard 词云
2. **E13** — 周复盘
3. **E14** — 月复盘
