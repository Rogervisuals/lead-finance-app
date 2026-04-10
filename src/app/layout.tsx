import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { AuthCallbackHandler } from "@/components/auth/AuthCallbackHandler";
import { Footer } from "@/components/layout/Footer";
import { I18nProvider } from "@/contexts/I18nContext";
import { getHtmlLang, LOCALE_COOKIE, parseLocale } from "@/lib/i18n/locale";
import { getUi } from "@/lib/i18n/get-ui";
import { getThemeBootstrapInlineScript } from "@/lib/theme";
import { VercelObservability } from "@/components/performance/VercelObservability";
import "./globals.css";
import "./theme-light.css";

/** display: swap avoids invisible text during font load (explicit; next/font defaults to swap). */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lead Finance Dashboard",
  description: "Freelancer finance dashboard (Next.js + Supabase)",
};

/** Ensures mobile browsers use device width and 1:1 initial scale (no implicit zoom). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/** Locale from cookies() keeps this layout dynamic; no extra force-dynamic needed. */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = parseLocale(cookies().get(LOCALE_COOKIE)?.value);
  const ui = getUi(locale);

  return (
    <html lang={getHtmlLang(locale)} suppressHydrationWarning className="h-full">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeBootstrapInlineScript() }}
        />
      </head>
      <body
        className={`${inter.className} min-h-full min-w-0 overflow-x-clip bg-zinc-950 text-zinc-50 antialiased`}
      >
        <AuthCallbackHandler />
        <I18nProvider value={ui}>
          <div className="flex min-h-screen min-w-0 flex-col bg-zinc-950 text-zinc-50">
            <div className="min-w-0 flex-1">{children}</div>
            <Footer footer={ui.footer} />
          </div>
        </I18nProvider>

        <VercelObservability />
      </body>
    </html>
  );
}