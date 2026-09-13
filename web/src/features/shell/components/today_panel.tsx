import { SunHorizonIcon } from "@phosphor-icons/react/dist/ssr";
import Markdown from "@/components/markdown";
import MockedBadge from "./mocked_badge";
import ResizablePanel from "./resizable_panel";
import { saveTodayWidthAction } from "@/features/profile/actions";
import { MAX_TODAY_WIDTH, MIN_TODAY_WIDTH } from "@/features/profile/types";
import { sampleContent } from "../mocks";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface TodayPanelOptions {
  t: Dictionary;
  locale: Locale;
  width: number;
}

export default function TodayPanel(options: TodayPanelOptions) {
  const samples = sampleContent(options.locale);
  const today = new Date().toLocaleDateString(options.locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ResizablePanel
      initialWidth={options.width}
      label={options.t.shell.resizeToday}
      max={MAX_TODAY_WIDTH}
      min={MIN_TODAY_WIDTH}
      onCommit={saveTodayWidthAction}
    >
      <aside className="flex min-h-0 flex-1 flex-col bg-surface">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="text-highlight">
            <SunHorizonIcon size={ICON_SIZE} weight="fill" />
          </span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">{options.t.shell.todayTitle}</h2>
            <p className="text-xs text-muted">{today}</p>
          </div>
          <MockedBadge label={options.t.shell.mocked} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm">
          <Markdown>{samples.today}</Markdown>
        </div>
      </aside>
    </ResizablePanel>
  );
}
