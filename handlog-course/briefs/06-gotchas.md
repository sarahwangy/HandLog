# Module 6: 容易踩的坑（和这个项目的"全貌"）

### Teaching Arc
- **Metaphor:** 拆房子前的验房报告——买了一栋看起来不错的房子，验房师会告诉你"这扇门其实是假的""这个开关标签贴错了""这堵墙看着一样其实是后加的"。这个模块就是给 HandLog 项目做一次"验房"，把容易让新手迷惑的细节都指出来。
- **Opening hook:** "如果你去翻 HandLog 的代码，会发现一个叫 `/api/handlog/generate` 的接口——名字听起来像是'生成日记'，但它实际上是用来画画的。名字有时候会骗人。"
- **Key insight:** 真实项目的代码不是教科书例子，会有命名不准确、文档过时、历史遗留的"预留但没用上"的设计——学会识别这些"不完美"，是从"看得懂代码"到"能independently debug代码"的关键一步。
- **Why should I care:** 下次你自己的项目里 AI 写出类似的"名不副实"或者"两条路径同时存在"的情况,你能一眼看出来,而不会被表面的命名或注释误导。

### Code Snippets (pre-extracted)

File: src/app/api/handlog/generate/route.ts（路由命名误导示例——文件路径本身就是最好的展示素材，不需要摘取业务代码，只需要展示：这个路径叫"generate"但实际是DALL-E画图；而真正生成复盘的路由叫 /api/process，两者对比）

File: src/lib/notion.ts（appendReviewBlocks 两步创建 Toggle+Callout 再回查 id 的坑，前面 Module 3 已经详细讲过原理，这里只需要简短复习一句带过，重点放在"这是Notion API的通用坑,不是HandLog特有"）

File: src/lib/claude.ts（第368-370行附近，weekLabel.split("-")依赖固定格式字符串协议）
```ts
const [month, startDay, endDay] = weekLabel.split("-");
// weekLabel 长得像 "5-4-10"（5月4日到10日）
// 如果格式对不上，这里会静默产生错误的日期，不会报错提醒你
```

File: src/lib/auth.ts + src/lib/notion-schema.ts（两套Notion认证机制并存的对比：真正在用的 getNotionTokenInternal() vs 预留但未激活的 NotionUserSchema 多用户OAuth设计）

File: CaptureForm.tsx / ReviewContent.tsx（sessionStorage传递数据的模式，约 setItem("pendingReview", ...) 这行，写作agent请从真实文件中摘取该行前后5行左右的上下文）

补充说明（写作agent请转述为课程语言，不要照抄）：
- CLAUDE.md 提到需要遵守的 `docs/notion.md` 实际在代码库中不存在，真正的字段映射定义在 `src/lib/notion-schema.ts`——这是"文档滞后于代码"的真实案例，值得作为收尾的一个小提醒。
- 开发环境（NODE_ENV === "development"）多个路由会跳过登录校验，方便本地测试，但也提醒"上线前要确认这个判断真的生效"。

### Interactive Elements

- [x] **Drag-and-drop 或 spot-the-bug 风格 Quiz** — 5题，覆盖本模块+回顾全课程：
  1. "'/api/handlog/generate' 这个路由实际是做什么的？"（spot-the-bug：名字骗人）
  2. "如果 weekLabel 的格式变成 '2026-05-04-10'（多一段年份），split('-') 会出什么问题？"（debugging，考察字符串协议的脆弱性）
  3. "HandLog 里 Notion 认证实际生效的是哪一种方式？（内部Token 还是 多用户OAuth）"
  4. "sessionStorage 传递数据的方案，有什么已知的局限（提示：刷新页面会怎样）？"
  5. 综合题："如果要把 HandLog 改造成能给多个朋友一起用的产品，按今天学到的内容，你觉得优先要解决哪三个问题？"（开放性综合题，检验整门课的架构理解）
- [x] **Group Chat Animation**（收尾彩蛋）——延续前面模块的角色群聊传统，让"导演""演员""耳朵""大脑""笔记本"做一次"庆功群聊"，互相调侃刚才犯过的那些"坑"，作为课程的情感收尾
- [x] **Code↔English translation** — 用 weekLabel.split("-") 讲字符串协议的脆弱性
- 建议本模块最后加一个"全课程回顾"的架构总图（可选的 architecture diagram），把 Module 1-6 讲过的所有角色重新放进一张图里，作为整门课的总结画面

### Reference Files to Read
- `references/interactive-elements.md` → "Multiple-Choice Quizzes"（含 spot-the-bug 变体）, "Group Chat Animation", "Code↔English Translation Blocks", 如有 Architecture Diagram 章节也读
- `references/content-philosophy.md` → 全部
- `references/gotchas.md` → 全部（这是最后一个模块，尤其要检查收尾的完整性和没有虎头蛇尾）

### Connections
- **Previous module:** Module 5 讲了项目里聪明的工程技巧
- **Next module:** 无（这是最后一个模块），结尾处应该有明确的"课程完结"感，可以呼应 Module 1 开头的"翻译接力"比喻做首尾呼应
- **Tone/style notes:** 收尾模块语气可以更轻松、带点幽默感，但不要削弱专业性；一定要有明确的"结束感"，比如一段简短的"现在你懂了"总结文字+可能的行动建议（比如"下次你可以试着自己往这个项目里加一个新功能"）。
