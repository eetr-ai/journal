import type { ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCallouts from "./callouts";
import rehypeChanged from "./rehype_changed";
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

function componentsFor(options: MarkdownOptions, own: (url: string) => boolean): Components {
  const renderImage = options.renderImage;

  if (!renderImage) {
    return { a: link };
  }

  return {
    a: link,
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
      <ReactMarkdown
        components={componentsFor(options, own)}
        rehypePlugins={options.changed ? [[rehypeChanged, options.changed]] : []}
        remarkPlugins={[remarkGfm, remarkCallouts]}
        urlTransform={(url) => (own(url) ? url : defaultUrlTransform(url))}
      >
        {options.children}
      </ReactMarkdown>
    </div>
  );
}
