export interface MockedBadgeOptions {
  label: string;
}

// Says out loud that a panel is not wired to anything yet, so nobody has to
// discover it by clicking.
export default function MockedBadge(options: MockedBadgeOptions) {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
      {options.label}
    </span>
  );
}
