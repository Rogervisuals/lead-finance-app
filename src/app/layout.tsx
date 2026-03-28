import type { Metadata, Viewport } from "next";
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

/** Ensures mobile browsers use device width and 1:1 initial scale (no implicit zoom). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeBootstrapInlineScript() }}
        />
      </head>
      <body
        className={`${inter.className} min-h-full min-w-0 overflow-x-clip bg-zinc-950 text-zinc-50 antialiased`}
      >
        <div className="min-h-screen min-w-0 bg-zinc-950 text-zinc-50">
          {children}
        </div>

        {/* 👇 BELANGRIJK: onderaan body zetten */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}