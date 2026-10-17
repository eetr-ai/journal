"use client";

import { useCallback } from "react";
import { XIcon } from "@phosphor-icons/react";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useContextNullSafe } from "@eetr/react-reducer-utils";
import Markdown from "@/components/markdown";
import ChatWidget from "@/features/widgets/components/chat_widget";
import { EntryEditorContext } from "../editor_context";

const ICON_SIZE = 14;

/**
 * A card or a table, drawn exactly as the entry draws it when read. It can be
 * taken out, but what it says is not the editor's to change.
 */
export default function VerbatimView(params: ReactNodeViewProps) {
  const context = useContextNullSafe(EntryEditorContext);
  const { locale, t } = context;
  const draw = useCallback(
    (encoded: string) => <ChatWidget encoded={encoded} locale={locale} place="entry" t={t} />,
    [locale, t],
  );

  return (
    <NodeViewWrapper
      className={`group relative my-2 rounded ${params.selected ? "editor-selected" : ""}`}
      contentEditable={false}
    >
      <button
        aria-label={t.editor.remove}
        className="absolute top-1 right-1 z-10 rounded bg-surface p-1 text-muted opacity-0 shadow-sm group-hover:opacity-100 hover:text-accent focus:opacity-100"
        onClick={() => params.deleteNode()}
        title={t.editor.remove}
        type="button"
      >
        <XIcon size={ICON_SIZE} />
      </button>
      <Markdown place="entry" widget={draw}>
        {String(params.node.attrs.source)}
      </Markdown>
    </NodeViewWrapper>
  );
}
