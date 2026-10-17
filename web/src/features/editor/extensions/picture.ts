import { Node } from "@tiptap/core";
import type { MarkdownToken } from "@tiptap/core";

/**
 * A picture kept with the entry, placed in its words as `![caption](image:<id>)`.
 *
 * For now pictures are added only from the conversation, so the editor can move
 * one with the words around it but never add or remove one; that rule is held
 * by the guard beside this node, not here.
 */

export const PICTURE = "picture";

const ANCHOR = /^!\[([^\]\n]*)\]\(image:([0-9a-f-]{36})\)/u;

interface PictureToken extends MarkdownToken {
  id: string;
  caption: string;
}

export const Picture = Node.create({
  name: PICTURE,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: { default: "" },
      caption: { default: "" },
    };
  },

  // Deliberately no parseHTML: an image pasted from anywhere else is not one of
  // this entry's pictures, and dropping it is what keeps them from being added.
  renderHTML({ node }) {
    return ["span", { "data-picture": node.attrs.id as string }];
  },

  markdownTokenizer: {
    name: PICTURE,
    level: "inline",
    start: (src: string) => src.indexOf("!["),
    tokenize: (src: string): PictureToken | undefined => {
      const found = ANCHOR.exec(src);

      return found ? { type: PICTURE, raw: found[0], caption: found[1], id: found[2] } : undefined;
    },
  },

  parseMarkdown: (token, helpers) => {
    const picture = token as PictureToken;

    return helpers.createNode(PICTURE, { id: picture.id, caption: picture.caption });
  },

  renderMarkdown: (node) =>
    `![${String(node.attrs?.caption ?? "")}](image:${String(node.attrs?.id ?? "")})`,
});
