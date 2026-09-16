import Image from "next/image";
import Link from "next/link";
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
      <Link className="flex items-center gap-2" href={`/${options.locale}`}>
        <Image alt="" height={LOGO_SIZE} priority src="/mascot.png" width={LOGO_SIZE} />
        <span className="font-semibold">{options.t.appName}</span>
      </Link>

      <div className="flex-1" />

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
