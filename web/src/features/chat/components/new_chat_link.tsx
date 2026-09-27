"use client";

import { NotePencilIcon } from "@phosphor-icons/react";
import { useViewHref } from "@/features/shell/use_view_href";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface NewChatLinkOptions {
  locale: Locale;
  label: string;
}

/** A fresh conversation beside the same entry: only the chat is let go of. */
export default function NewChatLink(options: NewChatLinkOptions) {
  const href = useViewHref();

  return (
    <a
      aria-label={options.label}
      className="tap-target shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground"
      href={href(`/${options.locale}`, { chat: null })}
      title={options.label}
    >
      <NotePencilIcon size={ICON_SIZE} />
    </a>
  );
}
