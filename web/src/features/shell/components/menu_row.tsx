"use client";

import Link from "next/link";

const ROW =
  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted";

export interface MenuRowOptions {
  icon?: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** Renders the row as a submit button, for a row that posts a form. */
  submit?: boolean;
}

/** One line in the user menu, whichever of the three things it happens to be. */
export default function MenuRow(options: MenuRowOptions) {
  const body = (
    <>
      {options.icon && <span className="shrink-0 text-muted">{options.icon}</span>}
      <span className="flex-1 text-left">{options.children}</span>
    </>
  );

  if (options.href) {
    return (
      <Link className={ROW} href={options.href}>
        {body}
      </Link>
    );
  }

  return (
    <button className={ROW} onClick={options.onClick} type={options.submit ? "submit" : "button"}>
      {body}
    </button>
  );
}
