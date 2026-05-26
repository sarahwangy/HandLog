import AppNav from "@/components/layout/AppNav";
import CaptureForm from "./CaptureForm";

// capture 页面：用户输入日记的主界面
// 对照 ui-mockup.html 的 #capture 部分
export default function CapturePage() {
  // 获取今天的日期，用于显示在页面标题
  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      <AppNav />
      <main className="max-w-5xl mx-auto px-10 py-8 grid grid-cols-[1fr_300px] gap-8">
        <CaptureForm today={today} />
        <CapturePanel />
      </main>
    </div>
  );
}

// 右侧面板（提示 + 草稿历史）——静态内容，不需要客户端交互
function CapturePanel() {
  return (
    <div className="space-y-5">
      {/* 语言切换 */}
      <div className="bg-[#F5EFE4] rounded-xl p-3 border border-[rgba(139,107,74,0.2)] flex gap-2 items-center">
        <span className="text-xs text-[#8B6B4A]">语言：</span>
        <button className="px-3 py-1 rounded-full text-xs bg-[#2C1F14] text-[#FAF6F0]">
          中文
        </button>
        <button className="px-3 py-1 rounded-full text-xs text-[#8B6B4A]">
          English
        </button>
      </div>

      {/* 输入提示 */}
      <div className="bg-[#F5EFE4] rounded-xl p-5 border border-[rgba(139,107,74,0.2)]">
        <h4 className="text-[#8B6B4A] mb-3 text-base" style={{ fontFamily: "cursive" }}>
          💡 输入小贴士
        </h4>
        <ul className="space-y-2">
          {[
            "说人名，AI 会自动更新你的人物卡",
            "提到孩子的成长，会自动记录月龄",
            "提到身体不适，会记录到健康日志",
            "不需要精简，越真实越好 🌱",
          ].map((tip) => (
            <li key={tip} className="text-xs text-[#8B6B4A] leading-relaxed pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-[#C4907A]">
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* 近期草稿 */}
      <div className="bg-white rounded-xl p-5 border border-[rgba(139,107,74,0.2)] shadow-sm">
        <div className="text-[#8B6B4A] mb-3 text-base" style={{ fontFamily: "cursive" }}>
          📂 近期草稿
        </div>
        <div className="text-xs text-[#2C1F14] py-2 border-b border-[rgba(139,107,74,0.1)]">
          昨天 · 已提交 ✓
        </div>
        <div className="text-xs text-[#2C1F14] py-2 border-b border-[rgba(139,107,74,0.1)]">
          前天 · 已提交 ✓
        </div>
        <div className="text-xs text-[#C4907A] py-2">
          三天前 · 草稿未完成
        </div>
      </div>
    </div>
  );
}
