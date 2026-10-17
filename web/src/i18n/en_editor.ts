// Writing an entry by hand: the editor, what it says about saving, and the
// menu that turns one kind of block into another.
const editor = {
  titlePlaceholder: "Give the day a title",
  placeholder: "Write what happened, or type / for a heading, a list or a callout",
  save: {
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
  },
  // Also saves on its own a moment after you stop typing.
  saveHint: "Save now (⌘S). It also saves on its own when you pause.",
  status: {
    failed:
      "This could not be saved. What you wrote is still here — keep writing, or press ⌘S to try again.",
    titleTooLong: "The title is too long to save. Shorten it, and it saves on its own.",
    contentTooLong: "This entry is too long to save. Split it, and it saves on its own.",
    pictures:
      "A picture here is not one kept with this entry, so it could not be saved. Pictures are added from the conversation.",
  },
  conflict: {
    body: "This entry changed somewhere else while you were writing. Your words are still here and nothing has been saved over.",
    latest: "Load the latest",
    mine: "Keep mine",
  },
  menu: {
    label: "Turn this block into",
    none: "Nothing matches",
    text: "Text",
    heading1: "Heading",
    heading2: "Subheading",
    heading3: "Small heading",
    bullets: "Bulleted list",
    numbers: "Numbered list",
    tasks: "To-do list",
    quote: "Quote",
    callout: "Callout",
    divider: "Divider",
    code: "Code",
  },
  // A card or a table is kept as written: it can be taken out, not changed.
  remove: "Take this out",
};

export type EditorDictionary = typeof editor;

export default editor;
