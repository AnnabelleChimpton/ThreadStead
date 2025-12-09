import { randomBytes } from 'crypto';
import { db } from './config/database/connection';
import { encryptEmail, findUsersByEmail } from './utils/security/email-encryption';
import { Resend } from 'resend';

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
 * Verify an email login token and return associated users (marks token as used)
 */
export async function verifyEmailLoginToken(token: string): Promise<EmailLoginUser[]> {
  // First check if token is valid
  const users = await checkEmailLoginToken(token);

  // If valid, mark token as used
  await db.emailLoginToken.update({
    where: { token },
    data: { usedAt: new Date() }
  });

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
  await db.emailLoginToken.update({
    where: { token },
    data: { usedAt: new Date() }
  });

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
  await db.emailLoginToken.update({
    where: { token },
    data: { usedAt: new Date() }
  });

  // Return decrypted email for confirmation
  const email = await import('./utils/security/email-encryption').then(mod =>
    mod.decryptEmail(tokenRecord.encryptedEmail)
  );

  return { userId: tokenRecord.userId, email };
}

/**
 * Send login email with magic link
 */
export async function sendLoginEmail(email: string, users: EmailLoginUser[], token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/auth/email-verify?token=${token}`;

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
        <p>We received a request to sign in to your account, but we couldn't find any verified accounts associated with this email address.</p>
        <p>If you believe this is an error, please check that you're using the correct email address and that your email is verified.</p>
        <p style="color: #666; font-size: 14px;">This email will expire in 15 minutes.</p>
      </body>
      </html>
    `;
  } else if (users.length === 1) {
    const user = users[0];
    const displayName = user.displayName || user.handle || 'your account';
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
      <p>Hi <strong>${displayName}</strong>,</p>
      <p>You requested to sign in to your ${siteName} account. Click the button below to sign in:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Sign In to ${siteName}</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; border: 1px solid #ddd;">
        <a href="${loginUrl}" style="color: #007cba;">${loginUrl}</a>
      </p>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px;">
        <p><strong>Security note:</strong> This link will expire in 15 minutes.</p>
        <p>If you didn't request this login, you can safely ignore this email.</p>
        <p>Best regards,<br>The ${siteName} Team</p>
      </div>
    </body>
    </html>
    `;
  } else {
    // Multiple accounts
    subject = `Choose account to sign in to ${siteName}`;
    const accountList = users.map(user => {
      const displayName = user.displayName || user.handle || 'Unnamed Account';
      return `<li><strong>${displayName}</strong> (@${user.handle || 'no-handle'})</li>`;
    }).join('');

    htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Choose account - ${siteName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #007cba;">Choose account to sign in to ${siteName}</h2>
      <p>We found multiple verified accounts associated with this email address:</p>
      <ul style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; border-left: 4px solid #007cba;">
        ${accountList}
      </ul>
      <p>Click the button below to choose which account to sign in to:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Choose Account</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; border: 1px solid #ddd;">
        <a href="${loginUrl}" style="color: #007cba;">${loginUrl}</a>
      </p>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px;">
        <p><strong>Security note:</strong> This link will expire in 15 minutes.</p>
        <p>If you didn't request this login, you can safely ignore this email.</p>
        <p>Best regards,<br>The ${siteName} Team</p>
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL environment variable is required');
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Threadstead';

  const subject = `Verify your email address for ${siteName}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your email - ${siteName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #007cba;">Verify your email address</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>You recently added this email address to your ${siteName} account. To complete the setup and enable email login, please verify your email address:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Verify Email Address</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; border: 1px solid #ddd;">
        <a href="${verifyUrl}" style="color: #007cba;">${verifyUrl}</a>
      </p>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px;">
        <p><strong>Security note:</strong> This verification link will expire in 24 hours.</p>
        <p>If you didn't add this email address to your account, you can safely ignore this email.</p>
        <p>Best regards,<br>The ${siteName} Team</p>
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
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, userName: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
      <p>Hi <strong>${userName}</strong>,</p>
      <p>You requested to reset your password for your ${siteName} account. Click the button below to set a new password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Reset Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; border: 1px solid #ddd;">
        <a href="${resetUrl}" style="color: #007cba;">${resetUrl}</a>
      </p>
      
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 14px;">
        <p><strong>Security note:</strong> This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Best regards,<br>The ${siteName} Team</p>
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