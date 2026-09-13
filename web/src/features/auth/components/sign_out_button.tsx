import { SignOutIcon } from "@phosphor-icons/react/dist/ssr";
import { signOut } from "@/auth";

const ICON_SIZE = 16;

export interface SignOutButtonOptions {
  locale: string;
  label: string;
}

/**
 * A way off the screens that come before the app.
 *
 * There is no vault key in this browser on either of them — that is why they are
 * showing — so signing out here has nothing to clear.
 */
export default function SignOutButton(options: SignOutButtonOptions) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: `/${options.locale}/signin` });
      }}
    >
      <button
        className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition hover:opacity-90"
        type="submit"
      >
        <SignOutIcon size={ICON_SIZE} weight="fill" />
        {options.label}
      </button>
    </form>
  );
}
