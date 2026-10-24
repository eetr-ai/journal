"use client";

import { CheckCircleIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import BirthdayField from "./birthday_field";
import PersonField from "./person_field";
import ProximityField from "./proximity_field";
import type { PersonSave, SaveStatus } from "../use_person_save";
import type { PersonDraft } from "../rules";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;
/** What the footer's save button submits, from outside the form. */
export const PERSON_FORM = "person-form";

export interface PersonFormOptions {
  save: PersonSave;
  /** Some field would not open under the key, so saving is refused. */
  locked: boolean;
  locale: Locale;
  t: Dictionary;
}

export default function PersonForm(options: PersonFormOptions) {
  const save = options.save;
  const t = options.t;
  const field = (name: keyof PersonDraft) => ({
    id: `person-${name}`,
    value: save.draft[name],
    issue: save.issues[name],
    onChange: (value: string) => save.edit(name, value),
    t,
  });

  return (
    <form
      className="flex flex-col gap-4"
      id={PERSON_FORM}
      onSubmit={(event) => {
        event.preventDefault();
        save.submit();
      }}
    >
      <fieldset className="contents" disabled={save.pending}>
        <div className="grid gap-4 sm:grid-cols-2">
          <PersonField {...field("name")} label={t.people.name} />
          <PersonField
            {...field("relation")}
            hint={t.people.relationHint}
            label={t.people.relation}
          />
          <BirthdayField
            issue={save.issues.birthday}
            locale={options.locale}
            onChange={(value) => save.edit("birthday", value)}
            t={t}
            value={save.draft.birthday}
          />
        </div>
        <ProximityField
          invalid={Boolean(save.issues.proximity)}
          onChange={(value) => save.edit("proximity", value)}
          t={t}
          value={save.draft.proximity}
        />
        <PersonField
          {...field("notes")}
          hint={t.people.notesHint}
          label={t.people.notes}
          multiline
        />
      </fieldset>
      {options.locked && <p className="text-sm text-accent">{t.people.locked}</p>}
    </form>
  );
}

interface StatusOptions {
  status: SaveStatus;
  t: Dictionary;
}

function Status(options: StatusOptions) {
  const t = options.t.people;

  switch (options.status) {
    case "saved":
      return (
        <span className="flex items-center gap-1.5 text-brand">
          <CheckCircleIcon size={ICON_SIZE} weight="fill" />
          {t.saved}
        </span>
      );
    case "failed":
      return <span className="text-accent">{t.saveFailed}</span>;
    case "missing":
      return <span className="text-accent">{t.missing}</span>;
    default:
      return null;
  }
}

/** How the last save went, and the button that makes the next one. */
export function PersonSaveBar(options: PersonFormOptions) {
  const t = options.t.people;

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-muted">
        <Status status={options.save.status} t={options.t} />
      </p>
      <button
        className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand transition hover:bg-brand-strong disabled:opacity-50"
        disabled={options.save.pending || options.locked}
        form={PERSON_FORM}
        type="submit"
      >
        <FloppyDiskIcon size={ICON_SIZE} weight="fill" />
        {options.save.pending ? t.saving : t.save}
      </button>
    </div>
  );
}
