"use client";

import { useEffect, useRef } from "react";
import {
  EmojiPicker,
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
} from "frimousse";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

// Served by this app, so the picker never reaches a public CDN.
const EMOJI_DATA_URL = "/api/emoji";
const COLUMNS = 8;

export interface IconPickerOptions {
  labels: Dictionary["editor"]["icon"];
  locale: Locale;
  showRemove: boolean;
  onChoose: (icon: string) => void;
}

function CategoryHeader(params: EmojiPickerListCategoryHeaderProps) {
  const { category, ...rest } = params;

  return (
    <div {...rest} className="bg-surface px-1 pt-2 pb-1 text-xs font-medium text-muted">
      {category.label}
    </div>
  );
}

function Row(params: EmojiPickerListRowProps) {
  return <div {...params} className="flex gap-0.5 px-0.5" />;
}

function EmojiButton(params: EmojiPickerListEmojiProps) {
  const { emoji, ...rest } = params;

  return (
    <button
      {...rest}
      className={`grid size-8 place-items-center rounded text-xl ${
        emoji.isActive ? "bg-surface-muted" : ""
      }`}
      type="button"
    >
      {emoji.emoji}
    </button>
  );
}

const LIST_PARTS = { CategoryHeader, Row, Emoji: EmojiButton };

/** Every emoji there is, searched by name in the reader's language. */
export default function IconPicker(options: IconPickerOptions) {
  const labels = options.labels;
  const search = useRef<HTMLInputElement>(null);

  // Opened on purpose, so the search is where typing should go.
  useEffect(() => search.current?.focus(), []);

  return (
    <div className="absolute top-full left-0 z-20 mt-1 w-[18.5rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-xl">
      <EmojiPicker.Root
        className="flex h-80 flex-col"
        columns={COLUMNS}
        emojibaseUrl={EMOJI_DATA_URL}
        locale={options.locale}
        onEmojiSelect={(chosen) => options.onChoose(chosen.emoji)}
      >
        <EmojiPicker.Search
          aria-label={labels.search}
          ref={search}
          className="m-2 rounded-lg border border-border bg-surface px-2 py-1 text-base outline-none focus:border-brand md:text-sm"
          placeholder={labels.search}
        />
        <EmojiPicker.Viewport className="relative min-h-0 flex-1 px-1.5">
          <EmojiPicker.Loading className="p-3 text-xs text-muted">
            {labels.loading}
          </EmojiPicker.Loading>
          <EmojiPicker.Empty className="p-3 text-xs text-muted">{labels.none}</EmojiPicker.Empty>
          <EmojiPicker.List className="pb-1.5" components={LIST_PARTS} />
        </EmojiPicker.Viewport>
        <Footer
          labels={labels}
          onRemove={() => options.onChoose("")}
          showRemove={options.showRemove}
        />
      </EmojiPicker.Root>
    </div>
  );
}

interface FooterOptions {
  labels: Dictionary["editor"]["icon"];
  showRemove: boolean;
  onRemove: () => void;
}

// The emoji under the pointer by name, and the way to have none at all.
function Footer(options: FooterOptions) {
  return (
    <div className="flex items-center gap-2 border-t border-border px-2 py-1.5">
      <EmojiPicker.ActiveEmoji>
        {({ emoji }) => (
          <span className="min-w-0 flex-1 truncate text-xs text-muted">
            {emoji ? `${emoji.emoji} ${emoji.label}` : options.labels.choose}
          </span>
        )}
      </EmojiPicker.ActiveEmoji>
      <EmojiPicker.SkinToneSelector
        aria-label={options.labels.skinTone}
        className="rounded px-1 text-base hover:bg-surface-muted"
        title={options.labels.skinTone}
      />
      {options.showRemove && (
        <button
          className="shrink-0 rounded px-2 py-0.5 text-xs text-muted hover:bg-surface-muted hover:text-accent"
          onClick={options.onRemove}
          type="button"
        >
          {options.labels.remove}
        </button>
      )}
    </div>
  );
}
