/**
 * What Auth.js puts in `?error=` on the error page.
 *
 * Only a fixed set of codes is considered safe to send to the browser; every
 * other failure is collapsed into `Configuration`. The underlying cause never
 * reaches the page, which is why the sign-in flow logs it on the server.
 */
export const authErrorCodes = [
  "Configuration",
  "AccessDenied",
  "OAuthCallbackError",
  "OAuthAccountNotLinked",
  "AccountNotLinked",
  "Verification",
  "MissingCSRF",
  "CredentialsSignin",
  "WebAuthnVerificationError",
] as const;

export type AuthErrorCode = (typeof authErrorCodes)[number] | "Unknown";

export function toAuthErrorCode(raw: string | undefined): AuthErrorCode {
  return (authErrorCodes as readonly string[]).includes(raw ?? "")
    ? (raw as AuthErrorCode)
    : "Unknown";
}

// Codes a person can do something about by starting over. `Configuration` is
// the one that cannot: it means the app and the issuer disagree, and only an
// operator can change that.
const RETRYABLE = new Set<AuthErrorCode>([
  "AccessDenied",
  "OAuthCallbackError",
  "Verification",
  "MissingCSRF",
  "CredentialsSignin",
  "WebAuthnVerificationError",
  "Unknown",
]);

export function isRetryable(code: AuthErrorCode): boolean {
  return RETRYABLE.has(code);
}
