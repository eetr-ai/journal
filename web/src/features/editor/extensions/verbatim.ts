import { Extension, Node } from "@tiptap/core";
import type { JSONContent, MarkdownToken } from "@tiptap/core";

/**
 * Markdown the editor keeps exactly as it was written: the cards an entry holds,
 * and the tables nothing here can edit. A verbatim block can be selected and
 * taken out, never changed, and it is written back character for character.
 *
 * Only the cards an entry may draw are claimed; any other directive is prose,
 * because `:word` turns up in ordinary sentences.
 */

export const VERBATIM = "verbatim";

const CARD =
  /^(?::::(?:quote|lyrics)\{[^\n]*\}(?:\n[\s\S]*?)?\n:::[ \t]*|::memory\{[^\n]*\}[ \t]*)(?:\n|$)/u;
const CARD_START = /^:{2,3}(?:quote|lyrics|memory)\{/mu;

interface VerbatimToken extends MarkdownToken {
  source: string;
}

function verbatimNode(source: string): JSONContent {
  return { type: VERBATIM, attrs: { source } };
}

export const Verbatim = Node.create({
  name: VERBATIM,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      source: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-verbatim") ?? "",
        renderHTML: (attributes) => ({ "data-verbatim": attributes.source as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-verbatim]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes];
  },

  markdownTokenizer: {
    name: VERBATIM,
    level: "block",
    start: (src: string) => src.match(CARD_START)?.index ?? -1,
    tokenize: (src: string): VerbatimToken | undefined => {
      const found = CARD.exec(src);

      return found ? { type: VERBATIM, raw: found[0], source: found[0].trimEnd() } : undefined;
    },
  },

  parseMarkdown: (token) => verbatimNode((token as VerbatimToken).source),

  renderMarkdown: (node) => String(node.attrs?.source ?? ""),
});

// Tokens the editor has no node for. Without these they would be dropped, and
// a save would take them out of the entry.
function keptAs(tokenName: string) {
  return Extension.create({
    name: `${VERBATIM}-${tokenName}`,
    markdownTokenName: tokenName,
    parseMarkdown: (token) => verbatimNode((token.raw ?? "").trimEnd()),
  });
}

export const VerbatimTable = keptAs("table");
export const VerbatimHtml = keptAs("html");
