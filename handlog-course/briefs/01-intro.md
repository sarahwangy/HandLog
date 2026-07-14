# Module 1: 录音之后，发生了什么？

### Teaching Arc
- **Metaphor:** 一场"翻译接力"——你对着手机说一段乱七八糟的流水账，就像把一张潦草的字条塞进一条传话筒队伍：第一个人（Whisper）把声音变成文字，第二个人（Claude）把文字整理成一份漂亮的复盘，第三个人（Notion）把它归档进你的笔记本。每个人只做自己那一件事，谁都不知道全局，但接力完成后，你得到了一份结构化的日记。
- **Opening hook:** "你按下麦克风按钮说了两分钟的话——那两分钟里，你的声音其实经过了三次'翻译'才变成你在 Notion 里看到的那份漂亮复盘。"
- **Key insight:** 一个看起来"一键完成"的功能，背后其实是好几个独立系统（浏览器录音 → AI 转文字 → AI 结构化 → 写数据库）按顺序接力完成的；学会拆解这条链路，就能知道"如果哪一步坏了，该去哪里找问题"。
- **Why should I care:** 这是后面所有模块的地图。理解了这条链路，你才能跟 AI 说"帮我在转文字这一步加个功能"而不是笼统地说"帮我改一下录音"。

### App 介绍（本模块开场，用大白话讲清楚)
HandLog 是一个"偷懒式日记"App。你不用坐下来认真写日记——你可以像跟朋友吐槽一样，把今天发生的事随口说出来或者随手打出来，AI 会帮你：
1. 整理成一段有条理的复盘（今天心情打几分、见了谁、发生了什么事、有什么感悟）
2. 自动存进你自己的 Notion 笔记里，不用你手动复制粘贴
3. 攒够一周/一个月的日记后，还能再帮你生成"周复盘""月复盘"

这个 App 只有一个用户——项目作者本人自己用（后面模块 6 会讲为什么登录只允许一个邮箱）。

### Code Snippets (pre-extracted)

File: src/hooks/useWhisper.ts (关键片段，约第44-98行，录音+上传逻辑)
```ts
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
    ? "audio/mp4"
    : "audio/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.onstop = async () => {
    const audioBlob = new Blob(chunks, { type: mimeType });
    const formData = new FormData();
    formData.append("audio", audioBlob);
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });
  };
  recorder.start();
};
```

File: src/app/api/transcribe/route.ts (第8-37行，后端转文字)
```ts
const audioFile = new File([audioBlob], "recording.webm", { type: audioBlob.type });
const response = await openai.audio.transcriptions.create({
  file: audioFile,
  model: "whisper-1",
  prompt: "这是一段日记录音，请保留所有标点符号。今天天气很好，我去了咖啡馆，见了老朋友。",
});
```

File: src/app/api/process/route.ts (核心衔接点，约第41行起)
```ts
const review = await generateDailyReview(journal, date);
// 拿到 Claude 生成的结构化结果后...
await findOrCreateWeekPage(date);
await appendDailySummary(date, journal);
await appendReviewBlocks(weekPageId, review);
```

### Interactive Elements

- [x] **Code↔English translation** — 用 `useWhisper.ts` 的录音片段，讲清楚"浏览器怎么获取麦克风权限、录音变成什么格式"
- [x] **Data flow animation** — actors: 手机麦克风 → 浏览器(MediaRecorder) → /api/transcribe → Whisper → /api/process → Claude → Notion。Steps: 依次高亮每一步，包裹旁白："你的声音" → "变成一段音频文件" → "被送去问 Whisper" → "变成文字" → "被送去问 Claude" → "变成结构化 JSON" → "存进 Notion"
- [x] **Quiz** — 3题，tracing 风格：
  1. "如果你打字而不是录音，上面这条链路会跳过哪一步？"（考察：是否理解 Whisper 只服务于语音输入）
  2. "如果 Whisper 转录出来的文字全是错别字，问题最可能出在链路的哪个环节？"（debugging 风格）
  3. "为什么这个功能需要先转文字、再让 Claude 整理，而不是让 Claude 直接'听'录音？"（架构决策，答案：当前用的 Claude 版本走的是文字输入，语音要先转成文字）

### Reference Files to Read
- `references/interactive-elements.md` → "Code↔English Translation Blocks", "Message Flow / Data Flow Animation", "Multiple-Choice Quizzes"
- `references/content-philosophy.md` → 全部（首个模块，需要建立整体调性）
- `references/gotchas.md` → 全部

### Connections
- **Previous module:** 无（这是第一个模块）
- **Next module:** Module 2 会介绍这条链路背后到底有哪些"文件"和"角色"分别负责哪一段
- **Tone/style notes:** 主色调 vermillion（暖橙红）。全程用"你"称呼学习者，语气像朋友讲解，不用"用户"这种冷冰冰的词。角色命名统一：Whisper 叫"耳朵"，Claude 叫"大脑"，Notion 叫"笔记本"——后续模块延续这套拟人化称呼。
