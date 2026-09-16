/**
 * Marking the asked-for words inside a passage the model quoted back.
 *
 * Folded rather than compared: `rodilla` has to find `Rodilla`, and it has to
 * find `rodillá` too, because what someone types in a hurry is not what they
 * wrote on a good day. Comparison happens on a folded copy and every offset is
 * applied to the original, so what is shown is always the words as written.
 *
 * Folding cannot change a string's length or the offsets would not line up.
 * NFD then dropping the marks satisfies that for the accents these two
 * languages use; a script where it would not is a reason to revisit this.
 */
export interface Segment {
  text: string;
  marked: boolean;
}

const MARKS = /\p{Diacritic}/gu;

function fold(value: string): string {
  return value.normalize("NFD").replace(MARKS, "").toLowerCase();
}

/** The words worth looking for: the short ones match everywhere and mean nothing. */
const MIN_WORD = 3;

function wordsOf(query: string): string[] {
  return [...new Set(fold(query).split(/\s+/u))].filter((word) => word.length >= MIN_WORD);
}

function spansIn(folded: string, words: string[]): Array<[number, number]> {
  const found: Array<[number, number]> = [];

  for (const word of words) {
    let at = folded.indexOf(word);

    while (at !== -1) {
      found.push([at, at + word.length]);
      at = folded.indexOf(word, at + word.length);
    }
  }

  return found.sort((left, right) => left[0] - right[0]);
}

/** Overlapping runs are one run: two words that share letters mark once. */
function merged(spans: Array<[number, number]>): Array<[number, number]> {
  return spans.reduce<Array<[number, number]>>((ret, [from, to]) => {
    const last = ret.at(-1);

    if (last && from <= last[1]) {
      last[1] = Math.max(last[1], to);

      return ret;
    }

    return [...ret, [from, to]];
  }, []);
}

function cut(passage: string, runs: Array<[number, number]>): Segment[] {
  const ret: Segment[] = [];
  let at = 0;

  for (const [from, to] of runs) {
    if (from > at) {
      ret.push({ text: passage.slice(at, from), marked: false });
    }

    ret.push({ text: passage.slice(from, to), marked: true });
    at = to;
  }

  if (at < passage.length) {
    ret.push({ text: passage.slice(at), marked: false });
  }

  return ret;
}

export function highlight(passage: string, query: string): Segment[] {
  const folded = fold(passage);
  const plain = [{ text: passage, marked: false }];

  if (folded.length !== passage.length) {
    return plain;
  }

  const runs = merged(spansIn(folded, wordsOf(query)));

  return runs.length === 0 ? plain : cut(passage, runs);
}
