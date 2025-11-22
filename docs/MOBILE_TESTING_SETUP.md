# Mobile Testing Setup Guide

This document explains how to configure Threadstead for mobile testing on your local network with HTTPS support.

## ⚠️ IMPORTANT: Authentication Requires HTTPS

The authentication system uses `@noble/ed25519` which requires the `crypto.subtle` API. This API is ONLY available in:
- ✅ HTTPS connections
- ✅ `http://localhost:*` URLs
- ❌ NOT available over `http://<IP-ADDRESS>:*`

**You MUST use HTTPS for mobile testing to test authentication/signup features.**

---

## Quick Start (Already Configured?)

If you've already set up mobile testing before and just need to toggle it on/off:

### Enable Mobile Testing
1. In `.env`: Set `MOBILE_TESTING="true"` and `NEXT_PUBLIC_BASE_URL="https://YOUR-IP:3000"`
2. In `next.config.ts`: Update CSP directives to include your IP
3. Run `npm run dev`
4. Access from mobile: `https://YOUR-IP:3000`

### Disable Mobile Testing
1. In `.env`: Set `MOBILE_TESTING="false"` and `NEXT_PUBLIC_BASE_URL="http://localhost:3000"`
2. In `next.config.ts`: Revert CSP directives to `'self'` only
3. Run `npm run dev`

**First time setup?** Continue reading below for complete instructions.

---

## Recommended Setup: HTTPS with Self-Signed Certificate

This is the **recommended approach** for mobile testing as it enables full authentication support.

### Step 1: Find Your Local IP Address

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

### Step 2: Install mkcert (One-Time Setup)

