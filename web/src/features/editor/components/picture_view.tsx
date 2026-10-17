"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useContextNullSafe } from "@eetr/react-reducer-utils";
import InlinePicture from "@/features/images/components/inline_picture";
import { EntryEditorContext } from "../editor_context";

/** A picture inside the words, drawn the way the entry draws it when read. */
export default function PictureView(params: ReactNodeViewProps) {
  const context = useContextNullSafe(EntryEditorContext);
  const id = String(params.node.attrs.id);

  return (
    <NodeViewWrapper as="span" className={params.selected ? "editor-selected" : undefined}>
      <InlinePicture
        alt={String(params.node.attrs.caption)}
        image={context.pictures.get(id)}
        loading={context.picturesLoading}
        t={context.t}
      />
    </NodeViewWrapper>
  );
}
