// Fills {name}-style placeholders. The whole templating story: the dictionaries
// are ours, so there is no untrusted input here and no reason for anything
// cleverer than a replace.
export function format(template: string, values: Record<string, string>): string {
  let ret = template;

  for (const [key, value] of Object.entries(values)) {
    ret = ret.replaceAll(`{${key}}`, value);
  }

  return ret;
}
