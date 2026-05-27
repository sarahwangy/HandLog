import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Analytics } from "@vercel/analytics/react";

// Inter 是 Airbnb Cereal 最接近的开源替代字体
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "HandLog — AI Reflection Journal",
  description: "Turn everyday chaos into meaningful life reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className={cn(inter.variable, "font-[var(--font-inter)] antialiased")}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
