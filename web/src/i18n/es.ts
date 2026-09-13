import type { Dictionary } from "./en";

// Typed as Dictionary rather than inferred, which is what makes a missing or
// misspelled key fail the build instead of silently falling back to English.
const es: Dictionary = {
  appName: "diario",
  language: "Idioma",
  signIn: {
    prompt: "Iniciá sesión para empezar a escribir.",
    github: "Iniciar sesión con GitHub",
  },
  signedInAs: "Sesión iniciada como {name}",
  signOut: "Cerrar sesión",
};

export default es;
