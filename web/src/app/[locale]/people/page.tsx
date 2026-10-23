import { notFound, redirect } from "next/navigation";
import AppShell from "@/features/shell/components/app_shell";
import { chatView } from "@/features/chat/service";
import { journalView } from "@/features/entries/service";
import { imagesView } from "@/features/images/service";
import PeopleOverlay from "@/features/people/components/people_overlay";
import { people } from "@/features/people/service";
import { auth } from "@/auth";
import { currentProfile } from "@/features/profile/service";
import { vaultGate } from "@/features/vault/gate";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

export interface PeopleOptions {
  params: Promise<{ locale: string }>;
  // Which conversation is open travels in the query, so it survives a reload
  // and can be linked to.
  searchParams: Promise<{ chat?: string; entry?: string }>;
}

// A cover over the journal, like settings: the people are sealed on the way in
// and opened in the browser under the vault's key.
export default async function People(options: PeopleOptions) {
  const { locale } = await options.params;
  const { chat, entry } = await options.searchParams;

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
        images={await imagesView()}
        journal={await journalView(entry)}
      />
      <PeopleOverlay
        locale={locale}
        people={await people()}
        subject={profile.subject}
        t={t}
        timezone={profile.config.timezone}
      />
    </>
  );
}
