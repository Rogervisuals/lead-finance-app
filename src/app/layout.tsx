import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getThemeBootstrapInlineScript } from "@/lib/theme";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react"; // optional maar aanrader
import "./globals.css";
import "./theme-light.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lead Finance Dashboard",
  description: "Freelancer finance dashboard (Next.js + Supabase)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeBootstrapInlineScript() }}
        />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-zinc-950 text-zinc-50">
          {children}
        </div>

        {/* 👇 BELANGRIJK: onderaan body zetten */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}