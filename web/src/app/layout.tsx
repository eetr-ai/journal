import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { BACKGROUND_DARK, BACKGROUND_LIGHT, THEME_COOKIE, THEME_SCRIPT } from "@/theme/config";
import { requestLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eetr Journal",
  description: "A quiet place to think out loud.",
  // An installed copy gets its own status bar, which `default` keeps legible
  // against either palette.
  appleWebApp: { capable: true, title: "Journal", statusBarStyle: "default" },
};

/**
 * Deliberately no `maximumScale` or `userScalable`: pinch-zoom is how someone
 * reads a page whose text is too small for them, and taking it away to stop an
 * input zooming is fixing the wrong thing.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The shell paints its own background to the edges, so the notch and the home
  // indicator are ours to pad around rather than the browser's to letterbox.
  viewportFit: "cover",
  // Shrinks the layout viewport with the soft keyboard, which is what keeps the
  // composer above it instead of behind it.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BACKGROUND_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: BACKGROUND_DARK },
  ],
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
