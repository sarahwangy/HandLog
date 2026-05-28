import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // API 路由完全跳过（包括 /api/auth/callback/google），不能走 intl 处理
  if (pathname.startsWith("/api")) return NextResponse.next();

  // 登录页直接走 intl（需要 locale 前缀）
  if (pathname.includes("/login")) return intlMiddleware(req);

  // 检查是否已登录
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET });
  if (!token) {
    // 未登录跳转到登录页，保留当前 URL 作为 callbackUrl
    const loginUrl = new URL("/en/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录正常走 next-intl 路由
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
