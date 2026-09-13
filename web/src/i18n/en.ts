// The source dictionary. Every other locale is typed against this shape, so a
// key added here is a compile error everywhere it is missing.
const en = {
  appName: "journal",
  language: "Language",
  signIn: {
    prompt: "Sign in to start writing.",
    github: "Sign in with GitHub",
  },
  signedInAs: "Signed in as {name}",
  signOut: "Sign out",
};

export type Dictionary = typeof en;

export default en;
