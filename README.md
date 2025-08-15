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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd retro-social-site
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

## 🛠️ Development

### Project Structure
```
├── components/          # React components
├── pages/              # Next.js pages and API routes
├── lib/                # Utility functions and configurations  
├── prisma/             # Database schema and migrations
├── public/             # Static assets
└── styles/             # Global styles
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
