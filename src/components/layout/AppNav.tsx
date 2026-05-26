"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

// 顶部导航栏组件——所有登录后的页面共用
// 对照 ui-mockup.html 的 .app-nav 样式
export default function AppNav() {
  const pathname = usePathname();
  const locale = useLocale();

  // 判断当前路径是否匹配某个 tab，用于高亮显示
  const isActive = (path: string) => pathname.includes(path);

  const navItems = [
    { label: locale === "zh" ? "记录" : "Capture", href: `/${locale}/capture` },
    { label: locale === "zh" ? "时间轴" : "Timeline", href: `/${locale}/timeline` },
    { label: locale === "zh" ? "看板" : "Dashboard", href: `/${locale}/dashboard` },
  ];

  return (
    <nav className="bg-[#2C1F14] h-[52px] flex items-center px-6 gap-8 sticky top-0 z-50">
      {/* Logo */}
      <Link
        href={`/${locale}/capture`}
        className="font-['Caveat',cursive] text-[22px] text-[#C4A962] tracking-wide flex-shrink-0"
        style={{ fontFamily: "cursive" }}
      >
        ✍ HandLog
      </Link>

      {/* 导航链接 */}
      <div className="flex gap-6 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm transition-colors ${
              isActive(item.href.split("/").pop() || "")
                ? "text-[#C4A962] border-b border-[#C4A962] pb-[1px]"
                : "text-[#E8D5B7] opacity-70 hover:opacity-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* 用户头像占位 */}
      <div className="w-[30px] h-[30px] rounded-full bg-[#C4907A] flex items-center justify-center text-white text-sm flex-shrink-0">
        J
      </div>
    </nav>
  );
}
