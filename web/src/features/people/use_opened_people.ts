"use client";

import { useEffect } from "react";
import { openSealed } from "@/features/chat/sealed";
import { readPersonAction } from "./actions";
import { NEW_PERSON, PeopleActionType, usePeople } from "./people_state";
import type { OpenedPerson, Person } from "./types";

/**
 * Opening what the page was handed sealed, under the key in this browser.
 *
 * A value the key will not open shows a stand-in rather than nothing, so a
 * person written under another key reads as someone with a gap in them.
 */

async function openOne(person: Person, key: string, unreadable: string): Promise<OpenedPerson> {
  const open = async (value: string) => (await openSealed(value, key)) ?? unreadable;

  return {
    name: await open(person.name),
    relation: await open(person.relation),
    birthday: await open(person.birthday),
    notes: await open(person.notes),
  };
}

/** Opens whoever is in the list and has not been opened yet. */
export function useOpenedPeople(key: string | null, unreadable: string) {
  const { state, dispatch } = usePeople();
  const { people, opened } = state;

  useEffect(() => {
    const pending = people.filter((person) => !(person.id in opened));

    if (!key || pending.length === 0) {
      return;
    }

    let abandoned = false;

    async function open(agentKey: string) {
      const pairs = await Promise.all(
        pending.map(async (person) => [person.id, await openOne(person, agentKey, unreadable)]),
      );

      if (!abandoned) {
        dispatch({ type: PeopleActionType.Opened, data: Object.fromEntries(pairs) });
      }
    }

    void open(key);

    return () => {
      abandoned = true;
    };
  }, [dispatch, key, opened, people, unreadable]);
}

/** Loads and opens the facts of whoever is selected. */
export function usePersonFacts(key: string | null, unreadable: string) {
  const { state, dispatch } = usePeople();
  const { selected } = state;

  useEffect(() => {
    if (!key || !selected || selected === NEW_PERSON) {
      return;
    }

    let abandoned = false;

    async function load(id: string, agentKey: string) {
      dispatch({ type: PeopleActionType.FactsLoading, data: id });
      // A server action that could not be reached rejects rather than answering.
      const outcome = await readPersonAction(id).catch(() => ({ kind: "failed" }) as const);

      if (abandoned) {
        return;
      }

      if (outcome.kind !== "found") {
        dispatch({ type: PeopleActionType.FactsFailed });
        return;
      }

      const items = await Promise.all(
        outcome.detail.facts.map(async (fact) => ({
          id: fact.id,
          fact: (await openSealed(fact.fact, agentKey)) ?? unreadable,
        })),
      );

      if (!abandoned) {
        dispatch({ type: PeopleActionType.FactsOpened, data: items });
      }
    }

    void load(selected, key);

    return () => {
      abandoned = true;
    };
  }, [dispatch, key, selected, unreadable]);
}
