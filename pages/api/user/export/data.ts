import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

interface ExportMetadata {
  exportDate: string;
  schemaVersion: string;
  userDid: string;
  primaryHandle: string | null;
  totalRecords: {
    posts: number;
    threadrings: number;
    comments: number;
    media: number;
    followers: number;
    following: number;
    guestbookEntries: number;
  };
}

interface UserDataExport {
  exportMetadata: ExportMetadata;
  profile: any;
  posts: any[];
  threadrings: any[];
  comments: any[];
  media: any[];
  social: {
    followers: any[];
    following: any[];
    blocks: any[];
  };
  guestbook: any[];
  account: {
    did: string;
    primaryHandle: string | null;
    handles: any[];
    createdAt: string;
    emailVerifiedAt: string | null;
    consents: any[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Rate limiting check - only allow 1 export per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentExportCheck = await db.user.findFirst({
      where: {
        id: user.id,
        // You could add an exportLog table to track this properly
        // For now we'll just allow the export
      }
    });

    // Gather all user data
    const exportData = await generateUserExport(user.id);

    // Set response headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="threadstead-data-export-${Date.now()}.json"`
    );

    return res.status(200).json(exportData);
  } catch (error) {
    console.error('Error generating user data export:', error);
    return res.status(500).json({
      error: 'Failed to generate data export',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function generateUserExport(userId: string): Promise<UserDataExport> {
  // Fetch user with all related data
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      handles: true,
      posts: {
        orderBy: { createdAt: 'desc' }
      },
      threadRingMemberships: {
        include: {
          threadRing: {
            include: {
              badge: true
            }
          }
        }
      },
      comments: {
        include: {
          post: {
            select: {
              id: true,
              title: true,
              authorId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      photoComments: {
        include: {
          media: {
            select: {
              id: true,
              title: true,
              userId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      media: {
        orderBy: { createdAt: 'desc' }
      },
      followers: {
        include: {
          follower: {
            select: {
              id: true,
              did: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      },
      following: {
        include: {
          followee: {
            select: {
              id: true,
              did: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      },
      blocksCreated: {
        include: {
          blockedUser: {
            select: {
              id: true,
              did: true,
              primaryHandle: true
            }
          },
          blockedThreadRing: {
            select: {
              id: true,
              slug: true,
              name: true
            }
          }
        }
      },
      guestbook: {
        orderBy: { createdAt: 'desc' }
      },
      consents: true,
      homeConfig: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Transform data for export
  const exportData: UserDataExport = {
    exportMetadata: {
      exportDate: new Date().toISOString(),
      schemaVersion: '1.0',
      userDid: user.did,
      primaryHandle: user.primaryHandle,
      totalRecords: {
        posts: user.posts.length,
        threadrings: user.threadRingMemberships.length,
        comments: user.comments.length + user.photoComments.length,
        media: user.media.length,
        followers: user.followers.length,
        following: user.following.length,
        guestbookEntries: user.guestbook.length
      }
    },
    profile: user.profile ? {
      displayName: user.profile.displayName,
      bio: user.profile.bio,
      avatarUrl: user.profile.avatarUrl,
      bannerUrl: user.profile.bannerUrl,
      customCSS: user.profile.customCSS,
      blogroll: user.profile.blogroll,
      featuredFriends: user.profile.featuredFriends,
      visibility: user.profile.visibility,
      customTemplate: user.profile.customTemplate,
      templateEnabled: user.profile.templateEnabled,
      templateMode: user.profile.templateMode,
      hideNavigation: user.profile.hideNavigation,
      badgePreferences: user.profile.badgePreferences,
      includeSiteCSS: user.profile.includeSiteCSS,
      midiAutoplay: user.profile.midiAutoplay,
      midiLoop: user.profile.midiLoop
    } : null,
    posts: user.posts.map(post => ({
      id: post.id,
      title: post.title,
      bodyMarkdown: post.bodyMarkdown,
      bodyText: post.bodyText,
      bodyHtml: post.bodyHtml,
      media: post.media,
      tags: post.tags,
      visibility: post.visibility,
      intent: post.intent,
      excerpt: post.excerpt,
      platform: post.platform,
      contentWarning: post.contentWarning,
      isSpoiler: post.isSpoiler,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt?.toISOString(),
      publishedAt: post.publishedAt?.toISOString()
    })),
    threadrings: user.threadRingMemberships.map(membership => ({
      ringId: membership.threadRing.id,
      ringSlug: membership.threadRing.slug,
      ringName: membership.threadRing.name,
      ringUri: membership.threadRing.uri,
      ringDescription: membership.threadRing.description,
      role: membership.role,
      joinedAt: membership.joinedAt.toISOString(),
      badge: membership.threadRing.badge ? {
        title: membership.threadRing.badge.title,
        subtitle: membership.threadRing.badge.subtitle,
        imageUrl: membership.threadRing.badge.imageUrl,
        backgroundColor: membership.threadRing.badge.backgroundColor,
        textColor: membership.threadRing.badge.textColor
      } : null
    })),
    comments: [
      ...user.comments.map(comment => ({
        id: comment.id,
        type: 'post_comment',
        content: comment.content,
        postId: comment.post.id,
        postTitle: comment.post.title,
        postAuthorId: comment.post.authorId,
        parentId: comment.parentId,
        status: comment.status,
        createdAt: comment.createdAt.toISOString()
      })),
      ...user.photoComments.map(comment => ({
        id: comment.id,
        type: 'photo_comment',
        content: comment.content,
        mediaId: comment.media.id,
        mediaTitle: comment.media.title,
        mediaUserId: comment.media.userId,
        parentId: comment.parentId,
        status: comment.status,
        createdAt: comment.createdAt.toISOString()
      }))
    ],
    media: user.media.map(item => ({
      id: item.id,
      title: item.title,
      caption: item.caption,
      thumbnailUrl: item.thumbnailUrl,
      mediumUrl: item.mediumUrl,
      fullUrl: item.fullUrl,
      originalName: item.originalName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
      mediaType: item.mediaType,
      width: item.width,
      height: item.height,
      featured: item.featured,
      featuredOrder: item.featuredOrder,
      visibility: item.visibility,
      uploadContext: item.uploadContext,
      isGalleryItem: item.isGalleryItem,
      createdAt: item.createdAt.toISOString()
    })),
    social: {
      followers: user.followers.map(follow => ({
        followerId: follow.follower.id,
        followerDid: follow.follower.did,
        followerHandle: follow.follower.primaryHandle,
        followerDisplayName: follow.follower.profile?.displayName,
        followerAvatarUrl: follow.follower.profile?.avatarUrl,
        status: follow.status,
        followedAt: follow.createdAt.toISOString()
      })),
      following: user.following.map(follow => ({
        followeeId: follow.followee.id,
        followeeDid: follow.followee.did,
        followeeHandle: follow.followee.primaryHandle,
        followeeDisplayName: follow.followee.profile?.displayName,
        followeeAvatarUrl: follow.followee.profile?.avatarUrl,
        status: follow.status,
        followedAt: follow.createdAt.toISOString()
      })),
      blocks: user.blocksCreated.map(block => ({
        id: block.id,
        type: block.blockedUserId ? 'user' : 'threadring',
        blockedUserId: block.blockedUser?.id,
        blockedUserDid: block.blockedUser?.did,
        blockedUserHandle: block.blockedUser?.primaryHandle,
        blockedThreadRingId: block.blockedThreadRing?.id,
        blockedThreadRingSlug: block.blockedThreadRing?.slug,
        blockedThreadRingName: block.blockedThreadRing?.name,
        reason: block.reason,
        createdAt: block.createdAt.toISOString()
      }))
    },
    guestbook: user.guestbook.map(entry => ({
      id: entry.id,
      message: entry.message,
      signature: entry.signature,
      status: entry.status,
      createdAt: entry.createdAt.toISOString()
    })),
    account: {
      did: user.did,
      primaryHandle: user.primaryHandle,
      handles: user.handles.map(handle => ({
        handle: handle.handle,
        host: handle.host,
        verifiedAt: handle.verifiedAt?.toISOString()
      })),
      createdAt: user.createdAt.toISOString(),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() || null,
      consents: user.consents.map(consent => ({
        type: consent.type,
        granted: consent.granted,
        timestamp: consent.timestamp.toISOString(),
        version: consent.version,
        withdrawnAt: consent.withdrawnAt?.toISOString()
      }))
    }
  };

  return exportData;
}
