import "next-auth";
import "next-auth/jwt";

// 扩展 NextAuth 的内置类型，加入我们自定义的字段
// 不做这一步，TypeScript 会报"session 上没有 userId 属性"的错误
declare module "next-auth" {
  interface Session {
    userId: string;
    notionAccessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    notionAccessToken?: string;
  }
}
