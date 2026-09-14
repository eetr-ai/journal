import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCallouts from "./callouts";

export interface MarkdownOptions {
  children: string;
}

/**
 * Renders untrusted markdown. react-markdown builds a React tree rather than
 * setting innerHTML, and raw HTML is not enabled, so embedded tags render as
 * text instead of executing.
 */
export default function Markdown(options: MarkdownOptions) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:my-2">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkCallouts]}>{options.children}</ReactMarkdown>
    </div>
  );
}
