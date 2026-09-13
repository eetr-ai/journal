import { notFound, redirect } from "next/navigation";
import UnlockScreen from "@/features/vault/components/unlock_screen";
import { currentProfile } from "@/features/profile/service";
import { currentVault } from "@/features/vault/service";
import { vaultIsOpen } from "@/features/vault/gate";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

export interface UnlockOptions {
  params: Promise<{ locale: string }>;
}

export default async function Unlock(options: UnlockOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  const profile = await currentProfile();

  if (!profile) {
    redirect(`/${locale}/signin`);
  }

  const stored = await currentVault();

  // Nothing to unlock, or already open. Either way this page has no job.
  if (!stored.vault || (await vaultIsOpen())) {
    redirect(`/${locale}`);
  }

  return (
    <UnlockScreen
      identity={{ subject: profile.subject, name: profile.name, email: profile.email }}
      locale={locale}
      stored={stored}
      t={dictionary(locale)}
    />
  );
}
