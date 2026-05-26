import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Next.js App Router 的写法：
// 把 GET 和 POST 请求都交给 NextAuth 处理
// NextAuth 会自动处理：
//   GET  /api/auth/signin       → 触发登录
//   GET  /api/auth/callback/notion → Notion 授权后的回调
//   POST /api/auth/signout      → 登出
//   GET  /api/auth/session      → 获取当前 session
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
