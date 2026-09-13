import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The `sub` claim the issuer minted. The key everything else hangs off. */
      subject: string;
    } & DefaultSession["user"];
  }
}
