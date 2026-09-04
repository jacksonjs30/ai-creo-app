import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ReferralSync } from "@/components/ReferralSync";

export const metadata: Metadata = {
  title: "MarketingSpace | AI Marketing Engine",
  description: "Avatar to Advertisement: Автоматическая генерация рекламных креативов на основе JTBD и психологии аудитории",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body suppressHydrationWarning>
        <ReferralSync />
        {children}
      </body>
    </html>
  );
}
