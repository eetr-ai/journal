import { NextResponse, type NextRequest } from "next/server";
import { isLocale, locales, negotiate } from "@/i18n/config";

// Every page lives under /{locale}. This sends a bare path to the right one,
// preferring a locale the visitor has already chosen over what their browser
// asks for, so switching language sticks across navigations.
export function middleware(request: NextRequest) {
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
  // Everything except the API routes, Next's own assets, and files with an
  // extension. /api/auth in particular must never be rewritten: Auth.js builds
  // its callback URLs without a locale and the OAuth round trip would break.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

export const runtime = "nodejs";
