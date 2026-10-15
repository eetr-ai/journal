// Cards a reply can draw in the conversation, and the memory a new one opens on.
const widgets = {
  memory: {
    label: "From your journal",
    open: "Open entry",
    another: "Another memory",
    opening: "Opening...",
    missing: "That entry isn't in your journal any more.",
  },
};

export type WidgetsDictionary = typeof widgets;

export default widgets;
