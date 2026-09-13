import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "@/lib/db";

// AUTH_SECRET, AUTH_URL and the AUTH_GITHUB_* pair are read from the
// environment by convention; only the adapter is wired by hand.
//
// GitHub is the only provider for now. Adding another is a line in `providers`.
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PostgresAdapter(pool()),
  providers: [GitHub],
  // Database sessions: a row we can delete beats a token we have to wait out.
  // Costs one query per request, which at this size is free.
  session: { strategy: "database" },
  pages: {
    signIn: "/",
  },
});
