import MockedBadge from "./mocked_badge";

export interface DrawerItem {
  id: string;
  title: string;
  when: string;
}

export interface DrawerSectionOptions {
  title: string;
  mockedLabel: string;
  icon: React.ReactNode;
  items: readonly DrawerItem[];
}

export default function DrawerSection(options: DrawerSectionOptions) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 px-4 py-3">
        <span className="text-muted">{options.icon}</span>
        <h2 className="flex-1 text-sm font-semibold">{options.title}</h2>
        <MockedBadge label={options.mockedLabel} />
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {options.items.map((item) => (
          <li key={item.id}>
            <div className="rounded-lg px-2 py-2 hover:bg-surface-muted">
              <p className="truncate text-sm">{item.title}</p>
              <p className="text-xs text-muted">{item.when}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
