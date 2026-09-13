import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownOptions {
  children: string;
}

// Renders untrusted markdown. react-markdown builds a React tree rather than
// setting innerHTML, and raw HTML is not enabled, so embedded tags render as
// text instead of executing.
export default function Markdown(options: MarkdownOptions) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{options.children}</ReactMarkdown>
    </div>
  );
}
