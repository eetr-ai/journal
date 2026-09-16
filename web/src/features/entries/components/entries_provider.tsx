"use client";

import { SimpleProvider } from "@eetr/react-reducer-utils";
import {
  EntriesDispatchContext,
  EntriesStateContext,
  entriesReducer,
  initialEntriesState,
} from "../entries_state";
import type { Entry } from "../types";

export interface EntriesProviderOptions {
  entries: Entry[];
  /** The reader's day, worked out on the server where the zone is known. */
  today: string;
  /** The entry the URL asked for, null for today's. */
  showing: string | null;
  /** Every day with something on it, for the calendar. */
  days: string[];
  children: React.ReactNode;
}

// SimpleProvider rather than bootstrapProvider: the initial state is this
// request's entries and this request's day, and bootstrapProvider fixes state at
// module scope.
//
// It wraps the whole shell rather than the panel, because the chat's stream is
// what writes into this: the agent takes notes while it answers, and the frames
// carrying them arrive in the middle panel's connection.
export default function EntriesProvider(options: EntriesProviderOptions) {
  return (
    <SimpleProvider
      dispatchContext={EntriesDispatchContext}
      initialState={initialEntriesState(
        options.entries,
        options.today,
        options.showing,
        options.days,
      )}
      reducer={entriesReducer}
      stateContext={EntriesStateContext}
    >
      {options.children}
    </SimpleProvider>
  );
}
