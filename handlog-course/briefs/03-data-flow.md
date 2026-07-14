# Module 3: 数据怎么流动——从一段文字到 Notion 里的一个折叠块

### Teaching Arc
- **Metaphor:** 快递打包——你的日记文字像一件商品，Claude 把它"打包"成一个标准化的包裹（JSON），Notion 收货员按包裹上的标签（字段映射表）把每样东西放到笔记本里对应的格子。但快递偶尔会"包装变形"（AI 输出的 JSON 有时不合法），所以收货员还得会"拆歪包装"这项特殊技能。
- **Opening hook:** "你在 Notion 里看到的那个可以点开的'复盘'折叠框，其实是程序分两步才'造'出来的——先造一个空盒子，再回头确认盒子的编号，才能往里面塞东西。"
- **Key insight:** AI 的输出是"文本"，但程序需要的是"结构化数据"（JSON）；从文本到结构化数据、再从结构化数据到 Notion 复杂的块结构，中间有好几层"翻译"和"容错"，这是所有 AI 应用都要处理的通用问题。
- **Why should I care:** 理解这层，你就能预判"AI 输出格式不对"这种问题该怎么处理，而不是每次都手忙脚乱。

### Code Snippets (pre-extracted)

File: src/lib/claude.ts（extractJson，约第131-152行，用括号计数法找到真正闭合的JSON）
```ts
function extractJson(text: string): string {
  const start = text.indexOf("{");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;
    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  throw new Error("No valid JSON found in response");
}
```
（注：写作 agent 请以此为准，若实际代码略有出入，以代码库真实内容为准，保持"括号计数找到真正闭合的JSON"这一核心讲解思路不变。）

File: src/lib/claude.ts（buildPrompt，约第155-191行，模板+字符串替换）
```ts
function buildPrompt(journal: string, date: string): string {
  const templatePath = join(process.cwd(), "src/prompts/daily-review.md");
  const template = readFileSync(templatePath, "utf-8");
  return template.replace("{{DATE}}", date).replace("{{JOURNAL}}", journal);
}
```

File: src/lib/notion-schema.ts（字段映射表，完整摘录）
```ts
export const DEFAULT_FIELD_MAPPING: JournalFieldMapping = {
  name: "Name",
  dailySummary: "简短日常",
  labels: "label标签",
  score: "打分",
  insight: "一句话感悟",
  review: "复盘",
  nextSteps: "下一步",
  handlogImage: "手绘复盘图",
  psychNote: "心理学正能量话",
};
```

File: src/lib/notion.ts（appendReviewBlocks 两步创建 Toggle+Callout 的核心思路，约第257-291行；写作 agent 可用文字流程图描述这个"先创建、再查询拿真实id"的两步操作，不必逐行摘录完整函数，只需摘取能体现"两次API调用"这个关键动作的片段）

### Interactive Elements

- [x] **Data flow animation** — actors: 你的原始日记文字 → Claude(大脑) → 一段"看起来像JSON但可能有瑕疵的文本" → extractJson/sanitizeJson(质检员) → 干净的JSON对象 → notion-schema.ts(翻译表) → Notion API → 你的笔记本里的具体格子。Steps: 高亮"文本"变成"JSON"再变成"Notion属性"的每一次转换。
- [x] **Code↔English translation** — 用 extractJson 讲"为什么不能简单地找最后一个 }"；用 notion-schema 的映射表讲"程序内部叫 score，但你在 Notion 里看到的列名其实是'打分'"
- [x] **Group Chat Animation** — 复用/延伸 Module 2 的角色群聊，这次让 claude.ts 和 notion.ts 具体对话："大脑，我把你的话包成JSON了" → "笔记本："等等，你这JSON里有个弯引号，我先给你捋直了再收""(对应 sanitizeJson)
- [x] **Quiz** — 4题（tracing + debugging 风格）：
  1. "如果 Claude 返回的文本前面多了一句'好的，这是你的复盘：'，extractJson 还能正确工作吗？为什么？"
  2. "假如你想在 Notion 里新增一列'今日运动'，除了在 Notion 网页里加一列，代码这边至少还要改哪个文件？"（考察是否理解 notion-schema.ts 的作用）
  3. "为什么创建 Notion 的折叠块(Toggle)需要调用两次 API，而不是一次搞定？"
  4. "一个 debugging 场景：用户反馈'复盘生成了，但 Notion 里没有新增内容'，你会先怀疑链路里的哪个环节？"

### Reference Files to Read
- `references/interactive-elements.md` → "Message Flow / Data Flow Animation", "Group Chat Animation", "Code↔English Translation Blocks", "Multiple-Choice Quizzes"
- `references/content-philosophy.md` → 全部
- `references/gotchas.md` → 全部

### Connections
- **Previous module:** Module 2 介绍了各个"角色"文件分别是谁
- **Next module:** Module 4 会讲这些角色之外，还有哪些"外部世界"的服务（Claude/Whisper/DALL-E/Notion/Google登录）在背后提供支持，以及这些服务本身的特性（花钱、有限速等）
- **Tone/style notes:** 延续拟人化角色称呼。这个模块信息密度较高，务必严格遵守"每屏最多2-3句话"的规则，把 JSON 容错这类稍显技术的内容尽量转成动画/图示，不要写成大段说明文字。
