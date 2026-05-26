# HandLog 学习笔记

---

### T-101 — 初始化 Next.js 14 项目

- **学到的核心概念：** App Router 是 Next.js 13+ 的新路由方式，用文件夹结构定义路由（`src/app/capture/page.tsx` → `/capture`）；`src/` 目录是推荐的项目结构
- **用到的关键工具：** `create-next-app`（官方脚手架命令）
- **容易踩的坑：** 目录里已有文件时 `create-next-app` 会报冲突，需要先把文件移走再创建
- **一句话总结：** 用官方脚手架一键生成含 TypeScript + ESLint + Tailwind 的 Next.js 14 项目骨架

---

### T-102 — 配置 shadcn/ui

- **学到的核心概念：** shadcn/ui 不是普通 npm 包，它把组件源码直接复制进项目，你完全掌控组件代码；`cn()` 函数用于合并 Tailwind class 名称
- **用到的关键 API/函数：** `npx shadcn@latest init`、`npx shadcn@latest add`、`clsx` + `tailwind-merge`（cn 内部用的）
- **容易踩的坑：** shadcn init 会修改 `layout.tsx`，引入 Next.js 14 里不存在的 `Geist` google font，需要手动还原为 `localFont`
- **一句话总结：** 安装可自定义的 UI 组件库，拿到 Button/Input/Card/Dialog 四个基础组件的源码

---

### T-103 — i18n 国际化（next-intl）

- **学到的核心概念：** i18n = 把页面文字抽成 JSON，运行时按语言加载；middleware 是每次 HTTP 请求都会经过的"拦截层"；Provider Pattern 是 React 共享数据的标准方式
- **用到的关键 API/函数：** `defineRouting`、`getRequestConfig`、`createMiddleware`（均来自 next-intl）
- **容易踩的坑：** middleware 的 `matcher` 要排除 `api`、`_next`、静态文件，否则会拦截不该拦截的请求
- **一句话总结：** 用 next-intl 让 app 支持中/英文切换，所有文字存在 `messages/zh.json` 和 `messages/en.json` 里

---

### T-104 — 亮/暗模式（next-themes）

- **学到的核心概念：** Provider Pattern——用一个"外壳"组件包住所有页面，让所有子组件都能通过 Context 获取共享状态（这里是主题）；`suppressHydrationWarning` 避免服务端/客户端主题不一致的警告
- **用到的关键 API/函数：** `ThemeProvider`（next-themes）、React Context（隐式使用）
- **容易踩的坑：** ThemeProvider 必须是 Client Component（`"use client"`），但 layout.tsx 是 Server Component，所以要单独抽一个 providers.tsx 文件
- **一句话总结：** 用 next-themes 的 ThemeProvider 包住整个 app，实现亮/暗模式切换，默认亮色

---

### T-105 — 环境变量模板

- **学到的核心概念：** `.env.local` 存真实密钥（被 .gitignore 保护，不上传 GitHub）；`.env.example` 是说明书（值为空，可以安全提交）；`NEXT_PUBLIC_` 前缀的变量会暴露给浏览器端，没有前缀的只在服务器端可用
- **用到的关键工具：** Next.js 内置的环境变量系统
- **容易踩的坑：** 把真实密钥提交到 GitHub 是严重安全问题；`NEXT_PUBLIC_` 前缀的变量不能放敏感信息
- **一句话总结：** 建立环境变量模板，区分"服务器端密钥"和"客户端公开变量"

---

### T-106 — Vercel KV 工具函数

