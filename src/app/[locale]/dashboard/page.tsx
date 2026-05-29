import AppNav from "@/components/layout/AppNav";
import DashboardContent from "./DashboardContent";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#FDFAF6]">
      <AppNav />
      <main className="max-w-[1080px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-[22px] sm:text-[26px] font-bold text-[#2C1F14] mb-1">Dashboard</h1>
        <p className="text-[14px] text-[#8B6B4A] mb-6 sm:mb-8">Your journal patterns at a glance</p>
        <DashboardContent />
      </main>
    </div>
  );
}
