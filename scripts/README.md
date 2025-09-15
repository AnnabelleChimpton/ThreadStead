# Pixel Home Randomization Scripts

## Overview
These scripts help randomize user pixel homes with varied templates, color palettes, and customizations to create a more interesting and diverse community when launching to production.

## Scripts

### 1. Production Migration Script
**File:** `randomize-pixel-homes.js`

Randomizes pixel homes for all existing users before production launch.

#### Usage

```bash
# Dry run - see what would be changed without making updates
node scripts/randomize-pixel-homes.js --dry-run

# Live update all users
node scripts/randomize-pixel-homes.js

# Update specific users only
node scripts/randomize-pixel-homes.js --users=user1,user2,user3

# Custom batch size (default: 50)
node scripts/randomize-pixel-homes.js --batch-size=100
```

#### Features
- **Smart randomization**: Generates varied but appealing combinations
- **Batch processing**: Processes users in batches to avoid overwhelming the database
- **Progress tracking**: Shows detailed progress and success/failure rates
- **Dry run mode**: Test the script safely before making real changes
- **Error handling**: Continues processing even if individual updates fail

#### What Gets Randomized
- **House templates**: cottage_v1, townhouse_v1, loft_v1, cabin_v1
- **Color palettes**: thread_sage, charcoal_nights, pixel_petals, crt_glow, classic_linen
- **Architectural styles**: Window styles, door styles, roof trims (70% chance)
- **House titles**: Inspirational names like "Cozy Corner", "Pixel Paradise" (30% chance)
- **Atmosphere**: Sky, weather, and time of day variations (80% chance)
- **Seasonal opt-in**: 60% of users will opt into seasonal changes

### 2. New User Randomization
**File:** `lib/pixel-homes/randomization.ts`

Automatically gives new users randomized pixel homes during signup.

#### How It Works
- Automatically triggered when a user first accesses their home config
- **80%** get "interesting" configurations with customizations
- **20%** get "clean" minimal configurations
- Smart scoring system picks the most appealing combinations

#### Integration
Already integrated into the home API endpoint. New users will automatically get:
- Random house template and color palette
- Thoughtful customizations that work well together
- Variety without overwhelming new users

## Example Output

```
🏠 Pixel Home Randomization Script
=====================================
Mode: LIVE UPDATE
Batch size: 50
Finding all users...
Found 150 users to process

Processing batch 1/3 (50 users)...
✅ alice@example.com: cabin_v1/charcoal_nights - "Digital Den"
✅ bob@example.com: cottage_v1/pixel_petals
✅ charlie@example.com: loft_v1/crt_glow - "Cyber Sanctuary"
...
Batch complete: 48/50 successful

🎉 Randomization Complete!
============================
Total users processed: 150
Successfully updated: 147
Failed: 3
```

## Before Running in Production

1. **Backup your database** - Always backup before mass updates
2. **Test with dry run** - Run `--dry-run` first to verify the logic
3. **Test with small batch** - Try `--users=testuser1,testuser2` first
4. **Monitor performance** - Watch database performance during execution

## Safety Features

- **Dry run mode** prevents accidental changes
- **Batch processing** prevents database overload
- **Error isolation** - one failed update won't stop the entire process
- **Detailed logging** shows exactly what's happening
- **Non-destructive** - only updates home configurations, doesn't delete anything

## Customization

You can modify the randomization logic by editing:
- `HOUSE_TITLES` array for different title options
- Probability percentages for customization rates
- Atmospheric combination preferences
- Template and palette distributions

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify database connectivity
3. Ensure all required dependencies are installed
4. Test with a small subset of users first