"use client";

import { SimpleProvider } from "@eetr/react-reducer-utils";
import OverlayDialog from "@/components/overlay_dialog";
import PeopleBody from "./people_body";
import {
  initialPeopleState,
  peopleReducer,
  PeopleDispatchContext,
  PeopleStateContext,
} from "../people_state";
import { useViewHref } from "@/features/shell/use_view_href";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";
import type { Person } from "../types";

export interface PeopleOverlayOptions {
  /** Sealed, as stored; null when they could not be fetched. */
  people: Person[] | null;
  subject: string;
  /** The reader's zone, which "today" and every countdown are counted in. */
  timezone: string;
  locale: Locale;
  t: Dictionary;
}

// SimpleProvider rather than bootstrapProvider: the initial state is this
// request's people, which a module-scope provider cannot know.
export default function PeopleOverlay(options: PeopleOverlayOptions) {
  const href = useViewHref();
  const t = options.t;

  return (
    <OverlayDialog
      closeHref={href(`/${options.locale}`)}
      closeLabel={t.close}
      subtitle={t.people.subtitle}
      title={t.people.title}
    >
      {options.people ? (
        <SimpleProvider
          dispatchContext={PeopleDispatchContext}
          initialState={initialPeopleState(options.people)}
          reducer={peopleReducer}
          stateContext={PeopleStateContext}
        >
          <PeopleBody
            locale={options.locale}
            subject={options.subject}
            t={t}
            timezone={options.timezone}
          />
        </SimpleProvider>
      ) : (
        <p className="text-sm text-accent">{t.people.loadFailed}</p>
      )}
    </OverlayDialog>
  );
}
