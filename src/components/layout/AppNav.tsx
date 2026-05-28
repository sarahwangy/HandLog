"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession, signOut } from "next-auth/react";

// 顶部导航栏组件——所有登录后的页面共用
// 对照 ui-mockup.html 的 .app-nav 样式
export default function AppNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const { data: session } = useSession();
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "?";

  // 判断当前路径是否匹配某个 tab，用于高亮显示
  const isActive = (path: string) => pathname.includes(path);

  const navItems = [
    { label: "Capture",   href: `/${locale}/capture` },
    { label: "Review",    href: `/${locale}/review` },
    { label: "Timeline",  href: `/${locale}/timeline` },
    { label: "Dashboard", href: `/${locale}/dashboard` },
  ];

  return (
    <nav className="bg-[#FDFAF6] border-b border-[#E4D4C0] h-[72px] flex items-center px-8 sticky top-0 z-50">
      {/* Logo */}
      <Link
        href={`/${locale}/capture`}
        className="text-[20px] font-bold text-[#C4783A] flex-shrink-0"
        style={{ fontFamily: "inherit", letterSpacing: "-0.3px" }}
      >
        ✍ HandLog
      </Link>

      {/* 导航链接居中 */}
      <div className="flex gap-8 flex-1 justify-center">
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
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-[32px] h-[32px] rounded-full bg-[#C4783A] flex items-center justify-center text-white text-sm font-semibold"
          title={session?.user?.name ?? ""}>
          {initial}
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
          className="text-[13px] text-[#8B6B4A] px-3 py-1 rounded-full border border-transparent hover:border-[#E4D4C0] hover:bg-[#FAF5EE] hover:text-[#2C1F14] active:bg-[#F0E8DC] transition-all"
        >
          SignOut
        </button>
      </div>
    </nav>
  );
}
