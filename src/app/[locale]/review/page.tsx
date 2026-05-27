import AppNav from "@/components/layout/AppNav";
import ReviewContent from "./ReviewContent";

export default function ReviewPage() {
  const dateKey = new Date().toISOString().slice(0, 10);
  return (
    <div className="min-h-screen bg-[#FDFAF6]">
      <AppNav />
      <main className="max-w-[1080px] mx-auto px-8 py-12">
        <ReviewContent dateKey={dateKey} />
      </main>
    </div>
  );
}
