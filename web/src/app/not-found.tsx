import Link from "next/link";
import { CompassIcon } from "@phosphor-icons/react/dist/ssr";
import { dictionary } from "@/i18n/dictionaries";
import { requestLocale } from "@/i18n/server";

const ICON_SIZE = 32;

export default async function NotFound() {
  const locale = await requestLocale();
  const t = dictionary(locale);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-muted">
        <CompassIcon size={ICON_SIZE} weight="fill" />
      </span>
      <h1 className="text-xl font-semibold">{t.errors.notFoundTitle}</h1>
      <p className="max-w-sm text-sm text-muted">{t.errors.notFoundBody}</p>
      <Link
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand"
        href={`/${locale}`}
      >
        {t.errors.home}
      </Link>
    </main>
  );
}
