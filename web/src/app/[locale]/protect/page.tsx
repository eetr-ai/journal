import { notFound, redirect } from "next/navigation";
import ProtectScreen from "@/features/vault/components/protect_screen";
import SignOutButton from "@/features/auth/components/sign_out_button";
import { currentProfile } from "@/features/profile/service";
import { vaultGate } from "@/features/vault/gate";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

export interface ProtectOptions {
  params: Promise<{ locale: string }>;
}

export default async function Protect(options: ProtectOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  const profile = await currentProfile();

  if (!profile) {
    redirect(`/${locale}/signin`);
  }

  const gate = await vaultGate();

  if (gate !== "protect") {
    redirect(gate === "unlock" ? `/${locale}/unlock` : `/${locale}`);
  }

  const t = dictionary(locale);

  return (
    <ProtectScreen
      identity={{ subject: profile.subject, name: profile.name, email: profile.email }}
      locale={locale}
      t={t}
      signOut={<SignOutButton label={t.signOut} locale={locale} />}
    />
  );
}
