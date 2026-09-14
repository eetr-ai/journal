import { notFound, redirect } from "next/navigation";
import AppShell from "@/features/shell/components/app_shell";
import { chatView } from "@/features/chat/service";
import SettingsOverlay from "@/features/profile/components/settings_overlay";
import { auth } from "@/auth";
import { currentProfile } from "@/features/profile/service";
import { vaultGate } from "@/features/vault/gate";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

export interface SettingsOptions {
  params: Promise<{ locale: string }>;
  // Which conversation is open travels in the query, so it survives a reload
  // and can be linked to.
  searchParams: Promise<{ chat?: string }>;
}

// The journal stays on screen behind the overlay, so this reads as a cover over
// where you were rather than somewhere you navigated to.
export default async function Settings(options: SettingsOptions) {
  const { locale } = await options.params;
  const { chat } = await options.searchParams;

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

  return (
    <>
      <AppShell
        hasImage={Boolean(session?.user?.image)}
        locale={locale}
        profile={profile}
        t={t}
        {...await chatView(chat)}
      />
      <SettingsOverlay locale={locale} profile={profile} t={t} />
    </>
  );
}
