"use client";

import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import type { BlockMenu as BlockMenuHandle } from "../use_block_menu";
import type { EditorDictionary } from "@/i18n/en_editor";

// Room between the caret and the menu below it.
const CARET_GAP_PX = 4;

export interface BlockMenuOptions {
  editor: Editor;
  handle: BlockMenuHandle;
  labels: EditorDictionary["menu"];
}

/**
 * The block menu, under the caret. Keyboard first; a click works too.
 *
 * Drawn into the body: the panels slide, and anything translated is what a
 * fixed element is placed against, so inside one the caret's coordinates
 * would land the menu somewhere else entirely.
 */
export default function BlockMenu(options: BlockMenuOptions) {
  const { menu, visible } = options.handle;

  if (!menu.open) {
    return null;
  }

  return createPortal(
    <div
      aria-label={options.labels.label}
      className="fixed z-50 max-h-72 w-56 overflow-y-auto rounded-md border border-border bg-surface py-1 text-sm shadow-lg"
      role="menu"
      style={{ left: menu.left, top: menu.top + CARET_GAP_PX }}
    >
      {menu.slashFrom === null && menu.query !== "" ? (
        <p className="px-3 py-1 text-xs text-muted">{menu.query}</p>
      ) : null}
      {visible.length === 0 ? <p className="px-3 py-1 text-muted">{options.labels.none}</p> : null}
      {visible.map((item, index) => (
        <button
          aria-current={index === menu.index}
          className={`block w-full px-3 py-1.5 text-left ${
            index === menu.index ? "bg-surface-muted text-foreground" : "text-muted"
          }`}
          key={item.id}
          // Keeps the caret in the entry, so the block it turns is still the
          // one it was on.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => options.handle.choose(options.editor, item)}
          role="menuitem"
          type="button"
        >
          {options.labels[item.id]}
        </button>
      ))}
    </div>,
    document.body,
  );
}
