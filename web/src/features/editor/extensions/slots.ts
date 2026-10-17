import { Node } from "@tiptap/core";
import type { Editor, JSONContent } from "@tiptap/core";
import { PICTURE } from "./picture";

/**
 * Blocks that stand in for something still being made: a picture on its way
 * up, a quote or a song being looked for. They are the editor's alone — never
 * written to markdown and never parsed from it — so a save, a reload or an
 * undo leaves no trace of one, and only what it turned into is kept.
 */

export const PICTURE_SLOT = "pictureSlot";
export const SEARCH_SLOT = "searchSlot";

export type SlotStatus = "empty" | "uploading" | "failed";
export type SearchKind = "quotes" | "songs";

function transient(name: string, attributes: Record<string, { default: unknown }>) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    selectable: true,
    draggable: false,
    addAttributes: () => attributes,
    renderHTML: () => ["div", { "data-slot": name }],
    renderMarkdown: () => "",
  });
}

/** `opening` asks the view to open the file picker once, as it is placed. */
export const PictureSlot = transient(PICTURE_SLOT, {
  token: { default: "" },
  status: { default: "empty" },
  problem: { default: "" },
  opening: { default: false },
});

export const SearchSlot = transient(SEARCH_SLOT, { kind: { default: "quotes" } });

const TRANSIENT = new Set([PICTURE_SLOT, SEARCH_SLOT]);

function withoutSlots(node: JSONContent): JSONContent {
  if (!node.content) {
    return node;
  }

  const content = node.content.filter((child) => !TRANSIENT.has(child.type ?? ""));

  return { ...node, content: content.map(withoutSlots) };
}

/**
 * The words as markdown, as if no slot were there. Leaving a slot out of the
 * document, rather than writing it as nothing, is what keeps the blank lines
 * around it out of the entry.
 */
export function markdownOf(editor: Editor): string {
  return editor.markdown?.serialize(withoutSlots(editor.getJSON())) ?? editor.getMarkdown();
}

export function pictureSlot(token: string, status: SlotStatus, opening = false): JSONContent {
  return { type: PICTURE_SLOT, attrs: { token, status, problem: "", opening } };
}

export function searchSlot(kind: SearchKind): JSONContent {
  return { type: SEARCH_SLOT, attrs: { kind } };
}

function slotAt(editor: Editor, token: string): { pos: number; size: number } | null {
  let ret: { pos: number; size: number } | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === PICTURE_SLOT && node.attrs.token === token) {
      ret = { pos, size: node.nodeSize };
    }

    return ret === null;
  });

  return ret;
}

/** Changes what a slot says. One that was undone away is left gone. */
export function markSlot(editor: Editor, token: string, attrs: Record<string, unknown>): void {
  const slot = slotAt(editor, token);

  if (slot) {
    const node = editor.state.doc.nodeAt(slot.pos);
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(slot.pos, undefined, { ...node?.attrs, ...attrs }),
    );
  }
}

/**
 * The slot becomes the picture, on a line of its own. False when the slot is
 * gone, in which case the picture stays kept with the entry, unanchored.
 */
export function fillSlot(editor: Editor, token: string, id: string): boolean {
  const slot = slotAt(editor, token);

  if (!slot) {
    return false;
  }

  const line = { type: "paragraph", content: [{ type: PICTURE, attrs: { id, caption: "" } }] };

  return editor
    .chain()
    .insertContentAt({ from: slot.pos, to: slot.pos + slot.size }, line)
    .run();
}
