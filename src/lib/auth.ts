import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// 只允许这个邮箱登录，其他账号一律拒绝
const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL ?? "").trim();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  callbacks: {
    // 登录时检查邮箱白名单
    async signIn({ user }) {
      return user.email === ALLOWED_EMAIL;
    },

    async session({ session, token }) {
      session.userId = token.sub as string;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

// Internal Integration：从环境变量读 Notion token
export function getNotionTokenInternal(): string {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN is not set in environment variables");
  return token;
}

export function getNotionDatabaseId(): string {
  const id = process.env.NOTION_DATABASE_ID;
  if (!id) throw new Error("NOTION_DATABASE_ID is not set in environment variables");
  return id;
}
