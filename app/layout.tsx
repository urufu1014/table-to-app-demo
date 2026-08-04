import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "点検案件管理アプリ",
  description: "Excel・スプレッドシートで属人化した点検案件管理をWebアプリへ移行する模擬納品事例"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
