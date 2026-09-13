import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/ssr";
import Markdown from "@/components/markdown";
import MockedBadge from "./mocked_badge";
import { sampleContent } from "../mocks";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface ChatPanelOptions {
  t: Dictionary;
  locale: Locale;
}

/**
 * Only what the person said is a bubble. The journal's own replies run the full
 * width of the column as prose, because they are the thing being read rather
 * than a turn in a conversation.
 */
export default function ChatPanel(options: ChatPanelOptions) {
  const samples = sampleContent(options.locale);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <h2 className="flex-1 text-sm font-semibold">{options.t.shell.chatTitle}</h2>
        <MockedBadge label={options.t.shell.mocked} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
        {samples.chat.map((message) =>
          message.from === "you" ? (
            <div
              className="max-w-lg self-end rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-on-brand"
              key={message.id}
            >
              {message.text}
            </div>
          ) : (
            <div className="text-sm" key={message.id}>
              <Markdown>{message.text}</Markdown>
            </div>
          ),
        )}
      </div>

      {/* Inert on purpose: there is nothing behind it yet, and a box that
          accepts text it then drops is worse than one that says it cannot. */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <input
            className="flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
            disabled
            placeholder={options.t.shell.chatPlaceholder}
          />
          <button
            aria-label={options.t.shell.chatSend}
            className="text-muted disabled:opacity-40"
            disabled
            type="button"
          >
            <PaperPlaneRightIcon size={ICON_SIZE} weight="fill" />
          </button>
        </div>
      </div>
    </section>
  );
}
