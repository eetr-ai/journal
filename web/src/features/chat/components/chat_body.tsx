"use client";

import { TrashIcon } from "@phosphor-icons/react";
import ChatNotice from "./chat_notice";
import ConfirmDialog from "@/components/confirm_dialog";
import Composer from "./composer";
import TurnList from "./turn_list";
import { useChat } from "../chat_state";
import { useStickToBottom } from "../use_stick_to_bottom";
import { useOpenedTurns } from "../use_opened_turns";
import { useForgetting } from "../use_forgetting";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface ChatBodyOptions {
  t: Dictionary;
  locale: Locale;
  unavailable: boolean;
  timezone: string;
  subject: string;
}

const ICON_SIZE = 16;

export default function ChatBody(options: ChatBodyOptions) {
  const { state } = useChat();
  const going = useForgetting(state.threadId, options.locale);
  const t = options.t.chat;

  useOpenedTurns(options.subject, t.unreadable);
  // Everything that makes the region taller, as one number: a turn arriving, a
  // token landing, or a reasoning panel filling up.
  const written = state.turns.reduce(
    (total, turn) => total + turn.text.length + turn.reasoning.length,
    state.turns.length,
  );
  const { region, onScroll } = useStickToBottom(written);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background md:min-w-64 lg:min-w-80">
      <ChatHeader onForget={going.ask} started={state.turns.length > 0} t={options.t} />

      {going.failed && (
        <p className="border-b border-border px-5 py-2 text-xs text-accent">{t.deleteFailed}</p>
      )}

      {going.asking && (
        <ConfirmDialog
          body={t.deleteConfirm.body}
          cancelLabel={t.deleteConfirm.cancel}
          confirmLabel={t.deleteConfirm.confirm}
          onCancel={going.cancel}
          onConfirm={going.confirm}
          title={t.deleteConfirm.title}
        />
      )}

      <div
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 py-6"
        onScroll={onScroll}
        ref={region}
      >
        {state.turns.length === 0 ? (
          <Nothing t={options.t} unavailable={options.unavailable} />
        ) : (
          <TurnList locale={options.locale} t={options.t} timezone={options.timezone} />
        )}
      </div>

      <ChatNotice t={options.t} />

      {/* The bottom edge is where the home indicator sits, so the padding is
          whichever is larger: the layout's own, or enough to clear it. */}
      <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Composer locale={options.locale} subject={options.subject} t={options.t} />
      </div>
    </section>
  );
}

/** Before anything has been said, and when what was said will not load. */
function Nothing(options: { t: Dictionary; unavailable: boolean }) {
  const t = options.t.chat;

  return (
    <div className="m-auto max-w-sm text-center">
      <p className="text-sm font-medium">
        {options.unavailable ? t.unavailableTitle : t.emptyTitle}
      </p>
      <p className="mt-1 text-sm text-muted">
        {options.unavailable ? t.unavailablePrompt : t.emptyPrompt}
      </p>
    </div>
  );
}

interface ChatHeaderOptions {
  t: Dictionary;
  /** Nothing stored yet has nothing to forget, and the agent has never been
   *  told this id, so asking it to would only 404. */
  started: boolean;
  onForget: () => void;
}

function ChatHeader(options: ChatHeaderOptions) {
  const t = options.t.chat;

  return (
    <header className="flex items-center gap-2 border-b border-border px-5 py-3">
      <h2 className="min-w-0 flex-1 text-sm font-semibold">{t.title}</h2>
      {options.started && (
        <button
          aria-label={t.delete}
          className="tap-target shrink-0 rounded p-1 text-muted hover:bg-surface-muted hover:text-accent"
          onClick={options.onForget}
          title={t.delete}
          type="button"
        >
          <TrashIcon size={ICON_SIZE} />
        </button>
      )}
    </header>
  );
}
