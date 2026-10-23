/**
 * How the page is arranged where the panels are columns: the conversation in
 * the middle, the entry in the middle with the conversation beside it, or the
 * entry alone.
 *
 * Kept per device rather than in the profile: the same person wants the entry
 * to themselves on a laptop and the conversation in front of them on a tablet,
 * and a choice made on one should not rearrange the other.
 */
export const layouts = ["conversation", "writing", "focus"] as const;

export type Layout = (typeof layouts)[number];

export const defaultLayout: Layout = "conversation";

export function isLayout(value: unknown): value is Layout {
  return typeof value === "string" && (layouts as readonly string[]).includes(value);
}

export const LAYOUT_KEY = "eetr-journal:layout";

// Puts the stored layout on <html> before the first paint, because the server
// cannot know it and the stylesheet arranges the columns off that attribute. A
// value it does not recognise, or storage it cannot read, leaves the default.
export const LAYOUT_SCRIPT = `(function(){try{
var l=localStorage.getItem(${JSON.stringify(LAYOUT_KEY)});
if(${JSON.stringify(layouts)}.indexOf(l)>=0)document.documentElement.dataset.layout=l;
}catch(e){}})();`;
