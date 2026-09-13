import { notFound, redirect } from "next/navigation";
import AppShell from "@/features/shell/components/app_shell";
import { auth } from "@/auth";
import { currentProfile } from "@/features/profile/service";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

export interface HomeOptions {
  params: Promise<{ locale: string }>;
}

export default async function Home(options: HomeOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  const profile = await currentProfile();

  if (!profile) {
    redirect(`/${locale}/signin`);
  }

  const session = await auth();

  return (
    <AppShell
      hasImage={Boolean(session?.user?.image)}
      locale={locale}
      profile={profile}
      t={dictionary(locale)}
    />
  );
}
