// The themes a person can pick. `system` is not a third palette: it defers to
// the operating system, and is resolved to light or dark in the browser.
export const themes = ["system", "light", "dark"] as const;

export type Theme = (typeof themes)[number];

export const defaultTheme: Theme = "system";

export function isTheme(value: string): value is Theme {
  return (themes as readonly string[]).includes(value);
}

// The cookie is what the first paint can read, before any session or profile
// has been resolved. The profile is the source of truth; this is a copy of it
// kept where the layout can reach it cheaply.
export const THEME_COOKIE = "theme";

// Applied before the first paint, so a dark preference does not flash light.
// Inlined as a blocking script because a class added after hydration is a
// frame too late. It only has to handle `system`: an explicit choice is already
// on <html> by the time this runs.
export const THEME_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);
var t=m?decodeURIComponent(m[1]):"system";
if(t!=="system")return;
if(window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark");
}catch(e){}})();`;
