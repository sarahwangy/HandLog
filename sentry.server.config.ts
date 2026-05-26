import * as Sentry from "@sentry/nextjs";

// 服务器端 Sentry 初始化（API routes、Server Components 里的错误）
// 服务器端不需要 session replay，所以配置更简单
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  enabled: process.env.NODE_ENV === "production",
});
