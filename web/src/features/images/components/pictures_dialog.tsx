"use client";

import { useReducer } from "react";
import Image from "next/image";
import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react";
import { useModal } from "@/components/confirm_dialog";
import PictureTile from "./picture_tile";
import { deleteImageAction } from "../actions";
import { INITIAL_PICTURES_STATE, PicturesActionType, picturesReducer } from "../pictures_state";
import type { OpenedImage } from "../types";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;

export interface PicturesDialogOptions {
  t: Dictionary;
  entryId: string;
  images: OpenedImage[];
  /** The ids the words place, or null while the words have not been read. */
  anchored: Set<string> | null;
  onClose: () => void;
  onRemoved: (id: string) => void;
}

/** Every picture kept with the day: look at any, throw away the loose ones. */
export default function PicturesDialog(options: PicturesDialogOptions) {
  const [state, dispatch] = useReducer(picturesReducer, INITIAL_PICTURES_STATE);
  const ref = useModal(options.onClose);
  const t = options.t.images;
  const viewing = options.images.find((image) => image.id === state.viewing);

  async function remove(id: string) {
    dispatch({ type: PicturesActionType.Deleting, data: id });
    const gone = await deleteImageAction(options.entryId, id).catch(() => false);

    if (gone) {
      options.onRemoved(id);
    }

    dispatch({ type: gone ? PicturesActionType.Deleted : PicturesActionType.Failed });
  }

  return (
    <dialog
      aria-labelledby="pictures-title"
      className="m-auto w-full max-w-2xl rounded-lg border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        options.onClose();
      }}
      ref={ref}
    >
      <PicturesHeader
        onBack={viewing ? () => dispatch({ type: PicturesActionType.Back }) : undefined}
        onClose={options.onClose}
        t={options.t}
      />
      {state.failed ? (
        <p className="border-b border-border px-4 py-2 text-xs text-accent">{t.deleteFailed}</p>
      ) : null}
      <div className="max-h-[70vh] overflow-y-auto p-4">
        {viewing ? (
          <PictureView image={viewing} t={options.t} />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {options.images.map((image) => (
              <PictureTile
                anchored={options.anchored ? options.anchored.has(image.id) : null}
                confirming={state.confirming === image.id}
                deleting={state.deleting === image.id}
                image={image}
                key={image.id}
                onAsk={() => dispatch({ type: PicturesActionType.Asked, data: image.id })}
                onCancel={() => dispatch({ type: PicturesActionType.Cancelled })}
                onConfirm={() => void remove(image.id)}
                onView={() => dispatch({ type: PicturesActionType.Viewed, data: image.id })}
                t={options.t}
              />
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}

function PictureView(options: { image: OpenedImage; t: Dictionary }) {
  const t = options.t.images;

  if (!options.image.src) {
    return <p className="text-sm text-muted">{t.unreadable}</p>;
  }

  return (
    <figure>
      <Image
        alt={options.image.caption || t.attached}
        className="h-auto w-full rounded-lg"
        height={0}
        sizes="100vw"
        src={options.image.src}
        unoptimized
        width={0}
      />
      {options.image.caption ? (
        <figcaption className="mt-2 text-sm text-muted">{options.image.caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface PicturesHeaderOptions {
  t: Dictionary;
  /** Back to all of them, while one is being looked at. */
  onBack?: () => void;
  onClose: () => void;
}

function PicturesHeader(options: PicturesHeaderOptions) {
  const t = options.t.images;

  return (
    <header className="flex items-center gap-2 border-b border-border px-4 py-3">
      {options.onBack ? (
        <button
          aria-label={t.back}
          className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
          onClick={options.onBack}
          title={t.back}
          type="button"
        >
          <ArrowLeftIcon size={ICON_SIZE} />
        </button>
      ) : null}
      <h2 className="flex-1 text-sm font-semibold" id="pictures-title">
        {t.dialogTitle}
      </h2>
      <button
        aria-label={t.close}
        className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
        onClick={options.onClose}
        title={t.close}
        type="button"
      >
        <XIcon size={ICON_SIZE} />
      </button>
    </header>
  );
}
