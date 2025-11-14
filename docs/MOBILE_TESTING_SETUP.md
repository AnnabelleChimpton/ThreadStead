# Mobile Testing Setup Guide

This document explains how to configure Threadstead for mobile testing on your local network, and how to revert back to normal development mode.

## Problem

When testing the app on mobile devices via local IP address (e.g., `http://10.0.0.61:3001`), several issues occur:
1. Content Security Policy (CSP) blocks requests from non-localhost origins
2. The `upgrade-insecure-requests` CSP directive forces HTTP to HTTPS (which fails)
3. Base URL is hardcoded to localhost
4. Dev server binds only to localhost by default
5. **crypto.subtle is not available over HTTP to IP addresses** (only works on HTTPS or localhost)

## Known Limitation

⚠️ **IMPORTANT**: The authentication system uses `@noble/ed25519` which requires `crypto.subtle` API. This API is ONLY available in:
- HTTPS connections
- `http://localhost:*` URLs
- NOT available over `http://<IP-ADDRESS>:*`

This means **login/authentication will NOT work when testing via IP address over HTTP**. You can test the UI and non-authenticated features, but login will fail with "crypto.subtle must be defined" error.

### Workaround Options for Authentication Testing:

1. **Use HTTPS with self-signed certificate** (recommended for full testing)
2. **Test authentication on localhost only** (use Chrome DevTools device emulation)
3. **Use browser polyfills** (requires additional implementation)
4. **Deploy to a staging server with HTTPS**

---

## Changes for Mobile Testing

### 1. Find Your Local IP Address

**Windows:**
```bash
ipconfig
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

Look for your IPv4 address on your active Wi-Fi/Ethernet adapter (e.g., `10.0.0.61`).

---

### 2. File: `next.config.ts`

**Location:** `C:\Users\pesky\Git\threadstead\next.config.ts`

#### Change 1: Update CSP `default-src` (line ~173)

**ORIGINAL:**
```typescript
"default-src 'self'",
```

**MOBILE TESTING:**
```typescript
"default-src 'self' http://10.0.0.61:3001",
```
*(Replace `10.0.0.61` with your actual IP address)*

---

#### Change 2: Update CSP `connect-src` (line ~179)

**ORIGINAL:**
```typescript
"connect-src 'self' https:",
```

**MOBILE TESTING:**
```typescript
"connect-src 'self' https: http://10.0.0.61:3001",
```
*(Replace `10.0.0.61` with your actual IP address)*

---

#### Change 3: Remove `upgrade-insecure-requests` (line ~185)

**ORIGINAL:**
```typescript
              "connect-src 'self' https:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
```

**MOBILE TESTING:**
```typescript
              "connect-src 'self' https: http://10.0.0.61:3001",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
```
*(Note: `upgrade-insecure-requests` line is REMOVED)*

---

### 3. File: `.env`

**Location:** `C:\Users\pesky\Git\threadstead\.env`

#### Change: Update `NEXT_PUBLIC_BASE_URL` (line ~79)

**ORIGINAL:**
```bash
NEXT_PUBLIC_BASE_URL="https://localhost:3000"
```

**MOBILE TESTING:**
```bash
NEXT_PUBLIC_BASE_URL="http://10.0.0.61:3001"
```
*(Replace `10.0.0.61` with your actual IP address)*

---

### 4. File: `package.json`

**Location:** `C:\Users\pesky\Git\threadstead\package.json`

#### Change: Update `dev` script (line ~10)

**ORIGINAL:**
```json
"dev": "next dev",
```

**MOBILE TESTING:**
```json
"dev": "next dev -H 0.0.0.0 -p 3001",
```

**Explanation:**
- `-H 0.0.0.0` - Binds to all network interfaces (allows external connections)
- `-p 3001` - Uses port 3001 instead of default 3000

---

## Testing Steps

1. Make all the changes listed above
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. On your mobile device (connected to the same Wi-Fi network):
   - Open browser
   - Navigate to: `http://10.0.0.61:3001` (use your actual IP)
4. Test the UI and non-authenticated features
5. **Note:** Login/authentication will not work due to crypto.subtle limitation

---

## Reverting Back to Normal Development

When you're done with mobile testing, revert these changes:

### 1. Revert `next.config.ts`

**Line ~173:**
```typescript
"default-src 'self'",
```

**Line ~179:**
```typescript
"connect-src 'self' https:",
```

**Line ~185 (add back):**
```typescript
              "connect-src 'self' https:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
```

---

### 2. Revert `.env`

**Line ~79:**
```bash
NEXT_PUBLIC_BASE_URL="https://localhost:3000"
```

---

### 3. Revert `package.json`

**Line ~10:**
```json
"dev": "next dev",
```

---

### 4. Restart Dev Server

```bash
npm run dev
```

Your app will now run normally on `http://localhost:3000` with full security headers.

---

## Quick Reference: Git Diff Format

If you want to track changes with git, here's what the diff looks like:

```diff
# next.config.ts
-              "default-src 'self'",
+              "default-src 'self' http://10.0.0.61:3001",

-              "connect-src 'self' https:",
+              "connect-src 'self' https: http://10.0.0.61:3001",

-              "upgrade-insecure-requests",
+

# .env
-NEXT_PUBLIC_BASE_URL="https://localhost:3000"
+NEXT_PUBLIC_BASE_URL="http://10.0.0.61:3001"

# package.json
-    "dev": "next dev",
+    "dev": "next dev -H 0.0.0.0 -p 3001",
```

---

## Important Notes

1. **Never commit these changes to production**
   - These changes weaken security by allowing HTTP access
   - Only use for local mobile testing

2. **Firewall considerations**
   - Windows Firewall may block port 3001
   - You may need to allow Node.js through your firewall

3. **Same network requirement**
   - Your mobile device must be on the same Wi-Fi network as your computer

4. **IP address changes**
   - If your computer's IP address changes (reconnect to Wi-Fi, router DHCP), you'll need to update all references to the IP address

5. **Authentication limitation**
   - Due to crypto.subtle API restrictions, you cannot test login functionality over HTTP to IP addresses
   - Consider using Chrome DevTools device emulation for testing authenticated features
   - Or set up HTTPS with self-signed certificates for full mobile testing

---

## Alternative: Using HTTPS for Full Testing

If you need to test authentication on mobile, you'll need to set up HTTPS:

1. Generate self-signed certificate:
   ```bash
   # Install mkcert (one-time)
   # Windows: choco install mkcert
   # Mac: brew install mkcert

   mkcert -install
   mkcert localhost 10.0.0.61
   ```

2. Update dev script in `package.json`:
   ```json
   "dev": "next dev -H 0.0.0.0 -p 3001 --experimental-https --experimental-https-key ./localhost+1-key.pem --experimental-https-cert ./localhost+1.pem",
   ```

3. Access via: `https://10.0.0.61:3001`

This allows crypto.subtle to work and enables full authentication testing on mobile devices.

---

## Summary

**Files to modify for mobile testing:**
1. `next.config.ts` - Update CSP, remove upgrade-insecure-requests
2. `.env` - Update NEXT_PUBLIC_BASE_URL
3. `package.json` - Update dev script

**Files to revert when done:**
1. `next.config.ts` - Restore original CSP and upgrade-insecure-requests
2. `.env` - Restore localhost URL
3. `package.json` - Restore simple dev script

**Key limitation:**
- Authentication (login) will not work over HTTP to IP addresses due to crypto.subtle API restrictions
- Use HTTPS with self-signed certificates if you need to test authentication on mobile devices
