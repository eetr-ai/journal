"use client";

import { useEffect, useRef } from "react";
import { ImageIcon, XIcon } from "@phosphor-icons/react";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useContextNullSafe } from "@eetr/react-reducer-utils";
import { ACCEPTED_TYPES } from "@/features/images/rules";
import { EntryEditorContext } from "../editor_context";
import type { SlotStatus } from "../extensions/slots";
import type { UploadProblem } from "../use_picture_upload";

const ICON_SIZE = 18;

/**
 * Where a picture is going: a place to pick or drop one, the picture on its way
 * up, or what stopped it. It turns into the picture once it is stored.
 */
export default function PictureSlotView(params: ReactNodeViewProps) {
  const context = useContextNullSafe(EntryEditorContext);
  const labels = context.t.editor.slots;
  const input = useRef<HTMLInputElement>(null);
  const status = params.node.attrs.status as SlotStatus;
  const token = String(params.node.attrs.token);
  const pick = (files: FileList | null) => context.fillSlot(Array.from(files ?? []), token);

  usePickerOnPlacement(params, input);

  return (
    <NodeViewWrapper
      data-picture-slot=""
      className={`group relative my-2 rounded-lg border border-dashed border-border bg-surface-muted ${params.selected ? "editor-selected" : ""}`}
      contentEditable={false}
      onDragOver={(event: React.DragEvent) => event.preventDefault()}
      onDrop={(event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        pick(event.dataTransfer.files);
      }}
    >
      {status === "uploading" ? (
        <p className="px-4 py-5 text-sm text-muted">{labels.uploading}</p>
      ) : (
        <button
          className="flex w-full items-center gap-3 px-4 py-4 text-left text-sm hover:text-foreground"
          onClick={() => input.current?.click()}
          type="button"
        >
          <span className="text-muted">
            <ImageIcon size={ICON_SIZE} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block">{status === "failed" ? labels.tryAgain : labels.picture}</span>
            <span className={`block text-xs ${status === "failed" ? "text-accent" : "text-muted"}`}>
              {status === "failed"
                ? labels.problems[params.node.attrs.problem as UploadProblem]
                : labels.pictureHint}
            </span>
          </span>
        </button>
      )}
      <RemoveButton label={context.t.editor.remove} onRemove={() => params.deleteNode()} />
      <input
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          pick(event.target.files);
          // Cleared, so the same file picked again after a failure still counts.
          event.target.value = "";
        }}
        ref={input}
        type="file"
      />
    </NodeViewWrapper>
  );
}

function RemoveButton(options: { label: string; onRemove: () => void }) {
  return (
    <button
      aria-label={options.label}
      className="absolute top-1 right-1 rounded p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-accent focus:opacity-100"
      onClick={options.onRemove}
      title={options.label}
      type="button"
    >
      <XIcon size={ICON_SIZE} />
    </button>
  );
}

// Placed from the menu, the slot opens the file picker straight away, once.
function usePickerOnPlacement(
  params: ReactNodeViewProps,
  input: React.RefObject<HTMLInputElement | null>,
): void {
  const opening = params.node.attrs.opening === true;
  const { updateAttributes } = params;

  useEffect(() => {
    if (opening) {
      updateAttributes({ opening: false });
      input.current?.click();
    }
  }, [opening, updateAttributes, input]);
}
