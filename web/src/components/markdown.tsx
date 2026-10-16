import { createContext, useContext, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkCallouts from "./callouts";
import rehypeChanged from "./rehype_changed";
import remarkWidgets, { WIDGET_PROPERTY } from "@/features/widgets/remark_widgets";
import type { Place } from "@/features/widgets/rules";
import { isExternal } from "./links";
import type { TextRange } from "@/features/entries/changes";

export interface MarkdownOptions {
  children: string;
  /**
   * Draws an image whose URL uses `scheme` instead of fetching it. Without
   * both, such URLs are stripped like any other unknown scheme; with them, any
   * other image is shown as its alt text.
   */
  renderImage?: (url: string, alt: string) => ReactNode;
  scheme?: string;
  /** Stretches of `children`, by offset, whose blocks are marked `data-changed`. */
  changed?: TextRange[];
  /**
   * Draws a widget from the catalog, handed the checked widget as JSON.
   * Without it, `::name{…}` lines are just text.
   */
  widget?: (encoded: string) => ReactNode;
  /** Which of the catalog's cards these words may draw: a reply's, by default. */
  place?: Place;
}

// A link out of the app opens beside it rather than in place of it, and the
// page it opens is given no handle back to this one.
const EXTERNAL = { rel: "noopener noreferrer", target: "_blank" } as const;

const link: Components["a"] = (options) => {
  const { node: _node, children, ...anchor } = options;

  return (
    <a {...anchor} {...(isExternal(anchor.href) ? EXTERNAL : {})}>
      {children}
    </a>
  );
};

// How the reply being rendered draws a widget. A context rather than a closure
// in the components map, so the div below is one component for the life of the
// page: a new one each render would remount every card on every streamed token.
const DrawWidget = createContext<((encoded: string) => ReactNode) | null>(null);

// A div carrying a widget is one the widgets plugin made; any other is a div.
// The card keeps the block's change mark, so a card the agent added is shown
// like any other passage it wrote.
const WidgetDiv: Components["div"] = (options) => {
  const draw = useContext(DrawWidget);
  const { node, ...div } = options;
  const encoded = node?.properties?.[WIDGET_PROPERTY];

  if (!draw || typeof encoded !== "string") {
    return <div {...div} />;
  }

  return (
    <div data-changed={node?.properties?.dataChanged as string | undefined}>{draw(encoded)}</div>
  );
};

function componentsFor(options: MarkdownOptions, own: (url: string) => boolean): Components {
  const renderImage = options.renderImage;
  const div = options.widget ? { div: WidgetDiv } : {};

  if (!renderImage) {
    return { a: link, ...div };
  }

  return {
    a: link,
    ...div,
    // Only our own pictures are drawn; any other image shows its alt text,
    // so words we render never make the browser fetch a stranger's URL.
    img: (image) =>
      typeof image.src === "string" && own(image.src)
        ? renderImage(image.src, image.alt ?? "")
        : image.alt,
  };
}

/**
 * Renders untrusted markdown. react-markdown builds a React tree rather than
 * setting innerHTML, and raw HTML is not enabled, so embedded tags render as
 * text instead of executing.
 */
export default function Markdown(options: MarkdownOptions) {
  const { renderImage, scheme } = options;
  const own = (url: string) => Boolean(scheme && renderImage && url.startsWith(scheme));

  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2">
      <DrawWidget value={options.widget ?? null}>
        <ReactMarkdown
          components={componentsFor(options, own)}
          rehypePlugins={options.changed ? [[rehypeChanged, options.changed]] : []}
          remarkPlugins={
            options.widget
              ? [
                  remarkGfm,
                  remarkCallouts,
                  remarkDirective,
                  [remarkWidgets, options.place ?? "chat"],
                ]
              : [remarkGfm, remarkCallouts]
          }
          urlTransform={(url) => (own(url) ? url : defaultUrlTransform(url))}
        >
          {options.children}
        </ReactMarkdown>
      </DrawWidget>
    </div>
  );
}
