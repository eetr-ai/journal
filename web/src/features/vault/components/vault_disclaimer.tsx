import { EyeIcon, LockKeyIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 16;

export interface VaultDisclaimerOptions {
  t: Dictionary;
}

/**
 * Three claims, one of which is not reassuring on purpose.
 *
 * A promise people cannot check is worth less than an honest account of what is
 * still visible, so the middle block says what the search index keeps in the
 * clear and what that is worth to somebody reading it.
 */
export default function VaultDisclaimer(options: VaultDisclaimerOptions) {
  const t = options.t.vault;

  const blocks = [
    {
      icon: <LockKeyIcon size={ICON_SIZE} weight="fill" />,
      title: t.protectedTitle,
      body: t.protectedBody,
      tone: "text-brand",
    },
    {
      icon: <EyeIcon size={ICON_SIZE} weight="fill" />,
      title: t.visibleTitle,
      body: t.visibleBody,
      tone: "text-highlight",
    },
    {
      icon: <WarningIcon size={ICON_SIZE} weight="fill" />,
      title: t.lossTitle,
      body: t.lossBody,
      tone: "text-accent",
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4">
      {blocks.map((block) => (
        <div className="flex gap-2.5" key={block.title}>
          <span className={`mt-0.5 shrink-0 ${block.tone}`}>{block.icon}</span>
          <div>
            <p className="text-xs font-semibold">{block.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{block.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
