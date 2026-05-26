import AppNav from "@/components/layout/AppNav";
import ReviewContent from "./ReviewContent";

export default function ReviewPage() {
  const dateKey = new Date().toISOString().slice(0, 10);
  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      <AppNav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <ReviewContent dateKey={dateKey} />
      </main>
    </div>
  );
}
