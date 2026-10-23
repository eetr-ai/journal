"use client";

import { useCallback, useState } from "react";
import { TrashIcon } from "@phosphor-icons/react";
import ConfirmDialog from "@/components/confirm_dialog";
import { deletePersonAction } from "../actions";
import { PeopleActionType, usePeople } from "../people_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 14;

export interface DeletePersonOptions {
  id: string;
  t: Dictionary;
}

/** Forgetting someone is asked about first, and only leaves the list once it has happened. */
export default function DeletePerson(options: DeletePersonOptions) {
  const { dispatch } = usePeople();
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = options.t.people;
  // Stable, because the dialog reopens itself whenever this changes.
  const cancel = useCallback(() => setAsking(false), []);

  async function forget() {
    setAsking(false);
    const gone = await deletePersonAction(options.id).catch(() => false);

    if (gone) {
      dispatch({ type: PeopleActionType.Removed, data: options.id });
      return;
    }

    setFailed(true);
  }

  return (
    <div className="flex flex-col items-start gap-1.5 border-t border-border pt-4">
      <button
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-accent hover:bg-surface-muted"
        onClick={() => setAsking(true)}
        type="button"
      >
        <TrashIcon size={ICON_SIZE} />
        {t.delete}
      </button>
      {failed && <p className="text-xs text-accent">{t.deleteFailed}</p>}
      {asking && (
        <ConfirmDialog
          body={t.deleteConfirm.body}
          cancelLabel={t.deleteConfirm.cancel}
          confirmLabel={t.deleteConfirm.confirm}
          onCancel={cancel}
          onConfirm={() => void forget()}
          title={t.deleteConfirm.title}
        />
      )}
    </div>
  );
}
