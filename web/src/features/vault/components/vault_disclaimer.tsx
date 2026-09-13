"use client";

import { useState } from "react";
import { CaretDownIcon, EyeIcon, LockKeyIcon, WarningIcon } from "@phosphor-icons/react";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;
const CARET_SIZE = 14;

export interface VaultDisclaimerOptions {
  t: Dictionary;
}

/**
 * The summary is what most people will read, so it carries the one thing they
 * cannot undo. The detail is a click away rather than a wall.
 */
export default function VaultDisclaimer(options: VaultDisclaimerOptions) {
  const [open, setOpen] = useState(false);
  const t = options.t.vault;

  const blocks = [
    {
      icon: <LockKeyIcon size={ICON_SIZE} weight="fill" />,
      title: t.protectedTitle,
      body: t.protectedBody,
      tone: "text-brand",
    },
    {
      icon: <EyeIcon size={ICON_SIZE} weight="fill" />,
      title: t.visibleTitle,
      body: t.visibleBody,
      tone: "text-highlight",
    },
    {
      icon: <WarningIcon size={ICON_SIZE} weight="fill" />,
      title: t.lossTitle,
      body: t.lossBody,
      tone: "text-accent",
    },
  ];

  return (
    <div className="w-full rounded-lg border border-border bg-surface-muted">
      <button
        aria-expanded={open}
        className="flex w-full items-start gap-2.5 p-4 text-left"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="mt-0.5 shrink-0 text-brand">
          <LockKeyIcon size={ICON_SIZE} weight="fill" />
        </span>
        <span className="flex-1 text-xs leading-relaxed text-muted">{t.summary}</span>
        <span
          className={`mt-0.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <CaretDownIcon size={CARET_SIZE} weight="bold" />
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {blocks.map((block) => (
            <div className="flex gap-2.5" key={block.title}>
              <span className={`mt-0.5 shrink-0 ${block.tone}`}>{block.icon}</span>
              <div>
                <p className="text-xs font-semibold">{block.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{block.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
