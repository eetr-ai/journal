"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import DeletePerson from "./delete_person";
import PersonFacts from "./person_facts";
import PersonForm from "./person_form";
import { NEW_PERSON, PeopleActionType, usePeople } from "../people_state";
import { EMPTY_DRAFT } from "../rules";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 14;

export interface PersonViewOptions {
  agentKey: string;
  t: Dictionary;
}

/** Someone new, or someone already there with what is known about them. */
export default function PersonView(options: PersonViewOptions) {
  const { state, dispatch } = usePeople();
  const t = options.t;
  const id = state.selected === NEW_PERSON ? null : state.selected;
  const initial = id ? (state.opened[id] ?? EMPTY_DRAFT) : EMPTY_DRAFT;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <button
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
          onClick={() => dispatch({ type: PeopleActionType.Select, data: null })}
          type="button"
        >
          <ArrowLeftIcon size={ICON_SIZE} weight="bold" />
          {t.people.back}
        </button>
        {!id && <h2 className="text-sm font-medium">{t.people.newPerson}</h2>}
      </div>

      {/* Keyed by who it is, so another person — or someone new once they are
          saved — starts from what is stored rather than from the last draft. */}
      <PersonForm
        agentKey={options.agentKey}
        id={id}
        initial={initial}
        key={id ?? NEW_PERSON}
        t={t}
      />

      {id && (
        <>
          <PersonFacts agentKey={options.agentKey} personId={id} t={t} />
          <DeletePerson id={id} t={t} />
        </>
      )}
    </div>
  );
}
