import { GithubLogoIcon, SignOutIcon } from "@phosphor-icons/react/dist/ssr";
import { auth, signIn, signOut } from "@/auth";
import LanguagePicker from "@/components/language_picker";
import { dictionary, format } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

const ICON_SIZE = 18;

export interface HomeOptions {
  params: Promise<{ locale: string }>;
}

// Sign in, sign out, switch language. The bootstrap stops here on purpose: it
// proves auth reaches Postgres and the dictionaries resolve, and nothing else.
export default async function Home(options: HomeOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = dictionary(locale);
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{t.appName}</h1>
        <LanguagePicker current={locale} label={t.language} />
      </div>

      {session?.user ? (
        <>
          <p className="text-sm opacity-70">
            {format(t.signedInAs, { name: session.user.name ?? session.user.email ?? "" })}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: `/${locale}` });
            }}
          >
            <button className="flex items-center gap-2 rounded border px-4 py-2" type="submit">
              <SignOutIcon size={ICON_SIZE} />
              {t.signOut}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm opacity-70">{t.signIn.prompt}</p>
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: `/${locale}` });
            }}
          >
            <button className="flex items-center gap-2 rounded border px-4 py-2" type="submit">
              <GithubLogoIcon size={ICON_SIZE} />
              {t.signIn.github}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
