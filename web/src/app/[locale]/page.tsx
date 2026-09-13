import { notFound, redirect } from "next/navigation";
import AppShell from "@/features/shell/components/app_shell";
import { auth } from "@/auth";
import { currentProfile } from "@/features/profile/service";
import { vaultGate } from "@/features/vault/gate";
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

  // Signing in settles who you are and nothing else. Writing is encrypted or it
  // does not happen, so a vault is made and opened before any of this renders.
  const gate = await vaultGate();

  if (gate !== "open") {
    redirect(`/${locale}/${gate}`);
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
