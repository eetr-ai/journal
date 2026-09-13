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
    session({ session, token }) {
      // The trust boundary: the subject is read off the server-side token and
      // never off anything the browser sent.
      session.user.subject = token.sub ?? "";

      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);

export { PROVIDER_ID };
