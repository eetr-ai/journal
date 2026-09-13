import { auth } from "@/auth";

const NOT_FOUND = 404;
const FIVE_MINUTES = 300;

/**
 * The signed-in person's photo, served from our own origin.
 *
 * The upstream URL is read off the session token, never off the request, so
 * this cannot be pointed at an arbitrary host. Proxying rather than linking
 * means no allow-list of image hosts to keep in step with the issuer, and the
 * browser never announces itself to whatever CDN the issuer happens to use.
 */
export async function GET() {
  const session = await auth();
  const source = session?.user?.image;

  if (!source) {
    return new Response(null, { status: NOT_FOUND });
  }

  const upstream = await fetch(source);

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: NOT_FOUND });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      // Private: this is one person's photo, and a shared cache must not hold it.
      "cache-control": `private, max-age=${FIVE_MINUTES}`,
    },
  });
}
