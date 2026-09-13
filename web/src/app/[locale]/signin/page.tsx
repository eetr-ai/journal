import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import AuthErrorNotice from "@/features/auth/components/auth_error_notice";
import LanguagePicker from "@/components/language_picker";
import { PROVIDER_ID, auth, signIn } from "@/auth";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { toAuthErrorCode } from "@/features/auth/errors";

const ICON_SIZE = 18;
const MASCOT_SIZE = 200;

export interface SignInOptions {
  params: Promise<{ locale: string }>;
  // Auth.js sends a failure whose kind is `signIn` back here rather than to the
  // error page, so this is where most of them surface.
  searchParams: Promise<{ error?: string }>;
}

export default async function SignIn(options: SignInOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  const session = await auth();

  // Not `session?.user`: a session carrying no subject identifies nobody, and
  // sending it onward only starts a loop with the pages that need one.
  if (session?.user?.subject) {
    redirect(`/${locale}`);
  }

  const t = dictionary(locale);
  const { error } = await options.searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="absolute right-6 top-6">
        <LanguagePicker current={locale} label={t.language} />
      </div>

      <Image
        alt=""
        className="drop-shadow-sm"
        height={MASCOT_SIZE}
        priority
        src="/mascot.png"
        width={MASCOT_SIZE}
      />

      <div className="text-center">
        <h1 className="text-3xl font-semibold">{t.signIn.title}</h1>
        <p className="mt-2 text-lg text-brand-strong dark:text-brand">{t.signIn.tagline}</p>
      </div>

      {error && <AuthErrorNotice code={toAuthErrorCode(error)} t={t} />}

      <form
        action={async () => {
          "use server";
          await signIn(PROVIDER_ID, { redirectTo: `/${locale}` });
        }}
      >
        <button
          className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-medium text-on-brand transition hover:bg-brand-strong"
          type="submit"
        >
          {error ? t.errors.signIn.retry : t.signIn.action}
          <ArrowRightIcon size={ICON_SIZE} weight="bold" />
        </button>
      </form>
    </main>
  );
}
