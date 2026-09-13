import { notFound, redirect } from "next/navigation";
import AppShell from "@/features/shell/components/app_shell";
import { auth } from "@/auth";
import { currentProfile } from "@/features/profile/service";
import { currentVault } from "@/features/vault/service";
import VaultGuard from "@/features/vault/components/vault_guard";
import { vaultIsOpen } from "@/features/vault/gate";
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

  // Signing in is not enough to read anything: a vault that exists has to be
  // opened in this browser first.
  if (!(await vaultIsOpen())) {
    redirect(`/${locale}/unlock`);
  }

  const session = await auth();
  const vault = await currentVault();

  return (
    <>
      {/* Only here: settings renders the shell too, and has to stay reachable
          while the vault is locked — it is where you unlock it. */}
      <VaultGuard hasVault={Boolean(vault.vault)} locale={locale} subject={profile.subject} />
      <AppShell
        hasImage={Boolean(session?.user?.image)}
        locale={locale}
        profile={profile}
        t={dictionary(locale)}
      />
    </>
  );
}
