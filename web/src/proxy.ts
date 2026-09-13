import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER, isLocale, locales, negotiate } from "@/i18n/config";

/**
 * Every page lives under /{locale}. A bare path is redirected to one, taking the
 * cookie over the Accept-Language header so a chosen language sticks.
 *
 * A request that already carries a locale is passed through with it copied into
 * a header, which is how the root layout knows the language for a path no page
 * matched.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const matched = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (matched) {
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, matched);

    return NextResponse.next({ request: { headers } });
  }

  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;

  const locale =
    chosen && isLocale(chosen) ? chosen : negotiate(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next's own assets, and files with an
  // extension. /api must stay unprefixed: OAuth callback URLs carry no locale.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
