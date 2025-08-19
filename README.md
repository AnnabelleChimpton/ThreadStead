# Retro Social Site Template

A fully-featured retro-themed social networking template built with Next.js, featuring user profiles, posts, comments, guestbooks, and customizable CSS styling.

## ✨ Features

- 🎨 **Retro-themed UI** with customizable CSS per user
- 👤 **User profiles** with avatars, bios, and custom styling
- 📝 **Posts and comments** with nested threading
- 📖 **Guestbook system** for profile interactions
- 🔔 **Real-time notifications** for comments, replies, and follows
- 🔐 **Decentralized identity** using DID (Decentralized Identifiers)
- 📧 **Optional email login** with magic links and encrypted storage
- 🎫 **Beta key system** for controlled access
- 📱 **Responsive design** that works on all devices
- 🏗️ **Custom page creation** with full design freedom and built-in patterns
- 🛠️ **Comprehensive admin panel** with site configuration and user management
- 📚 **Design patterns guide** with copy-paste ready templates
- 🎯 **Sticky footer layout** ensuring proper page structure

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd threadstead
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the setup wizard** ⭐
   ```bash
   npm run setup
   ```
   This interactive wizard will guide you through configuring your site name, user handles, database, and security settings.

4. **Set up the database and create admin user**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npm run setup:admin  # Creates admin user with seed phrase
   ```
   
   💡 **The setup:admin script will:**
   - Create an admin user account
   - Generate a secure seed phrase for login
   - Display the credentials you'll need to sign in
   - ⚠️ **Save the seed phrase securely - you'll need it to log in!**

5. **Generate beta keys (if enabled)**
   ```bash
   npm run beta:generate 10
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open [http://localhost:3000](http://localhost:3000)** and use the seed phrase to sign in as admin

### Manual Configuration (Alternative)

If you prefer manual setup instead of the wizard:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

- `SITE_NAME` - Your site's name (appears in header and user handles)
- `DATABASE_URL` - PostgreSQL connection string
- `CAP_JWT_SECRET` - JWT secret for authentication (generate with `openssl rand -base64 32`)
- `CAP_AUDIENCE` - Your production domain
- `BETA_KEYS_ENABLED` - Enable/disable beta key requirement
- `DEFAULT_USER_*` - Customize the default seeded user

### Admin User Management

```bash
npm run setup:admin         # Create initial admin user with seed phrase
npm run promote-admin <handle>  # Promote existing user to admin
```

**Admin Setup Options:**
You can customize the admin user via environment variables:
- `ADMIN_HANDLE` - Admin username (default: "admin")
- `ADMIN_DISPLAY_NAME` - Display name (default: "Site Administrator")
- `ADMIN_BIO` - Bio text (default: "Site administrator and community manager.")
- `SITE_HANDLE_DOMAIN` - Domain for handles (default: "localhost")

### Beta Key Management

```bash
npm run beta:generate 5     # Generate 5 beta keys
npm run beta:list           # List all beta keys
```

### Email Authentication Setup

Threadstead supports optional email-based authentication using magic links, allowing users to sign in without their seed phrase. This is completely optional and privacy-focused.

#### 1. Generate Email Encryption Key

First, generate a secure encryption key for storing emails:

```bash
npm run email:generate-key
```

This will display a 64-character hex key. **Save this securely** - if lost, encrypted emails become unreadable.

#### 2. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Email Authentication (Optional)
EMAIL_ENCRYPTION_KEY="your_64_char_hex_key_from_step_1"

# Email Service (Required for email login)
RESEND_API_KEY="re_xxxxxxx"           # Get from resend.com
RESEND_FROM_EMAIL="noreply@yourdomain.com"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"  # Your site URL
NEXT_PUBLIC_SITE_NAME="YourSiteName"  # Used in emails
```

#### 3. Set Up Resend Account

1. **Sign up** at [resend.com](https://resend.com)
2. **Verify your domain** (required for production)
3. **Get API key** from the dashboard
4. **Set from address** (must be from verified domain in production)

#### 4. Email Features

Once configured, users can:

- **Add email during signup** (optional step in new account flow)
- **Add email later** from Identity page → Email Login section
- **Login with magic links** sent to verified email
- **Use multiple accounts** with the same email address

#### 5. Privacy & Security

- ✅ **Encrypted storage** - All emails encrypted with AES-256-GCM
- ✅ **No marketing** - Strict policy: emails only for login/security
- ✅ **Verification required** - Must verify email before login use
- ✅ **Multiple accounts** - Same email can be used for multiple accounts
- ✅ **Username required** - Email login requires username to prevent enumeration

#### 6. Production Considerations

**Domain Verification:**
- Resend requires domain verification in production
- Test with sandbox domains in development
- Configure SPF/DKIM records for deliverability

**Security:**
- Use strong `EMAIL_ENCRYPTION_KEY` (generated by the script)
- Store encryption key securely (environment variables, secrets manager)
- Monitor email sending rates and limits
- Consider backup encryption keys for key rotation

**Testing:**
```bash
# Test email encryption
npm run email:test-encryption

# Verify email service configuration
curl -X POST http://localhost:3000/api/auth/email-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser"}'
```

## 🏗️ Production Deployment

### 1. Prepare Environment
```bash
cp .env.example .env
# Configure all production values in .env
```

### 2. Build Application
```bash
npm run build
```

### 3. Database Setup
```bash
npx prisma migrate deploy  # Apply all migrations
npx prisma generate        # Generate Prisma client
npm run setup:admin        # Create admin user (save the seed phrase!)
```

### 4. Generate Beta Keys (if enabled)
```bash
npm run beta:generate 10
```

### 5. Deploy
- Deploy to your hosting platform (Vercel, Railway, etc.)
- Set environment variables in your hosting dashboard
- Ensure PostgreSQL database is accessible

### Deployment Checklist
- [ ] Set strong `CAP_JWT_SECRET` (min 32 chars)
- [ ] Configure production `DATABASE_URL` 
- [ ] Set `CAP_AUDIENCE` to your domain
- [ ] Customize `SITE_NAME` and defaults
- [ ] Generate beta keys if `BETA_KEYS_ENABLED=true`
- [ ] **Email Authentication (Optional):**
  - [ ] Generate `EMAIL_ENCRYPTION_KEY` with `npm run email:generate-key`
  - [ ] Set up Resend account and verify domain
  - [ ] Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
  - [ ] Set `NEXT_PUBLIC_BASE_URL` to your production domain
  - [ ] Test email login functionality
- [ ] Test all functionality in production

## 🎨 Custom Page Creation

### Admin-Created Pages
Admins can create fully customizable pages with complete design freedom:

- **No Containers**: Pages render raw HTML without post-style wrappers
- **Full Creative Control**: Use any HTML, CSS, and inline styles
- **Navbar & Footer**: Automatically included on every page
- **Responsive Design**: Built-in responsive layout structure
- **Easy Access**: Pages available at `/page/[slug]`

### Design Patterns Guide
The admin panel includes a comprehensive design patterns guide with:

- **Layout Patterns**: Full-screen heroes, centered containers, card grids, two-column layouts
- **Color & Backgrounds**: Gradient backgrounds, pattern overlays, color schemes
- **Interactive Elements**: Hover effects, animated buttons, progress indicators
- **Typography & Content**: Article layouts, callout boxes, FAQ sections

### Getting Started with Custom Pages

1. **Access Admin Panel**: Navigate to `/settings/admin` (admin privileges required)
2. **Open Design Patterns**: Review the built-in guide for inspiration and code snippets
3. **Create New Page**: Use the page creation form with HTML content
4. **Copy Patterns**: Use the copy-paste ready examples from the design guide
5. **Customize**: Modify colors, text, and layout to match your vision
6. **Publish**: Make your page live and optionally add it to navigation

For detailed examples and patterns, see [DESIGN.md](DESIGN.md).

## 📊 Features Overview

### User System
- **Decentralized Identity**: Uses DID keys instead of passwords
- **Optional Email Login**: Magic link authentication for convenience
- **Profile Customization**: Users can customize their page with CSS
- **Handle System**: Users get handles like `username@YourSiteHere`

### Content Features  
- **Posts**: Create, edit, delete posts with markdown support
- **Comments**: Nested comment threads with notifications
- **Guestbook**: Visitor messages on user profiles

### Social Features
- **Following**: Follow other users to see their content
- **Notifications**: Get notified of interactions
- **Directory**: Browse all users on the platform

### Admin Features
- **Beta Keys**: Control who can sign up
- **Moderation**: Basic content management tools
- **Custom Pages**: Create fully customizable pages with complete design freedom
- **Site Configuration**: Manage site-wide settings, branding, and messaging
- **CSS Theming**: Apply site-wide CSS themes and styles
- **User Management**: View and manage all users on the platform
- **Design Patterns**: Built-in guide with copy-paste ready design templates

## 🛠️ Development

### Project Structure
```
├── components/          # React components
│   ├── Layout.tsx       # Main layout with navbar/footer
│   ├── CustomPageLayout.tsx  # Special layout for admin pages
│   ├── DesignPatternsGuide.tsx  # Interactive design guide
│   └── ...             # Other components
├── pages/              # Next.js pages and API routes
│   ├── page/           # Custom page routes
│   ├── settings/       # Admin and user settings
│   └── api/            # API endpoints
├── lib/                # Utility functions and configurations  
├── prisma/             # Database schema and migrations
├── public/             # Static assets
├── styles/             # Global styles
├── DESIGN.md           # Design patterns documentation
└── README.md           # This file
```

### Key Technologies
- **Next.js** - React framework
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Tailwind CSS** - Styling
- **DID/JWT** - Authentication

### Available Scripts
- `npm run setup` - **Interactive setup wizard** ⭐
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - ESLint checking
- `npm run seed` - Seed database
- `npm run beta:generate` - Generate beta keys
- `npm run beta:list` - List beta keys

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
