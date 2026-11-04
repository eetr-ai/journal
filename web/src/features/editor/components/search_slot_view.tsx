"use client";

import { useEffect, useRef, useState } from "react";
import {
  MusicNotesIcon,
  QuotesIcon,
  SpinnerGapIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useContextNullSafe } from "@eetr/react-reducer-utils";
import type { ResearchHit } from "@/features/research/types";
import type { Dictionary } from "@/i18n/en";
import { EntryEditorContext } from "../editor_context";
import { VERBATIM } from "../extensions/verbatim";
import type { SearchKind } from "../extensions/slots";
import { chosen, useSearchSlot, type SearchSlot } from "../use_search_slot";

const ICON_SIZE = 16;
const KINDS: SearchKind[] = ["quotes", "songs"];
const KIND_ICONS: Record<SearchKind, Icon> = { quotes: QuotesIcon, songs: MusicNotesIcon };

/**
 * A quote or a song looked for on the web, in place. The one picked becomes
 * the card the entry keeps; the block itself is never kept.
 */
export default function SearchSlotView(params: ReactNodeViewProps) {
  const context = useContextNullSafe(EntryEditorContext);
  const labels = context.t.editor.slots;
  const kind = params.node.attrs.kind as SearchKind;
  const slot = useSearchSlot(kind, context.locale);

  const add = (hit: ResearchHit) => {
    const at = params.getPos();

    if (typeof at === "number") {
      params.editor
        .chain()
        .focus()
        .insertContentAt(
          { from: at, to: at + params.node.nodeSize },
          { type: VERBATIM, attrs: { source: hit.source } },
        )
        .run();
    }
  };

  const close = () => {
    params.deleteNode();
    params.editor.commands.focus();
  };

  return (
    <NodeViewWrapper
      className={`relative my-2 rounded-lg border border-border bg-surface shadow-sm ${params.selected ? "editor-selected" : ""}`}
      contentEditable={false}
    >
      <SearchBar
        add={add}
        close={close}
        kind={kind}
        onKind={(each) => params.updateAttributes({ kind: each })}
        slot={slot}
        t={context.t}
      />
      <Results add={add} labels={labels} slot={slot} />
    </NodeViewWrapper>
  );
}

interface SearchBarOptions {
  t: Dictionary;
  slot: SearchSlot;
  kind: SearchKind;
  onKind: (kind: SearchKind) => void;
  add: (hit: ResearchHit) => void;
  close: () => void;
}

// The query, which kind of thing it looks for, and a way out.
function SearchBar(options: SearchBarOptions) {
  const labels = options.t.editor.slots;
  const field = useRef<HTMLInputElement>(null);

  // Placed to be typed into, the way a menu item is chosen to be used.
  useEffect(() => field.current?.focus(), []);

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <KindSwitch kind={options.kind} labels={labels} onKind={options.onKind} />
      <input
        aria-label={options.kind === "quotes" ? labels.findQuote : labels.findSong}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        onChange={(event) => options.slot.type(event.target.value)}
        onKeyDown={(event) => keyed({ ...options, event })}
        placeholder={options.kind === "quotes" ? labels.findQuote : labels.findSong}
        ref={field}
        value={options.slot.state.query}
      />
      <button
        aria-label={options.t.editor.remove}
        className="rounded p-1 text-muted hover:text-accent"
        onClick={options.close}
        title={options.t.editor.remove}
        type="button"
      >
        <XIcon size={ICON_SIZE} />
      </button>
    </div>
  );
}

interface KindSwitchOptions {
  kind: SearchKind;
  labels: Dictionary["editor"]["slots"];
  onKind: (kind: SearchKind) => void;
}

// Leads the bar, so what the field looks for is read before what is typed into it.
function KindSwitch(options: KindSwitchOptions) {
  return (
    <fieldset className="flex shrink-0 rounded-md border border-border p-0.5">
      {KINDS.map((each) => {
        const KindIcon = KIND_ICONS[each];
        const on = each === options.kind;

        return (
          <button
            aria-pressed={on}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs ${on ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground"}`}
            key={each}
            onClick={() => options.onKind(each)}
            type="button"
          >
            <KindIcon size={ICON_SIZE} weight={on ? "fill" : "regular"} />
            {options.labels[each]}
          </button>
        );
      })}
    </fieldset>
  );
}

interface KeyedOptions {
  event: React.KeyboardEvent<HTMLInputElement>;
  slot: SearchSlot;
  kind: SearchKind;
  add: (hit: ResearchHit) => void;
  close: () => void;
}

const STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

function keyed(options: KeyedOptions): void {
  const { event, slot } = options;

  if (event.key === "Escape") {
    event.preventDefault();
    options.close();
  } else if (event.key === "Enter") {
    event.preventDefault();
    const hit = chosen(slot.state, options.kind);
    if (hit) {
      options.add(hit);
    } else {
      slot.search();
    }
  } else if (event.key in STEPS) {
    event.preventDefault();
    slot.move(STEPS[event.key]);
  }
}

interface ResultsOptions {
  slot: SearchSlot;
  labels: Dictionary["editor"]["slots"];
  add: (hit: ResearchHit) => void;
}

function Results(options: ResultsOptions) {
  const { state } = options.slot;
  const labels = options.labels;
  if (state.status === "searching") {
    return <Waiting labels={labels} startedAt={state.startedAt} />;
  }

  const line = {
    idle: labels.hint,
    slow: labels.slow,
    failed: labels.failed,
    found: state.hits.length === 0 ? labels.none : null,
  }[state.status];

  if (line) {
    return <p className="px-3 py-2.5 text-xs text-muted">{line}</p>;
  }

  return (
    <ul className="max-h-72 overflow-y-auto p-1.5">
      {state.hits.map((hit, index) => (
        <li key={hit.source}>
          <button
            aria-current={index === state.index}
            className={`w-full rounded-md px-2.5 py-2 text-left ${index === state.index ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
            onClick={() => options.add(hit)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <span className="line-clamp-2 block text-sm">{hit.title}</span>
            <span className="block truncate text-xs text-muted">{hit.detail}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// When the waiting line moves on: a web search and a model reading it can take most of a minute.
const LONGER_AFTER_MS = 8000;
const LONGEST_AFTER_MS = 25_000;
const TICK_MS = 1000;

interface WaitingOptions {
  labels: Dictionary["editor"]["slots"];
  startedAt: number;
}

function waitingLine(labels: WaitingOptions["labels"], waited: number): string {
  if (waited >= LONGEST_AFTER_MS) {
    return labels.searchingLongest;
  }

  return waited >= LONGER_AFTER_MS ? labels.searchingLonger : labels.searching;
}

// A search out, said to be one, and said again as it goes on.
function Waiting(options: WaitingOptions) {
  const [now, setNow] = useState(options.startedAt);

  useEffect(() => {
    const ticking = setInterval(() => setNow(Date.now()), TICK_MS);

    return () => clearInterval(ticking);
  }, []);

  return (
    <div aria-live="polite" className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted">
      <SpinnerGapIcon className="animate-spin" size={ICON_SIZE} />
      <span>{waitingLine(options.labels, now - options.startedAt)}</span>
    </div>
  );
}
