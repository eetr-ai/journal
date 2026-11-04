import { soonestFirst, type Placed } from "./birthdays";
import { calledBy } from "./types";

/** The orders the people list can be read in. */
export enum PeopleOrder {
  Birthday = "birthday",
  Name = "name",
  Closeness = "closeness",
}

export const PEOPLE_ORDERS: PeopleOrder[] = [
  PeopleOrder.Birthday,
  PeopleOrder.Name,
  PeopleOrder.Closeness,
];

export function isPeopleOrder(value: string): value is PeopleOrder {
  return (PEOPLE_ORDERS as string[]).includes(value);
}

type Compare = (a: Placed, b: Placed) => number;

// By what the row shows, so the list reads alphabetically down the page.
function byName(collator: Intl.Collator): Compare {
  return (a, b) => collator.compare(calledBy(a.person), calledBy(b.person));
}

// Innermost first; not known yet sorts after everyone placed. Ties by name.
function byCloseness(collator: Intl.Collator): Compare {
  const name = byName(collator);

  return (a, b) => {
    const nearer = (Number(b.person.proximity) || 0) - (Number(a.person.proximity) || 0);

    return nearer === 0 ? name(a, b) : nearer;
  };
}

/** A new array in the order asked for; names compare in the reader's language, accents aside. */
export function ordered(rows: Placed[], order: PeopleOrder, locale: string): Placed[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });

  switch (order) {
    case PeopleOrder.Name:
      return rows.toSorted(byName(collator));
    case PeopleOrder.Closeness:
      return rows.toSorted(byCloseness(collator));
    default:
      return rows.toSorted(soonestFirst);
  }
}
