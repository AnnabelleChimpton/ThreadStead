# Mobile Testing Setup Guide

This document explains how to configure Threadstead for mobile testing on your local network with HTTPS support.

## ⚠️ IMPORTANT: Authentication Requires HTTPS

The authentication system uses `@noble/ed25519` which requires the `crypto.subtle` API. This API is ONLY available in:
- ✅ HTTPS connections
- ✅ `http://localhost:*` URLs
- ❌ NOT available over `http://<IP-ADDRESS>:*`

**You MUST use HTTPS for mobile testing to test authentication/signup features.**

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

#### File: `package.json`

**Location:** `package.json` (line ~10)

**Change the dev script:**
```json
"dev": "cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 next dev -H 0.0.0.0 -p 3001 --experimental-https --experimental-https-key ./localhost+1-key.pem --experimental-https-cert ./localhost+1.pem"
```

**Note:** The `NODE_TLS_REJECT_UNAUTHORIZED=0` flag is required to allow Node.js to accept the self-signed certificate during server-side rendering. The `cross-env` package ensures this works on both Windows and Unix systems.

**Install cross-env if not already installed:**
```bash
npm install --save-dev cross-env
```

#### File: `.env`

**Location:** `.env` (line ~79)

**Update the base URL:**
```bash
NEXT_PUBLIC_BASE_URL="https://10.0.0.61:3001"
```

#### File: `next.config.ts`

**Location:** `next.config.ts` (lines ~173, ~179)

**Update CSP directives:**
```typescript
"default-src 'self' https://10.0.0.61:3001",
// ...
"connect-src 'self' https: https://10.0.0.61:3001",
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
- Local:        https://localhost:3001
- Network:      https://10.0.0.61:3001
```

### Step 6: Test on Mobile Device

1. **Ensure your mobile device is on the same Wi-Fi network**
2. **Open your browser and navigate to:** `https://10.0.0.61:3001`
3. **Accept the certificate warning:**
   - iOS Safari: Tap "Show Details" → "visit this website"
   - Android Chrome: Tap "Advanced" → "Proceed to 10.0.0.61 (unsafe)"
4. **Test authentication/signup** - Everything should work! ✅

### Troubleshooting

**Certificate warning won't go away on iOS:**
- Go to Settings → General → About → Certificate Trust Settings
- Enable full trust for the mkcert root CA

**Connection refused:**
- Check Windows Firewall - allow Node.js on port 3001
- Verify you're on the same network: `ping 10.0.0.61` from mobile

**Still getting crypto.subtle error:**
- Verify you're accessing via `https://` (not `http://`)
- Check that NEXT_PUBLIC_BASE_URL uses `https://`
- Clear browser cache and reload

**"UNABLE_TO_VERIFY_LEAF_SIGNATURE" or fetch errors:**
- This means Node.js doesn't trust the self-signed certificate
- Ensure you have `NODE_TLS_REJECT_UNAUTHORIZED=0` in your dev script
- Make sure `cross-env` is installed: `npm install --save-dev cross-env`
- Restart the dev server after making changes

---

## Reverting Back to Normal Development

When you're done with mobile testing, revert these changes:

### 1. Revert `package.json`

```json
"dev": "next dev",
```

### 2. Revert `.env`

```bash
NEXT_PUBLIC_BASE_URL="https://localhost:3000"
```

### 3. Revert `next.config.ts`

```typescript
"default-src 'self'",
// ...
"connect-src 'self' https:",
```

Keep the `upgrade-insecure-requests` directive.

### 4. Restart Dev Server

```bash
npm run dev
```

Your app will now run normally on `http://localhost:3000` with full security headers.

---

## Alternative: HTTP-Only Testing (UI Only, No Auth)

⚠️ **Not recommended** - Authentication will not work!

If you only need to test UI/layout without authentication, you can use HTTP mode. However, you will not be able to test:
- Login
- Signup
- Any authentication-related features

### Quick HTTP Setup

1. **Find your IP address** (see Step 1 above)

2. **Update `next.config.ts`:**
   ```typescript
   "default-src 'self' http://10.0.0.61:3001",
   // ...
   "connect-src 'self' https: http://10.0.0.61:3001",
   ```
   Remove the `upgrade-insecure-requests` directive.

3. **Update `.env`:**
   ```bash
   NEXT_PUBLIC_BASE_URL="http://10.0.0.61:3001"
   ```

4. **Update `package.json`:**
   ```json
   "dev": "next dev -H 0.0.0.0 -p 3001"
   ```

5. **Access via:** `http://10.0.0.61:3001`

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

Windows Firewall may block port 3001. If you can't connect from mobile:

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Find "Node.js" and ensure both Private and Public are checked
4. Or manually add an inbound rule for port 3001

### Network Requirements

- Your computer and mobile device must be on the same Wi-Fi network
- Some corporate/public networks block device-to-device communication
- If it doesn't work, try a personal hotspot or home network

### IP Address Changes

If your computer's IP address changes (router DHCP, reconnecting to Wi-Fi):
- Re-run `ipconfig` to get the new IP
- Update all references in the config files
- Regenerate certificates with the new IP: `mkcert localhost NEW-IP`

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
