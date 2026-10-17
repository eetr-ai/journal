import { Extension } from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { PICTURE } from "./picture";

/**
 * Holds the rule that, for now, pictures are added and removed only from the
 * conversation: a change that would lose one of the entry's pictures is
 * refused whole, and a pasted or dropped file goes nowhere.
 *
 * A load of words from outside the editor — an undo, or the latest version —
 * is marked `LOADED` and passes, because it is putting back a state the entry
 * was really in.
 */

export const LOADED = "entryLoaded";

function picturesIn(doc: ProseNode): Set<string> {
  const ret = new Set<string>();

  doc.descendants((node) => {
    if (node.type.name === PICTURE) {
      ret.add(String(node.attrs.id));
    }
  });

  return ret;
}

function carriesFiles(transfer: DataTransfer | null | undefined): boolean {
  return (transfer?.files.length ?? 0) > 0;
}

export const PictureGuard = Extension.create({
  name: "pictureGuard",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("pictureGuard"),
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged || transaction.getMeta(LOADED)) {
            return true;
          }

          const after = picturesIn(transaction.doc);

          return [...picturesIn(state.doc)].every((id) => after.has(id));
        },
        props: {
          handlePaste: (_view, event) => carriesFiles(event.clipboardData),
          handleDrop: (_view, event) => carriesFiles((event as DragEvent).dataTransfer),
        },
      }),
    ];
  },
});
