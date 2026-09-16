import { NextResponse } from "next/server";
import { currentProfile } from "@/features/profile/service";
import { mirrorProfile } from "@/features/profile/mirror";

// Relative, so nothing here has to work out what this app is called from the
// outside. Behind a gateway the request's own URL is the one it arrived on
// internally, and a redirect built from it sends the browser to a host only the
// cluster can reach.
function to(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

/**
 * Where a sign-in lands, before anything of the app has rendered.
 *
 * Signing in settles whose browser this is, so the profile is adopted whole
 * rather than deferred to: a language cookie already here was left by whoever
 * used this browser last, which on a device this person has never opened is
 * nobody. The profile is the only thing that knows what they chose.
 *
 * Under /api because the proxy leaves those paths alone, and a landing that
 * carried a locale would be deciding the very thing it is here to look up.
 */
export async function GET() {
  const profile = await currentProfile();

  // Signed out, or a session carrying no subject. The root lets the proxy and
  // the sign-in page settle which of those it was.
  if (!profile) {
    return to("/");
  }

  const response = to(`/${profile.config.language}`);

  mirrorProfile(response.cookies, profile.config);

  return response;
}
