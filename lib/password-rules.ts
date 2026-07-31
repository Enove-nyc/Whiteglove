/**
 * The password rule, in a module with no server dependencies.
 *
 * Both the sign-up form (a client component) and the account store (which
 * uses node's crypto) need this number. Keeping it in the account store meant
 * the form imported a server module to read one integer, and whether that
 * stayed out of the browser bundle was down to tree-shaking rather than
 * design.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Why a password was refused, or null if it is fine. Same answer everywhere. */
export function passwordProblem(password: string | undefined): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
