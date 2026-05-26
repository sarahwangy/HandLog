import { NextAuthOptions, getServerSession } from "next-auth";
import { kv } from "@vercel/kv";

// ── Notion OAuth Provider 配置 ──────────────────────
// NextAuth 支持很多第三方登录（GitHub、Google 等），
// Notion 没有内置，所以我们用 "custom provider" 自己配置
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "notion",
      name: "Notion",
      type: "oauth",
      // Notion OAuth 的两个核心 URL：
      // authorization = 用户点登录后跳转去哪里
      // token = 用户授权后，我们用什么 URL 换 access token
      authorization: {
        url: "https://api.notion.com/v1/oauth/authorize",
        params: {
          client_id: process.env.NOTION_CLIENT_ID,
          response_type: "code",
          owner: "user", // 代表用户本人授权，不是 bot
        },
      },
      token: "https://api.notion.com/v1/oauth/token",
      // Notion 用 Basic Auth（client_id:client_secret 的 Base64 编码）
      // 而不是普通的 body 参数，这是 Notion 的特殊要求
      userinfo: {
        url: "https://api.notion.com/v1/users/me",
        async request({ tokens }) {
          const res = await fetch("https://api.notion.com/v1/users/me", {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              "Notion-Version": "2022-06-28",
            },
          });
          return res.json();
        },
      },
      // 从 Notion 返回的用户信息里提取我们需要的字段
      profile(profile) {
        return {
          id: profile.bot?.owner?.user?.id ?? profile.id,
          name: profile.bot?.owner?.user?.name ?? profile.name,
          email: profile.bot?.owner?.user?.person?.email ?? null,
          image: profile.bot?.owner?.user?.avatar_url ?? null,
        };
      },
      clientId: process.env.NOTION_CLIENT_ID,
      clientSecret: process.env.NOTION_CLIENT_SECRET,
    },
  ],

  // ── Callbacks：登录流程的各个钩子 ──────────────────
  callbacks: {
    // jwt callback：每次生成/更新 JWT token 时触发
    // 我们把 Notion access token 存进 JWT，方便后续调用 Notion API
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.notionAccessToken = account.access_token;

        // 同时把 token 存一份到 KV，key 按 userId 隔离
        // 这样服务端 API route 也能拿到，不只是前端 session
        if (token.sub) {
          await kv.set(
            `notion_token:${token.sub}`,
            account.access_token,
            { ex: 60 * 60 * 24 * 30 } // 30 天过期
          );
        }
      }
      return token;
    },

    // session callback：前端调用 useSession() 时返回的数据
    // 我们把 userId 和 notionAccessToken 暴露给前端
    async session({ session, token }) {
      session.userId = token.sub as string;
      session.notionAccessToken = token.notionAccessToken as string;
      return session;
    },
  },

  // ── 自定义页面 ──────────────────────────────────────
  pages: {
    signIn: "/onboarding", // 未登录时跳转到我们的 onboarding 页面
    error: "/onboarding",  // 登录出错时也跳转到 onboarding
  },

  // session 用 JWT 方式存储（不需要数据库存 session）
  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

// ── 工具函数：在 Server Component / API route 里获取当前用户 ──
// 行业常见模式：封装一层，不用每次都传 authOptions
export async function getAuthSession() {
  return getServerSession(authOptions);
}

// ── 工具函数：从 KV 获取用户的 Notion access token ──
export async function getNotionToken(userId: string): Promise<string | null> {
  return kv.get<string>(`notion_token:${userId}`);
}
