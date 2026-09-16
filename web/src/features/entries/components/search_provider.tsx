"use client";

import { SimpleProvider } from "@eetr/react-reducer-utils";
import {
  SearchDispatchContext,
  SearchStateContext,
  initialSearchState,
  searchReducer,
} from "../search_state";

/**
 * Wraps only the journal bar. A search belongs to the drawer that runs it, not
 * to the shell: nothing outside has to hear about it, and an answer still
 * arriving must not re-render the conversation beside it.
 */
export default function SearchProvider(options: { children: React.ReactNode }) {
  return (
    <SimpleProvider
      dispatchContext={SearchDispatchContext}
      initialState={initialSearchState()}
      reducer={searchReducer}
      stateContext={SearchStateContext}
    >
      {options.children}
    </SimpleProvider>
  );
}
