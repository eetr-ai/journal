"use client";

import { useAgentKey } from "@/features/chat/use_agent_key";
import PeopleList from "./people_list";
import PersonView from "./person_view";
import { usePeople } from "../people_state";
import { useOpenedPeople, usePersonFacts } from "../use_opened_people";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface PeopleBodyOptions {
  subject: string;
  timezone: string;
  locale: Locale;
  t: Dictionary;
}

/** Nothing is shown until the key is read: a list of ciphertext is not a list. */
export default function PeopleBody(options: PeopleBodyOptions) {
  const key = useAgentKey(options.subject);
  const { state } = usePeople();
  const t = options.t;

  useOpenedPeople(key, t.people.unreadable);
  usePersonFacts(key, t.people.unreadable);

  if (!key) {
    return <p className="text-sm text-muted">{t.people.opening}</p>;
  }

  if (state.selected === null) {
    return <PeopleList locale={options.locale} t={t} timezone={options.timezone} />;
  }

  return <PersonView agentKey={key} t={t} />;
}
