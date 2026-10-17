import type { ChainedCommands } from "@tiptap/core";
import type { EditorDictionary } from "@/i18n/en_editor";

/** What the block menu can turn the current block into. */

export type MenuItemId = Exclude<keyof EditorDictionary["menu"], "label" | "none">;

export interface MenuItem {
  id: MenuItemId;
  /** Matched as well as the label, so "h1" or "todo" finds its block in any language. */
  keywords: string;
  run: (chain: ChainedCommands) => ChainedCommands;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "text", keywords: "p paragraph", run: (chain) => chain.setParagraph() },
  { id: "heading1", keywords: "h1 title", run: (chain) => chain.setHeading({ level: 1 }) },
  { id: "heading2", keywords: "h2", run: (chain) => chain.setHeading({ level: 2 }) },
  { id: "heading3", keywords: "h3", run: (chain) => chain.setHeading({ level: 3 }) },
  { id: "bullets", keywords: "ul list", run: (chain) => chain.toggleBulletList() },
  { id: "numbers", keywords: "ol list", run: (chain) => chain.toggleOrderedList() },
  { id: "tasks", keywords: "todo check list", run: (chain) => chain.toggleTaskList() },
  { id: "quote", keywords: "blockquote", run: (chain) => chain.toggleBlockquote() },
  { id: "callout", keywords: "note tip warning", run: (chain) => chain.setCallout() },
  { id: "divider", keywords: "hr rule line", run: (chain) => chain.setHorizontalRule() },
  { id: "code", keywords: "pre", run: (chain) => chain.toggleCodeBlock() },
];

/** The items a query finds, in menu order. An empty query finds them all. */
export function matching(
  items: MenuItem[],
  labels: EditorDictionary["menu"],
  query: string,
): MenuItem[] {
  const wanted = query.trim().toLowerCase();

  if (wanted === "") {
    return items;
  }

  return items.filter((item) =>
    `${labels[item.id]} ${item.keywords}`.toLowerCase().includes(wanted),
  );
}
