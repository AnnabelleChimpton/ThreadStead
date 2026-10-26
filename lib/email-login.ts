import { getSiteBaseUrl } from '@/lib/config/site-url';
import { randomBytes } from 'crypto';
import { db } from './config/database/connection';
import { encryptEmail, findUsersByEmail } from './utils/security/email-encryption';
import { Resend } from 'resend';
import { escapeHtml } from './utils/sanitization/escape';
import type { EmailTokenType } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailLoginUser {
  id: string;
  did: string;
  displayName?: string;
  handle?: string;
  host?: string;
  avatarThumbnailUrl?: string;
  emailVerifiedAt?: Date;
}

/**
 * Generate a secure token for email login
 */
export function generateEmailLoginToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create an email login token for the given email address
 * Returns the token that should be sent via email
 */
export async function createEmailLoginToken(email: string): Promise<string> {
  const token = generateEmailLoginToken();
  const encryptedEmail = encryptEmail(email);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.emailLoginToken.create({
    data: {
      token,
      encryptedEmail,
      type: 'login',
      expiresAt
    }
  });

  return token;
}

/**
 * Create an email verification token for the given user and email
 */
export async function checkEmailLoginToken(token: string): Promise<EmailLoginUser[]> {
  const tokenRecord = await db.emailLoginToken.findUnique({
    where: { token }
  });

  if (!tokenRecord) {
    throw new Error('Invalid token');
  }

  if (tokenRecord.type !== 'login') {
    throw new Error('Invalid token type');
  }

  if (tokenRecord.usedAt) {
    throw new Error('Token has already been used');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new Error('Token has expired');
  }

  // Don't mark as used yet - just validate and return users

  // Decrypt the email from token and find users with that email
  const { decryptEmail } = await import('./utils/security/email-encryption');
  const email = decryptEmail(tokenRecord.encryptedEmail);

  // Find users with this email (decrypt-based lookup) AND verified email
  const usersWithEmail = await findUsersByEmail(email);
  const users = usersWithEmail.filter(user => !!user.emailVerifiedAt);

  return users.map(user => ({
    id: user.id,
    did: user.did,
    displayName: user.profile?.displayName,
    handle: user.handles[0]?.handle,
    host: user.handles[0]?.host,
    avatarThumbnailUrl: user.profile?.avatarThumbnailUrl,
    emailVerifiedAt: user.emailVerifiedAt
  }));
}

/**
 * Mark a token as used, atomically. Two requests racing with the same link
 * both pass the read-only checks above, but only one of them can flip usedAt
 * from null here; the other gets count 0 and is refused.
 */
async function claimToken(token: string, type: EmailTokenType): Promise<boolean> {
  const { count } = await db.emailLoginToken.updateMany({
    where: { token, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() }
  });
  return count === 1;
}

/**
 * Verify an email login token and return associated users (marks token as used)
 */
export async function verifyEmailLoginToken(token: string): Promise<EmailLoginUser[]> {
  // First check if token is valid
  const users = await checkEmailLoginToken(token);

  // If valid, mark token as used
  if (!(await claimToken(token, 'login'))) {
    throw new Error('Token has already been used');
  }

  return users;
}

/**
 * Verify an email verification token and mark email as verified
 */
export async function verifyEmailVerificationToken(token: string): Promise<{ userId: string; email: string }> {
  const tokenRecord = await db.emailLoginToken.findUnique({
    where: { token }
  });

  if (!tokenRecord) {
    throw new Error('Invalid verification token');
  }

  if (tokenRecord.type !== 'verification') {
    throw new Error('Invalid token type');
  }

  if (tokenRecord.usedAt) {
    throw new Error('Verification token has already been used');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new Error('Verification token has expired');
  }

  if (!tokenRecord.userId) {
    throw new Error('Invalid verification token - no user ID');
  }

  // Mark token as used
  if (!(await claimToken(token, 'verification'))) {
    throw new Error('Verification token has already been used');
  }

  // Verify the email for the user (email should already be set, just mark as verified)
  await db.user.update({
    where: { id: tokenRecord.userId },
    data: {
      emailVerifiedAt: new Date()
      // No need to set encryptedEmail again - it's already set when user added email
    }
  });

  // Return decrypted email for confirmation
  const email = await import('./utils/security/email-encryption').then(mod =>
    mod.decryptEmail(tokenRecord.encryptedEmail)
  );

  return { userId: tokenRecord.userId, email };
}

