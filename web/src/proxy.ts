import { NextResponse, type NextRequest } from "next/server";
import { isLocale, locales, negotiate } from "@/i18n/config";

// Every page lives under /{locale}. A bare path is redirected to one, taking
// the cookie over the Accept-Language header so a chosen language sticks.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  const chosen = request.cookies.get("locale")?.value;

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
