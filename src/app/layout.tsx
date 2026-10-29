import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk tgt la",
  description: "香港人一齊傾偈",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