/**
 * Verify a password reset token and return user ID (marks token as used)
 */
export async function verifyPasswordResetToken(token: string): Promise<{ userId: string; email: string }> {
  const tokenRecord = await db.emailLoginToken.findUnique({
    where: { token }
  });

  if (!tokenRecord) {
    throw new Error('Invalid reset token');
  }

  if (tokenRecord.type !== 'password_reset') {
    throw new Error('Invalid token type');
  }

  if (tokenRecord.usedAt) {
    throw new Error('Reset token has already been used');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new Error('Reset token has expired');
  }

  if (!tokenRecord.userId) {
    throw new Error('Invalid reset token - no user ID');
  }

  // Mark token as used
  if (!(await claimToken(token, 'password_reset'))) {
    throw new Error('Reset token has already been used');
  }

  // Return decrypted email for confirmation
  const email = await import('./utils/security/email-encryption').then(mod =>
    mod.decryptEmail(tokenRecord.encryptedEmail)
  );

  return { userId: tokenRecord.userId, email };
}

/**
 * Send login email with magic link. `next`: a path on this site to land on
 * after signing in (checked by the caller), e.g. the guestbook they were
 * signing from someone's own address.
 */
export async function sendLoginEmail(email: string, users: EmailLoginUser[], token: string, next?: string | null): Promise<void> {
  const baseUrl = getSiteBaseUrl();
  const loginUrl = `${baseUrl}/auth/email-verify?token=${token}${next ? `&next=${encodeURIComponent(next)}` : ''}`;

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL environment variable is required');
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Threadstead';

  let subject: string;
  let htmlContent: string;

  if (users.length === 0) {
    // No accounts found - security: don't reveal this info
    subject = `Sign in to ${siteName}`;
    htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to ${siteName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #007cba;">Sign in to ${siteName}</h2>
        <p>Someone (hopefully you!) asked to sign in to ${siteName} with this email address, but I couldn't find an account where it's been verified.</p>
        <p>If you do have an account, check that this is the address you added, and that you clicked the link in the verification email. If you didn't ask to sign in, you can ignore this.</p>
        <p>- Annabelle</p>
      </body>
      </html>
    `;
  } else if (users.length === 1) {
    const user = users[0];
    const displayName = escapeHtml(user.displayName || user.handle || 'your account');
    subject = `Sign in to ${siteName}`;
    htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in to ${siteName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #007cba;">Sign in to ${siteName}</h2>
      <p>Hi <strong>${displayName}</strong>!</p>
      <p>Here's your link to sign in to ${siteName}.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Sign in</a>
      </div>
      
      <p>If the button doesn't work, copy this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; border: 1px solid #ddd;">
        <a href="${loginUrl}" style="color: #007cba;">${loginUrl}</a>
      </p>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px;">
        <p>The link stops working after 15 minutes. If you didn't ask to sign in, you can ignore this email and nothing will happen.</p>
        <p>- Annabelle</p>
      </div>
    </body>
    </html>
    `;
  } else {
    // Multiple accounts
    subject = `Pick an account to sign in to ${siteName}`;
    const accountList = users.map(user => {
      const displayName = escapeHtml(user.displayName || user.handle || 'Unnamed Account');
      return `<li><strong>${displayName}</strong> (@${escapeHtml(user.handle || 'no-handle')})</li>`;
    }).join('');

    htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pick an account - ${siteName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #007cba;">Pick an account to sign in to ${siteName}</h2>
      <p>This email address is verified on more than one account:</p>
      <ul style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; border-left: 4px solid #007cba;">
        ${accountList}
      </ul>
      <p>Pick the one you want to sign in to:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Choose account</a>
      </div>
      
      <p>If the button doesn't work, copy this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; border: 1px solid #ddd;">
        <a href="${loginUrl}" style="color: #007cba;">${loginUrl}</a>
      </p>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px;">
        <p>The link stops working after 15 minutes. If you didn't ask to sign in, you can ignore this email and nothing will happen.</p>
        <p>- Annabelle</p>
      </div>
    </body>
    </html>
    `;
  }

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html: htmlContent
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(email: string, userName: string, token: string): Promise<void> {
  const baseUrl = getSiteBaseUrl();
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL environment variable is required');
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Threadstead';

  const subject = `Confirm your email for ${siteName}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirm your email - ${siteName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #007cba;">Confirm your email</h2>
      <p>Hi <strong>${escapeHtml(userName)}</strong>!</p>
      <p>You added this email address to your ${siteName} account. Click below to confirm it's yours, and then you'll be able to sign in with an email link.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Confirm email</a>
      </div>
      
      <p>If the button doesn't work, copy this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; border: 1px solid #ddd;">
        <a href="${verifyUrl}" style="color: #007cba;">${verifyUrl}</a>
      </p>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px;">
        <p>The link stops working after 24 hours. If you didn't add this address, you can ignore this email.</p>
        <p>- Annabelle</p>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html: htmlContent
  });
}

/**
 * Tell someone their account is set to be deleted (lib/domain/users/leaving.ts),
 * so a stolen session can't quietly delete it.
 */
export async function sendLeavingEmail(email: string, userName: string, deletesAt: Date): Promise<void> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL environment variable is required');
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Threadstead';
  const settingsUrl = `${getSiteBaseUrl()}/settings?tab=privacy`;
  const day = deletesAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Your ${siteName} account is set to be deleted`,
    html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>Hi <strong>${escapeHtml(userName)}</strong>,</p>
      <p>You asked to delete your ${siteName} account. Your page, house and posts are hidden now, and everything goes for good on <strong>${day}</strong>.</p>
      <p>Changed your mind? Sign in before then and press <strong>Keep my account</strong> in <a href="${settingsUrl}" style="color: #007cba;">Settings</a>.</p>
      <p>If this wasn't you, sign in, keep your account, and tell me.</p>
      <p>- Annabelle</p>
    </body>
    </html>
  `,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, userName: string, token: string): Promise<void> {
  const baseUrl = getSiteBaseUrl();
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL environment variable is required');
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Threadstead';

  const subject = `Reset your password for ${siteName}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset your password - ${siteName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #007cba;">Reset your password</h2>
      <p>Hi <strong>${escapeHtml(userName)}</strong>!</p>
      <p>Someone asked to reset the password on your ${siteName} account. If that was you, click below to pick a new one.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Reset password</a>
      </div>
      
      <p>If the button doesn't work, copy this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; border: 1px solid #ddd;">
        <a href="${resetUrl}" style="color: #007cba;">${resetUrl}</a>
      </p>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px;">
        <p>The link stops working after an hour. If you didn't ask for this, you can ignore this email and your password won't change.</p>
        <p>- Annabelle</p>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html: htmlContent
  });
}

/**
 * Clean up expired email login tokens
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await db.emailLoginToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
}

/**
 * Create an email verification token
 */
export async function createEmailVerificationToken(userId: string, email: string): Promise<string> {
  const token = generateEmailLoginToken();
  const encryptedEmail = encryptEmail(email);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.emailLoginToken.create({
    data: {
      token,
      userId,
      encryptedEmail,
      type: 'verification',
      expiresAt
    }
  });
  return token;
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(userId: string, email: string): Promise<string> {
  const token = generateEmailLoginToken();
  const encryptedEmail = encryptEmail(email);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hr

  await db.emailLoginToken.create({
    data: {
      token,
      userId,
      encryptedEmail,
      type: 'password_reset' as any, // Cast to any to avoid TS error if types not regenerated yet
      expiresAt
    }
  });
  return token;
}