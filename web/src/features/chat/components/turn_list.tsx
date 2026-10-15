"use client";

import Image from "next/image";
import Markdown from "@/components/markdown";
import Moment from "./moment";
import ReasoningPanel from "./reasoning_panel";
import ToolSteps from "./tool_steps";
import TypingDots from "./typing_dots";
import { useChat, type ChatTurn } from "../chat_state";
import { endsARun } from "../moments";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

export interface TurnListOptions {
  t: Dictionary;
  locale: Locale;
  /** The reader's zone, from their profile. */
  timezone: string;
}

/**
 * Only what the person said is a bubble. The journal's own replies run the full
 * width of the column as prose, because they are the thing being read rather
 * than a turn in a conversation.
 *
 * A time appears under the last turn of a run rather than under every one:
 * three messages typed in the same half-minute do not each need the clock on
 * them, and stamping all of them pushes the words apart for nothing.
 */
export default function TurnList(options: TurnListOptions) {
  const { state } = useChat();
  // The turn being written is always the last one, and only while a run is in
  // flight — otherwise nothing is live and every panel is folded away.
  const streaming =
    state.status === "streaming" || state.status === "waiting" ? state.turns.at(-1)?.id : undefined;

  return (
    <>
      {state.turns.map((turn, at) =>
        turn.from === "you" ? (
          <YourTurn
            key={turn.id}
            locale={options.locale}
            next={state.turns[at + 1]}
            t={options.t}
            timezone={options.timezone}
            turn={turn}
          />
        ) : (
          <JournalTurn
            key={turn.id}
            live={turn.id === streaming}
            locale={options.locale}
            next={state.turns[at + 1]}
            t={options.t}
            timezone={options.timezone}
            turn={turn}
          />
        ),
      )}
    </>
  );
}

interface YourTurnOptions {
  t: Dictionary;
  locale: Locale;
  timezone: string;
  turn: ChatTurn;
  /** The turn after this one, which decides whether it carries the time. */
  next?: ChatTurn;
}

// The pictures sit above the words, the way a message with a photo reads.
function YourTurn(options: YourTurnOptions) {
  const turn = options.turn;
  const t = options.t.chat;

  return (
    <div className="flex flex-col items-end gap-1 motion-safe:animate-rise-in">
      {turn.images ? <SentPictures alt={options.t.images.attached} images={turn.images} /> : null}
      {turn.text === "" ? null : (
        <div
          aria-label={t.you}
          className="max-w-lg rounded-2xl rounded-br-sm border border-user-bubble-border bg-user-bubble px-4 py-2.5 text-sm text-on-user-bubble"
        >
          {turn.text}
        </div>
      )}
      {endsARun(turn.at, options.next, turn.from) ? (
        <Moment
          className="px-1 text-xs text-muted"
          fallbackLocale={options.locale}
          iso={turn.at}
          timezone={options.timezone}
        />
      ) : null}
    </div>
  );
}

const SENT_PICTURE_PX = 112;

function SentPictures(options: { images: string[]; alt: string }) {
  return (
    <ul className="flex max-w-lg flex-wrap justify-end gap-1">
      {options.images.map((src, at) => (
        <li key={at}>
          <Image
            alt={options.alt}
            className="rounded-xl border border-border object-cover"
            height={SENT_PICTURE_PX}
            src={src}
            style={{ height: SENT_PICTURE_PX, width: SENT_PICTURE_PX }}
            unoptimized
            width={SENT_PICTURE_PX}
          />
        </li>
      ))}
    </ul>
  );
}

interface JournalTurnOptions {
  t: Dictionary;
  locale: Locale;
  timezone: string;
  turn: ChatTurn;
  /** The turn after this one, which decides whether it carries the time. */
  next?: ChatTurn;
  /** Whether this is the turn a run is writing right now. */
  live: boolean;
}

function JournalTurn(options: JournalTurnOptions) {
  const turn = options.turn;

  return (
    <div aria-label={options.t.chat.journal} className="text-sm motion-safe:animate-rise-in">
      <ReasoningPanel live={options.live} reasoning={turn.reasoning} t={options.t} />
      <ToolSteps steps={turn.tools} t={options.t} />
      {turn.text === "" ? (
        <Waiting live={options.live} t={options.t} turn={turn} />
      ) : (
        <>
          <div className={options.live ? "live-caret" : undefined}>
            <Markdown>{turn.text}</Markdown>
          </div>
          {endsARun(turn.at, options.next, turn.from) ? (
            <Moment
              className="mt-1 block text-xs text-muted"
              fallbackLocale={options.locale}
              iso={turn.at}
              timezone={options.timezone}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

// Dots only while nothing else is moving: a tool under way already says the
// journal is at work, and says what at.
function Waiting(options: { t: Dictionary; turn: ChatTurn; live: boolean }) {
  const busy = options.turn.tools.some((step) => step.status === "running");

  return options.live && !busy ? <TypingDots label={options.t.chat.thinking} /> : null;
}
