import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import type { AuthErrorCode } from "../errors";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 18;

export interface AuthErrorNoticeOptions {
  code: AuthErrorCode;
  t: Dictionary;
}

/**
 * What went wrong, in words, plus the raw code as a reference someone can
 * quote. The code is never the explanation: it names an internal failure mode,
 * and Auth.js coarsens several real causes into each one.
 */
export default function AuthErrorNotice(options: AuthErrorNoticeOptions) {
  const copy = options.t.errors.signIn.codes[options.code];

  return (
    <div className="flex max-w-md gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4 text-left">
      <span className="mt-0.5 shrink-0 text-accent">
        <WarningCircleIcon size={ICON_SIZE} weight="fill" />
      </span>
      <div>
        <p className="text-sm font-medium">{copy.title}</p>
        <p className="mt-1 text-sm text-muted">{copy.body}</p>
        <p className="mt-2 font-mono text-[11px] text-muted">
          {options.t.errors.signIn.reference}: {options.code}
        </p>
      </div>
    </div>
  );
}
