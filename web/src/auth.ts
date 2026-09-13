import NextAuth, { type NextAuthConfig } from "next-auth";

// The OIDC provider's id, which is also the last segment of the callback URL
// registered with the issuer: {AUTH_URL}/api/auth/callback/eetr
const PROVIDER_ID = "eetr";

const ISSUER = "https://auth.eetr.app";

// AUTH_SECRET and AUTH_URL are read from the environment by convention. The
// client credentials are named explicitly because the convention would look for
// AUTH_EETR_ID and AUTH_EETR_SECRET instead.
const config: NextAuthConfig = {
  providers: [
    {
      id: PROVIDER_ID,
      name: "eetr",
      type: "oidc",
      issuer: ISSUER,
      clientId: process.env.AUTH_OIDC_ID,
      clientSecret: process.env.AUTH_OIDC_SECRET,
      authorization: { params: { scope: "openid profile email" } },
    },
  ],
  // JWT sessions: signing in touches no table, and the only thing that has to
  // survive between requests is the subject.
  session: { strategy: "jwt" },
  // The app runs behind an ingress that terminates TLS, so the host header is
  // not self-evidently ours. AUTH_URL is what callback URLs are built from.
  trustHost: true,
  pages: {
    signIn: "/signin",
    error: "/auth-error",
  },
  // Auth.js hands the browser a coarse code and keeps the cause to itself, which
  // is the right call for a public page and useless for whoever has to fix it.
  // This is where the cause lands.
  logger: {
    error(error) {
      console.error("[auth]", error);
    },
  },
  callbacks: {
    jwt({ token, account }) {
      // `token.sub` is NOT the issuer's subject: with no adapter, Auth.js mints
      // a fresh UUID for `user.id` on every sign-in and that is what lands
      // there. The issuer's `sub` survives as `account.providerAccountId`, and
      // only on the sign-in pass, so it is copied onto the token once and read
      // from there afterwards.
      if (account?.providerAccountId) {
        token.subject = account.providerAccountId;
      }

      // A token from before this claim existed identifies nobody. Returning
      // null drops the session rather than leaving someone signed in as no one,
      // which the pages can only answer by bouncing them between each other.
      return token.subject ? token : null;
    },
    session({ session, token }) {
      // The trust boundary: the subject is read off the server-side token and
      // never off anything the browser sent.
      session.user.subject = typeof token.subject === "string" ? token.subject : "";

      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);

export { PROVIDER_ID };
