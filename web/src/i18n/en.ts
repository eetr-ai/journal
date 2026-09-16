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
    todayTitle: "Today",
    resizeToday: "Resize today's entry",
  },

  entries: {
    empty: "Nothing written down yet. Keep talking, and this fills in.",
    // The entry is there; the key has not been through it yet.
    opening: "Unlocking...",
    unreadable: "This could not be unlocked with your key.",
    none: "Nothing written yet.",
    open: "Open this entry",
    backToToday: "Back to today",
    delete: "Throw this entry away",
    deleteConfirm: {
      title: "Throw this entry away?",
      body: "This day goes for good, and so does everything that could find it. This cannot be undone.",
      confirm: "Throw it away",
      cancel: "Keep it",
    },
    deleteFailed: "This entry could not be thrown away. It is still here — try again in a moment.",
    search: {
      open: "Search the journal",
      close: "Close the search",
      placeholder: "What are you looking for?",
      submit: "Search",
      // A model is reading the entries that came back, which takes a beat.
      searching: "Reading back through your days...",
      none: "Nothing you have written bears on that.",
      tooLong: "That is longer than a search can be. Try asking it in a sentence.",
      failed: "The search could not be run. Nothing was changed — try again in a moment.",
    },
    days: {
      open: "Pick a day",
      close: "Close the calendar",
      previous: "Previous month",
      next: "Next month",
      written: "Something written",
      nothing: "Nothing written",
    },
  },

  chat: {
    title: "Chat",
    placeholder: "Ask about today, or just start talking...",
    send: "Send",
    stop: "Stop",
    thinking: "Thinking...",
    reasoning: "Thinking it through",
    working: "Looking something up...",
    emptyTitle: "Nothing here yet",
    unavailableTitle: "This one would not load",
    unavailablePrompt:
      "What was said before is not showing. Anything you send still goes to this conversation.",
    emptyPrompt: "Say what kind of day it was, and we will go from there.",
    // What is stored is sealed under a key only this browser holds. If it will
    // not open, it was written under a different one.
    unreadable: "This could not be unlocked with your key.",
    you: "You said",
    journal: "The journal said",
    noConversations: "No conversations yet.",
    delete: "Forget this conversation",
    newChat: "New conversation",
    aborted: "You stopped this one. What is above is all of it.",
    retry: "Try again",
    errors: {
      empty: "There is nothing to send.",
      tooLong: "That is longer than one message can be. Send it in two.",
      locked: "Your journal locked while you were typing. Unlock it and send again.",
      unauthorized: "You are signed out. Sign in and send it again.",
      // Not a fault: the browser has not yet told us which day it is where the
      // reader is, and nothing gets filed under a guess.
      notReady: "Still working out what day it is where you are. Try again in a moment.",
      unreachable: "The journal could not be reached, so nothing was sent.",
      failed: "That answer stopped part-way. What is above is all of it.",
    },
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
    summary:
      "Your journal is stored encrypted with this password, and what we keep cannot be read without it. Lose the password and your writing is effectively gone — tap for what that means.",
    protectTitle: "Protect your journal",
    protectPrompt:
      "Choose a password before you write anything. It is what encrypts your journal, and the only thing that can open it.",
    lockedState: "Locked",
    unlockedState: "Unlocked on this device",
    protectedTitle: "What this protects",
    protectedBody:
      "Your password never leaves this browser, and we only hold the key made from it for as long as it takes to answer something you asked for. Everything you write is encrypted before it is stored, so what sits in our database and our backups is not readable — including to whoever runs this service.",
    visibleTitle: "What we can see",
    visibleBody:
      "Making an entry searchable means reading it, so what you write passes through our server on its way to being encrypted, and the keywords and numerical embeddings taken from it are stored alongside it unencrypted. None of that is written down or logged in the clear.",
    lossTitle: "If you forget your password",
    lossBody:
      "Your writing would be very hard to get back — hard enough that you should treat it as gone, and hard enough that we could not do it for you if you asked. A passkey opens the same journal, so enrolling one is a good second way in. Changing this password is not something you can do yourself yet: ask, and we will arrange it.",
    password: "Password",
    confirm: "Confirm password",
    create: "Encrypt my journal",
    creating: "Setting up...",
    unlockTitle: "Unlock your journal",
    unlockPrompt: "Your writing is encrypted. Your password is the only thing that opens it.",
    unlock: "Unlock",
    unlocking: "Unlocking...",
    unlockWithPasskey: "Use a passkey",
    lock: "Lock now",
    passkeys: "Passkeys",
    noPasskeys: "No passkeys yet. One lets you unlock on this device without typing your password.",
    passkeyStepTitle: "Add a faster way in",
    passkeyStepPrompt:
      "A passkey opens your journal with your fingerprint or face, and is a second way back in if the password ever slips your mind.",
    notNow: "Not now",
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
      noStorage:
        "This browser will not let us keep your key, so the journal cannot stay open. Private browsing and blocked site data both do this.",
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
