import type { AnyExtension, NodeViewRenderer } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Callout } from "./extensions/callout";
import { PictureGuard } from "./extensions/guard";
import { Picture } from "./extensions/picture";
import { PictureSlot, SearchSlot } from "./extensions/slots";
import { Verbatim, VerbatimHtml, VerbatimTable } from "./extensions/verbatim";

/**
 * What an entry can be made of, as markdown in and markdown out.
 *
 * Undo and redo are the editor reducer's, so the editor's own history is off.
 * Underline is off because markdown has no way to write it.
 */

/** How the blocks the editor cannot draw on its own are drawn, when there is a page to draw on. */
export interface SchemaViews {
  picture?: NodeViewRenderer;
  verbatim?: NodeViewRenderer;
  pictureSlot?: NodeViewRenderer;
  searchSlot?: NodeViewRenderer;
}

function viewed<T extends { extend: (config: object) => T }>(node: T, view?: NodeViewRenderer): T {
  return view ? node.extend({ addNodeView: () => view }) : node;
}

export function entrySchema(views: SchemaViews = {}): AnyExtension[] {
  return [
    StarterKit.configure({ undoRedo: false, underline: false, link: { openOnClick: false } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Callout,
    viewed(Picture, views.picture),
    viewed(Verbatim, views.verbatim),
    VerbatimTable,
    VerbatimHtml,
    viewed(PictureSlot, views.pictureSlot),
    viewed(SearchSlot, views.searchSlot),
    PictureGuard,
  ];
}
