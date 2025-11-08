#!/usr/bin/env npx tsx

/**
 * Script to safely delete a user and all associated data
 * Usage: npx tsx scripts/delete-user.ts <user-id-or-handle>
 *
 * This script:
 * - Finds user by ID or handle
 * - Shows what will be deleted (including DID status)
 * - Requires confirmation
 * - Cleans up DID mappings and private keys from .threadstead-user-dids.json
 * - Performs cascading deletion in proper order
 * - Handles foreign key constraints safely
 */

import { db } from '../lib/config/database/connection';
import { SITE_NAME } from '../lib/config/site/constants';
import { loadUserDIDMappings, storeUserDIDMappings } from '../lib/api/did/server-did-client';

interface UserDeletionSummary {
  user: {
    id: string;
    primaryHandle: string | null;
    displayName: string | null;
    createdAt: Date;
    hasDID: boolean;
  };
  counts: {
    handles: number;
    posts: number;
    comments: number;
    photoComments: number;
    guestbookEntries: number;
    media: number;
    sessions: number;
    notifications: number;
    follows: number;
    followers: number;
    threadRingMemberships: number;
    threadRingsCurated: number;
    reports: number;
    blocks: number;
    betaInviteCodes: number;
    betaInviteShares: number;
    emojis: number;
    siteNews: number;
    betaLandingPages: number;
    pixelHomeVisits: number;
  };
}

async function findUser(identifier: string) {
  console.log(`🔍 Looking for user: ${identifier}`);
  
  // Try to find by ID first
  let user = await db.user.findUnique({
    where: { id: identifier },
    include: {
      handles: true,
      profile: true
    }
  });

  // If not found by ID, try to find by handle
  if (!user) {
    const handle = await db.handle.findFirst({
      where: {
        OR: [
          { handle: identifier, host: SITE_NAME },
          { handle: identifier.replace(`@${SITE_NAME}`, ''), host: SITE_NAME }
        ]
      },
      include: {
        user: {
          include: {
            handles: true,
            profile: true
          }
        }
      }
    });
    
    if (handle) {
      user = handle.user;
    }
  }

  return user;
}

