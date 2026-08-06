// How long a user stays logged in. Drives both the JWT expiry and the session
// cookie lifetime. Change SESSION_DURATION_DAYS to adjust how long users stay
// signed in.
export const SESSION_DURATION_DAYS = 30;
export const SESSION_DURATION_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;
export const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;
