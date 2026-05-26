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
