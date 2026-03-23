import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-zinc-950 text-zinc-50">
          {children}
        </div>
      </body>
    </html>
  );
}