- **学到的核心概念：** Key-Value 存储（Redis）——像超大 JS 对象，key 是字符串，value 是任意数据；TTL（Time To Live）——数据的"保质期"，自动过期不用手动删；封装（wrapper）——把底层 API 包一层，让调用更语义化
- **用到的关键 API/函数：** `kv.get()`、`kv.set({ ex: TTL })`、`kv.del()`（来自 `@vercel/kv`）
- **容易踩的坑：** KV 在本地开发时需要 `.env.local` 里有 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`，否则会报错；本地测试可以用 Upstash 免费账号
- **一句话总结：** 封装三类 KV 操作：草稿存储（7天）、Notion 元数据缓存（5分钟）、周复盘等待状态（28天）

---

### T-107 — Sentry + Vercel Analytics

- **学到的核心概念：** Sentry 是错误追踪服务，app 出错时自动捕获并上报（包括错误信息、用户操作路径）；Vercel Analytics 统计页面访问量和性能；两者都只在生产环境启用，本地开发不干扰
- **用到的关键 API/函数：** `Sentry.init()`（客户端和服务端分别初始化）、`<Analytics />`（React 组件，放在 layout 里全局生效）
- **容易踩的坑：** Sentry 有两个配置文件（client / server），因为浏览器端和服务器端是两个完全不同的运行环境；`NEXT_PUBLIC_SENTRY_DSN` 需要 `NEXT_PUBLIC_` 前缀，因为浏览器端也需要读取它
- **一句话总结：** 加入错误监控（Sentry）和访问统计（Vercel Analytics），均只在生产环境激活

### T-203 — 加密存储 Notion access token

- **学到的核心概念：** AES-256-GCM 对称加密——同一个密钥加密和解密；IV（初始向量）每次随机生成确保相同内容加密结果不同；authTag 防止密文被篡改
- **用到的关键 API/函数：** Node.js 内置 `crypto` 模块的 `createCipheriv`、`createDecipheriv`、`randomBytes`，不需要装额外的包
- **容易踩的坑：** `ENCRYPTION_KEY` 必须是 64 位十六进制字符串（32字节），长度不对会报错；密钥丢了就永远解不开已存的 token
- **一句话总结：** 用 AES-256-GCM 加密 Notion token 再存 KV，读取时解密，KV 里只有密文，即使泄露也没用

---

### T-304 — 自动保存草稿到 Vercel KV

- **学到的核心概念：** 防抖（debounce）——用户每次击键都重置定时器，停止输入 3 秒后才真正保存；`useRef` 存 timer ID，因为改它不会触发重新渲染（和 `useState` 的区别）
- **用到的关键 API/函数：** `setTimeout` / `clearTimeout`、`useRef`、`useEffect` cleanup 函数
- **容易踩的坑：** 组件卸载时必须 `clearTimeout`，否则定时器还在内存里跑（内存泄漏）
- **一句话总结：** 用防抖模式实现自动保存：用户停止输入 3 秒后才发请求，失焦时立即保存

---

### T-305 — 草稿恢复（页面加载时读 KV）

- **学到的核心概念：** Mount effect——`useEffect(() => {...}, [])` 只在组件第一次显示时执行一次，用来做"页面加载时初始化"；loading 状态防止用户刚打字就被服务器数据覆盖
- **用到的关键 API/函数：** `useEffect`、`fetch`、`useState` 管理 loading 状态
- **容易踩的坑：** 草稿加载完之前要 `disabled` 输入框，否则用户输入会被服务端数据覆盖
- **一句话总结：** 页面加载时调 GET /api/draft 恢复草稿，loading 期间禁用输入框

---

### T-306~308 — 语音输入（OpenAI Whisper）

- **学到的核心概念：** `MediaRecorder` API——浏览器原生录音，收集音频 chunks；Whisper API——OpenAI 的语音转文字服务，自动识别语言，中英文混说都支持，带标点
- **用到的关键 API/函数：** `navigator.mediaDevices.getUserMedia()`、`MediaRecorder`、`openai.audio.transcriptions.create()`
- **容易踩的坑：** Hydration 错误——`isSupported` 必须在 `useEffect` 里设置，不能在 render 时直接读 `window`，因为服务端没有 window；OpenAI 初始化不能放模块顶层，会在 build 时报"Missing credentials"
- **行业常用模式：** "录完再发"（和 Web Speech API 实时出字不同）——用户松开按钮后发一整段音频，1-2 秒后返回完整文字，准确率更高
- **一句话总结：** 用 MediaRecorder 录音，发给 Whisper API 转文字，自动识别语言无需手动切换
