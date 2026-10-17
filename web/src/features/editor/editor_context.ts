"use client";

import { createContext } from "react";
import type { OpenedImage } from "@/features/images/types";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

/**
 * What the blocks drawn inside the editor need from the page around it. A
 * context because they are rendered by the editor, not by this tree's props.
 */
export interface EntryEditorContextValue {
  t: Dictionary;
  locale: Locale;
  pictures: Map<string, OpenedImage>;
  picturesLoading: boolean;
  /** Stores what was picked or dropped on a picture slot, and puts it there. */
  fillSlot: (files: File[], token: string) => void;
}

export const EntryEditorContext = createContext<EntryEditorContextValue | null>(null);
