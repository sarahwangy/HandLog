import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// next-intl 中间件：处理语言前缀路由
// 例：访问 /capture → 自动跳转 /zh/capture（根据浏览器语言）
const intlMiddleware = createMiddleware(routing);

export default intlMiddleware;

export const config = {
  // 匹配所有页面路由，排除：
  // - api（API routes）
  // - _next（Next.js 内部文件）
  // - _vercel（Vercel 内部）
  // - 有扩展名的文件（图片、字体等静态资源）
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
