"use client";

import { useEffect, useRef, useState } from "react";
import { GearSixIcon, LockKeyIcon, SignOutIcon } from "@phosphor-icons/react";
import Avatar from "./avatar";
import { forgetEveryKey } from "@/features/vault/session";
import LanguageOptions from "./language_options";
import MenuRow from "./menu_row";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const AVATAR_SIZE = 32;
const MENU_AVATAR_SIZE = 36;
const ICON_SIZE = 15;

export interface UserMenuOptions {
  name: string;
  email: string;
  hasImage: boolean;
  locale: Locale;
  t: Dictionary;
  /** The sign-out server action, handed down so this stays a plain form post. */
  signOutAction: () => Promise<void>;
}

/** Closes the menu on a click anywhere outside it, and on Escape. */
function useDismiss(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onDismiss();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss]);

  return ref;
}

function MenuBody(options: UserMenuOptions) {
  const t = options.t;

  return (
    <>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar hasImage={options.hasImage} name={options.name} size={MENU_AVATAR_SIZE} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{options.name}</p>
          <p className="truncate text-xs leading-tight text-muted">{options.email}</p>
        </div>
      </div>

      <div className="border-t border-border p-1">
        <MenuRow href={`/${options.locale}/settings`} icon={<GearSixIcon size={ICON_SIZE} />}>
          {t.settings}
        </MenuRow>
        <MenuRow href={`/${options.locale}/privacy`} icon={<LockKeyIcon size={ICON_SIZE} />}>
          {t.vault.title}
        </MenuRow>
      </div>

      <div className="border-t border-border p-1">
        <p className="px-2 pb-0.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          {t.language}
        </p>
        <LanguageOptions current={options.locale} />
      </div>

      {/* The unlocked data key is cleared before the session goes: whoever
          signs in next is not this person. */}
      <form
        action={options.signOutAction}
        className="border-t border-border p-1"
        onSubmit={() => void forgetEveryKey()}
      >
        <MenuRow icon={<SignOutIcon size={ICON_SIZE} />} submit>
          {t.signOut}
        </MenuRow>
      </form>
    </>
  );
}

export default function UserMenu(options: UserMenuOptions) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={options.name}
        className="flex rounded-full ring-1 ring-border transition hover:ring-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <Avatar hasImage={options.hasImage} name={options.name} size={AVATAR_SIZE} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
          role="menu"
        >
          <MenuBody {...options} />
        </div>
      )}
    </div>
  );
}
