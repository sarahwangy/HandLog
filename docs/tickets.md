# HandLog Tickets

---

## E10 — Dashboard 词云卡片

**目标：** 在 Dashboard 页面新增一张词云卡片，从「简短日常」和「复盘」字段提取高频词，可视化展示生活关键词。

**不花钱：** 纯前端文字处理，不调用 Claude / Whisper。

### 实现思路

1. Dashboard API（`/api/dashboard`）里，读取每条记录的 `简短日常` + `复盘` 字段文字
2. 按标点/空格分词，统计每个词出现频率，过滤掉"的/了/我/在"等停用词
3. 返回 `wordFrequency: { word: string; count: number }[]` 数组
4. 前端用 `react-wordcloud` 或手写气泡样式渲染词云卡片

### 涉及文件

- `src/lib/dashboard.ts` — 加 `wordFrequency` 字段和分词逻辑
- `src/lib/notion-schema.ts` — 确认 `简短日常` / `复盘` 字段名
- `src/app/api/dashboard/route.ts` — 读取这两个字段传给 transformNotionPages
- `src/app/[locale]/dashboard/DashboardContent.tsx` — 新增词云卡片组件

### 验收标准

- Dashboard 页面出现词云卡片
- 词越频繁，字越大、颜色越深（秋天配色）
- 停用词（的、了、我、在、是）不显示

---

## E11 — 时间轴页面（Timeline）

**目标：** 新增「时间轴」页面，把每周条目里的「简短日常」按天拆开，展示成每天一张卡片的日记墙，支持按标签筛选和关键词搜索。

**不花钱：** 只读 Notion API，不调用 AI。

### 数据解析逻辑

每条 Notion 周记录的「简短日常」格式：
```
1. Wheeler hills，看书，...
2. ben toy library，...
3. 预定clayton...
```
- 按 `\n数字.` 拆分成最多 7 条
- 周一 = 标题开始日（如 `5-4-10` → 5月4日）+ 0天
- 周二 = +1天，周三 = +2天，以此类推

### 涉及文件

- `src/app/api/timeline/route.ts` — 新 API，返回按天展开的条目列表
- `src/lib/timeline.ts` — 解析简短日常文字、计算每天日期的工具函数
- `src/app/[locale]/timeline/page.tsx` — 时间轴页面
- `src/app/[locale]/timeline/TimelineContent.tsx` — 卡片墙 + 筛选 + 搜索
- `src/components/layout/AppNav.tsx` — 导航加「时间轴」入口

### 页面功能

- 按月分组，每月显示"X 年 X 月 · N 条记录"标题
- 3列卡片网格（手机端 1 列）
- 顶部标签筛选栏（从所有条目的 label标签 提取）
- 搜索框（关键词过滤简短日常文字）
- 最右下角「+ 记录今天」按钮，跳转 Capture 页

### 验收标准

- 时间轴正确显示每天的内容（不是每周）
- 日期、星期、分数、标签、一句话感悟都显示
- 按标签筛选有效
- 搜索过滤有效

---

## 待做顺序建议

1. **E8** — Capture 写入 Notion（核心功能）
2. **E9** — 部署 Vercel（上线）
3. **E10** — Dashboard 词云
4. **E11** — 时间轴
