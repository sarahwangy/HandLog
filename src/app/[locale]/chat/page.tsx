import AppNav from "@/components/layout/AppNav";
import ChatContent from "./ChatContent";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#FDFAF6]">
      <AppNav />
      <ChatContent />
    </div>
  );
}
