/**
 * What the password routes take. The strength rule (validatePasswordStrength:
 * 8 characters with a lowercase letter, a capital and a number) was only
 * checked in the browser; a request could set "a". And a non-string password
 * reached bcrypt or pbkdf2 and threw (a 500), after a reset had already used
 * up its token.
 */
import { z } from 'zod';
import { validatePasswordStrength } from './password';

/** A password being set: the site's strength rule, in its own words */
export const newPasswordSchema = z.string().max(200).superRefine((password, ctx) => {
  const { valid, errors } = validatePasswordStrength(password);
  if (!valid) ctx.addIssue({ code: 'custom', message: errors[0] });
});

/** A password being checked (the current one): no rule, just text */
export const givenPasswordSchema = z.string().max(200);

/**
 * The seed phrase encrypted with the password (encryptSeedPhraseWithPassword):
 * base64 of salt (32) + iv (16) + tag (16) + the phrase, so 88 characters at
 * least. Password sign-in decrypts it, so garbage here locks the account out.
 */
export const encryptedSeedPhraseSchema = z
  .string()
  .min(88, "That saved phrase isn't in the right form.")
  .max(2000, "That saved phrase isn't in the right form.")
  .regex(/^[A-Za-z0-9+/]+={0,2}$/, "That saved phrase isn't in the right form.");
