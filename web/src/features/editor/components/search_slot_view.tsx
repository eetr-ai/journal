"use client";

import { useEffect, useRef } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
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
      <span className="text-muted">
        <MagnifyingGlassIcon size={ICON_SIZE} />
      </span>
      <input
        aria-label={options.kind === "quotes" ? labels.findQuote : labels.findSong}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        onChange={(event) => options.slot.type(event.target.value)}
        onKeyDown={(event) => keyed({ ...options, event })}
        placeholder={options.kind === "quotes" ? labels.findQuote : labels.findSong}
        ref={field}
        value={options.slot.state.query}
      />
      {KINDS.map((each) => (
        <button
          aria-pressed={each === options.kind}
          className={`rounded px-2 py-0.5 text-xs ${each === options.kind ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground"}`}
          key={each}
          onClick={() => options.onKind(each)}
          type="button"
        >
          {labels[each]}
        </button>
      ))}
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
  const line = {
    idle: labels.hint,
    searching: labels.searching,
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
