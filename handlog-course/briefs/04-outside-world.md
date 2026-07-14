# Module 4: 外部世界——那些不属于这个项目、却撑起整个 App 的服务

### Teaching Arc
- **Metaphor:** 请外包团队——HandLog 自己不会"听声音"、不会"理解文字"、不会"画画"、不会"记笔记"，这些活它全部外包给了专业公司（OpenAI 的 Whisper 和 DALL-E、Anthropic 的 Claude、Notion）。外包有好处（不用自己造轮子），也有代价（要按用量付钱、对方服务器挂了你也跟着挂、每家公司的"接口合同"格式都不一样）。
- **Opening hook:** "HandLog 这个 App 自己其实什么都不会——它不会转录声音、不会理解你写了什么、也不会画画，这些全部是'外包'出去的。"
- **Key insight:** 现代 AI 应用的核心工作往往是"整合别人的服务"而不是"自己实现算法"；知道有哪些外部依赖、各自的花费模式和限制，是评估一个项目"稳不稳、贵不贵"的关键能力。
- **Why should I care:** 以后你自己做项目要不要接某个 API，就知道该问"这个服务按什么计费、有没有限速、挂了会怎样"这几个关键问题。

### Code Snippets (pre-extracted)

File: src/lib/auth.ts（登录白名单核心逻辑，约第17-19行）
```ts
async signIn({ user }) {
  return user.email === process.env.ALLOWED_EMAIL;
}
```

File: src/lib/auth.ts（内部 Notion token 读取，约第43-48行）
```ts
function getNotionTokenInternal(): string {
  return process.env.NOTION_TOKEN!;
}
```

File: src/app/api/handlog/generate/route.ts（DALL-E 配图调用，约第59-80行 buildPrompt 逻辑思路 + images.generate 调用）
```ts
const image = await openai.images.generate({
  model: "dall-e-3",
  prompt: buildPrompt(review), // 根据心情分数、地点等动态拼出"日式手帐水彩画"风格描述
  n: 1,
  size: "1024x1024",
});
```

File: src/middleware.ts（登录拦截，约第8-28行核心逻辑思路）
```ts
const token = await getToken({ req });
if (!token && !isPublicPath(req.nextUrl.pathname)) {
  return NextResponse.redirect(new URL("/en/login", req.url));
}
```

外部服务清单（供写作 agent 做成"服务名片卡片"）：
| 服务 | 干什么 | 计费方式 | 值得提的特性 |
|---|---|---|---|
| Anthropic Claude (claude-sonnet-4-6 / claude-haiku-4-5) | 把日记整理成结构化复盘、聊天问答 | 按 token（输入+输出的文字量）计费 | 项目里刻意用便宜的 Haiku 模型做简单任务（提取表格），贵的 Sonnet 做复杂生成，这是成本优化 |
| OpenAI Whisper (whisper-1) | 语音转文字 | 按音频时长计费 | 给它一句"示范文本"当 prompt，引导它输出带标点的结果 |
| OpenAI DALL-E 3 | 生成手帐风配图 | 按张数计费，比文字贵很多 | 是可选功能，不是每次都会触发 |
| Notion API | 存储所有日记/复盘数据 | 免费（个人使用） | 单次最多处理100个blocks，要分批；有自己的一套认证token机制 |
| Google OAuth (next-auth) | 登录 | 免费 | 只允许一个白名单邮箱登录——这不是一个多用户产品，是自己给自己做的私人工具 |
| Vercel KV | 临时存草稿、缓存 | 按用量小额计费/有免费额度 | 草稿存7天，Notion缓存只存5分钟——不同数据用不同"保质期" |

### Interactive Elements

- [x] **Pattern Cards / 服务名片** — 上面表格转成视觉卡片，每张卡片一个服务的logo风格图标+一句话职责+一个"计费方式"徽章
- [x] **Code↔English translation** — 用 auth.ts 的白名单片段，讲"这不是要给所有人用的产品"这件事
- [x] **Quiz** — 4题：
  1. "如果 OpenAI 的服务器今天挂了，HandLog 的哪些功能会受影响，哪些不会？"（架构判断：Whisper转录和DALL-E配图会挂，但Claude不受影响因为是不同公司）
  2. "为什么周复盘/月复盘要设计成'整周一次调用 Claude'而不是'每天调用一次然后拼起来'？"（成本优化的判断力，为 Module 5 埋伏笔）
  3. "如果你想让朋友也能用你的 HandLog，最少需要改哪部分代码？"（考察是否理解白名单登录机制）
  4. "DALL-E 配图这个功能，如果预算有限，你会把它设计成默认开启还是用户手动触发？HandLog 现在是怎么做的？"

### Reference Files to Read
- `references/interactive-elements.md` → "Pattern Cards" 或类似的卡片型展示模式章节, "Code↔English Translation Blocks", "Multiple-Choice Quizzes"
- `references/content-philosophy.md` → 全部（尤其是"一个概念一屏"和"隐喻先行"）
- `references/gotchas.md` → 全部

### Connections
- **Previous module:** Module 3 讲了数据在项目内部各文件之间怎么流动
- **Next module:** Module 5 会讲 HandLog 在整合这些外部服务时用到的几个"聪明技巧"（省钱、容错、缓存策略）
- **Tone/style notes:** 这个模块信息偏"清单式"，务必用卡片而不是大段列表文字呈现服务清单；延续前面模块拟人化的语气，可以把每个外部服务也拟人化（比如 Notion="笔记本"已经用过，continue 这个称呼）。
