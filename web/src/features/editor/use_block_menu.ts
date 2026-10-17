"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { MENU_ITEMS, matching, type MenuItem } from "./menu_items";
import type { EditorDictionary } from "@/i18n/en_editor";

/**
 * The menu that turns the current block into another kind, opened two ways:
 * `/` at the start of a paragraph, where what follows the slash is the query and
 * is taken out when an item is chosen; or Ctrl+Space anywhere, where the query
 * is typed into the menu and never reaches the entry.
 */

export interface MenuState {
  open: boolean;
  query: string;
  index: number;
  /** Where the slash is, when the menu was opened by one. */
  slashFrom: number | null;
  left: number;
  top: number;
}

const CLOSED: MenuState = { open: false, query: "", index: 0, slashFrom: null, left: 0, top: 0 };

// A slash, then a word, and nothing else before the caret in the paragraph.
const SLASH = /^\/([\p{L}\d]*)$/u;

function caretBox(editor: Editor) {
  const caret = editor.view.coordsAtPos(editor.state.selection.from);

  return { left: caret.left, top: caret.bottom };
}

function slashIn(editor: Editor): { from: number; query: string } | null {
  const { $from, empty } = editor.state.selection;

  if (!empty || $from.parent.type.name !== "paragraph") {
    return null;
  }

  const found = SLASH.exec($from.parent.textBetween(0, $from.parentOffset));

  return found ? { from: $from.start(), query: found[1] } : null;
}

function followed(menu: MenuState, editor: Editor): MenuState {
  const slash = slashIn(editor);

  if (!slash) {
    // Typing past the slash, or away from it, closes a menu it opened.
    return menu.slashFrom === null ? menu : CLOSED;
  }

  const index = menu.query === slash.query ? menu.index : 0;

  return { open: true, query: slash.query, index, slashFrom: slash.from, ...caretBox(editor) };
}

// Ctrl+Space's menu: what is typed goes to the query, not into the entry.
function typedInto(menu: MenuState, event: KeyboardEvent): MenuState | null {
  if (event.key === "Backspace") {
    return { ...menu, query: menu.query.slice(0, -1), index: 0 };
  }

  const printable = event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;

  return printable ? { ...menu, query: menu.query + event.key, index: 0 } : null;
}

function moved(menu: MenuState, key: string, count: number): MenuState | null {
  const step = { ArrowDown: 1, ArrowUp: -1 }[key];

  return step === undefined || count === 0
    ? null
    : { ...menu, index: (menu.index + step + count) % count };
}

export interface BlockMenu {
  menu: MenuState;
  visible: MenuItem[];
  openHere: (editor: Editor) => void;
  follow: (editor: Editor) => void;
  close: () => void;
  choose: (editor: Editor, item: MenuItem) => void;
  /** Whether the menu took the key; the editor must not see it if so. */
  handleKey: (editor: Editor, event: KeyboardEvent) => boolean;
}

export function useBlockMenu(labels: EditorDictionary["menu"]): BlockMenu {
  const [menu, setMenu] = useState(CLOSED);
  const visible = useMemo(() => matching(MENU_ITEMS, labels, menu.query), [labels, menu.query]);
  // Read by the editor's key handler, which is made once and outlives renders.
  const latest = useRef({ menu, visible });

  useEffect(() => {
    latest.current = { menu, visible };
  }, [menu, visible]);

  const openHere = useCallback(
    (editor: Editor) => setMenu({ ...CLOSED, open: true, ...caretBox(editor) }),
    [],
  );
  const follow = useCallback((editor: Editor) => setMenu((now) => followed(now, editor)), []);
  const close = useCallback(() => setMenu(CLOSED), []);

  const choose = useCallback((editor: Editor, item: MenuItem) => {
    const from = latest.current.menu.slashFrom;
    const chain = editor.chain().focus();
    const cleared =
      from === null ? chain : chain.deleteRange({ from, to: editor.state.selection.from });

    item.run(cleared).run();
    setMenu(CLOSED);
  }, []);

  const handleKey = useCallback(
    (editor: Editor, event: KeyboardEvent) =>
      keyFor({ editor, event, latest: latest.current, setMenu, choose }),
    [choose],
  );

  return { menu, visible, openHere, follow, close, choose, handleKey };
}

interface KeyContext {
  editor: Editor;
  event: KeyboardEvent;
  latest: { menu: MenuState; visible: MenuItem[] };
  setMenu: (menu: MenuState) => void;
  choose: (editor: Editor, item: MenuItem) => void;
}

function keyFor(context: KeyContext): boolean {
  const { menu, visible } = context.latest;

  if (!menu.open) {
    return false;
  }

  if (context.event.key === "Escape") {
    context.setMenu(CLOSED);
    return true;
  }

  const chosen = visible[menu.index];

  if (context.event.key === "Enter" && chosen) {
    context.choose(context.editor, chosen);
    return true;
  }

  const next =
    moved(menu, context.event.key, visible.length) ??
    (menu.slashFrom === null ? typedInto(menu, context.event) : null);

  if (next) {
    context.setMenu(next);
  }

  return next !== null;
}
