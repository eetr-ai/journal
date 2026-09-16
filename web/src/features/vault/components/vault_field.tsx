"use client";

export interface VaultFieldOptions {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
}

export default function VaultField(options: VaultFieldOptions) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={options.id}>
        {options.label}
      </label>
      <input
        autoComplete={options.autoComplete}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 md:text-sm"
        id={options.id}
        onChange={(event) => options.onChange(event.target.value)}
        type="password"
        value={options.value}
      />
    </div>
  );
}
