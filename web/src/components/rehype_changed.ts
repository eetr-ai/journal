import type { TextRange } from "@/features/entries/changes";

// Only the parts of a hast tree this reads, so it depends on no tree library.
interface Point {
  offset?: number;
}

interface TreeNode {
  type: string;
  position?: { start: Point; end: Point };
  properties?: Record<string, unknown>;
  children?: TreeNode[];
}

function overlaps(node: TreeNode, range: TextRange): boolean {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;

  return start !== undefined && end !== undefined && start < range.end && end > range.start;
}

/**
 * Marks each top-level block whose source overlaps one of `ranges` with
 * `data-changed`. Offsets are into the markdown as it was handed over, so the
 * ranges have to be taken from exactly that text.
 */
export default function rehypeChanged(ranges: TextRange[]) {
  return (tree: TreeNode) => {
    for (const node of tree.children ?? []) {
      if (node.type === "element" && ranges.some((range) => overlaps(node, range))) {
        node.properties = { ...node.properties, dataChanged: "true" };
      }
    }
  };
}
