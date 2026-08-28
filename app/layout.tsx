import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import PostHogProvider from "@/components/PostHogProvider";
import "@/sentry.client.config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "CurateKit — Content Curation Dashboard",
    template: "%s · CurateKit",
  },
  description:
    "The production-ready Micro-SaaS starter kit for content creators: curate news and manage short-form video scripts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
