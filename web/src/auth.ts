import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// AUTH_SECRET, AUTH_URL and the AUTH_GITHUB_* pair are read from the
// environment by convention, so there is nothing to wire by hand.
//
// GitHub is the only provider for now. Adding another is a line in `providers`.
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
  // JWT sessions, so signing in touches no database and the schema stays empty.
  // Switching to database sessions later means adding an adapter and the tables
  // it requires.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
});
