import * as Sentry from "@sentry/nextjs";

// 浏览器端 Sentry 初始化
// 只在生产环境启用，本地开发时 enabled: false 不会发送任何数据
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,        // 追踪 100% 的请求性能（生产环境可调低）
  replaysOnErrorSampleRate: 1.0, // 出错时回放用户操作（帮助复现 bug）
  replaysSessionSampleRate: 0.1, // 随机抽 10% 的会话做回放
  enabled: process.env.NODE_ENV === "production",
});
