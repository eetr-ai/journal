import Image from "next/image";
import Link from "next/link";
import PanelToggle from "./panel_toggle";
import SearchButton from "./search_button";
import UserMenu from "./user_menu";
import { signOut } from "@/auth";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const LOGO_SIZE = 28;

export interface ShellHeaderOptions {
  t: Dictionary;
  locale: Locale;
  name: string;
  email: string;
  hasImage: boolean;
}

export default function ShellHeader(options: ShellHeaderOptions) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
      <PanelToggle panel="drawer" t={options.t} />

      {/* The name goes where there is no room for it. Four controls and a
          wordmark do not fit across a phone, and the one that can be spared is
          the one naming an app you are already inside. */}
      <Link className="flex shrink-0 items-center gap-2" href={`/${options.locale}`}>
        <Image alt="" height={LOGO_SIZE} priority src="/mascot.png" width={LOGO_SIZE} />
        <span className="hidden font-semibold sm:inline">{options.t.appName}</span>
      </Link>

      <div className="flex-1" />

      <SearchButton t={options.t} />

      <PanelToggle panel="entry" t={options.t} />

      <UserMenu
        email={options.email}
        hasImage={options.hasImage}
        locale={options.locale}
        name={options.name}
        signOutAction={async () => {
          "use server";
          await signOut({ redirectTo: `/${options.locale}/signin` });
        }}
        t={options.t}
      />
    </header>
  );
}
