"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_MAX_IMAGES } from "./rules";
import type { ImagesView } from "./types";

/**
 * Whether the composer offers pictures, and how many. Decided on the server and
 * handed down once, rather than threaded through every panel between the page
 * and the box that needs it.
 *
 * The default offers nothing, so a composer rendered outside the provider never
 * offers what the model may not read.
 */
const ImagesConfigContext = createContext<ImagesView>({
  allowed: false,
  maxImages: DEFAULT_MAX_IMAGES,
});

export interface ImagesConfigProviderOptions {
  view: ImagesView;
  children: ReactNode;
}

export function ImagesConfigProvider(options: ImagesConfigProviderOptions) {
  return (
    <ImagesConfigContext.Provider value={options.view}>
      {options.children}
    </ImagesConfigContext.Provider>
  );
}

export function useImagesConfig(): ImagesView {
  return useContext(ImagesConfigContext);
}
