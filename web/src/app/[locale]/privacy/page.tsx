import { notFound, redirect } from "next/navigation";
import AppShell from "@/features/shell/components/app_shell";
import VaultOverlay from "@/features/vault/components/vault_overlay";
import { auth } from "@/auth";
import { currentProfile } from "@/features/profile/service";
import { currentVault } from "@/features/vault/service";
import { vaultGate } from "@/features/vault/gate";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

export interface PrivacyOptions {
  params: Promise<{ locale: string }>;
}

export default async function Privacy(options: PrivacyOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  const profile = await currentProfile();

  if (!profile) {
    redirect(`/${locale}/signin`);
  }

  const gate = await vaultGate();

  if (gate !== "open") {
    redirect(`/${locale}/${gate}`);
  }

  const session = await auth();
  const t = dictionary(locale);
  const stored = await currentVault();

  return (
    <>
      <AppShell hasImage={Boolean(session?.user?.image)} locale={locale} profile={profile} t={t} />
      <VaultOverlay
        identity={{ subject: profile.subject, name: profile.name, email: profile.email }}
        locale={locale}
        passkeys={stored.passkeys}
        t={t}
        vault={stored.vault!}
      />
    </>
  );
}
