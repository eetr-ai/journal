export interface SettingsSectionOptions {
  title: string;
  children: React.ReactNode;
}

export default function SettingsSection(options: SettingsSectionOptions) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
        {options.title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{options.children}</div>
    </section>
  );
}
