"use client";

import { FingerprintIcon, TrashIcon } from "@phosphor-icons/react";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 15;

export interface PasskeyListOptions {
  t: Dictionary;
  onRemove: (credentialId: string) => void;
}

export default function PasskeyList(options: PasskeyListOptions) {
  const { state } = useVault();
  const t = options.t.vault;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.passkeys}</p>

      {state.passkeys.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted">{t.noPasskeys}</p>
      ) : (
        <ul className="mt-1.5 flex flex-col gap-1">
          {state.passkeys.map((passkey) => (
            <li
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              key={passkey.credentialId}
            >
              <FingerprintIcon size={ICON_SIZE} weight="fill" />
              <span className="flex-1 truncate">{passkey.label}</span>
              <button
                className="text-muted hover:text-accent"
                disabled={state.busy}
                onClick={() => options.onRemove(passkey.credentialId)}
                type="button"
              >
                <TrashIcon size={ICON_SIZE} />
                <span className="sr-only">{t.removePasskey}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
