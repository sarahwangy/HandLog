import AppNav from "@/components/layout/AppNav";
import HistoryContent from "./HistoryContent";

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-[#FDFAF6]">
      <AppNav />
      <main>
        <HistoryContent />
      </main>
    </div>
  );
}
