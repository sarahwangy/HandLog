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
    <div className="min-h-screen bg-[#FDFAF6]">
      <AppNav />
      <main className="max-w-[1080px] mx-auto px-8 py-12 grid grid-cols-[1fr_340px] gap-10">
        <CaptureForm today={today} dateKey={dateKey} />
        <CapturePanel />
      </main>
    </div>
  );
}

function CapturePanel() {
  return (
    <div className="space-y-4">
      {/* Writing tips */}
      <div className="bg-[#FDFAF6] rounded-[14px] p-5 border border-[#E4D4C0] shadow-[rgba(80,40,10,0.03)_0_0_0_1px,rgba(80,40,10,0.05)_0_2px_6px,rgba(80,40,10,0.08)_0_4px_12px]">
        <h4 className="text-[15px] font-semibold text-[#2C1F14] mb-3">💡 Writing tips</h4>
        <ul className="space-y-1">
          {[
            "Mention people by name — AI will note them",
            "Talk about parenting moments — milestones get recorded",
            "Mention health symptoms — logged automatically",
            "No need to edit — the messier the better 🌿",
          ].map((tip) => (
            <li key={tip} className="text-[13px] text-[#4A3324] leading-relaxed py-[6px] border-b border-[#EDE3D8] last:border-0 flex gap-2">
              <span className="text-[#C4783A] flex-shrink-0">·</span>{tip}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