**Windows:**
```bash
choco install mkcert
```
*(Requires Chocolatey. Alternative: Download from https://github.com/FiloSottile/mkcert/releases)*

**Mac:**
```bash
brew install mkcert
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install mkcert

# Or download from releases
```

### Step 3: Generate Self-Signed Certificate

In your project root directory, run:

```bash
# Install the local Certificate Authority
mkcert -install

# Generate certificate for localhost and your IP address
mkcert localhost 10.0.0.61
```

This creates two files:
- `localhost+1.pem` (certificate)
- `localhost+1-key.pem` (private key)

⚠️ These files are automatically ignored by `.gitignore` (`*.pem`) and should never be committed.

### Step 4: Configure for HTTPS Mobile Testing

Update the following files (replace `10.0.0.61` with your actual IP address):

#### File: `.env`

**Enable mobile testing mode and update the base URL:**
```bash
MOBILE_TESTING="true"
NEXT_PUBLIC_BASE_URL="https://10.0.0.61:3000"
```

**How it works:** The `MOBILE_TESTING` environment variable automatically configures server.js to:
- Create an HTTPS server using `localhost+1.pem` and `localhost+1-key.pem`
- Listen on `0.0.0.0` (all network interfaces) instead of just `localhost`
- Configure Socket.io CORS to use the `NEXT_PUBLIC_BASE_URL` value

**Security Note:** The dev script in `package.json` uses `NODE_TLS_REJECT_UNAUTHORIZED=0` via `cross-env`:
```json
"dev": "cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 node server.js"
```
This flag is **required** to allow Node.js to accept the self-signed certificate during server-side rendering (when the server makes fetch requests to itself). This is safe for development but should **never** be used in production.

#### File: `next.config.ts`

**Location:** `next.config.ts` (lines ~183, ~189)

**Update CSP directives:**
```typescript
"default-src 'self' https://10.0.0.61:3000",
// ...
"connect-src 'self' https: https://10.0.0.61:3000",
```

**Keep the `upgrade-insecure-requests` directive** (this is safe with HTTPS):
```typescript
"upgrade-insecure-requests",
```

### Step 5: Start the Dev Server

```bash
npm run dev
```

You should see output indicating the server is running with HTTPS:
```
> Ready on https://0.0.0.0:3000
> Mobile testing mode enabled
> Access from mobile: https://10.0.0.61:3000
> Socket.io server running
```

### Step 6: Verify Your Configuration

Before testing on mobile, verify your setup is correct:

**✅ Configuration Checklist:**
- [ ] Certificate files exist: `localhost+1.pem` and `localhost+1-key.pem` in project root
- [ ] `.env` has `MOBILE_TESTING="true"`
- [ ] `.env` has `NEXT_PUBLIC_BASE_URL="https://YOUR-IP:3000"`
- [ ] `next.config.ts` CSP includes `https://YOUR-IP:3000`
- [ ] `package.json` dev script includes `NODE_TLS_REJECT_UNAUTHORIZED=0`
- [ ] Dev server is running and shows "Mobile testing mode enabled"

### Step 7: Test on Mobile Device

1. **Ensure your mobile device is on the same Wi-Fi network**
2. **Open your browser and navigate to:** `https://10.0.0.61:3000`
3. **Accept the certificate warning:**
   - iOS Safari: Tap "Show Details" → "visit this website"
   - Android Chrome: Tap "Advanced" → "Proceed to 10.0.0.61 (unsafe)"
4. **Test authentication/signup** - Everything should work! ✅

### Troubleshooting

**Certificate warning won't go away on iOS:**
- Go to Settings → General → About → Certificate Trust Settings
- Enable full trust for the mkcert root CA

**Connection refused:**
- Check Windows Firewall - allow Node.js on port 3000
- Verify you're on the same network: `ping 10.0.0.61` from mobile
- Make sure MOBILE_TESTING="true" is set in .env

**"UNABLE_TO_VERIFY_LEAF_SIGNATURE" or certificate verification errors:**
- This error occurs during server-side rendering when Node.js can't verify the self-signed certificate
- **Solution:** Ensure your `package.json` dev script includes `NODE_TLS_REJECT_UNAUTHORIZED=0`:
  ```json
  "dev": "cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 node server.js"
  ```
- This flag tells Node.js to accept self-signed certificates during development
- **Important:** This is safe for development only and should never be used in production
- Restart the dev server after making this change

**Still getting crypto.subtle error on mobile browser:**
- Verify you're accessing via `https://` (not `http://`)
- Check that NEXT_PUBLIC_BASE_URL uses `https://`
- Ensure MOBILE_TESTING="true" in .env
- Clear browser cache and reload
- Try accessing in an incognito/private window

**Server won't start or can't find certificate files:**
- Verify the certificate files exist in project root: `localhost+1.pem` and `localhost+1-key.pem`
- Make sure MOBILE_TESTING="true" in .env
- Check that mkcert was run with your IP: `mkcert localhost 10.0.0.61`
- Restart the dev server after making changes

**Port already in use (EADDRINUSE):**
- Another process is using port 3000
- Kill the existing process or change the PORT environment variable
- On Windows: `netstat -ano | findstr :3000` to find the process, then kill it
- On Mac/Linux: `lsof -ti:3000 | xargs kill`

---

## Reverting Back to Normal Development

When you're done with mobile testing, revert these changes:

### 1. Disable Mobile Testing in `.env`

```bash
MOBILE_TESTING="false"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 2. Revert `next.config.ts`

```typescript
"default-src 'self'",
// ...
"connect-src 'self' https:",
```

Keep the `upgrade-insecure-requests` directive.

### 3. Restart Dev Server

```bash
npm run dev
```

Your app will now run normally on `http://localhost:3000` with full security headers.

The server will automatically use HTTP mode and listen only on `localhost` when `MOBILE_TESTING` is not set to `"true"`.

---

## Alternative: HTTP-Only Testing (UI Only, No Auth)

⚠️ **Not recommended** - Authentication will not work!

If you only need to test UI/layout without authentication, you can use HTTP mode. However, you will not be able to test:
- Login
- Signup
- Any authentication-related features

### Quick HTTP Setup

1. **Find your IP address** (see Step 1 above)

2. **Update `.env`:**
   ```bash
   MOBILE_TESTING="false"
   NEXT_PUBLIC_BASE_URL="http://10.0.0.61:3000"
   ```

3. **Update `next.config.ts`:**
   ```typescript
   "default-src 'self' http://10.0.0.61:3000",
   // ...
   "connect-src 'self' https: http://10.0.0.61:3000",
   ```
   Remove the `upgrade-insecure-requests` directive.

4. **Access via:** `http://10.0.0.61:3000`

**Note:** With HTTP mode, server.js will still listen on `localhost` by default. You may need to modify server.js line 17 to use `'0.0.0.0'` instead of checking the `MOBILE_TESTING` variable.

---

## Summary

**For full mobile testing (RECOMMENDED):**
- ✅ Use HTTPS with mkcert
- ✅ Full authentication support
- ✅ crypto.subtle API available
- ✅ Test all features

**For UI-only testing (NOT RECOMMENDED):**
- ⚠️ Use HTTP mode
- ❌ No authentication support
- ❌ crypto.subtle not available
- ⚠️ Limited testing capability

---

## Additional Notes

### Firewall Configuration

Windows Firewall may block port 3000. If you can't connect from mobile:

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Find "Node.js" and ensure both Private and Public are checked
4. Or manually add an inbound rule for port 3000

### Network Requirements

- Your computer and mobile device must be on the same Wi-Fi network
- Some corporate/public networks block device-to-device communication
- If it doesn't work, try a personal hotspot or home network

### IP Address Changes

If your computer's IP address changes (router DHCP, reconnecting to Wi-Fi):
- Re-run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to get the new IP
- Update `NEXT_PUBLIC_BASE_URL` in `.env` with the new IP
- Update CSP directives in `next.config.ts` with the new IP
- Regenerate certificates with the new IP: `mkcert localhost NEW-IP`
- Restart the dev server

### Certificate Files

The generated `.pem` files:
- Are ignored by `.gitignore`
- Should NEVER be committed to version control
- Are only valid for the IP addresses specified when created
- Can be regenerated anytime with `mkcert`

---

## Legacy HTTP-Only Instructions (Archived)

The following section is kept for reference but is **not recommended**.

<details>
<summary>Click to expand old HTTP-only instructions</summary>

This section is archived and not recommended. Use the HTTPS method above instead.

</details>
