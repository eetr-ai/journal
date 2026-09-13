import { ChatsCircleIcon, NotebookIcon } from "@phosphor-icons/react/dist/ssr";
import DrawerSection from "./drawer_section";
import { sampleContent } from "../mocks";
import type { Dictionary } from "@/i18n/en";
import type { Locale } from "@/i18n/config";

const ICON_SIZE = 16;

export interface LeftDrawerOptions {
  t: Dictionary;
  locale: Locale;
}

export default function LeftDrawer(options: LeftDrawerOptions) {
  const samples = sampleContent(options.locale);

  return (
    <aside className="flex w-64 shrink-0 flex-col divide-y divide-border border-r border-border bg-surface">
      <DrawerSection
        icon={<ChatsCircleIcon size={ICON_SIZE} weight="fill" />}
        items={samples.transcripts}
        mockedLabel={options.t.shell.mocked}
        title={options.t.shell.transcripts}
      />
      <DrawerSection
        icon={<NotebookIcon size={ICON_SIZE} weight="fill" />}
        items={samples.entries}
        mockedLabel={options.t.shell.mocked}
        title={options.t.shell.entries}
      />
    </aside>
  );
}
