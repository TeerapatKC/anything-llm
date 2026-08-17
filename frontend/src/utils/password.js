/**
 * Characters a password may contain. Kept deliberately narrow so passwords survive being
 * passed through shells, env files, and URL-encoded form posts without escaping surprises.
 */
export const PW_REGEX = new RegExp(/^[a-zA-Z0-9_\-!@$%^&*();]+$/);

/** Human-readable list of the symbols `PW_REGEX` allows, for error messages. */
export const PW_ALLOWED_SYMBOLS = "_,-,!,@,$,%,^,&,*,(,),;";
