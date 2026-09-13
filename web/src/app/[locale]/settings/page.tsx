import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import SettingsForm from "@/features/profile/components/settings_form";
import { currentProfile } from "@/features/profile/service";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface SettingsOptions {
  params: Promise<{ locale: string }>;
}

export default async function Settings(options: SettingsOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  const profile = await currentProfile();

  if (!profile) {
    redirect(`/${locale}/signin`);
  }

  const t = dictionary(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <Link
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
        href={`/${locale}`}
      >
        <ArrowLeftIcon size={ICON_SIZE} weight="bold" />
        {t.backToJournal}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">{t.profile.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.profile.subtitle}</p>
      </header>

      <SettingsForm locale={locale} profile={profile} t={t} />
    </main>
  );
}
