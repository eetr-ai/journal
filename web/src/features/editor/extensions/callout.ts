import { Node } from "@tiptap/core";
import type { JSONContent, MarkdownToken } from "@tiptap/core";

/**
 * A GitHub-style callout, `> [!NOTE]` and what follows it, as a block that
 * holds ordinary editable blocks and keeps its kind.
 */

export const CALLOUT = "callout";
export const CALLOUT_KINDS = ["note", "tip", "important", "warning", "caution"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

const OPENING =
  /^> ?\[!(note|tip|important|warning|caution)\][ \t]*(?:\n|$)((?:>[^\n]*(?:\n|$))*)/iu;
const QUOTED = /^> ?/u;

interface CalloutToken extends MarkdownToken {
  kind: CalloutKind;
}

function asKind(value: unknown): CalloutKind {
  return CALLOUT_KINDS.find((kind) => kind === value) ?? "note";
}

// One quoted block per child, each line under the callout's own marker.
function quoted(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
    .join("\n");
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wraps the current block in a callout. */
      setCallout: (kind?: CalloutKind) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: CALLOUT,
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "note",
        parseHTML: (element) => asKind(element.getAttribute("data-callout")),
        renderHTML: (attributes) => ({ "data-callout": attributes.kind as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "blockquote[data-callout]" }];
  },

  // The classes the rendered entry uses, so a callout looks the same written as read.
  renderHTML({ node, HTMLAttributes }) {
    return [
      "blockquote",
      { ...HTMLAttributes, class: `callout callout-${node.attrs.kind as string}`, role: "note" },
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (kind = "note") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { kind }),
    };
  },

  markdownTokenizer: {
    name: CALLOUT,
    level: "block",
    start: (src: string) => src.match(/^> ?\[!/mu)?.index ?? -1,
    tokenize: (src, _tokens, lexer): CalloutToken | undefined => {
      const found = OPENING.exec(src);

      if (!found) {
        return undefined;
      }

      const body = found[2]
        .split("\n")
        .map((line) => line.replace(QUOTED, ""))
        .join("\n");

      return {
        type: CALLOUT,
        raw: found[0],
        kind: asKind(found[1].toLowerCase()),
        tokens: lexer.blockTokens(body),
      };
    },
  },

  parseMarkdown: (token, helpers) => {
    const children = helpers.parseChildren(token.tokens ?? []);
    const content: JSONContent[] = children.length > 0 ? children : [{ type: "paragraph" }];

    return helpers.createNode(CALLOUT, { kind: (token as CalloutToken).kind }, content);
  },

  renderMarkdown: (node, helpers) => {
    const kind = asKind(node.attrs?.kind).toUpperCase();
    const blocks = (node.content ?? []).map((child) => quoted(helpers.renderChildren([child])));

    return [`> [!${kind}]`, blocks.join("\n>\n")].join("\n");
  },
});
