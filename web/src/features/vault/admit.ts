import "server-only";
import { auth } from "@/auth";
import { vaultGate } from "./gate";

/**
 * The checks every route handler that carries content runs before it reads a
 * byte of the body, and the bounded read it then does.
 */

const UNAUTHORIZED = 401;
const LOCKED = 423;
const UNSUPPORTED_MEDIA = 415;

/** Who this is, or the answer that turns them away. */
export type Admitted = { subject: string } | { refused: Response };

export async function admit(request: Request): Promise<Admitted> {
  // The session is the trust boundary. The subject never comes from the posted
  // body, which is what stops a caller writing into someone else's journal.
  const subject = (await auth())?.user?.subject;

  if (!subject) {
    return { refused: new Response(null, { status: UNAUTHORIZED }) };
  }

  // A JSON content type forces a preflight for a cross-origin caller, on top of
  // the session cookie being SameSite=Lax.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { refused: new Response(null, { status: UNSUPPORTED_MEDIA }) };
  }

  // The real gate, not the marker cookie beside it: the cookie is written by
  // client code, so trusting it alone would be a way into the app with no vault.
  if ((await vaultGate()) !== "open") {
    return { refused: new Response(null, { status: LOCKED }) };
  }

  return { subject };
}

/**
 * The posted JSON, null when it is not JSON, or "tooLarge" once more than
 * `limit` bytes have arrived. Counted as they arrive rather than trusted from
 * content-length, which a chunked request does not send.
 */
export async function postedJson(request: Request, limit: number): Promise<unknown> {
  // Refused unread when it already says it is too large.
  return Number(request.headers.get("content-length") ?? 0) > limit
    ? "tooLarge"
    : await readJson(request, limit);
}

async function readJson(request: Request, limit: number): Promise<unknown> {
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (let read = await reader?.read(); read && !read.done; read = await reader?.read()) {
    received += read.value.byteLength;

    if (received > limit) {
      await reader?.cancel();

      return "tooLarge";
    }

    chunks.push(read.value);
  }

  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    return null;
  }
}
