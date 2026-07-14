# Module 2: 认识主要角色

### Teaching Arc
- **Metaphor:** 一个剧组——导演（page.tsx，负责场务和把关，比如"这个人有没有登录"）从不直接上场表演，真正在台上演戏、和观众互动的是演员（XxxContent.tsx）。道具管理员（lib/ 里的文件）负责准备所有跟外部世界打交道的工具。
- **Opening hook:** "你打开 Capture 页面时，其实同时加载了两个文件——一个你几乎看不出存在，另一个才是你真正在跟它互动的。"
- **Key insight:** Next.js 项目里 `page.tsx` + `XxxContent.tsx` 的配对是一个非常常见的模式：前者在服务器上跑，负责"能不能看这个页面"之类的把关；后者在你的浏览器里跑，负责按钮点击、输入框这些实际交互。
- **Why should I care:** 知道这个配对模式后，你就能准确告诉 AI"这个交互逻辑要加在 Content 组件里，不是 page 里"，而不是被 AI 加错地方却看不出问题。

### Code Snippets (pre-extracted)

（此模块不需要展示深层业务逻辑代码，重点是"文件地图"，可以用简短的目录结构和一两个文件开头的对比。）

File: 目录结构示例（用于可视化文件树，不是要展示成代码块，而是画成带图标的文件树）
```
src/
├── app/
│   ├── [locale]/
│   │   ├── capture/
│   │   │   ├── page.tsx          ← "导演"：服务器端，检查登录、准备数据
│   │   │   └── CaptureForm.tsx   ← "演员"：浏览器里跑，处理录音/打字/按钮
│   │   ├── review/ReviewContent.tsx
│   │   ├── dashboard/, history/, timeline/, chat/, login/
│   └── api/                       ← 后端接口，不渲染任何画面，只负责"干活"
├── hooks/
│   ├── useWhisper.ts       ← 封装录音逻辑
│   ├── useAutosave.ts      ← 每隔几秒自动把草稿存起来
├── lib/
│   ├── claude.ts           ← 所有跟 Claude 对话的代码，401行
│   ├── notion.ts           ← 所有跟 Notion 读写的代码，1150行（全项目最大文件）
│   ├── notion-schema.ts    ← "翻译表"：程序内部字段名 ↔ Notion 里的中文列名
│   ├── auth.ts             ← 登录规则
│   └── kv.ts               ← 一个"便利贴"式的临时存储
└── prompts/
    ├── daily-review.md     ← 喂给 Claude 的"日复盘"说明书
    ├── weekly-review.md
    └── monthly-review.md
```

File: src/hooks/useAutosave.ts（如果原文件较短可摘取核心 setInterval/debounce 片段，用于说明"自动保存"这个演员角色的职责——写作 agent 需要自行去文件里找一段 5-10 行、能独立说明"每隔几秒存一次草稿"逻辑的代码，若找不到合适片段可改用文字+图标卡片代替，不要杜撰代码）

### Interactive Elements

- [x] **Group Chat Animation** — 用"剧组群聊"的形式，让几个"角色"互相说话介绍自己：
  - page.tsx: "我先检查你有没有登录，登录了才把页面给你。"
  - CaptureForm.tsx: "登录之后，真正跟你互动的是我——录音、打字、点生成，都归我管。"
  - useWhisper.ts: "我是 CaptureForm 的助手，专门处理录音这件小事。"
  - claude.ts: "有人问我问题，我就去问 Claude，把答案整理好带回去。"
  - notion.ts: "最后我负责把所有东西真正存进你的 Notion 笔记本。"
  这组对话本身就是本模块的"记忆点"，帮助学习者记住每个文件的职责分工。
- [x] **架构图/文件树可视化**（非五大件强制要求，但很适合本模块）：给每个主要文件夹配一个图标+一句话职责说明
- [x] **Code↔English translation** — 用上面找到的一小段代码（优先 useAutosave.ts 或 CaptureForm.tsx 里最短小、职责单一的一段），讲清楚"这个演员具体做什么"
- [x] **Quiz** — 3题：
  1. "如果你想加一个'深色模式切换按钮'，这个逻辑更可能加在 page.tsx 还是 XxxContent.tsx？为什么？"（架构决策）
  2. "api/ 文件夹里的路由和 app/[locale]/ 里的页面文件有什么本质区别？"（scenario：一个不会渲染画面，一个会）
  3. "如果 AI 建议你把 Claude 调用逻辑直接写在 CaptureForm.tsx 里而不是 lib/claude.ts，这是个好主意吗？为什么 HandLog 选择把它单独拆出来？"（架构判断力）

### Reference Files to Read
- `references/interactive-elements.md` → "Group Chat Animation", "Code↔English Translation Blocks", "Multiple-Choice Quizzes", 如有 "Architecture Diagram / Pattern Cards" 相关章节也读
- `references/content-philosophy.md` → 全部
- `references/gotchas.md` → 全部

### Connections
- **Previous module:** Module 1 讲了"录音之后发生了什么"的整体旅程
- **Next module:** Module 3 会把这些角色串起来，具体讲"数据是怎么在它们之间流动的"（比 Module 1 更细节：具体到 Notion 里 Toggle+Callout 这种两步创建的坑）
- **Tone/style notes:** 延续 Module 1 的拟人称呼（耳朵=Whisper, 大脑=Claude, 笔记本=Notion），本模块新增"导演"(page.tsx)和"演员"(Content组件)这套比喻，之后模块如果提到这两类文件要保持一致称呼。
