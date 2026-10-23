"use client";

import { useState, useTransition } from "react";
import { savePersonAction } from "./actions";
import { PeopleActionType, usePeople } from "./people_state";
import { tidyDraft, validatePerson, type PersonDraft, type PersonIssues } from "./rules";

export type SaveStatus = "idle" | "saved" | "failed" | "missing";

export interface PersonSave {
  draft: PersonDraft;
  issues: PersonIssues;
  status: SaveStatus;
  pending: boolean;
  edit: (field: keyof PersonDraft, value: string) => void;
  submit: () => void;
}

/**
 * One person's form: checked here against the rules the server action checks
 * again, then sealed by the agent under the key. A refused or failed save
 * leaves the draft as it was, so nothing typed is lost. A locked person is
 * never saved: every field is written, stand-ins for what the key would not
 * open included, so saving would seal them over what is kept.
 */
export function usePersonSave(
  id: string | null,
  initial: PersonDraft,
  key: string,
  locked: boolean,
): PersonSave {
  const { dispatch } = usePeople();
  const [draft, setDraft] = useState(initial);
  const [issues, setIssues] = useState<PersonIssues>({});
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [pending, startTransition] = useTransition();

  function edit(field: keyof PersonDraft, value: string) {
    setDraft({ ...draft, [field]: value });
    setIssues({ ...issues, [field]: undefined });
    setStatus("idle");
  }

  function submit() {
    if (locked) {
      return;
    }

    const tidy = tidyDraft(draft);
    const found = validatePerson(tidy);

    if (Object.keys(found).length > 0) {
      setIssues(found);
      return;
    }

    startTransition(async () => {
      const outcome = await savePersonAction(id, tidy, key).catch(() => null);

      if (outcome?.kind === "saved") {
        dispatch({
          type: PeopleActionType.Saved,
          data: { person: outcome.person, opened: { ...tidy, unreadable: [] } },
        });
        setDraft(tidy);
        setStatus("saved");
        return;
      }

      if (outcome?.kind === "invalid" && Object.keys(outcome.issues).length > 0) {
        setIssues(outcome.issues);
        return;
      }

      setStatus(outcome?.kind === "missing" ? "missing" : "failed");
    });
  }

  return { draft, issues, status, pending, edit, submit };
}
