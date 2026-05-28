"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/en/capture";

  return (
    <div className="min-h-screen bg-[#FDFAF6] flex">
      {/* 左侧装饰区 */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-[#F5EDE0] p-12 flex-shrink-0">
        <p className="text-[22px] font-bold text-[#C4783A]">✍ HandLog</p>

        {/* 中间装饰文字 */}
        <div>
          <p className="text-[13px] text-[#C4A98A] uppercase tracking-[2px] mb-4">Every day worth remembering</p>
          <h2 className="text-[32px] font-semibold text-[#2C1F14] leading-[1.4] mb-6">
            Turn daily moments<br />into growth insights
          </h2>
          {/* 模拟日记卡片装饰 */}
          <div className="space-y-3">
            {[
              { date: "5.25", color: "#FAE8E8", text: "Saw my own potential in someone else's story." },
              { date: "5.24", color: "#E8F0E8", text: "Gave myself a quiet hour — worth it." },
              { date: "5.23", color: "#EDE8F5", text: "Tired, but being present was the answer." },
            ].map((card) => (
              <div key={card.date} className="flex items-center gap-3 rounded-[12px] overflow-hidden bg-white shadow-sm">
                <div className="w-[56px] h-[56px] flex items-center justify-center flex-shrink-0 font-serif italic text-[16px]"
                  style={{ backgroundColor: card.color, color: "#8B6B4A" }}>
                  {card.date}
                </div>
                <p className="text-[12px] text-[#4A3324] pr-3 line-clamp-1">{card.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-[#C4A98A]">AI Review · Mood Tracking · Growth Insights</p>
      </div>

      {/* 右侧登录区 */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-[360px]">
          {/* 移动端 Logo */}
          <p className="text-[24px] font-bold text-[#C4783A] mb-1 lg:hidden">✍ HandLog</p>

          <h1 className="text-[26px] font-semibold text-[#2C1F14] mb-2">Welcome back</h1>
          <p className="text-[14px] text-[#8B6B4A] mb-10">Sign in to view your journal reviews</p>

          {/* Google 登录按钮 */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 h-[52px] px-6 bg-white border border-[#E4D4C0] rounded-[12px] text-[15px] text-[#2C1F14] font-medium hover:bg-[#FAF5EE] hover:border-[#C4A98A] hover:shadow-md transition-all shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <p className="text-center text-[12px] text-[#C4A98A] mt-8">
            Access limited to authorized accounts
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
