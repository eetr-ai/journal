import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import "../globals.css";

export const metadata: Metadata = {
  title: "journal",
};

export interface LocaleLayoutOptions {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// The root layout. It sits under [locale] so <html lang> can be the locale that
// was actually resolved for the request.
export default async function LocaleLayout(options: LocaleLayoutOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className="antialiased">{options.children}</body>
    </html>
  );
}
