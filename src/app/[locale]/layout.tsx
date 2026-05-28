import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import AuthProvider from "@/components/layout/AuthProvider";

// 这个 layout 包住所有带语言前缀的页面（/zh/...、/en/...）
// 作用：把当前语言的翻译文字注入给所有子页面
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  // 如果 URL 里的语言不在支持列表里，返回 404
  if (!routing.locales.includes(locale as "zh" | "en")) {
    notFound();
  }

  // 加载对应语言的翻译文件（messages/zh.json 或 messages/en.json）
  const messages = await getMessages();

  return (
    <AuthProvider>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </AuthProvider>
  );
}
