import Link from "next/link";
import { notFound } from "next/navigation";
import AuthErrorNotice from "@/features/auth/components/auth_error_notice";
import { dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { isRetryable, toAuthErrorCode } from "@/features/auth/errors";

export interface AuthErrorOptions {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}

/**
 * Where Auth.js sends a failure it classifies as an error rather than a failed
 * sign-in attempt. A retryable one offers the button back; `Configuration` does
 * not, because nothing the person does will change the outcome.
 */
export default async function AuthError(options: AuthErrorOptions) {
  const { locale } = await options.params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = dictionary(locale);
  const code = toAuthErrorCode((await options.searchParams).error);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-8">
      <AuthErrorNotice code={code} t={t} />

      {isRetryable(code) ? (
        <Link
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand"
          href={`/${locale}/signin`}
        >
          {t.errors.signIn.retry}
        </Link>
      ) : (
        <Link className="text-sm text-muted hover:text-foreground" href={`/${locale}/signin`}>
          {t.errors.home}
        </Link>
      )}
    </main>
  );
}
