#!/usr/bin/env tsx
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for better UX
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
  dim: '\x1b[2m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function generateSecretKey(): string {
  return randomBytes(32).toString('base64');
}

function validateSiteName(name: string): { valid: boolean; message?: string } {
  if (!name.trim()) {
    return { valid: false, message: 'Site name cannot be empty' };
  }
  if (name.length > 50) {
    return { valid: false, message: 'Site name should be under 50 characters' };
  }
  return { valid: true };
}

function validateHandleDomain(domain: string): { valid: boolean; message?: string } {
  if (!domain.trim()) {
    return { valid: false, message: 'Handle domain cannot be empty' };
  }
  if (domain.length > 20) {
    return { valid: false, message: 'Handle domain should be under 20 characters (users see this in every username)' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(domain)) {
    return { valid: false, message: 'Handle domain should only contain letters and numbers' };
  }
  return { valid: true };
}

function validateUserHandle(handle: string): { valid: boolean; message?: string } {
  if (!handle.trim()) {
    return { valid: false, message: 'User handle cannot be empty' };
  }
  if (!/^[a-z0-9\-_.]{3,20}$/.test(handle)) {
    return { valid: false, message: 'Handle must be 3-20 characters, lowercase letters, numbers, hyphens, dots, or underscores only' };
  }
  return { valid: true };
}

async function promptWithValidation<T>(
  question: string, 
  validator: (input: string) => { valid: boolean; message?: string },
  defaultValue?: string
): Promise<string> {
  while (true) {
    const defaultText = defaultValue ? colorize(` (default: ${defaultValue})`, 'dim') : '';
    const input = await ask(`${question}${defaultText}: `);
    const value = input.trim() || defaultValue || '';
    
    const validation = validator(value);
    if (validation.valid) {
      return value;
    } else {
      console.log(colorize(`❌ ${validation.message}`, 'red'));
    }
  }
}

async function main() {
  console.log(colorize('🚀 Welcome to Retro Social Site Setup!', 'bold'));
  console.log(colorize('=====================================', 'blue'));
  console.log();
  console.log('This wizard will help you configure your site for first use.');
  console.log('We\'ll walk through each setting and explain where it appears.');
  console.log();

  // Check if .env already exists
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log(colorize('⚠️  .env file already exists!', 'yellow'));
    const overwrite = await ask('Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled. Your existing .env file is unchanged.');
      rl.close();
      return;
    }
    console.log();
  }

  console.log(colorize('📝 Site Configuration', 'bold'));
  console.log(colorize('====================', 'blue'));
  
  // Site Title
  console.log();
  console.log(colorize('🏷️  Site Title', 'bold'));
  console.log('This appears in the header/navigation at the top of every page.');
  console.log(colorize('Example: "MyAwesome Community" or "Sarah\'s Digital Garden"', 'dim'));
  const siteTitle = await promptWithValidation(
    'Enter your site title',
    validateSiteName,
    'My Retro Site'
  );

  // Handle Domain
  console.log();
  console.log(colorize('🔗 Handle Domain', 'bold'));
  console.log('This appears after @ in ALL usernames (like alice@YourDomain).');
  console.log(colorize('Keep it SHORT - users will see this constantly!', 'yellow'));
  console.log(colorize('Example: "CoolSite" creates handles like "bob@CoolSite"', 'dim'));
  const handleDomain = await promptWithValidation(
    'Enter your handle domain',
    validateHandleDomain,
    'MyRetroSite'
  );

  console.log();
  console.log(colorize('👤 Default User Setup (Optional)', 'bold'));
  console.log(colorize('=================================', 'blue'));
  console.log('This creates the first user when you run "npm run seed".');
  console.log('You can skip this and create users manually later.');
  console.log();
  
  const createDefaultUser = await ask('Create a default user? (Y/n): ');
  let userHandle = 'admin';
  let userDisplayName = 'Site Admin';
  let userBio = 'Welcome to our retro social site!';
  
  if (createDefaultUser.toLowerCase() !== 'n') {
    console.log();
    console.log(colorize('🆔 User Handle', 'bold'));
    console.log(`This creates the username part (before @${handleDomain}).`);
    userHandle = await promptWithValidation(
      'Enter default user handle',
      validateUserHandle,
      'admin'
    );

    console.log();
    console.log(colorize('📛 Display Name', 'bold'));
    console.log('This is the friendly name shown on their profile.');
    userDisplayName = await ask(`Enter display name (default: Site Admin): `) || 'Site Admin';

    console.log();
    console.log(colorize('📖 User Bio', 'bold'));
    console.log('This appears in their profile bio section.');
    userBio = await ask(`Enter bio text (default: Welcome to our retro social site!): `) || 'Welcome to our retro social site!';
  }

  console.log();
  console.log(colorize('🔐 Security Configuration', 'bold'));
  console.log(colorize('========================', 'blue'));
  
  // Database URL
  console.log();
  console.log(colorize('🗄️  Database URL', 'bold'));
  console.log('PostgreSQL connection string for your database.');
  console.log(colorize('For local development: postgresql://user:password@localhost:5432/dbname', 'dim'));
  const databaseUrl = await ask('Enter database URL (default: postgresql://retro:retro@localhost:5432/retro?schema=public): ') 
    || 'postgresql://retro:retro@localhost:5432/retro?schema=public';

  // JWT Secret
  console.log();
  console.log(colorize('🔑 JWT Secret', 'bold'));
  console.log('Critical for security! We\'ll generate a strong random secret for you.');
  const jwtSecret = generateSecretKey();
  console.log(colorize(`✅ Generated secure JWT secret (${jwtSecret.length} chars)`, 'green'));

  // JWT Audience
  console.log();
  console.log(colorize('🎯 JWT Audience', 'bold'));
  console.log('Set this to your production domain for security.');
  const jwtAudience = await ask('Enter your domain (default: retro.local): ') || 'retro.local';

  // Beta Keys
  console.log();
  console.log(colorize('🎫 Beta Key System', 'bold'));
  console.log('Require beta keys for new user registration?');
  console.log(colorize('- "true" = Only people with beta keys can sign up', 'dim'));
  console.log(colorize('- "false" = Anyone can create an account', 'dim'));
  const betaKeysEnabled = await ask('Enable beta keys? (Y/n): ');
  const betaEnabled = betaKeysEnabled.toLowerCase() !== 'n' ? 'true' : 'false';

  // Generate .env file
  console.log();
  console.log(colorize('📁 Generating Configuration...', 'bold'));
  
  const envContent = `# =============================================================================
# PRODUCTION ENVIRONMENT VARIABLES
# Generated by setup wizard on ${new Date().toISOString()}
# =============================================================================

# DATABASE CONFIGURATION
DATABASE_URL="${databaseUrl}"

# SECURITY CONFIGURATION
# CRITICAL: This secret was generated randomly - keep it secure!
CAP_JWT_SECRET="${jwtSecret}"

# Set to your production domain (used for JWT audience validation)
CAP_AUDIENCE="${jwtAudience}"

# BETA ACCESS CONTROL
# Set to "true" to require beta keys for new user registration
# Set to "false" to allow open registration
BETA_KEYS_ENABLED="${betaEnabled}"

# SITE CUSTOMIZATION
# ==================
# IMPORTANT: These names appear in different places throughout your site.
# Set them carefully as they'll be visible to users.

# SITE_TITLE: Appears in the header/navigation bar at the top of every page
# Example: "MyAwesomeSite" shows as the main site title
# Note: NEXT_PUBLIC_ prefix is required for client-side access
NEXT_PUBLIC_SITE_TITLE="${siteTitle}"

# SITE_HANDLE_DOMAIN: Used in user handles (like @username@domain)
# Example: "MyAwesome" creates handles like "alice@MyAwesome" 
# Note: Keep this short - it appears after @ in every username
SITE_HANDLE_DOMAIN="${handleDomain}"
NEXT_PUBLIC_SITE_HANDLE_DOMAIN="${handleDomain}"

# SEED USER CONFIGURATION
# =======================
# Default user created when you run 'npm run seed' (customize before seeding)
# This creates the first user account on your site

# SEED_USER_HANDLE: The username part (before @)
# Example: "admin" creates handle "admin@${handleDomain}"
SEED_USER_HANDLE="${userHandle}"

# SEED_USER_DISPLAY_NAME: The friendly name shown on their profile
# Example: "Site Administrator" appears as their display name
SEED_USER_DISPLAY_NAME="${userDisplayName}"

# SEED_USER_BIO: The bio text on their profile page
# Example: This text appears in their profile bio section
SEED_USER_BIO="${userBio}"
`;

  fs.writeFileSync(envPath, envContent);
  
  console.log(colorize('✅ Configuration saved to .env', 'green'));
  console.log();
  
  // Next steps
  console.log(colorize('🎉 Setup Complete!', 'bold'));
  console.log(colorize('================', 'blue'));
  console.log();
  console.log(colorize('Next steps:', 'bold'));
  console.log(`1. ${colorize('npm run build', 'green')} - Build the application`);
  console.log(`2. ${colorize('npx prisma generate', 'green')} - Generate database client`);
  console.log(`3. ${colorize('npx prisma db push', 'green')} - Create database tables`);
  
  if (createDefaultUser.toLowerCase() !== 'n') {
    console.log(`4. ${colorize('npm run seed', 'green')} - Create your default user (${userHandle}@${handleDomain})`);
  }
  
  if (betaEnabled === 'true') {
    console.log(`5. ${colorize('npm run beta:generate 10', 'green')} - Generate 10 beta keys`);
    console.log(`6. ${colorize('npm run beta:list', 'green')} - View your beta keys`);
  }
  
  console.log(`7. ${colorize('npm run dev', 'green')} - Start development server`);
  console.log();
  
  console.log(colorize('Your site will be available at:', 'bold'));
  console.log(colorize('http://localhost:3000', 'blue'));
  console.log();
  
  if (createDefaultUser.toLowerCase() !== 'n') {
    console.log(colorize(`Default user will be: ${userHandle}@${handleDomain}`, 'dim'));
  }
  
  console.log();
  console.log(colorize('📚 Need help? Check:', 'bold'));
  console.log('• README.md - Full documentation');
  console.log('• ENVIRONMENT_VARIABLES.md - Variable reference');
  console.log();
  
  rl.close();
}

main().catch((error) => {
  console.error(colorize('❌ Setup failed:', 'red'), error);
  rl.close();
  process.exit(1);
});