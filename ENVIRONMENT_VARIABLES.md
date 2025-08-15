# Environment Variables Guide

This guide shows exactly where each environment variable appears in your site.

## 🎨 Visual Reference Guide

```
┌─────────────────────────────────────────┐
│  [SITE_TITLE] @ ThreadStead             │  ← Header (top of every page)
├─────────────────────────────────────────┤
│  Welcome alice@[SITE_HANDLE_DOMAIN]!    │  ← User handles throughout site
│                                         │
│  Profile: [SEED_USER_DISPLAY_NAME]      │  ← Default user's display name
│  Bio: [SEED_USER_BIO]                   │  ← Default user's bio text
│                                         │
│  Username signup:                       │
│  yourname@[SITE_HANDLE_DOMAIN]         │  ← Shows in signup form
└─────────────────────────────────────────┘

Note: Without configuration, defaults show as "YourSiteHere" - obviously needs customizing!
```

## 📝 Complete Variable List

### Site Branding
- **`NEXT_PUBLIC_SITE_TITLE`** 
  - **Appears:** Header/navigation at top of every page
  - **Example:** "MyAwesome Site" → Shows as main site title
  - **Keep:** Descriptive, can be multiple words
  - **Note:** NEXT_PUBLIC_ prefix required for client-side access

- **`SITE_HANDLE_DOMAIN`** 
  - **Appears:** After @ in ALL usernames (alice@YourSite)
  - **Example:** "CoolSite" → Creates handles like "bob@CoolSite"
  - **Keep:** SHORT - users see this constantly
  - **Also need:** `NEXT_PUBLIC_SITE_HANDLE_DOMAIN` (same value, for client-side)

### Default User (Created by `npm run seed`)
- **`SEED_USER_HANDLE`**
  - **Appears:** Username part of default user
  - **Example:** "admin" → Creates "admin@YourSite"

- **`SEED_USER_DISPLAY_NAME`**
  - **Appears:** Display name on default user's profile  
  - **Example:** "Site Administrator"

- **`SEED_USER_BIO`**
  - **Appears:** Bio text on default user's profile
  - **Example:** "Welcome to our community!"

### Security & Database
- **`DATABASE_URL`**
  - **Use:** PostgreSQL connection string
  - **Example:** `postgresql://user:pass@host:5432/dbname`

- **`CAP_JWT_SECRET`**  
  - **Use:** JWT token signing (CRITICAL: Generate new for production)
  - **Generate:** `openssl rand -base64 32`

- **`CAP_AUDIENCE`**
  - **Use:** JWT audience validation
  - **Set to:** Your production domain

- **`BETA_KEYS_ENABLED`**
  - **Use:** Require beta keys for signup ("true"/"false")

## 🚀 Quick Setup Examples

### Example 1: "RetroSpace" Community
```bash
NEXT_PUBLIC_SITE_TITLE="RetroSpace Community"
SITE_HANDLE_DOMAIN="RetroSpace"
NEXT_PUBLIC_SITE_HANDLE_DOMAIN="RetroSpace"
SEED_USER_HANDLE="admin"
SEED_USER_DISPLAY_NAME="Community Manager"
SEED_USER_BIO="Welcome to RetroSpace! Let's build something cool together."
```
**Result:** Users get handles like `alice@RetroSpace`, site title shows "RetroSpace Community"

### Example 2: Personal Site
```bash
NEXT_PUBLIC_SITE_TITLE="Sarah's Digital Garden"
SITE_HANDLE_DOMAIN="SarahsGarden"  
NEXT_PUBLIC_SITE_HANDLE_DOMAIN="SarahsGarden"
SEED_USER_HANDLE="sarah"
SEED_USER_DISPLAY_NAME="Sarah"
SEED_USER_BIO="Welcome to my digital garden where I share thoughts and projects."
```
**Result:** Users get handles like `friends@SarahsGarden`, site shows "Sarah's Digital Garden"

## ⚠️ Important Notes

1. **Keep `SITE_HANDLE_DOMAIN` short** - it appears after @ in every username
2. **Set both versions** - `SITE_HANDLE_DOMAIN` and `NEXT_PUBLIC_SITE_HANDLE_DOMAIN` (same value)
3. **`SITE_TITLE` can be longer** - only appears in header
4. **Seed user is optional** - only created when you run `npm run seed`
5. **Change before seeding** - user data is set when created, not dynamic