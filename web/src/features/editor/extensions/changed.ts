import { Extension, type Editor } from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Marks the top-level blocks someone else just wrote with `data-changed`. The
 * marks follow the words as they are edited, and stay until they are cleared.
 */

const changedKey = new PluginKey<DecorationSet>("changedBlocks");

/**
 * Positions of the top-level blocks of `doc` that no block of `before` matches.
 * Matching is by node, so a moved block is not marked and a one-word edit marks
 * its whole block; what was only taken away leaves nothing to mark.
 */
export function changedBlocks(doc: ProseNode, before: ProseNode): number[] {
  const known: ProseNode[] = [];
  const ret: number[] = [];

  before.forEach((node) => known.push(node));
  doc.forEach((node, offset) => {
    if (!known.some((old) => old.eq(node))) {
      ret.push(offset);
    }
  });

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
