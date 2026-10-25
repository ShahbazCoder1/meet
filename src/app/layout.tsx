import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "meet. — Make room to connect",
  description: "A little space to connect. Meet, plan, and make room for good conversations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

