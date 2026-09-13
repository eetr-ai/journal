import type { Metadata } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, THEME_SCRIPT } from "@/theme/config";
import { requestLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eetr Journal",
  description: "A quiet place to think out loud.",
};

export interface RootLayoutOptions {
  children: React.ReactNode;
}

/**
 * The one layout that owns <html>. It sits above [locale] so that a path no
 * page matched still renders inside the app's shell rather than Next's own.
 */
export default async function RootLayout(options: RootLayoutOptions) {
  const locale = await requestLocale();
  const theme = (await cookies()).get(THEME_COOKIE)?.value;

  return (
    <html className={theme === "dark" ? "dark" : undefined} lang={locale} suppressHydrationWarning>
      <head>
        {/* Resolves "match my system" before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased">{options.children}</body>
    </html>
  );
}
