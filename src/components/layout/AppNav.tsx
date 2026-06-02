"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession, signOut } from "next-auth/react";

export default function AppNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const { data: session } = useSession();
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "?";

  const isActive = (path: string) => pathname.includes(path);

  const navItems = [
    { label: "Capture",   href: `/${locale}/capture`,   icon: "✍️" },
    { label: "Review",    href: `/${locale}/review`,    icon: "📋" },
    { label: "History",   href: `/${locale}/history`,   icon: "🗂" },
    { label: "Timeline",  href: `/${locale}/timeline`,  icon: "🗓" },
    { label: "Dashboard", href: `/${locale}/dashboard`, icon: "📊" },
    { label: "Chat",      href: `/${locale}/chat`,      icon: "💬" },
  ];

  return (
    <>
      {/* ── 顶部导航（桌面 + 手机共用，手机上隐藏导航链接） ── */}
      <nav className="bg-[#FDFAF6] border-b border-[#E4D4C0] h-[56px] flex items-center px-4 sm:px-8 sticky top-0 z-50">
        {/* Logo */}
        <Link
          href={`/${locale}/capture`}
          className="text-[18px] font-bold text-[#C4783A] flex-shrink-0"
          style={{ letterSpacing: "-0.3px" }}
        >
          ✍ HandLog
        </Link>

        {/* 桌面导航链接（手机隐藏） */}
        <div className="hidden sm:flex gap-8 flex-1 justify-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[15px] font-semibold transition-colors pb-[3px] ${
                isActive(item.href.split("/").pop() || "")
                  ? "text-[#2C1F14] border-b-2 border-[#C4783A]"
                  : "text-[#8B6B4A] hover:text-[#2C1F14]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* 右侧：用户头像 + Sign out */}
        <div className="flex items-center gap-2 ml-auto">
          <div
            className="w-[30px] h-[30px] rounded-full bg-[#C4783A] flex items-center justify-center text-white text-sm font-semibold"
            title={session?.user?.name ?? ""}
          >
            {initial}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="hidden sm:block text-[13px] text-[#8B6B4A] px-3 py-1 rounded-full border border-transparent hover:border-[#E4D4C0] hover:bg-[#FAF5EE] hover:text-[#2C1F14] transition-all"
          >
            SignOut
          </button>
        </div>
      </nav>

      {/* ── 手机底部 Tab Bar ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FDFAF6] border-t border-[#E4D4C0] flex">
        {navItems.map((item) => {
          const active = isActive(item.href.split("/").pop() || "");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-[2px]"
            >
              <span className="text-[20px] leading-none">{item.icon}</span>
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-[#C4783A]" : "text-[#8B6B4A]"
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[24px] h-[2px] bg-[#C4783A] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 手机底部 Tab Bar 占位（防止内容被遮住） */}
      <div className="sm:hidden h-[60px]" aria-hidden />
    </>
  );
}
