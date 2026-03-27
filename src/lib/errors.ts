/**
 * Thrown for expected, user-facing validation and business-logic errors.
 * The message is safe to return directly to API clients.
 * Any other Error subclass is treated as an unexpected infrastructure error
 * and its message is sanitized before being returned to clients.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
