"use client";

import { useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import FactForm from "./fact_form";
import { deleteFactAction } from "../actions";
import { PeopleActionType, usePeople } from "../people_state";
import type { OpenedFact } from "../types";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 14;

export interface PersonFactsOptions {
  personId: string;
  agentKey: string;
  t: Dictionary;
}

function FactItem(options: { personId: string; fact: OpenedFact; t: Dictionary }) {
  const { dispatch } = usePeople();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function forget() {
    setBusy(true);
    const gone = await deleteFactAction(options.personId, options.fact.id).catch(() => false);

    setBusy(false);

    if (gone) {
      dispatch({ type: PeopleActionType.FactRemoved, data: options.fact.id });
      return;
    }

    setFailed(true);
  }

  return (
    <li className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-start gap-3">
        <p className="flex-1 whitespace-pre-wrap text-sm">{options.fact.fact}</p>
        <button
          aria-label={options.t.people.forgetFact}
          className="tap-target rounded-md p-1 text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          disabled={busy}
          onClick={() => void forget()}
          title={options.t.people.forgetFact}
          type="button"
        >
          <XIcon size={ICON_SIZE} weight="bold" />
        </button>
      </div>
      {failed && <p className="text-xs text-accent">{options.t.people.forgetFactFailed}</p>}
    </li>
  );
}

function FactList(options: PersonFactsOptions) {
  const { state } = usePeople();
  const t = options.t.people;
  const facts = state.facts;

  if (facts.status === "failed") {
    return <p className="text-sm text-accent">{t.factsFailed}</p>;
  }

  if (facts.status !== "ready") {
    return <p className="text-sm text-muted">{t.opening}</p>;
  }

  if (facts.items.length === 0) {
    return <p className="text-sm text-muted">{t.noFacts}</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {facts.items.map((fact) => (
        <FactItem fact={fact} key={fact.id} personId={options.personId} t={options.t} />
      ))}
    </ul>
  );
}

export default function PersonFacts(options: PersonFactsOptions) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{options.t.people.facts}</h2>
      <FactList {...options} />
      <FactForm agentKey={options.agentKey} personId={options.personId} t={options.t} />
    </section>
  );
}
