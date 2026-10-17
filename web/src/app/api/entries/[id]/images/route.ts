import { admit, postedJson } from "@/features/vault/admit";
import { addImage } from "@/features/images/service";
import { maxBodyBytes, pictureAddFrom } from "@/features/images/rules";

/**
 * A picture the reader pasted or picked into an entry, kept with it.
 *
 * A route handler rather than a server action, because an action's body is
 * capped well below one picture. The body carries the picture in the clear and
 * the key it is sealed under: nothing here may log it or keep it.
 */

const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const TOO_LARGE = 413;
const BAD_GATEWAY = 502;
const ONE_PICTURE = 1;

const REFUSED: Record<"missing" | "failed", number> = {
  missing: NOT_FOUND,
  failed: BAD_GATEWAY,
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const admitted = await admit(request);

  if ("refused" in admitted) {
    return admitted.refused;
  }

  const posted = await postedJson(request, maxBodyBytes(ONE_PICTURE));

  if (posted === "tooLarge") {
    return new Response(null, { status: TOO_LARGE });
  }

  const add = pictureAddFrom(posted);

  if (!add) {
    return new Response(null, { status: BAD_REQUEST });
  }

  const outcome = await addImage((await context.params).id, add);

  return outcome.kind === "added"
    ? Response.json({ id: outcome.id })
    : new Response(null, { status: REFUSED[outcome.kind] });
}
