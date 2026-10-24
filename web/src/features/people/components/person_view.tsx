"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { OverlayBody, OverlayFooter } from "@/components/overlay_dialog";
import DeletePerson from "./delete_person";
import PersonFacts from "./person_facts";
import PersonForm, { PersonSaveBar } from "./person_form";
import { NEW_PERSON, PeopleActionType, usePeople } from "../people_state";
import { usePersonSave } from "../use_person_save";
import { EMPTY_DRAFT } from "../rules";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 14;

export interface PersonViewOptions {
  agentKey: string;
  locale: Locale;
  t: Dictionary;
}

/**
 * Someone new, or someone already there with what is known about them. Mount it
 * keyed by who it is, so another person starts from what is stored rather than
 * from the last draft.
 */
export default function PersonView(options: PersonViewOptions) {
  const { state, dispatch } = usePeople();
  const t = options.t;
  const id = state.selected === NEW_PERSON ? null : state.selected;
  const opened = id ? state.opened[id] : undefined;
  const locked = (opened?.unreadable.length ?? 0) > 0;
  const save = usePersonSave(id, opened ?? EMPTY_DRAFT, options.agentKey, locked);
  const form = { save, locked, locale: options.locale, t };

  return (
    <>
      <OverlayBody>
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
          <PersonForm {...form} />
          {id && (
            <>
              <PersonFacts agentKey={options.agentKey} personId={id} t={t} />
              <DeletePerson id={id} t={t} />
            </>
          )}
        </div>
      </OverlayBody>
      <OverlayFooter>
        <PersonSaveBar {...form} />
      </OverlayFooter>
    </>
  );
}
