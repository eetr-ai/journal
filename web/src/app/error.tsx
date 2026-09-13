"use client";

import { usePathname } from "next/navigation";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { dictionary } from "@/i18n/dictionaries";
import { defaultLocale, isLocale } from "@/i18n/config";

const ICON_SIZE = 32;
const LOCALE_SEGMENT = 1;

export interface ErrorPageOptions {
  error: Error & { digest?: string };
  reset: () => void;
}

// The render-time error boundary. It runs in the browser, where the only thing
// that still knows the language is the path.
export default function ErrorPage(options: ErrorPageOptions) {
  const segment = usePathname().split("/")[LOCALE_SEGMENT] ?? "";
  const t = dictionary(isLocale(segment) ? segment : defaultLocale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-accent">
        <WarningCircleIcon size={ICON_SIZE} weight="fill" />
      </span>
      <h1 className="text-xl font-semibold">{t.errors.title}</h1>
      <p className="max-w-sm text-sm text-muted">{t.errors.body}</p>
      <button
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand"
        onClick={options.reset}
        type="button"
      >
        {t.errors.retry}
      </button>
    </main>
  );
}
