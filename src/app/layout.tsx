import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk tgt la",
  description: "香港人一齊傾偈",
};

const themeBoot = `(function(){try{var k='talktgtla-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}
