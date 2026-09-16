/**
 * GitHub-style callouts for react-markdown, which `remark-gfm` does not cover.
 *
 *     > [!NOTE]
 *     > something worth not missing
 *
 * A remark plugin rather than a custom blockquote component, because at this
 * point the tree still holds plain text: finding the marker among rendered
 * React children means pattern-matching on elements, which breaks the first
 * time the marker lands in a different node.
 *
 * The marker is stripped and the blockquote is tagged; the styling lives with
 * the two palettes in globals.css, like every other colour.
 */

const KINDS = ["note", "tip", "important", "warning", "caution"] as const;

const MARKER = /^\[!(note|tip|important|warning|caution)\]\s*\n?/iu;

interface Node {
  type: string;
  value?: string;
  children?: Node[];
  data?: { hProperties?: Record<string, string> };
}

function markerIn(quote: Node): string | null {
  const text = quote.children?.[0]?.children?.[0];

  if (text?.type !== "text" || typeof text.value !== "string") {
    return null;
  }

  const found = MARKER.exec(text.value);

  if (!found) {
    return null;
  }

  // The marker is the label, not content: taken out so it is not read aloud or
  // rendered as the first words of the quote.
  text.value = text.value.slice(found[0].length);

  return found[1].toLowerCase();
}

function walk(node: Node): void {
  for (const child of node.children ?? []) {
    if (child.type === "blockquote") {
      const kind = markerIn(child);

      if (kind && KINDS.includes(kind as (typeof KINDS)[number])) {
        // role="note" rather than a label: it tells a screen reader what this
        // block is without putting an English word into a page that may not be
        // in English. The kind itself is carried by the glyph in globals.css.
        child.data = {
          ...child.data,
          hProperties: { className: `callout callout-${kind}`, role: "note" },
        };
      }
    }

    walk(child);
  }
}

export default function remarkCallouts() {
  return walk;
}
