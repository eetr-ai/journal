import type { AnyExtension, NodeViewRenderer } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Callout } from "./extensions/callout";
import { PictureGuard } from "./extensions/guard";
import { Picture } from "./extensions/picture";
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
}

export function entrySchema(views: SchemaViews = {}): AnyExtension[] {
  const { picture, verbatim } = views;

  return [
    StarterKit.configure({ undoRedo: false, underline: false, link: { openOnClick: false } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Callout,
    picture ? Picture.extend({ addNodeView: () => picture }) : Picture,
    verbatim ? Verbatim.extend({ addNodeView: () => verbatim }) : Verbatim,
    VerbatimTable,
    VerbatimHtml,
    PictureGuard,
  ];
}
