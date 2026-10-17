"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  CheckSquareIcon,
  CodeIcon,
  InfoIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  QuotesIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import type { Editor } from "@tiptap/core";
import type { BlockMenu as BlockMenuHandle, MenuState } from "../use_block_menu";
import type { MenuItem, MenuItemId } from "../menu_items";
import type { EditorDictionary } from "@/i18n/en_editor";

// Room between the caret and the menu.
const CARET_GAP_PX = 6;
// The menu's tallest; with less room than this below the caret it opens above.
const MENU_HEIGHT_PX = 380;
const ICON_SIZE = 20;

const ICONS: Record<MenuItemId, React.ReactNode> = {
  text: <TextTIcon size={ICON_SIZE} />,
  heading1: <TextHOneIcon size={ICON_SIZE} />,
  heading2: <TextHTwoIcon size={ICON_SIZE} />,
  heading3: <TextHThreeIcon size={ICON_SIZE} />,
  bullets: <ListBulletsIcon size={ICON_SIZE} />,
  numbers: <ListNumbersIcon size={ICON_SIZE} />,
  tasks: <CheckSquareIcon size={ICON_SIZE} />,
  quote: <QuotesIcon size={ICON_SIZE} />,
  callout: <InfoIcon size={ICON_SIZE} />,
  divider: <MinusIcon size={ICON_SIZE} />,
  code: <CodeIcon size={ICON_SIZE} />,
};

export interface BlockMenuOptions {
  editor: Editor;
  handle: BlockMenuHandle;
  labels: EditorDictionary["menu"];
}

// Below the caret, unless the page ends first.
function placed(menu: MenuState): React.CSSProperties {
  if (window.innerHeight - menu.top >= MENU_HEIGHT_PX) {
    return { left: menu.left, top: menu.top + CARET_GAP_PX };
  }

  return { left: menu.left, bottom: window.innerHeight - menu.above + CARET_GAP_PX };
}

/**
 * The block menu, at the caret. Keyboard first; a click works too.
 *
 * Drawn into the body: the panels slide, and anything translated is what a
 * fixed element is placed against, so inside one the caret's coordinates
 * would land the menu somewhere else entirely.
 */
export default function BlockMenu(options: BlockMenuOptions) {
  const { menu, visible } = options.handle;
  const labels = options.labels;

  if (!menu.open) {
    return null;
  }

  return createPortal(
    <div
      aria-label={labels.label}
      className="fixed z-50 flex max-h-[380px] w-80 flex-col overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-xl"
      role="menu"
      style={placed(menu)}
    >
      {menu.slashFrom === null ? <SearchLine labels={labels} query={menu.query} /> : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted">{labels.section}</p>
        {visible.length === 0 ? <p className="px-2.5 py-2 text-muted">{labels.none}</p> : null}
        {visible.map((item, index) => (
          <MenuRow
            item={item}
            key={item.id}
            label={labels[item.id]}
            onChoose={() => options.handle.choose(options.editor, item)}
            selected={index === menu.index}
          />
        ))}
      </div>
      <button
        className="flex items-center justify-between border-t border-border px-4 py-2.5 text-left hover:bg-surface-muted"
        onClick={options.handle.close}
        onMouseDown={(event) => event.preventDefault()}
        type="button"
      >
        {labels.close}
        <span className="text-xs text-muted">{labels.closeKey}</span>
      </button>
    </div>,
    document.body,
  );
}

// Ctrl+Space's menu takes the query itself, so it shows what has been typed.
function SearchLine(params: { labels: EditorDictionary["menu"]; query: string }) {
  return (
    <p className="border-b border-border px-4 py-2.5 text-muted">
      {params.query === "" ? (
        params.labels.search
      ) : (
        <span className="text-foreground">{params.query}</span>
      )}
    </p>
  );
}

interface MenuRowOptions {
  item: MenuItem;
  label: string;
  selected: boolean;
  onChoose: () => void;
}

function MenuRow(options: MenuRowOptions) {
  const row = useRef<HTMLButtonElement>(null);

  // The arrow keys move the highlight; the list follows it.
  useEffect(() => {
    if (options.selected) {
      row.current?.scrollIntoView({ block: "nearest" });
    }
  }, [options.selected]);

  return (
    <button
      aria-current={options.selected}
      className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-foreground ${
        options.selected ? "bg-surface-muted" : "hover:bg-surface-muted"
      }`}
      // Keeps the caret in the entry, so the block it turns is still the one it was on.
      onClick={options.onChoose}
      onMouseDown={(event) => event.preventDefault()}
      ref={row}
      role="menuitem"
      type="button"
    >
      <span className="flex w-5 shrink-0 justify-center text-muted">{ICONS[options.item.id]}</span>
      <span className="min-w-0 flex-1 truncate">{options.label}</span>
      {options.item.shortcut ? (
        <span className="shrink-0 font-mono text-xs text-muted">{options.item.shortcut}</span>
      ) : null}
    </button>
  );
}
