// The source dictionary. Every other locale is typed against this shape, so a
// key added here is a compile error everywhere it is missing.
const en = {
  appName: "Eetr Journal",
  language: "Language",

  signIn: {
    title: "Eetr Journal",
    tagline: "A quiet place to think out loud.",
    action: "Continue with eetr",
  },

  signOut: "Sign out",
  settings: "Settings",
  close: "Close",
  backToJournal: "Back to the journal",

  errors: {
    title: "Something went wrong",
    body: "The page could not be rendered. Trying again is usually enough.",
    retry: "Try again",
    notFoundTitle: "Nothing here",
    notFoundBody: "That page does not exist, or it moved.",
    home: "Go home",
    signIn: {
      retry: "Try signing in again",
      reference: "Reference",
      codes: {
        Configuration: {
          title: "Sign-in is not set up correctly",
          body: "This one is on us. Eetr Journal and auth.eetr.app disagree about something, and no amount of trying again will settle it. It needs a fix on our side.",
        },
        AccessDenied: {
          title: "Access was refused",
          body: "auth.eetr.app turned the request down. Either the sign-in was cancelled, or this account is not allowed into Eetr Journal yet.",
        },
        OAuthCallbackError: {
          title: "The sign-in did not finish",
          body: "auth.eetr.app answered, but we could not complete the exchange. This is usually temporary, and starting over normally works.",
        },
        OAuthAccountNotLinked: {
          title: "That email is already in use",
          body: "There is already a profile with this email address, created with a different way of signing in. Use the one you signed up with.",
        },
        AccountNotLinked: {
          title: "That email is already in use",
          body: "There is already a profile with this email address, created with a different way of signing in. Use the one you signed up with.",
        },
        Verification: {
          title: "That link has expired",
          body: "Sign-in links work once, and not for long. Ask for a new one and use it straight away.",
        },
        MissingCSRF: {
          title: "The sign-in request went stale",
          body: "The page was open too long, or your browser is refusing our cookies. Reload the sign-in page and start from there.",
        },
        CredentialsSignin: {
          title: "Those details were not accepted",
          body: "The username or password did not match anything we know about.",
        },
        WebAuthnVerificationError: {
          title: "Your passkey was not accepted",
          body: "Your device could not prove who you are. Try again, or sign in another way.",
        },
        Unknown: {
          title: "We could not sign you in",
          body: "We were not told why. Starting over usually works; if it keeps happening, the reference below is what to quote.",
        },
      },
    },
  },

  shell: {
    transcripts: "Recent chats",
    entries: "Journal",
    chatTitle: "Chat",
    chatPlaceholder: "Ask about today, or just start talking...",
    chatSend: "Send",
    todayTitle: "Today",
    mocked: "Sample content",
    resizeToday: "Resize today's entry",
  },

  profile: {
    title: "Your profile",
    subtitle: "How the journal should address you, and how it should look.",
    identity: "Identity",
    name: "Name",
    email: "Email",
    preferences: "Preferences",
    pronouns: "Pronouns",
    pronounsHint: "Pick one or write your own.",
    pronounOptions: ["she/her", "he/him", "they/them", "she/they", "he/they", "ze/hir"],
    sex: "Sex",
    treatment: "Preferred treatment",
    treatmentHint: "The grammatical gender the journal uses when it writes to you.",
    locationLabel: "Location",
    locationHint: "A city or region, used for context rather than for tracking.",
    timezone: "Time zone",
    appearance: "Appearance",
    theme: "Theme",
    save: "Save changes",
    saving: "Saving...",
    saved: "Saved",
    unsaved: "You have unsaved changes",
    saveFailed: "Your changes could not be saved. Try again.",
  },

  values: {
    sex: {
      female: "Female",
      male: "Male",
      intersex: "Intersex",
      undisclosed: "Prefer not to say",
    },
    treatment: {
      female: "Feminine",
      male: "Masculine",
      neutral: "Neutral",
    },
    theme: {
      system: "Match my system",
      light: "Light",
      dark: "Dark",
    },
  },

  vault: {
    title: "Private storage",
    absent: "Your writing is not encrypted yet.",
    lockedState: "Locked",
    unlockedState: "Unlocked on this device",
    protectedTitle: "What this protects",
    protectedBody:
      "Your entries and conversations are encrypted in this browser, with a key derived from your password, before they reach us. We store the result and never the key — so nobody reading our database, our backups, or a dump of either can read your writing. That includes whoever runs this service.",
    visibleTitle: "What stays readable",
    visibleBody:
      "To make search work, keywords and numerical embeddings of your writing are stored unencrypted. Embeddings are not a safe summary: a good deal of the original wording can be reconstructed from them. And when you ask the assistant about your journal, the entries it needs are decrypted in memory to answer you — never stored that way, and never logged.",
    lossTitle: "If you forget your password",
    lossBody:
      "Nobody can recover your writing, because nobody ever had the key. A passkey unlocks the same data, so keeping one is also a way back in — but lose both and it is gone for good.",
    password: "Password",
    confirm: "Confirm password",
    create: "Encrypt my journal",
    creating: "Setting up...",
    unlock: "Unlock",
    unlocking: "Unlocking...",
    unlockWithPasskey: "Use a passkey",
    lock: "Lock now",
    passkeys: "Passkeys",
    noPasskeys: "No passkeys yet. One lets you unlock on this device without typing your password.",
    addPasskey: "Add a passkey",
    addingPasskey: "Waiting for your device...",
    removePasskey: "Remove",
    errors: {
      tooShort: "Use at least 12 characters. This is the only thing protecting your writing.",
      mismatch: "Those two do not match.",
      wrongPassword: "That password does not open this vault.",
      passkeyUnsupported: "This browser or device cannot keep a key in a passkey.",
      passkeyFailed: "Your device did not finish that. Nothing changed.",
      rejected: "Those settings were refused as too weak to store.",
      failed: "That did not save. Nothing changed.",
    },
  },

  validation: {
    required: "This cannot be empty",
    tooLong: "This is too long",
    notAllowed: "Pick one of the options",
    badEmail: "That does not look like an email address",
    badTimezone: "That is not a time zone this browser knows",
  },
};

export type Dictionary = typeof en;

export default en;
