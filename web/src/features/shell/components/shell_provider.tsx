"use client";

import { SimpleProvider } from "@eetr/react-reducer-utils";
import {
  ShellDispatchContext,
  ShellStateContext,
  initialShellState,
  shellReducer,
} from "../shell_state";

export interface ShellProviderOptions {
  children: React.ReactNode;
}

// Wraps the header as well as the panels: the controls that raise a panel live
// up there, and they dispatch into the same state the panels read.
export default function ShellProvider(options: ShellProviderOptions) {
  return (
    <SimpleProvider
      dispatchContext={ShellDispatchContext}
      initialState={initialShellState()}
      reducer={shellReducer}
      stateContext={ShellStateContext}
    >
      {options.children}
    </SimpleProvider>
  );
}
