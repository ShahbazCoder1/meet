import { twCss } from "@/lib/tailwind-classes";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "meet. - Make room to connect",
  description: "A little space to connect. Meet, plan, and make room for good conversations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={twCss("h-full antialiased")}>
      <body className={twCss("m-0 min-h-full flex flex-col bg-[#171718] text-[#edeae5] text-[14px] [font-family:Arial,Helvetica,sans-serif] [--ink:#edeae5] [--muted:#8d8a89] [--faint:#696765] [--bg:#171718] [--panel:#1e1e20] [--line:#303033] [--coral:#f18e75] [--color-background:var(--bg)] [--color-foreground:var(--ink)] [&_*]:box-border [&_button]:cursor-pointer")}>{children}</body>
    </html>
  );
}

