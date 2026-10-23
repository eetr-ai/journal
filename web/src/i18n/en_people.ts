// The people in somebody's life: who they are, their birthdays, and what is
// worth knowing about them.
const people = {
  title: "People",
  subtitle: "The people in your life, and what is worth remembering about them.",
  menu: "People",
  opening: "Unlocking your people...",
  // What is stored is sealed under a key only this browser holds.
  unreadable: "This could not be unlocked with your key.",
  loadFailed: "Your people could not be loaded. Try again in a moment.",
  empty:
    "Nobody here yet. Add someone, or mention them in a conversation and the journal will remember them.",
  add: "Add someone",
  noBirthday: "No birthday",
  today: "Birthday today",
  tomorrow: "Birthday tomorrow",
  inDays: "Birthday in {days} days",
  back: "Everyone",
  newPerson: "Someone new",
  name: "Name",
  relation: "Who they are to you",
  relationHint: "In your words: my sister, a climbing partner, an old friend.",
  birthday: "Birthday",
  birthdayHint: "YYYY-MM-DD, or MM-DD if you do not know the year.",
  notes: "Notes",
  notesHint: "Anything worth keeping in mind about them.",
  save: "Save",
  saving: "Saving...",
  saved: "Saved",
  saveFailed: "This could not be saved. Nothing changed — try again in a moment.",
  missing: "This person is no longer here. They may have been forgotten from another window.",
  facts: "Worth knowing",
  noFacts: "Nothing yet.",
  factsFailed: "What is known about them could not be loaded. Try again in a moment.",
  factPlaceholder: "Something worth knowing about them...",
  addFact: "Add",
  factFailed: "That could not be kept. Try again in a moment.",
  forgetFact: "Forget this",
  forgetFactFailed: "That could not be forgotten. It is still here — try again in a moment.",
  delete: "Forget this person",
  deleteConfirm: {
    title: "Forget this person?",
    body: "They go for good, and everything known about them goes with them. Your journal entries are not touched. This cannot be undone.",
    confirm: "Forget them",
    cancel: "Keep them",
  },
  deleteFailed: "This person could not be forgotten. They are still here — try again in a moment.",
  badBirthday: "Write it as YYYY-MM-DD, or MM-DD, with a real month and day.",
};

export type PeopleDictionary = typeof people;

export default people;
