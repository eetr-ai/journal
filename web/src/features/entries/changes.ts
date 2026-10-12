/** A stretch of an entry's text, by character offset, end exclusive. */
export interface TextRange {
  start: number;
  end: number;
}

interface Block extends TextRange {
  text: string;
}

// A block is what markdown treats as one: the text between blank lines.
const BLOCK_BREAK = /\n[ \t]*\n/g;

function blocksOf(content: string): Block[] {
  const ret: Block[] = [];
  let start = 0;

  for (const gap of content.matchAll(BLOCK_BREAK)) {
    ret.push({ start, end: gap.index, text: content.slice(start, gap.index).trim() });
    start = gap.index + gap[0].length;
  }

  ret.push({ start, end: content.length, text: content.slice(start).trim() });

  return ret.filter((block) => block.text !== "");
}

/**
 * Where `after` says something `before` did not, block by block.
 *
 * A block counts as changed when no block of the old text reads the same, so a
 * moved paragraph is not marked and a one-word edit marks its whole paragraph.
 * Text that was only taken away leaves nothing to mark.
 */
export function changedRanges(before: string, after: string): TextRange[] {
  const known = new Set(blocksOf(before).map((block) => block.text));

  return blocksOf(after)
    .filter((block) => !known.has(block.text))
    .map((block) => ({ start: block.start, end: block.end }));
}