async function getUserDeletionSummary(userId: string): Promise<UserDeletionSummary> {
  console.log('📊 Analyzing user data...');

  const [
    user,
    handles,
    posts,
    comments,
    photoComments,
    guestbookEntries,
    media,
    sessions,
    notificationsReceived,
    notificationsActed,
    following,
    followers,
    threadRingMemberships,
    threadRingsCurated,
    reportsCreated,
    reportsReceived,
    blocksCreated,
    blocksReceived,
    betaInviteCodes,
    betaInviteShares,
    emojis,
    siteNews,
    betaLandingPages,
    pixelHomeVisits
  ] = await Promise.all([
    db.user.findUnique({ 
      where: { id: userId },
      include: { profile: true }
    }),
    db.handle.findMany({ where: { userId } }),
    db.post.findMany({ where: { authorId: userId } }),
    db.comment.findMany({ where: { authorId: userId } }),
    db.photoComment.findMany({ where: { authorId: userId } }),
    db.guestbookEntry.findMany({ where: { profileOwner: userId } }),
    db.media.findMany({ where: { userId } }),
    db.session.findMany({ where: { userId } }),
    db.notification.findMany({ where: { recipientId: userId } }),
    db.notification.findMany({ where: { actorId: userId } }),
    db.follow.findMany({ where: { followerId: userId } }),
    db.follow.findMany({ where: { followeeId: userId } }),
    db.threadRingMember.findMany({ where: { userId } }),
    db.threadRing.findMany({ where: { curatorId: userId } }),
    db.userReport.findMany({ where: { reporterId: userId } }),
    db.userReport.findMany({ where: { reportedUserId: userId } }),
    db.userBlock.findMany({ where: { blockerId: userId } }),
    db.userBlock.findMany({ where: { blockedUserId: userId } }),
    db.betaInviteCode.findMany({ where: { generatedBy: userId } }),
    db.betaInviteShare.findMany({ where: { sharedBy: userId } }),
    db.emoji.findMany({ where: { createdBy: userId } }),
    db.siteNews.findMany({ where: { createdBy: userId } }),
    db.betaLandingPage.findMany({ where: { createdBy: userId } }),
    db.pixelHomeVisitor.findMany({ where: { OR: [{ homeOwnerId: userId }, { visitorId: userId }] } })
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user has a DID mapping
  const didMappings = await loadUserDIDMappings();
  const hasDID = didMappings.some(m => m.userId === userId);

  return {
    user: {
      id: user.id,
      primaryHandle: user.primaryHandle,
      displayName: user.profile?.displayName || null,
      createdAt: user.createdAt,
      hasDID
    },
    counts: {
      handles: handles.length,
      posts: posts.length,
      comments: comments.length,
      photoComments: photoComments.length,
      guestbookEntries: guestbookEntries.length,
      media: media.length,
      sessions: sessions.length,
      notifications: notificationsReceived.length + notificationsActed.length,
      follows: following.length,
      followers: followers.length,
      threadRingMemberships: threadRingMemberships.length,
      threadRingsCurated: threadRingsCurated.length,
      reports: reportsCreated.length + reportsReceived.length,
      blocks: blocksCreated.length + blocksReceived.length,
      betaInviteCodes: betaInviteCodes.length,
      betaInviteShares: betaInviteShares.length,
      emojis: emojis.length,
      siteNews: siteNews.length,
      betaLandingPages: betaLandingPages.length,
      pixelHomeVisits: pixelHomeVisits.length
    }
  };
}

function displayDeletionSummary(summary: UserDeletionSummary) {
  console.log('');
  console.log('👤 USER TO DELETE:');
  console.log(`   ID: ${summary.user.id}`);
  console.log(`   Handle: ${summary.user.primaryHandle || 'None'}`);
  console.log(`   Display Name: ${summary.user.displayName || 'None'}`);
  console.log(`   Created: ${summary.user.createdAt.toISOString()}`);
  console.log(`   Has DID: ${summary.user.hasDID ? 'Yes' : 'No'}`);
  console.log('');
  console.log('📊 DATA TO DELETE:');
  console.log(`   Handles: ${summary.counts.handles}`);
  console.log(`   Posts: ${summary.counts.posts}`);
  console.log(`   Comments: ${summary.counts.comments}`);
  console.log(`   Photo Comments: ${summary.counts.photoComments}`);
  console.log(`   Guestbook Entries: ${summary.counts.guestbookEntries}`);
  console.log(`   Media Files: ${summary.counts.media}`);
  console.log(`   Sessions: ${summary.counts.sessions}`);
  console.log(`   Notifications: ${summary.counts.notifications}`);
  console.log(`   Following: ${summary.counts.follows}`);
  console.log(`   Followers: ${summary.counts.followers}`);
  console.log(`   ThreadRing Memberships: ${summary.counts.threadRingMemberships}`);
  console.log(`   ThreadRings Curated: ${summary.counts.threadRingsCurated}`);
  console.log(`   Reports: ${summary.counts.reports}`);
  console.log(`   Blocks: ${summary.counts.blocks}`);
  console.log(`   Beta Invite Codes: ${summary.counts.betaInviteCodes}`);
  console.log(`   Beta Invite Shares: ${summary.counts.betaInviteShares}`);
  console.log(`   Custom Emojis: ${summary.counts.emojis}`);
  console.log(`   Site News Posts: ${summary.counts.siteNews}`);
  console.log(`   Beta Landing Pages: ${summary.counts.betaLandingPages}`);
  console.log(`   Pixel Home Visits: ${summary.counts.pixelHomeVisits}`);
}

async function deleteUser(userId: string) {
  console.log('');
  console.log('🗑️  Starting user deletion...');

  // First, clean up DID mappings (before database transaction)
  console.log('   🔄 Cleaning up DID mappings...');
  try {
    const didMappings = await loadUserDIDMappings();
    const filteredMappings = didMappings.filter(m => m.userId !== userId);

    if (filteredMappings.length < didMappings.length) {
      await storeUserDIDMappings(filteredMappings);
      console.log('   ✅ DID mapping removed');
    } else {
      console.log('   ℹ️  No DID mapping found for user');
    }
  } catch (error) {
    console.warn('   ⚠️  Could not clean up DID mappings:', error);
    // Continue with deletion even if DID cleanup fails
  }

  await db.$transaction(async (tx) => {
    // Delete in reverse dependency order to avoid foreign key constraint issues
    
    console.log('   🔄 Deleting user blocks...');
    await tx.userBlock.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedUserId: userId }] } });

    console.log('   🔄 Deleting user consents...');
    await tx.userConsent.deleteMany({ where: { userId } });

    console.log('   🔄 Deleting consent logs...');
    await tx.consentLog.deleteMany({ where: { userId } });
    
    console.log('   🔄 Deleting user reports...');
    await tx.userReport.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedUserId: userId }] } });
    
    console.log('   🔄 Deleting notifications...');
    await tx.notification.deleteMany({ where: { OR: [{ recipientId: userId }, { actorId: userId }] } });
    
    console.log('   🔄 Deleting follows...');
    await tx.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followeeId: userId }] } });
    
    console.log('   🔄 Deleting sessions...');
    await tx.session.deleteMany({ where: { userId } });
    
    console.log('   🔄 Deleting capability grants...');
    await tx.capabilityGrant.deleteMany({ where: { userId } });
    
    console.log('   🔄 Deleting plugin installs...');
    await tx.pluginInstall.deleteMany({ where: { ownerId: userId } });
    
    console.log('   🔄 Deleting photo comments...');
    await tx.photoComment.deleteMany({ where: { authorId: userId } });
    
    console.log('   🔄 Deleting media...');
    await tx.media.deleteMany({ where: { userId } });
    
    console.log('   🔄 Deleting comments...');
    await tx.comment.deleteMany({ where: { authorId: userId } });
    
    console.log('   🔄 Deleting post-threadring associations...');
    await tx.postThreadRing.deleteMany({ where: { addedBy: userId } });
    
    console.log('   🔄 Deleting posts...');
    await tx.post.deleteMany({ where: { authorId: userId } });
    
    console.log('   🔄 Deleting guestbook entries...');
    await tx.guestbookEntry.deleteMany({ where: { profileOwner: userId } });
    
    console.log('   🔄 Deleting threadring memberships...');
    await tx.threadRingMember.deleteMany({ where: { userId } });
    
    console.log('   🔄 Deleting threadring blocks...');
    await tx.threadRingBlock.deleteMany({ where: { OR: [{ blockedUserId: userId }, { createdBy: userId }] } });
    
    console.log('   🔄 Deleting threadring invites...');
    await tx.threadRingInvite.deleteMany({ where: { OR: [{ inviterId: userId }, { inviteeId: userId }] } });
    
    console.log('   🔄 Deleting threadring forks...');
    await tx.threadRingFork.deleteMany({ where: { createdBy: userId } });
    
    console.log('   🔄 Deleting ring hub ownerships...');
    await tx.ringHubOwnership.deleteMany({ where: { ownerUserId: userId } });

    console.log('   🔄 Deleting beta invite shares...');
    await tx.betaInviteShare.deleteMany({ where: { sharedBy: userId } });

    console.log('   🔄 Deleting beta invite codes generated by user...');
    await tx.betaInviteCode.deleteMany({ where: { generatedBy: userId } });

    console.log('   🔄 Updating beta invite codes used by user...');
    await tx.betaInviteCode.updateMany({
      where: { usedBy: userId },
      data: { usedBy: null }
    });

    console.log('   🔄 Deleting beta keys...');
    await tx.betaKey.deleteMany({ where: { usedBy: userId } });

    console.log('   🔄 Deleting custom emojis...');
    await tx.emoji.deleteMany({ where: { createdBy: userId } });

    console.log('   🔄 Deleting site news posts...');
    await tx.siteNews.deleteMany({ where: { createdBy: userId } });

    console.log('   🔄 Deleting beta landing pages...');
    await tx.betaLandingPage.deleteMany({ where: { createdBy: userId } });

    console.log('   🔄 Updating beta landing pages ended by user...');
    await tx.betaLandingPage.updateMany({
      where: { endedBy: userId },
      data: { endedBy: null }
    });

    console.log('   🔄 Updating beta landing signups...');
    await tx.betaLandingSignup.updateMany({
      where: { userId },
      data: { userId: null }
    });

    console.log('   🔄 Updating IP signup tracking...');
    await tx.ipSignupTracking.updateMany({
      where: { blockedBy: userId },
      data: { blockedBy: null }
    });

    console.log('   🔄 Updating signup attempts...');
    await tx.signupAttempt.updateMany({
      where: { userId },
      data: { userId: null }
    });

    console.log('   🔄 Deleting pixel home visits...');
    await tx.pixelHomeVisitor.deleteMany({ where: { OR: [{ homeOwnerId: userId }, { visitorId: userId }] } });

    console.log('   🔄 Deleting user home config...');
    await tx.userHomeConfig.deleteMany({ where: { userId } });

    // Handle ThreadRings curated by this user - these need to be deleted since curatorId is required
    const curatedRings = await tx.threadRing.findMany({ where: { curatorId: userId } });
    if (curatedRings.length > 0) {
      console.log(`   🔄 Deleting ${curatedRings.length} curated ThreadRings...`);
      // Delete the rings since curatorId is a required field
      await tx.threadRing.deleteMany({
        where: { curatorId: userId }
      });
    }
    
    console.log('   🔄 Deleting profile...');
    await tx.profile.deleteMany({ where: { userId } });
    
    console.log('   🔄 Deleting handles...');
    await tx.handle.deleteMany({ where: { userId } });
    
    console.log('   🔄 Deleting user record...');
    await tx.user.delete({ where: { id: userId } });
  }, {
    timeout: 60000 // 60 second timeout for large deletions
  });
  
  console.log('');
  console.log('✅ User deleted successfully!');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: npx tsx scripts/delete-user.ts <user-id-or-handle>');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/delete-user.ts clxyz123');
    console.error('  npx tsx scripts/delete-user.ts johnsmith');
    console.error('  npx tsx scripts/delete-user.ts johnsmith@yoursite.com');
    process.exit(1);
  }

  const [identifier] = args;

  try {
    // Find the user
    const user = await findUser(identifier);
    if (!user) {
      throw new Error(`User not found: ${identifier}`);
    }

    console.log(`✅ Found user: ${user.id}`);

    // Get deletion summary
    const summary = await getUserDeletionSummary(user.id);
    displayDeletionSummary(summary);

    // Warning and confirmation
    console.log('');
    console.log('⚠️  DANGER: PERMANENT DELETION');
    console.log('   This action cannot be undone!');
    console.log('   All user data, posts, comments, and relationships will be permanently deleted.');
    console.log('');

    // Add proper readline confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      const confirmation1 = await new Promise<string>((resolve) => {
        rl.question('Type "DELETE" to confirm (case sensitive): ', resolve);
      });

      if (confirmation1.trim() !== 'DELETE') {
        console.log('❌ Deletion cancelled. You must type "DELETE" exactly.');
        return;
      }

      console.log('');
      console.log('⚠️  FINAL WARNING: Are you absolutely sure?');
      console.log(`   User: ${summary.user.displayName} (${summary.user.primaryHandle})`);
      console.log(`   This will delete ${Object.values(summary.counts).reduce((a, b) => a + b, 0)} records across multiple tables.`);
      console.log('');

      const confirmation2 = await new Promise<string>((resolve) => {
        rl.question('Type "YES I AM SURE" to proceed: ', resolve);
      });

      if (confirmation2.trim() !== 'YES I AM SURE') {
        console.log('❌ Deletion cancelled. You must type "YES I AM SURE" exactly.');
        return;
      }

      // Perform the deletion
      await deleteUser(user.id);

    } finally {
      rl.close();
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}