"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { addFactAction } from "../actions";
import { PeopleActionType, usePeople } from "../people_state";
import { factProblem, MAX_FACT } from "../rules";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 14;

export interface FactFormOptions {
  personId: string;
  agentKey: string;
  t: Dictionary;
}

/** Keeps one fact. What was typed stays in the box until it has landed. */
export default function FactForm(options: FactFormOptions) {
  const { dispatch } = usePeople();
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const t = options.t.people;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (factProblem(text)) {
      return;
    }

    startTransition(async () => {
      const outcome = await addFactAction(options.personId, text, options.agentKey).catch(
        () => null,
      );

      if (outcome?.kind !== "added") {
        setFailed(true);
        return;
      }

      dispatch({
        type: PeopleActionType.FactAdded,
        data: { id: outcome.fact.id, fact: text.trim() },
      });
      setText("");
      setFailed(false);
    });
  }

  return (
    <form className="flex flex-col gap-1.5" onSubmit={submit}>
      <div className="flex gap-2">
        <input
          aria-label={t.factPlaceholder}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 md:text-sm"
          disabled={pending}
          maxLength={MAX_FACT}
          onChange={(event) => setText(event.target.value)}
          placeholder={t.factPlaceholder}
          type="text"
          value={text}
        />
        <button
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted disabled:opacity-50"
          disabled={pending || text.trim() === ""}
          type="submit"
        >
          <PlusIcon size={ICON_SIZE} weight="bold" />
          {t.addFact}
        </button>
      </div>
      {failed && <p className="text-xs text-accent">{t.factFailed}</p>}
    </form>
  );
}
