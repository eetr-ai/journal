import { widgetFrom } from "./rules";

/**
 * Turns `::name{…}` lines and `:::name{…}` blocks from `remark-directive` into
 * widgets, and every other directive back into the text it was parsed from.
 *
 * The second half matters as much as the first: the directive syntax claims
 * ordinary prose too (`:word` mid-sentence parses as one), and a reply must
 * never lose words because they happened to look like a tag.
 *
 * A widget leaves here as a div carrying the checked widget as JSON, which the
 * renderer maps to a component. Raw HTML is off, so nothing the agent writes can
 * produce that attribute any other way.
 */

interface Node {
  type: string;
  name?: string;
  attributes?: Record<string, string | null | undefined> | null;
  value?: string;
  children?: Node[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: { hName?: string; hProperties?: Record<string, string> };
}

const DIRECTIVES = new Set(["textDirective", "leafDirective", "containerDirective"]);

export const WIDGET_PROPERTY = "dataWidget";

function asWritten(node: Node, source: string): Node {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  const value =
    start === undefined || end === undefined ? `:${node.name ?? ""}` : source.slice(start, end);
  const text = { type: "text", value };

  // A block that was a directive stays a block, so it does not run into the
  // paragraph after it.
  return node.type === "textDirective" ? text : { type: "paragraph", children: [text] };
}

// A line that is only colons: a closing fence, or one still being written.
const FENCE = /^\s*:+\s*$/u;

/**
 * A container's body as it was written, line breaks and all, rather than as
 * the markdown it was parsed into: a song is its lines.
 */
function bodyOf(node: Node, source: string): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;

  if (start === undefined || end === undefined) {
    return "";
  }

  const lines = source.slice(start, end).split("\n").slice(1);

  while (lines.length > 0 && FENCE.test(lines.at(-1) ?? "")) {
    lines.pop();
  }

  return lines.join("\n");
}

function widgetIn(node: Node, source: string) {
  const name = node.name ?? "";

  // Block-level only: a widget is a card, not something mid-sentence.
  switch (node.type) {
    case "leafDirective":
      return widgetFrom(name, "leaf", node.attributes);
    case "containerDirective":
      return widgetFrom(name, "container", node.attributes, bodyOf(node, source));
    default:
      return null;
  }
}

function drawn(node: Node, source: string): Node {
  const widget = widgetIn(node, source);

  if (!widget) {
    return asWritten(node, source);
  }

  return {
    ...node,
    children: [],
    data: { hName: "div", hProperties: { [WIDGET_PROPERTY]: JSON.stringify(widget) } },
  };
}

function walk(node: Node, source: string): void {
  if (!node.children) {
    return;
  }

  node.children = node.children.map((child) =>
    DIRECTIVES.has(child.type) ? drawn(child, source) : child,
  );

  for (const child of node.children) {
    walk(child, source);
  }
}

export default function remarkWidgets() {
  return (tree: Node, file: { value: unknown }) => {
    walk(tree, String(file.value));
  };
}
