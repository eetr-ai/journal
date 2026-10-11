import type { ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCallouts from "./callouts";

export interface MarkdownOptions {
  children: string;
  /**
   * Draws an image whose URL uses `scheme` instead of fetching it. Without
   * both, such URLs are stripped like any other unknown scheme; with them, any
   * other image is shown as its alt text.
   */
  renderImage?: (url: string, alt: string) => ReactNode;
  scheme?: string;
}

/**
 * Renders untrusted markdown. react-markdown builds a React tree rather than
 * setting innerHTML, and raw HTML is not enabled, so embedded tags render as
 * text instead of executing.
 */
export default function Markdown(options: MarkdownOptions) {
  const { renderImage, scheme } = options;
  const own = (url: string) => Boolean(scheme && renderImage && url.startsWith(scheme));
  const components: Components | undefined = renderImage
    ? {
        // Only our own pictures are drawn; any other image shows its alt text,
        // so words we render never make the browser fetch a stranger's URL.
        img: (image) =>
          typeof image.src === "string" && own(image.src)
            ? renderImage(image.src, image.alt ?? "")
            : image.alt,
      }
    : undefined;

  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, remarkCallouts]}
        urlTransform={(url) => (own(url) ? url : defaultUrlTransform(url))}
      >
        {options.children}
      </ReactMarkdown>
    </div>
  );
}
