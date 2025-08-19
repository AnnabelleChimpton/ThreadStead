-- CreateTable for policy documents via SiteConfig
-- This migration adds policy document fields to the site configuration
-- The fields will be stored as key-value pairs in the existing SiteConfig table

-- Insert default policy document entries if they don't exist
INSERT INTO "SiteConfig" ("id", "key", "value", "createdAt", "updatedAt")
VALUES 
  ('terms_simple_' || EXTRACT(EPOCH FROM NOW())::text, 'terms_simple', 'By creating an account, you agree to use our platform respectfully and responsibly. We reserve the right to remove content or accounts that violate these terms.', NOW(), NOW()),
  ('terms_full_' || EXTRACT(EPOCH FROM NOW())::text, 'terms_full', '# Terms and Conditions

## 1. Acceptance of Terms
By creating an account on this platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.

## 2. User Conduct
You agree to:
- Use the platform responsibly and respectfully
- Not post content that is illegal, harmful, or violates others'' rights
- Respect other users and maintain civil discourse
- Not attempt to hack, disrupt, or misuse the platform

## 3. Content Policy
- You retain ownership of content you post
- You grant us a license to display and distribute your content on our platform
- We reserve the right to remove content that violates our policies

## 4. Account Termination
We reserve the right to suspend or terminate accounts that violate these terms without prior notice.

## 5. Changes to Terms
We may update these terms from time to time. Continued use of the platform constitutes acceptance of any changes.

## 6. Contact
For questions about these terms, please contact the site administrators.

Last updated: ' || CURRENT_DATE, NOW(), NOW()),
  ('privacy_simple_' || EXTRACT(EPOCH FROM NOW())::text, 'privacy_simple', 'We collect minimal personal information to provide our service. We do not sell your data to third parties. We use reasonable security measures to protect your information.', NOW(), NOW()),
  ('privacy_full_' || EXTRACT(EPOCH FROM NOW())::text, 'privacy_full', '# Privacy Policy

## 1. Information We Collect
We collect information you provide when creating an account and using our platform:
- Username and display name
- Email address (if provided)
- Profile information you choose to share
- Content you post (posts, comments, messages)
- Usage data and analytics

## 2. How We Use Your Information
We use your information to:
- Provide and maintain our service
- Authenticate your account
- Display your content to other users as intended
- Improve our platform and user experience
- Communicate important updates about our service

## 3. Information Sharing
We do not sell, trade, or rent your personal information to third parties. We may share information only:
- With your explicit consent
- To comply with legal obligations
- To protect our rights and safety of our users
- In connection with a business transfer (with notice)

## 4. Data Security
We implement reasonable security measures to protect your information, including:
- Encrypted data transmission
- Secure servers and databases
- Regular security updates and monitoring
- Limited access to personal data

## 5. Your Rights
You have the right to:
- Access your personal information
- Correct inaccurate information
- Delete your account and associated data
- Control privacy settings for your content

## 6. Data Retention
We retain your information as long as your account is active or as needed to provide services. You may delete your account at any time.

## 7. Changes to This Policy
We may update this privacy policy from time to time. We will notify users of significant changes through our platform.

## 8. Contact Us
For questions about this privacy policy or your data, please contact the site administrators.

Last updated: ' || CURRENT_DATE, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;