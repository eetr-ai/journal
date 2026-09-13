import { notFound, redirect } from "next/navigation";
import UnlockScreen from "@/features/vault/components/unlock_screen";
import SignOutButton from "@/features/auth/components/sign_out_button";
import { currentProfile } from "@/features/profile/service";
import { currentVault } from "@/features/vault/service";
import { vaultGate } from "@/features/vault/gate";
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

  const gate = await vaultGate();

  if (gate !== "unlock") {
    redirect(gate === "protect" ? `/${locale}/protect` : `/${locale}`);
  }

  const stored = await currentVault();

  const t = dictionary(locale);

  return (
    <>
      {/* These screens come before the app, so the menu that normally
          carries this is not on them. Being unable to leave is a trap. */}
      <div className="absolute right-6 top-6">
        <SignOutButton label={t.signOut} locale={locale} />
      </div>
      <UnlockScreen
        identity={{ subject: profile.subject, name: profile.name, email: profile.email }}
        locale={locale}
        passkeys={stored.passkeys}
        t={t}
        vault={stored.vault!}
      />
    </>
  );
}
