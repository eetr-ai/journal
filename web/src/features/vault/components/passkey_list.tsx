"use client";

import { ArrowsClockwiseIcon, FingerprintIcon, TrashIcon } from "@phosphor-icons/react";
import { useVault } from "../vault_state";
import type { Dictionary } from "@/i18n/en";
import type { VaultPasskey } from "../types";

const ICON_SIZE = 15;

export interface PasskeyListOptions {
  t: Dictionary;
  onRemove: (credentialId: string) => void;
  /** Offered only on the row this browser opens the vault with. */
  onReset: () => void;
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
            <PasskeyRow
              key={passkey.credentialId}
              mine={passkey.credentialId === state.thisDevice}
              onRemove={options.onRemove}
              onReset={options.onReset}
              passkey={passkey}
              t={options.t}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface PasskeyRowOptions {
  t: Dictionary;
  passkey: VaultPasskey;
  mine: boolean;
  onRemove: (credentialId: string) => void;
  onReset: () => void;
}

function PasskeyRow(options: PasskeyRowOptions) {
  const { state } = useVault();
  const t = options.t.vault;

  return (
    <li className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <FingerprintIcon size={ICON_SIZE} weight="fill" />
      <span className="flex-1 truncate">
        {options.passkey.label}
        {options.mine ? <span className="ml-2 text-xs text-brand">{t.thisDevice}</span> : null}
      </span>
      {options.mine ? (
        <button
          className="text-muted hover:text-foreground"
          disabled={state.busy}
          onClick={options.onReset}
          title={t.resetTitle}
          type="button"
        >
          <ArrowsClockwiseIcon size={ICON_SIZE} />
          <span className="sr-only">{t.resetTitle}</span>
        </button>
      ) : null}
      <button
        className="text-muted hover:text-accent"
        disabled={state.busy}
        onClick={() => options.onRemove(options.passkey.credentialId)}
        type="button"
      >
        <TrashIcon size={ICON_SIZE} />
        <span className="sr-only">{t.removePasskey}</span>
      </button>
    </li>
  );
}
