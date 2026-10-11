// Pictures: attaching them to a message, and seeing the ones kept with a day.
const images = {
  attach: "Attach pictures",
  remove: "Remove this picture",
  attached: "A picture you attached",
  opening: "Unlocking pictures...",
  // What is stored is sealed under a key only this browser holds.
  unreadable: "This picture could not be unlocked with your key.",
  loadFailed: "The pictures for this day could not be loaded. Try again in a moment.",
  badgeOne: "1 picture",
  badgeMany: "{count} pictures",
  badgeLoose: "· {count} not in the entry",
  dialogTitle: "Pictures from this day",
  inEntry: "In the entry",
  loose: "Not in the entry",
  view: "Look at this picture",
  back: "All pictures",
  close: "Close",
  delete: "Delete this picture",
  deleteConfirm: "Delete for good",
  keep: "Keep it",
  deleteFailed: "This picture could not be deleted. It is still here — try again in a moment.",
  problems: {
    type: "Only PNG, JPEG and WebP pictures can be sent. Save it as one of those and try again.",
    tooLarge: "That picture is too big to send, even after shrinking it. Try a smaller one.",
    tooMany: "You can send up to {max} pictures in one message. Send the rest in the next one.",
    unreadable: "That picture could not be read. Try saving it as a PNG or JPEG first.",
    // The runtime cannot hand a picture to an answer that is already going.
    busy: "Pictures can only start a new message. Wait for this answer to finish, then send them.",
  },
};

export type ImagesDictionary = typeof images;

export default images;
