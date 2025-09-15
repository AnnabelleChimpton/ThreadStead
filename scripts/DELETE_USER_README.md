# User Deletion Script

## Overview

The `delete-user.ts` script provides a comprehensive way to completely remove a user and all their associated data from the database. This script handles all relationships and foreign key constraints safely.

## ⚠️ **IMPORTANT WARNINGS**

- **THIS OPERATION IS IRREVERSIBLE** - Once a user is deleted, all their data is permanently lost
- **USE WITH EXTREME CAUTION** - This affects production data
- **ALWAYS BACKUP** - Consider backing up the database before running this script on important users
- **TEST FIRST** - Run with test users before using on production data

## Usage

### Via npm script (recommended):
```bash
npm run delete-user <user-identifier>
```

### Direct execution:
```bash
npx tsx scripts/delete-user.ts <user-identifier>
```

### User Identifier Options

The script can find users by:
- **User ID**: `clxyz123abc` (exact database ID)
- **Handle**: `username` or `username@yoursite.com`
- **Primary Handle**: Any handle format

### Examples
```bash
# Delete by user ID
npm run delete-user clxyz123abc

# Delete by handle
npm run delete-user johnsmith
npm run delete-user johnsmith@hometoday.com

# Delete by full handle
npm run delete-user alice@yoursite.com
```

## What Gets Deleted

The script performs comprehensive deletion across all database tables:

### User Data (Direct Deletion)
- **User record** - Main user account
- **Profile** - Display name, bio, avatar, custom CSS, etc.
- **Handles** - All username handles
- **Sessions** - All login sessions (logs out all devices)
- **User Home Config** - Pixel home configuration

### Content (Direct Deletion)
- **Posts** - All posts authored by the user
- **Comments** - All comments on posts
- **Photo Comments** - Comments on media files
- **Media Files** - All uploaded images/files
- **Guestbook Entries** - Entries on their profile AND entries they wrote
- **Custom Emojis** - Emojis they created
- **Site News** - News posts they authored

### Social & Relationships (Direct Deletion)
- **Follows** - Both following others and being followed
- **User Blocks** - Both blocks they created and blocks against them
- **User Reports** - Reports they made and reports about them
- **Notifications** - All notifications sent and received

### Community Features (Direct Deletion)
- **Thread Ring Memberships** - All ring memberships
- **Thread Ring Invites** - Invites sent and received
- **Thread Ring Blocks** - Ring-specific blocks
- **Thread Ring Forks** - Rings they forked
- **Post Thread Ring Additions** - Posts they added to rings
- **Ring Hub Ownerships** - External ring ownerships

### Beta System (Mixed)
- **Beta Invite Codes Generated** - Codes they created (DELETED)
- **Beta Invite Shares** - Share tracking data (DELETED)
- **Beta Landing Pages** - Landing pages they created (DELETED)
- **Beta Invite Codes Used** - Codes they used (SET TO NULL)
- **Beta Landing Signups** - Their signups (SET TO NULL)
- **Beta Landing Pages Ended** - Pages they ended (SET TO NULL)

### Admin & System (Mixed)
- **Capability Grants** - Special permissions (DELETED)
- **Plugin Installs** - Installed plugins (DELETED)
- **Pixel Home Visits** - Visit tracking (DELETED)
- **Thread Rings Curated** - Rings they curated (SET TO NULL)
- **IP Signup Tracking** - IPs they blocked (SET TO NULL)
- **Signup Attempts** - Attempts linked to them (SET TO NULL)

## Safety Features

### 1. User Search & Verification
- Comprehensive search across multiple identifier types
- Shows complete user information before deletion
- Displays all data that will be affected

### 2. Double Confirmation
- **First Prompt**: Must type "DELETE" exactly (case sensitive)
- **Second Prompt**: Must type "YES I AM SURE" exactly
- Either prompt can be cancelled with Ctrl+C

### 3. Transaction Safety
- All deletions happen in a single database transaction
- If any step fails, the entire operation is rolled back
- 60-second timeout for large deletions

### 4. Comprehensive Statistics
- Shows exact counts of all data types before deletion
- Helps assess the impact of the deletion
- Useful for confirming you have the right user

## Technical Details

### Database Relationships Handled
The script properly handles both `CASCADE` and `SET NULL` foreign key relationships:

- **CASCADE relationships**: Automatically deleted when user is deleted
- **SET NULL relationships**: Manually updated to preserve referential integrity

### Deletion Order
The script deletes data in reverse dependency order to avoid foreign key constraint violations:

1. User blocks, reports, and social relationships
2. Community features (rings, invites, etc.)
3. Content (posts, comments, media)
4. Beta system data
5. Admin and system data
6. Core user data (profile, handles)
7. User record (triggers cascades)

### Error Handling
- Database connection errors are caught and reported
- Transaction failures trigger automatic rollback
- User not found scenarios are handled gracefully
- Keyboard interrupts (Ctrl+C) are handled safely

## Exit Codes

- **0**: Success or user cancelled
- **1**: Error (user not found, database error, etc.)

## Logging

The script provides detailed logging including:
- User search results
- Data statistics before deletion
- Progress updates during deletion
- Success/failure confirmation
- Error details if applicable

## Recovery

**There is no recovery option.** Once deleted, the data is permanently gone. Always ensure you have:

1. **Database backups** before running on important users
2. **User confirmation** that they want their account deleted
3. **Legal compliance** with data retention requirements
4. **Export capability** if the user wants to download their data first

## Best Practices

1. **Never run this script directly on production without testing**
2. **Always verify the user identifier** before confirming deletion
3. **Consider data export options** before deletion
4. **Document the deletion** for audit purposes
5. **Check for any business-critical data** the user might have created
6. **Verify legal compliance** with data protection regulations

## Troubleshooting

### "User not found"
- Check the identifier format
- Try different identifier types (ID vs handle)
- Verify the user actually exists in the database

### "Transaction timeout"
- User has too much data (increase timeout in script)
- Database performance issues
- Consider deleting in smaller batches for very large users

### "Foreign key constraint violation"
- Usually indicates a missing deletion step
- Check for new database relationships not handled by the script
- May need to update the script for new features

## Security Considerations

- **Authentication**: Script doesn't verify who is running it
- **Authorization**: No built-in admin checks
- **Audit Trail**: No automatic logging of who deleted what
- **Access Control**: Protect access to this script appropriately

Consider adding additional security layers in production environments.