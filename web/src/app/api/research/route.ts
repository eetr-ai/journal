import { admit, postedJson } from "@/features/vault/admit";
import { research } from "@/features/research/service";

/**
 * A quote or song looked up for the editor.
 *
 * A route handler rather than a server action: actions are dispatched one at a
 * time, so a search that takes most of a minute would hold every save behind
 * it. Here the browser can also abandon it.
 *
 * Every outcome answers 200 with the outcome as its body; only a refusal does not.
 */

// A kind, a query capped well under this, and a locale.
const MAX_BODY_BYTES = 2048;
const TOO_LARGE = 413;
const BAD_REQUEST = 400;

export async function POST(request: Request): Promise<Response> {
  const admitted = await admit(request);

  if ("refused" in admitted) {
    return admitted.refused;
  }

  const posted = await postedJson(request, MAX_BODY_BYTES);

  if (posted === "tooLarge") {
    return new Response(null, { status: TOO_LARGE });
  }

  if (!posted || typeof posted !== "object") {
    return new Response(null, { status: BAD_REQUEST });
  }

  const ask = posted as Record<string, unknown>;

  return Response.json(await research(ask.kind, ask.query, ask.locale));
}
