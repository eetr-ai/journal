import { Extension, type Editor } from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Marks the blocks someone else just wrote with `data-changed`. The
 * marks follow the words as they are edited, and stay until they are cleared.
 */

const changedKey = new PluginKey<DecorationSet>("changedBlocks");

const LIST_ITEMS = new Set(["listItem", "taskItem"]);

function isEmptyLine(node: ProseNode): boolean {
  return node.isTextblock && node.content.size === 0;
}

function isList(node: ProseNode): boolean {
  return node.childCount > 0 && LIST_ITEMS.has(node.firstChild?.type.name ?? "");
}

function childrenOf(node: ProseNode): ProseNode[] {
  const ret: ProseNode[] = [];

  node.forEach((child) => ret.push(child));

  return ret;
}

// Takes a node equal to `node` out of `pool`; false when there was none left.
function took(pool: ProseNode[], node: ProseNode): boolean {
  const match = pool.findIndex((old) => old.eq(node));

  if (match !== -1) {
    pool.splice(match, 1);
  }

  return match !== -1;
}

/**
 * Positions of the blocks of `doc` that no block of `before` matches.
 *
 * Matching is by node, and each old block matches once, so a moved block is not
 * marked, a repeated one is, and a one-word edit marks its whole block. A list
 * that changed is matched item by item against the items of every old list, so
 * only its new items are marked. For now that goes one level deep: an item whose
 * nested list changed is marked whole. What was only taken away, or an empty
 * line, leaves nothing to mark.
 */
export function changedBlocks(doc: ProseNode, before: ProseNode): number[] {
  const blocks = childrenOf(before);
  const items = blocks.filter(isList).flatMap(childrenOf);
  const fresh: { node: ProseNode; offset: number }[] = [];
  const ret: number[] = [];

  // Whole blocks first, so an unchanged list's items are spoken for before any
  // changed list is matched against them, whichever comes first in the entry.
  doc.forEach((node, offset) => {
    if (!took(blocks, node)) {
      fresh.push({ node, offset });
    } else if (isList(node)) {
      node.forEach((item) => took(items, item));
    }
  });

  for (const { node, offset } of fresh.filter((block) => !isEmptyLine(block.node))) {
    if (!isList(node)) {
      ret.push(offset);
      continue;
    }

    node.forEach((item, at) => {
      if (!took(items, item)) {
        ret.push(offset + 1 + at);
      }
    });
  }

  return ret;
}

function decorated(doc: ProseNode, at: number[]): DecorationSet {
  return DecorationSet.create(
    doc,
    at.map((pos) =>
      Decoration.node(pos, pos + (doc.nodeAt(pos)?.nodeSize ?? 0), { "data-changed": "true" }),
    ),
  );
}

/** Marks the given block positions, replacing any marks already there. */
export function markChanged(editor: Editor, at: number[]): void {
  editor.view.dispatch(editor.state.tr.setMeta(changedKey, at));
}

export const ChangedBlocks = Extension.create({
  name: "changedBlocks",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: changedKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (transaction, marks) => {
            const at = transaction.getMeta(changedKey) as number[] | undefined;

            return at
              ? decorated(transaction.doc, at)
              : marks.map(transaction.mapping, transaction.doc);
          },
        },
        props: {
          decorations: (state) => changedKey.getState(state),
        },
      }),
    ];
  },
});
