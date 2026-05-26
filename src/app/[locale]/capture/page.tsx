import AppNav from "@/components/layout/AppNav";
import CaptureForm from "./CaptureForm";

// capture 页面：用户输入日记的主界面
// 对照 ui-mockup.html 的 #capture 部分
export default function CapturePage() {
  const now = new Date();
  const today = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  // ISO date key for KV storage: "2026-05-26"
  const dateKey = now.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      <AppNav />
      <main className="max-w-5xl mx-auto px-10 py-8 grid grid-cols-[1fr_300px] gap-8">
        <CaptureForm today={today} dateKey={dateKey} />
        <CapturePanel />
      </main>
    </div>
  );
}

// 右侧面板（提示 + 草稿历史）——静态内容，不需要客户端交互
function CapturePanel() {
  return (
    <div className="space-y-5">
      {/* 输入提示 */}
      <div className="bg-[#F5EFE4] rounded-xl p-5 border border-[rgba(139,107,74,0.2)]">
        <h4 className="text-[#8B6B4A] mb-3 text-base font-serif">
          💡 Writing tips
        </h4>
        <ul className="space-y-2">
          {[
            "Mention people by name — AI will note them",
            "Talk about parenting moments — milestones get recorded",
            "Mention health symptoms — logged automatically",
            "No need to edit — the messier the better 🌱",
          ].map((tip) => (
            <li key={tip} className="text-xs text-[#8B6B4A] leading-relaxed pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-[#C4907A]">
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Recent drafts */}
      <div className="bg-white rounded-xl p-5 border border-[rgba(139,107,74,0.2)] shadow-sm">
        <div className="text-[#8B6B4A] mb-3 text-base font-serif">
          📂 Recent drafts
        </div>
        <div className="text-xs text-[#2C1F14] py-2 border-b border-[rgba(139,107,74,0.1)]">
          Yesterday · Submitted ✓
        </div>
        <div className="text-xs text-[#2C1F14] py-2 border-b border-[rgba(139,107,74,0.1)]">
          2 days ago · Submitted ✓
        </div>
        <div className="text-xs text-[#C4907A] py-2">
          3 days ago · Draft unfinished
        </div>
      </div>
    </div>
  );
}
