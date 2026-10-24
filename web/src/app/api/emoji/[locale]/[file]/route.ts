import enData from "emojibase-data/en/data.json";
import enMessages from "emojibase-data/en/messages.json";
import esData from "emojibase-data/es/data.json";
import esMessages from "emojibase-data/es/messages.json";
import { version } from "emojibase-data/package.json";

/**
 * The emoji picker's data, served from here rather than from a public CDN, so
 * opening the picker tells no third party that somebody is writing. Pinned to
 * the installed emojibase-data and to the locales the app speaks.
 */

const NOT_FOUND = 404;
const FILES: Record<string, Record<string, unknown>> = {
  en: { "data.json": enData, "messages.json": enMessages },
  es: { "data.json": esData, "messages.json": esMessages },
};
// The data only changes with the package, and every deploy can change that.
const CACHING = "public, max-age=86400";

// Typed by hand rather than with Next's generated RouteContext, which a plain
// `tsc` run has not generated.
interface EmojiRoute {
  params: Promise<{ locale: string; file: string }>;
}

function found(locale: string, file: string): unknown {
  return FILES[locale]?.[file];
}

export async function GET(_request: Request, ctx: EmojiRoute) {
  const { locale, file } = await ctx.params;
  const body = found(locale, file);

  if (body === undefined) {
    return new Response(null, { status: NOT_FOUND });
  }

  // The picker keeps its copy until this changes, which is when the package does.
  const etag = `"emojibase-${version}-${locale}-${file}"`;

  return Response.json(body, { headers: { "Cache-Control": CACHING, ETag: etag } });
}

// Asked before the data, to see whether a cached copy is still current.
export async function HEAD(request: Request, ctx: EmojiRoute) {
  const answer = await GET(request, ctx);

  return new Response(null, { status: answer.status, headers: answer.headers });
}
