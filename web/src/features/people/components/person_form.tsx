"use client";

import { CheckCircleIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import PersonField from "./person_field";
import ProximityField from "./proximity_field";
import { usePersonSave, type SaveStatus } from "../use_person_save";
import type { PersonDraft } from "../rules";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;

export interface PersonFormOptions {
  /** Null for someone new. */
  id: string | null;
  initial: PersonDraft;
  /** Some field would not open under the key, so saving is refused. */
  locked: boolean;
  agentKey: string;
  t: Dictionary;
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

export default function PersonForm(options: PersonFormOptions) {
  const save = usePersonSave(options.id, options.initial, options.agentKey, options.locked);
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
      onSubmit={(event) => {
        event.preventDefault();
        save.submit();
      }}
    >
      <fieldset className="contents" disabled={save.pending}>
        <PersonField {...field("name")} label={t.people.name} />
        <PersonField
          {...field("relation")}
          hint={t.people.relationHint}
          label={t.people.relation}
        />
        <PersonField
          {...field("birthday")}
          hint={t.people.birthdayHint}
          label={t.people.birthday}
        />
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
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted">
          <Status status={save.status} t={t} />
        </p>
        <button
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand transition hover:bg-brand-strong disabled:opacity-50"
          disabled={save.pending || options.locked}
          type="submit"
        >
          <FloppyDiskIcon size={ICON_SIZE} weight="fill" />
          {save.pending ? t.people.saving : t.people.save}
        </button>
      </div>
    </form>
  );
}
