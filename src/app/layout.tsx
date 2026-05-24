import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
