# Retro Social Site Template

A fully-featured retro-themed social networking template built with Next.js, featuring user profiles, posts, comments, guestbooks, and customizable CSS styling.

## ✨ Features

- 🎨 **Retro-themed UI** with customizable CSS per user
- 👤 **User profiles** with avatars, bios, and custom styling
- 📝 **Posts and comments** with nested threading
- 📖 **Guestbook system** for profile interactions
- 🔔 **Real-time notifications** for comments, replies, and follows
- 🔐 **Decentralized identity** using DID (Decentralized Identifiers)
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

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed  # Creates default user (if configured in setup)
   ```

5. **Generate beta keys (if enabled)**
   ```bash
   npm run beta:generate 10
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open [http://localhost:3000](http://localhost:3000)**

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

### Beta Key Management

```bash
npm run beta:generate 5     # Generate 5 beta keys
npm run beta:list           # List all beta keys
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
npx prisma generate
npx prisma db push
npm run seed  # Optional: creates default user
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
