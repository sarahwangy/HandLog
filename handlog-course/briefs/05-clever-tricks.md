# Module 5: 聪明的工程技巧

### Teaching Arc
- **Metaphor:** 精明的管家——一个好管家不会每次都用最贵的方式做事：日常小事交给便宜的帮手（Haiku模型），重要场合才请最好的师傅（Sonnet模型）；不同东西保存期限不同（草稿留7天，因为怕你写了没保存；缓存只留5分钟，因为反正随时能重新问 Notion 要）；东西太多一次搬不完就分几趟搬（批量处理超过100个blocks）。
- **Opening hook:** "HandLog 生成'月复盘'的时候，并没有把整整30天的日记一天天喂给 Claude——这个设计选择，一年能省下不少 AI 调用费用。"
- **Key insight:** 好的工程不是"能跑就行"，而是在成本、速度、可靠性之间做出刻意的权衡；这些权衡背后都有具体的理由，理解这些理由能帮你在自己的项目里做出类似的聪明决策。
- **Why should I care:** 下次你让 AI 帮你搭一个类似的功能，你可以主动提出"用便宜模型处理简单任务""按批处理避免超限"这些要求，而不是等 AI 自己想到（它不一定会想到）。

### Code Snippets (pre-extracted)

File: src/lib/claude.ts（模型分级选择，约第297/342/386行附近的模式，用两三处调用对比展示）
```ts
// 日/周复盘：用更贵但质量更好的模型
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 8192,
  ...
});

// 简单的表格 bullet 提取：用更便宜的模型
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  ...
});
```

File: src/lib/claude.ts（第316-317行附近注释，"整月一次调用而不是逐天调用"的成本注释，写作agent请引用真实注释原文，思路是：比逐周/逐日调用节省约75%的token费用）

File: src/lib/notion.ts（batchAppend，约第189-198行，处理超过100个blocks的分批逻辑）
```ts
async function batchAppend(pageId: string, blocks: Block[]) {
  for (let i = 0; i < blocks.length; i += 100) {
    const batch = blocks.slice(i, i + 100);
    await notion.blocks.children.append({ block_id: pageId, children: batch });
  }
}
```

File: src/lib/kv.ts（草稿7天 vs Notion缓存5分钟的双TTL设计，写作agent请摘取实际的 TTL 数值设置代码，若变量名不同以真实代码为准，核心讲解点是"两种数据用两种过期时间"）

File: src/lib/notion.ts（withAuthCheck 统一401拦截，约第27-43行思路：把所有Notion调用包一层，统一识别401错误转成自定义NotionAuthError）

### Interactive Elements

- [x] **Pattern Cards** — 四张"技巧卡"：①模型分级(省钱) ②整周一次调用(省钱) ③分批处理(避免超限报错) ④双TTL缓存(数据新鲜度 vs 性能)
- [x] **Code↔English translation** — 用 batchAppend 讲"为什么100个东西不能一次性搬完"；用模型分级片段讲"贵的和便宜的AI模型有什么区别，什么时候该用哪个"
- [x] **Data flow animation** — actors: 30天的日记 → (对比两种做法) 方案A："30次调用Claude"（每天一次，图示很多小箭头，费用图标堆很高）vs 方案B："1次调用Claude"（一次性打包一个月，费用图标只有一个）。用这个对比动画直观展示为什么方案B更聪明。
- [x] **Quiz** — 4题（decision-making + debugging风格）：
  1. "你在做一个类似的日记App，要新加一个'情绪标签提取'的小功能，你会用贵模型还是便宜模型？为什么？"
  2. "如果 Notion 突然要求你一次最多只能创建10个blocks(不是100个)，代码里哪个函数需要改？"
  3. "草稿缓存留7天、Notion数据缓存只留5分钟——如果这两个数值反过来会有什么问题？"（考察是否理解"为什么这么设计"而不只是记住数字）
  4. "withAuthCheck 这种'统一包一层处理错误'的写法，好处是什么？如果没有它，代码会变成什么样？"

### Reference Files to Read
- `references/interactive-elements.md` → "Pattern Cards", "Message Flow / Data Flow Animation", "Code↔English Translation Blocks", "Multiple-Choice Quizzes"
- `references/content-philosophy.md` → 全部
- `references/gotchas.md` → 全部

### Connections
- **Previous module:** Module 4 讲了外部依赖服务分别是什么、怎么计费
- **Next module:** Module 6 是最后一个模块，讲这个项目里容易让人迷惑/踩坑的地方，以及整体架构收尾
- **Tone/style notes:** "省钱"这个主题很适合用轻松幽默的语气(management比喻延续"管家"这个词)，避免枯燥地罗列技术细节，多用对比卡片和动画代替文字说明。
