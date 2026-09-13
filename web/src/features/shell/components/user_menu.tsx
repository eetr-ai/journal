"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GearSixIcon, SignOutIcon } from "@phosphor-icons/react";
import Avatar from "./avatar";
import LanguagePicker from "@/components/language_picker";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const AVATAR_SIZE = 32;
const ICON_SIZE = 16;

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

function MenuItems(options: UserMenuOptions) {
  const t = options.t;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Avatar hasImage={options.hasImage} name={options.name} size={AVATAR_SIZE} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{options.name}</p>
          <p className="truncate text-xs text-muted">{options.email}</p>
        </div>
      </div>

      <div className="p-1.5">
        <Link
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-surface-muted"
          href={`/${options.locale}/settings`}
        >
          <GearSixIcon size={ICON_SIZE} weight="fill" />
          {t.settings}
        </Link>

        <div className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm">
          <span>{t.language}</span>
          <LanguagePicker current={options.locale} label={t.language} />
        </div>
      </div>

      <form action={options.signOutAction} className="border-t border-border p-1.5">
        <button
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-surface-muted"
          type="submit"
        >
          <SignOutIcon size={ICON_SIZE} weight="fill" />
          {t.signOut}
        </button>
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
        className="flex rounded-full ring-offset-2 ring-offset-surface focus:outline-none focus:ring-2 focus:ring-brand"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <Avatar hasImage={options.hasImage} name={options.name} size={AVATAR_SIZE} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
          role="menu"
        >
          <MenuItems {...options} />
        </div>
      )}
    </div>
  );
}
