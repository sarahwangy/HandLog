import { redirect } from "next/navigation";

// 临时占位页：访问 /zh 或 /en 时直接跳到 capture 页面
// 等 E9 Landing 页做完后，这里会改成真正的 Landing 页
export default function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/capture`);
}
