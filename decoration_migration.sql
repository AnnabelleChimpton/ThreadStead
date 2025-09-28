-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('public', 'followers', 'friends', 'private');

-- CreateEnum
CREATE TYPE "public"."TemplateMode" AS ENUM ('default', 'enhanced', 'advanced');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('member', 'admin');

-- CreateEnum
CREATE TYPE "public"."AuthMethod" AS ENUM ('SEED_PHRASE', 'PASSWORD');

-- CreateEnum
CREATE TYPE "public"."PostIntent" AS ENUM ('sharing', 'asking', 'feeling', 'announcing', 'showing', 'teaching', 'looking', 'celebrating', 'recommending');

-- CreateEnum
CREATE TYPE "public"."CommentStatus" AS ENUM ('visible', 'hidden');

-- CreateEnum
CREATE TYPE "public"."EmailTokenType" AS ENUM ('login', 'verification');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('comment', 'reply', 'follow', 'friend', 'guestbook', 'photo_comment', 'photo_reply', 'threadring_invite', 'threadring_join', 'threadring_post', 'threadring_fork');

-- CreateEnum
CREATE TYPE "public"."UploadContext" AS ENUM ('media_collection', 'post_embed', 'profile_photo', 'threadring_badge', 'other');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('unread', 'read', 'dismissed');

-- CreateEnum
CREATE TYPE "public"."ThreadRingJoinType" AS ENUM ('open', 'invite', 'closed');

-- CreateEnum
CREATE TYPE "public"."ThreadRingVisibility" AS ENUM ('public', 'unlisted', 'private');

-- CreateEnum
CREATE TYPE "public"."ThreadRingRole" AS ENUM ('member', 'moderator', 'curator');

-- CreateEnum
CREATE TYPE "public"."ThreadRingInviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'revoked');

-- CreateEnum
CREATE TYPE "public"."BadgeTemplate" AS ENUM ('classic_blue', 'retro_green', 'sunset_orange', 'midnight_purple', 'matrix_green', 'neon_pink', 'vintage_brown', 'cyber_teal');

-- CreateEnum
CREATE TYPE "public"."ThreadRingBlockType" AS ENUM ('user', 'instance', 'actor');

-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('user', 'post', 'comment', 'threadring', 'guestbook_entry', 'photo_comment');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "public"."ReportReason" AS ENUM ('spam', 'harassment', 'hate_speech', 'violence', 'misinformation', 'sexual_content', 'copyright', 'other');

-- CreateEnum
CREATE TYPE "public"."NewsType" AS ENUM ('announcement', 'feature', 'maintenance', 'community');

-- CreateEnum
CREATE TYPE "public"."NewsPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "public"."BetaSignupStatus" AS ENUM ('started', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "public"."ConsentType" AS ENUM ('ESSENTIAL', 'ANALYTICS', 'MARKETING', 'PREFERENCES');

-- CreateEnum
CREATE TYPE "public"."ConsentAction" AS ENUM ('GRANTED', 'WITHDRAWN', 'UPDATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."BookmarkSourceType" AS ENUM ('community_index', 'site_content', 'external_search', 'manual');

-- CreateEnum
CREATE TYPE "public"."CollectionVisibility" AS ENUM ('private', 'public', 'shared');

-- CreateEnum
CREATE TYPE "public"."BookmarkSubmissionReason" AS ENUM ('user_bookmark', 'multiple_bookmarks', 'high_engagement');

-- CreateEnum
CREATE TYPE "public"."BookmarkSubmissionStatus" AS ENUM ('pending', 'validated', 'rejected', 'duplicate');

-- CreateEnum
CREATE TYPE "public"."ReleaseType" AS ENUM ('PUBLIC', 'LIMITED_TIME', 'CLAIM_CODE', 'ADMIN_ONLY', 'BETA_USERS');

-- CreateEnum
CREATE TYPE "public"."ClaimMethod" AS ENUM ('DIRECT', 'CODE', 'ADMIN_GRANT', 'BETA_ACCESS');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "primaryHandle" TEXT,
    "publicBaseUrl" TEXT,
    "sharedBaseUrl" TEXT,
    "privateBaseUrl" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'member',
    "emailVerifiedAt" TIMESTAMP(3),
    "encryptedEmail" TEXT,
    "passwordHash" TEXT,
    "encryptedSeedPhrase" TEXT,
    "authMethod" "public"."AuthMethod" NOT NULL DEFAULT 'SEED_PHRASE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Handle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Handle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "customCSS" TEXT,
    "blogroll" JSONB,
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'public',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featuredFriends" JSONB,
    "avatarFullUrl" TEXT,
    "avatarMediumUrl" TEXT,
    "avatarThumbnailUrl" TEXT,
    "customTemplate" TEXT,
    "customTemplateAst" TEXT,
    "hideNavigation" BOOLEAN NOT NULL DEFAULT false,
    "templateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "templateMode" "public"."TemplateMode" NOT NULL DEFAULT 'default',
    "badgePreferences" JSONB,
    "includeSiteCSS" BOOLEAN NOT NULL DEFAULT true,
    "profileMidiId" TEXT,
    "midiAutoplay" BOOLEAN NOT NULL DEFAULT false,
    "midiLoop" BOOLEAN NOT NULL DEFAULT false,
    "compiledTemplate" JSONB,
    "templateIslands" JSONB,
    "templateCompiledAt" TIMESTAMP(3),

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserHomeConfig" (
    "userId" TEXT NOT NULL,
    "houseTemplate" TEXT NOT NULL DEFAULT 'cottage_v1',
    "palette" TEXT NOT NULL DEFAULT 'thread_sage',
    "bookSkin" TEXT DEFAULT 'linen_v1',
    "seasonalOptIn" BOOLEAN NOT NULL DEFAULT false,
    "preferPixelHome" BOOLEAN NOT NULL DEFAULT false,
    "atmosphereSky" TEXT NOT NULL DEFAULT 'sunny',
    "atmosphereWeather" TEXT NOT NULL DEFAULT 'clear',
    "atmosphereTimeOfDay" TEXT NOT NULL DEFAULT 'midday',
    "wallColor" TEXT,
    "roofColor" TEXT,
    "trimColor" TEXT,
    "windowColor" TEXT,
    "detailColor" TEXT,
    "windowStyle" TEXT DEFAULT 'default',
    "doorStyle" TEXT DEFAULT 'default',
    "roofTrim" TEXT DEFAULT 'default',
    "houseTitle" TEXT,
    "houseDescription" TEXT,
    "houseBoardText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHomeConfig_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."UserHomeDecoration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decorationType" TEXT NOT NULL,
    "decorationId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "layer" INTEGER NOT NULL DEFAULT 1,
    "variant" TEXT,
    "size" TEXT DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHomeDecoration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PixelHomeVisitor" (
    "id" TEXT NOT NULL,
    "homeOwnerId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixelHomeVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "media" JSONB,
    "tags" TEXT[],
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'public',
    "bodyMarkdown" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled Post',
    "intent" "public"."PostIntent",
    "excerpt" TEXT,
    "platform" TEXT DEFAULT 'blog',
    "publishedAt" TIMESTAMP(3),
    "textPreview" TEXT,
    "contentWarning" TEXT,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "threadRingPostIds" JSONB,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostMetrics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueViewCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCommentAt" TIMESTAMP(3),
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recentViews" INTEGER NOT NULL DEFAULT 0,
    "recentComments" INTEGER NOT NULL DEFAULT 0,
    "velocityWindow" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostView" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT,
    "viewType" TEXT NOT NULL DEFAULT 'feed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "public"."CommentStatus" NOT NULL DEFAULT 'visible',
    "parentId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuestbookEntry" (
    "id" TEXT NOT NULL,
    "profileOwner" TEXT NOT NULL,
    "authorId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'visible',
    "signature" TEXT,

    CONSTRAINT "GuestbookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PluginInstall" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "settings" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "secret" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailLoginToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "encryptedEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "public"."EmailTokenType" NOT NULL DEFAULT 'login',
    "userId" TEXT,

    CONSTRAINT "EmailLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CapabilityGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "actions" TEXT[],
    "resource" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Follow" (
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followeeId")
);

-- CreateTable
CREATE TABLE "public"."BetaKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "usedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "BetaKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BetaInviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "usedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "BetaInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'unread',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "showInNav" BOOLEAN NOT NULL DEFAULT false,
    "navOrder" INTEGER NOT NULL DEFAULT 0,
    "navDropdown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hideNavbar" BOOLEAN NOT NULL DEFAULT false,
    "isHomepage" BOOLEAN NOT NULL DEFAULT false,
    "isLandingPage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CustomPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CuratedSite" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "addedBy" TEXT,
    "lastChecked" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuratedSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caption" TEXT,
    "title" TEXT,
    "thumbnailUrl" TEXT NOT NULL,
    "mediumUrl" TEXT NOT NULL,
    "fullUrl" TEXT NOT NULL,
    "originalName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "width" INTEGER,
    "height" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER,
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'public',
    "uploadContext" "public"."UploadContext" NOT NULL DEFAULT 'media_collection',
    "isGalleryItem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhotoComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "status" "public"."CommentStatus" NOT NULL DEFAULT 'visible',

    CONSTRAINT "PhotoComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRing" (
    "id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "curatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "joinType" "public"."ThreadRingJoinType" NOT NULL DEFAULT 'open',
    "visibility" "public"."ThreadRingVisibility" NOT NULL DEFAULT 'public',
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "currentPrompt" TEXT,
    "curatorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "directChildrenCount" INTEGER NOT NULL DEFAULT 0,
    "isSystemRing" BOOLEAN NOT NULL DEFAULT false,
    "lineageDepth" INTEGER NOT NULL DEFAULT 0,
    "lineagePath" TEXT NOT NULL DEFAULT '',
    "parentId" TEXT,
    "totalDescendantsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ThreadRing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRingMember" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ThreadRingRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadRingMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostThreadRing" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedBy" TEXT,

    CONSTRAINT "PostThreadRing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRingInvite" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "public"."ThreadRingInviteStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ThreadRingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRingFork" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "forkReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadRingFork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRingBadge" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "templateId" TEXT,
    "backgroundColor" TEXT NOT NULL DEFAULT '#4A90E2',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "isGenerated" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadRingBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRingBlock" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "blockedUserId" TEXT,
    "blockedInstance" TEXT,
    "blockedActorUri" TEXT,
    "blockType" "public"."ThreadRingBlockType" NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadRingBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RingHubOwnership" (
    "id" TEXT NOT NULL,
    "ringSlug" TEXT NOT NULL,
    "ringUri" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "serverDID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RingHubOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "reportType" "public"."ReportType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "public"."ReportReason" NOT NULL,
    "customReason" TEXT,
    "description" TEXT,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedUserId" TEXT,
    "blockedThreadRingId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Emoji" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Emoji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteNews" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "public"."NewsType" NOT NULL DEFAULT 'announcement',
    "priority" "public"."NewsPriority" NOT NULL DEFAULT 'medium',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "SiteNews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BetaLandingPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "signupLimit" INTEGER NOT NULL DEFAULT 50,
    "signupCount" INTEGER NOT NULL DEFAULT 0,
    "limitReached" BOOLEAN NOT NULL DEFAULT false,
    "endedAt" TIMESTAMP(3),
    "endedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaLandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BetaLandingSignup" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "userId" TEXT,
    "betaCode" TEXT,
    "signupStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signupCompletedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "public"."BetaSignupStatus" NOT NULL DEFAULT 'started',

    CONSTRAINT "BetaLandingSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IpSignupTracking" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "signupAttempts" INTEGER NOT NULL DEFAULT 1,
    "successfulSignups" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "blockedBy" TEXT,
    "blockedReason" TEXT,
    "autoBlocked" BOOLEAN NOT NULL DEFAULT false,
    "unblockAt" TIMESTAMP(3),

    CONSTRAINT "IpSignupTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SignupAttempt" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "landingPageId" TEXT,
    "betaCode" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "userId" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SignupAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BetaInviteShare" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "shareMethod" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "platform" TEXT,

    CONSTRAINT "BetaInviteShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IndexedSite" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "submittedBy" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveryMethod" TEXT NOT NULL DEFAULT 'manual',
    "discoveryContext" TEXT,
    "contentSample" TEXT,
    "extractedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detectedLanguage" TEXT,
    "siteType" TEXT,
    "lastCrawled" TIMESTAMP(3),
    "crawlStatus" TEXT NOT NULL DEFAULT 'pending',
    "contentHash" TEXT,
    "sslEnabled" BOOLEAN,
    "responseTimeMs" INTEGER,
    "lastModified" TIMESTAMP(3),
    "communityScore" INTEGER NOT NULL DEFAULT 0,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "verifiedBy" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "seedingScore" INTEGER,
    "seedingReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "communityValidated" BOOLEAN NOT NULL DEFAULT false,
    "validationVotes" INTEGER NOT NULL DEFAULT 0,
    "autoValidated" BOOLEAN,
    "autoValidatedAt" TIMESTAMP(3),
    "autoValidationScore" INTEGER,
    "indexingPurpose" TEXT DEFAULT 'full_index',
    "platformType" TEXT DEFAULT 'unknown',
    "extractedLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extractionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "parentProfileUrl" TEXT,
    "outboundLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inboundLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexedSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteVote" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteTag" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "suggestedBy" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscoveryPath" (
    "id" TEXT NOT NULL,
    "fromSite" TEXT,
    "toSite" TEXT NOT NULL,
    "discoveredBy" TEXT NOT NULL,
    "discoveryMethod" TEXT NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteRelationship" (
    "id" TEXT NOT NULL,
    "siteA" TEXT NOT NULL,
    "siteB" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 1,
    "discoveredBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CrawlQueue" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscoveryLink" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "linkLocation" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DiscoveryLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscoveredSite" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveryMethod" TEXT NOT NULL DEFAULT 'crawler_auto_submit',
    "discoveryContext" TEXT,
    "discoveredFrom" TEXT,
    "qualityScore" INTEGER NOT NULL,
    "qualityReasons" TEXT[],
    "suggestedCategory" TEXT,
    "contentSample" TEXT,
    "extractedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detectedLanguage" TEXT,
    "lastCrawled" TIMESTAMP(3),
    "crawlStatus" TEXT NOT NULL DEFAULT 'success',
    "contentHash" TEXT,
    "sslEnabled" BOOLEAN,
    "responseTimeMs" INTEGER,
    "outboundLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "promotedToIndex" BOOLEAN NOT NULL DEFAULT false,
    "promotedAt" TIMESTAMP(3),
    "indexedSiteId" TEXT,

    CONSTRAINT "DiscoveredSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteReview" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ConsentType" NOT NULL,
    "action" "public"."ConsentAction" NOT NULL,
    "granted" BOOLEAN,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "public"."CollectionVisibility" NOT NULL DEFAULT 'private',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "faviconUrl" TEXT,
    "sourceType" "public"."BookmarkSourceType" NOT NULL,
    "sourceMetadata" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "visitsCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookmarkCommunitySubmission" (
    "id" TEXT NOT NULL,
    "bookmarkId" TEXT NOT NULL,
    "indexedSiteId" TEXT,
    "submissionReason" "public"."BookmarkSubmissionReason" NOT NULL,
    "submissionScore" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."BookmarkSubmissionStatus" NOT NULL DEFAULT 'pending',
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookmarkCommunitySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DecorationItem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "iconSvg" TEXT,
    "renderSvg" TEXT,
    "imagePath" TEXT,
    "gridWidth" INTEGER NOT NULL DEFAULT 1,
    "gridHeight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "releaseType" "public"."ReleaseType" NOT NULL DEFAULT 'PUBLIC',
    "releaseStartAt" TIMESTAMP(3),
    "releaseEndAt" TIMESTAMP(3),
    "claimCode" TEXT,
    "maxClaims" INTEGER,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "DecorationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserDecorationClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decorationId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimMethod" "public"."ClaimMethod" NOT NULL DEFAULT 'DIRECT',

    CONSTRAINT "UserDecorationClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_did_key" ON "public"."User"("did");

-- CreateIndex
CREATE UNIQUE INDEX "Handle_handle_host_key" ON "public"."Handle"("handle", "host");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- CreateIndex
CREATE INDEX "UserHomeDecoration_userId_idx" ON "public"."UserHomeDecoration"("userId");

-- CreateIndex
CREATE INDEX "UserHomeDecoration_userId_zone_idx" ON "public"."UserHomeDecoration"("userId", "zone");

-- CreateIndex
CREATE INDEX "PixelHomeVisitor_homeOwnerId_visitedAt_idx" ON "public"."PixelHomeVisitor"("homeOwnerId", "visitedAt");

-- CreateIndex
CREATE INDEX "PixelHomeVisitor_visitorId_visitedAt_idx" ON "public"."PixelHomeVisitor"("visitorId", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PixelHomeVisitor_homeOwnerId_visitorId_key" ON "public"."PixelHomeVisitor"("homeOwnerId", "visitorId");

-- CreateIndex
CREATE INDEX "Post_visibility_createdAt_idx" ON "public"."Post"("visibility", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostMetrics_postId_key" ON "public"."PostMetrics"("postId");

-- CreateIndex
CREATE INDEX "PostMetrics_trendingScore_scoreUpdatedAt_idx" ON "public"."PostMetrics"("trendingScore", "scoreUpdatedAt");

-- CreateIndex
CREATE INDEX "PostMetrics_postId_idx" ON "public"."PostMetrics"("postId");

-- CreateIndex
CREATE INDEX "PostView_postId_createdAt_idx" ON "public"."PostView"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "PostView_createdAt_idx" ON "public"."PostView"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostView_postId_userId_createdAt_key" ON "public"."PostView"("postId", "userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostView_postId_ipHash_createdAt_key" ON "public"."PostView"("postId", "ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_secret_key" ON "public"."Session"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLoginToken_token_key" ON "public"."EmailLoginToken"("token");

-- CreateIndex
CREATE INDEX "EmailLoginToken_token_idx" ON "public"."EmailLoginToken"("token");

-- CreateIndex
CREATE INDEX "EmailLoginToken_encryptedEmail_expiresAt_idx" ON "public"."EmailLoginToken"("encryptedEmail", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailLoginToken_userId_type_idx" ON "public"."EmailLoginToken"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "BetaKey_key_key" ON "public"."BetaKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BetaKey_usedBy_key" ON "public"."BetaKey"("usedBy");

-- CreateIndex
CREATE UNIQUE INDEX "BetaInviteCode_code_key" ON "public"."BetaInviteCode"("code");

-- CreateIndex
CREATE INDEX "BetaInviteCode_generatedBy_idx" ON "public"."BetaInviteCode"("generatedBy");

-- CreateIndex
CREATE INDEX "BetaInviteCode_code_idx" ON "public"."BetaInviteCode"("code");

-- CreateIndex
CREATE INDEX "Notification_recipientId_status_createdAt_idx" ON "public"."Notification"("recipientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_actorId_type_idx" ON "public"."Notification"("recipientId", "actorId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SiteConfig_key_key" ON "public"."SiteConfig"("key");

-- CreateIndex
CREATE INDEX "SiteConfig_key_idx" ON "public"."SiteConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CustomPage_slug_key" ON "public"."CustomPage"("slug");

-- CreateIndex
CREATE INDEX "CustomPage_published_showInNav_navOrder_idx" ON "public"."CustomPage"("published", "showInNav", "navOrder");

-- CreateIndex
CREATE INDEX "CustomPage_isHomepage_idx" ON "public"."CustomPage"("isHomepage");

-- CreateIndex
CREATE INDEX "CustomPage_isLandingPage_idx" ON "public"."CustomPage"("isLandingPage");

-- CreateIndex
CREATE INDEX "CustomPage_navDropdown_idx" ON "public"."CustomPage"("navDropdown");

-- CreateIndex
CREATE UNIQUE INDEX "CuratedSite_url_key" ON "public"."CuratedSite"("url");

-- CreateIndex
CREATE INDEX "CuratedSite_active_idx" ON "public"."CuratedSite"("active");

-- CreateIndex
CREATE INDEX "CuratedSite_tags_idx" ON "public"."CuratedSite"("tags");

-- CreateIndex
CREATE INDEX "CuratedSite_weight_idx" ON "public"."CuratedSite"("weight");

-- CreateIndex
CREATE INDEX "Media_userId_featured_featuredOrder_idx" ON "public"."Media"("userId", "featured", "featuredOrder");

-- CreateIndex
CREATE INDEX "Media_userId_createdAt_idx" ON "public"."Media"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Media_userId_visibility_idx" ON "public"."Media"("userId", "visibility");

-- CreateIndex
CREATE INDEX "Media_userId_isGalleryItem_idx" ON "public"."Media"("userId", "isGalleryItem");

-- CreateIndex
CREATE INDEX "PhotoComment_mediaId_createdAt_idx" ON "public"."PhotoComment"("mediaId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoComment_authorId_createdAt_idx" ON "public"."PhotoComment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoComment_parentId_idx" ON "public"."PhotoComment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRing_uri_key" ON "public"."ThreadRing"("uri");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRing_slug_key" ON "public"."ThreadRing"("slug");

-- CreateIndex
CREATE INDEX "ThreadRing_curatorId_idx" ON "public"."ThreadRing"("curatorId");

-- CreateIndex
CREATE INDEX "ThreadRing_slug_idx" ON "public"."ThreadRing"("slug");

-- CreateIndex
CREATE INDEX "ThreadRing_uri_idx" ON "public"."ThreadRing"("uri");

-- CreateIndex
CREATE INDEX "ThreadRing_visibility_joinType_idx" ON "public"."ThreadRing"("visibility", "joinType");

-- CreateIndex
CREATE INDEX "ThreadRing_memberCount_postCount_idx" ON "public"."ThreadRing"("memberCount", "postCount");

-- CreateIndex
CREATE INDEX "ThreadRing_parentId_idx" ON "public"."ThreadRing"("parentId");

-- CreateIndex
CREATE INDEX "ThreadRing_lineageDepth_idx" ON "public"."ThreadRing"("lineageDepth");

-- CreateIndex
CREATE INDEX "ThreadRing_isSystemRing_idx" ON "public"."ThreadRing"("isSystemRing");

-- CreateIndex
CREATE INDEX "ThreadRingMember_userId_idx" ON "public"."ThreadRingMember"("userId");

-- CreateIndex
CREATE INDEX "ThreadRingMember_threadRingId_role_idx" ON "public"."ThreadRingMember"("threadRingId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingMember_threadRingId_userId_key" ON "public"."ThreadRingMember"("threadRingId", "userId");

-- CreateIndex
CREATE INDEX "PostThreadRing_threadRingId_addedAt_idx" ON "public"."PostThreadRing"("threadRingId", "addedAt");

-- CreateIndex
CREATE INDEX "PostThreadRing_threadRingId_isPinned_pinnedAt_idx" ON "public"."PostThreadRing"("threadRingId", "isPinned", "pinnedAt");

-- CreateIndex
CREATE INDEX "PostThreadRing_postId_idx" ON "public"."PostThreadRing"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostThreadRing_postId_threadRingId_key" ON "public"."PostThreadRing"("postId", "threadRingId");

-- CreateIndex
CREATE INDEX "ThreadRingInvite_inviteeId_status_idx" ON "public"."ThreadRingInvite"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "ThreadRingInvite_threadRingId_idx" ON "public"."ThreadRingInvite"("threadRingId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingInvite_threadRingId_inviteeId_key" ON "public"."ThreadRingInvite"("threadRingId", "inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingFork_childId_key" ON "public"."ThreadRingFork"("childId");

-- CreateIndex
CREATE INDEX "ThreadRingFork_parentId_idx" ON "public"."ThreadRingFork"("parentId");

-- CreateIndex
CREATE INDEX "ThreadRingFork_createdBy_idx" ON "public"."ThreadRingFork"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingBadge_threadRingId_key" ON "public"."ThreadRingBadge"("threadRingId");

-- CreateIndex
CREATE INDEX "ThreadRingBadge_threadRingId_idx" ON "public"."ThreadRingBadge"("threadRingId");

-- CreateIndex
CREATE INDEX "ThreadRingBadge_isActive_idx" ON "public"."ThreadRingBadge"("isActive");

-- CreateIndex
CREATE INDEX "ThreadRingBlock_threadRingId_blockType_idx" ON "public"."ThreadRingBlock"("threadRingId", "blockType");

-- CreateIndex
CREATE INDEX "ThreadRingBlock_blockedUserId_idx" ON "public"."ThreadRingBlock"("blockedUserId");

-- CreateIndex
CREATE INDEX "ThreadRingBlock_blockedInstance_idx" ON "public"."ThreadRingBlock"("blockedInstance");

-- CreateIndex
CREATE INDEX "ThreadRingBlock_createdBy_idx" ON "public"."ThreadRingBlock"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingBlock_threadRingId_blockedUserId_key" ON "public"."ThreadRingBlock"("threadRingId", "blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingBlock_threadRingId_blockedInstance_key" ON "public"."ThreadRingBlock"("threadRingId", "blockedInstance");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingBlock_threadRingId_blockedActorUri_key" ON "public"."ThreadRingBlock"("threadRingId", "blockedActorUri");

-- CreateIndex
CREATE UNIQUE INDEX "RingHubOwnership_ringSlug_key" ON "public"."RingHubOwnership"("ringSlug");

-- CreateIndex
CREATE INDEX "RingHubOwnership_ownerUserId_idx" ON "public"."RingHubOwnership"("ownerUserId");

-- CreateIndex
CREATE INDEX "RingHubOwnership_serverDID_idx" ON "public"."RingHubOwnership"("serverDID");

-- CreateIndex
CREATE INDEX "UserReport_reporterId_idx" ON "public"."UserReport"("reporterId");

-- CreateIndex
CREATE INDEX "UserReport_reportedUserId_idx" ON "public"."UserReport"("reportedUserId");

-- CreateIndex
CREATE INDEX "UserReport_status_createdAt_idx" ON "public"."UserReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_targetId_reportType_idx" ON "public"."UserReport"("targetId", "reportType");

-- CreateIndex
CREATE INDEX "UserReport_reviewedBy_idx" ON "public"."UserReport"("reviewedBy");

-- CreateIndex
CREATE INDEX "UserBlock_blockerId_idx" ON "public"."UserBlock"("blockerId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedUserId_idx" ON "public"."UserBlock"("blockedUserId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedThreadRingId_idx" ON "public"."UserBlock"("blockedThreadRingId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedUserId_key" ON "public"."UserBlock"("blockerId", "blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedThreadRingId_key" ON "public"."UserBlock"("blockerId", "blockedThreadRingId");

-- CreateIndex
CREATE UNIQUE INDEX "Emoji_name_key" ON "public"."Emoji"("name");

-- CreateIndex
CREATE INDEX "Emoji_name_idx" ON "public"."Emoji"("name");

-- CreateIndex
CREATE INDEX "Emoji_createdBy_idx" ON "public"."Emoji"("createdBy");

-- CreateIndex
CREATE INDEX "SiteNews_publishedAt_idx" ON "public"."SiteNews"("publishedAt");

-- CreateIndex
CREATE INDEX "SiteNews_type_idx" ON "public"."SiteNews"("type");

-- CreateIndex
CREATE INDEX "SiteNews_priority_idx" ON "public"."SiteNews"("priority");

-- CreateIndex
CREATE INDEX "SiteNews_isPublished_idx" ON "public"."SiteNews"("isPublished");

-- CreateIndex
CREATE INDEX "SiteNews_createdBy_idx" ON "public"."SiteNews"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "BetaLandingPage_slug_key" ON "public"."BetaLandingPage"("slug");

-- CreateIndex
CREATE INDEX "BetaLandingPage_slug_idx" ON "public"."BetaLandingPage"("slug");

-- CreateIndex
CREATE INDEX "BetaLandingPage_isActive_isPaused_idx" ON "public"."BetaLandingPage"("isActive", "isPaused");

-- CreateIndex
CREATE INDEX "BetaLandingPage_createdBy_idx" ON "public"."BetaLandingPage"("createdBy");

-- CreateIndex
CREATE INDEX "BetaLandingPage_limitReached_idx" ON "public"."BetaLandingPage"("limitReached");

-- CreateIndex
CREATE INDEX "BetaLandingSignup_landingPageId_status_idx" ON "public"."BetaLandingSignup"("landingPageId", "status");

-- CreateIndex
CREATE INDEX "BetaLandingSignup_userId_idx" ON "public"."BetaLandingSignup"("userId");

-- CreateIndex
CREATE INDEX "BetaLandingSignup_ipAddress_signupStartedAt_idx" ON "public"."BetaLandingSignup"("ipAddress", "signupStartedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IpSignupTracking_ipAddress_key" ON "public"."IpSignupTracking"("ipAddress");

-- CreateIndex
CREATE INDEX "IpSignupTracking_ipAddress_idx" ON "public"."IpSignupTracking"("ipAddress");

-- CreateIndex
CREATE INDEX "IpSignupTracking_isBlocked_idx" ON "public"."IpSignupTracking"("isBlocked");

-- CreateIndex
CREATE INDEX "IpSignupTracking_lastAttemptAt_idx" ON "public"."IpSignupTracking"("lastAttemptAt");

-- CreateIndex
CREATE INDEX "IpSignupTracking_autoBlocked_unblockAt_idx" ON "public"."IpSignupTracking"("autoBlocked", "unblockAt");

-- CreateIndex
CREATE INDEX "SignupAttempt_ipAddress_attemptedAt_idx" ON "public"."SignupAttempt"("ipAddress", "attemptedAt");

-- CreateIndex
CREATE INDEX "SignupAttempt_landingPageId_attemptedAt_idx" ON "public"."SignupAttempt"("landingPageId", "attemptedAt");

-- CreateIndex
CREATE INDEX "SignupAttempt_success_idx" ON "public"."SignupAttempt"("success");

-- CreateIndex
CREATE INDEX "SignupAttempt_suspicious_idx" ON "public"."SignupAttempt"("suspicious");

-- CreateIndex
CREATE INDEX "BetaInviteShare_codeId_sharedAt_idx" ON "public"."BetaInviteShare"("codeId", "sharedAt");

-- CreateIndex
CREATE INDEX "BetaInviteShare_sharedBy_sharedAt_idx" ON "public"."BetaInviteShare"("sharedBy", "sharedAt");

-- CreateIndex
CREATE INDEX "BetaInviteShare_shareMethod_idx" ON "public"."BetaInviteShare"("shareMethod");

-- CreateIndex
CREATE INDEX "UserConsent_userId_type_idx" ON "public"."UserConsent"("userId", "type");

-- CreateIndex
CREATE INDEX "UserConsent_granted_timestamp_idx" ON "public"."UserConsent"("granted", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_userId_type_key" ON "public"."UserConsent"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "IndexedSite_url_key" ON "public"."IndexedSite"("url");

-- CreateIndex
CREATE INDEX "IndexedSite_url_idx" ON "public"."IndexedSite"("url");

-- CreateIndex
CREATE INDEX "IndexedSite_discoveryMethod_idx" ON "public"."IndexedSite"("discoveryMethod");

-- CreateIndex
CREATE INDEX "IndexedSite_crawlStatus_idx" ON "public"."IndexedSite"("crawlStatus");

-- CreateIndex
CREATE INDEX "IndexedSite_communityScore_idx" ON "public"."IndexedSite"("communityScore");

-- CreateIndex
CREATE INDEX "IndexedSite_communityValidated_idx" ON "public"."IndexedSite"("communityValidated");

-- CreateIndex
CREATE INDEX "IndexedSite_seedingScore_idx" ON "public"."IndexedSite"("seedingScore");

-- CreateIndex
CREATE INDEX "IndexedSite_featured_idx" ON "public"."IndexedSite"("featured");

-- CreateIndex
CREATE INDEX "IndexedSite_siteType_idx" ON "public"."IndexedSite"("siteType");

-- CreateIndex
CREATE INDEX "IndexedSite_submittedBy_idx" ON "public"."IndexedSite"("submittedBy");

-- CreateIndex
CREATE INDEX "IndexedSite_verifiedBy_idx" ON "public"."IndexedSite"("verifiedBy");

-- CreateIndex
CREATE INDEX "SiteVote_siteId_idx" ON "public"."SiteVote"("siteId");

-- CreateIndex
CREATE INDEX "SiteVote_userId_idx" ON "public"."SiteVote"("userId");

-- CreateIndex
CREATE INDEX "SiteVote_voteType_idx" ON "public"."SiteVote"("voteType");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVote_siteId_userId_voteType_key" ON "public"."SiteVote"("siteId", "userId", "voteType");

-- CreateIndex
CREATE INDEX "SiteTag_siteId_idx" ON "public"."SiteTag"("siteId");

-- CreateIndex
CREATE INDEX "SiteTag_tag_idx" ON "public"."SiteTag"("tag");

-- CreateIndex
CREATE INDEX "SiteTag_suggestedBy_idx" ON "public"."SiteTag"("suggestedBy");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTag_siteId_tag_key" ON "public"."SiteTag"("siteId", "tag");

-- CreateIndex
CREATE INDEX "DiscoveryPath_toSite_idx" ON "public"."DiscoveryPath"("toSite");

-- CreateIndex
CREATE INDEX "DiscoveryPath_discoveredBy_idx" ON "public"."DiscoveryPath"("discoveredBy");

-- CreateIndex
CREATE INDEX "DiscoveryPath_discoveryMethod_idx" ON "public"."DiscoveryPath"("discoveryMethod");

-- CreateIndex
CREATE INDEX "DiscoveryPath_sessionId_idx" ON "public"."DiscoveryPath"("sessionId");

-- CreateIndex
CREATE INDEX "DiscoveryPath_createdAt_idx" ON "public"."DiscoveryPath"("createdAt");

-- CreateIndex
CREATE INDEX "SiteRelationship_siteA_idx" ON "public"."SiteRelationship"("siteA");

-- CreateIndex
CREATE INDEX "SiteRelationship_siteB_idx" ON "public"."SiteRelationship"("siteB");

-- CreateIndex
CREATE INDEX "SiteRelationship_relationshipType_idx" ON "public"."SiteRelationship"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "SiteRelationship_siteA_siteB_relationshipType_key" ON "public"."SiteRelationship"("siteA", "siteB", "relationshipType");

-- CreateIndex
CREATE INDEX "CrawlQueue_status_scheduledFor_idx" ON "public"."CrawlQueue"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "CrawlQueue_priority_scheduledFor_idx" ON "public"."CrawlQueue"("priority", "scheduledFor");

-- CreateIndex
CREATE INDEX "CrawlQueue_url_idx" ON "public"."CrawlQueue"("url");

-- CreateIndex
CREATE INDEX "DiscoveryLink_sourceUrl_idx" ON "public"."DiscoveryLink"("sourceUrl");

-- CreateIndex
CREATE INDEX "DiscoveryLink_targetUrl_idx" ON "public"."DiscoveryLink"("targetUrl");

-- CreateIndex
CREATE INDEX "DiscoveryLink_sourcePlatform_idx" ON "public"."DiscoveryLink"("sourcePlatform");

-- CreateIndex
CREATE INDEX "DiscoveryLink_processed_idx" ON "public"."DiscoveryLink"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredSite_url_key" ON "public"."DiscoveredSite"("url");

-- CreateIndex
CREATE INDEX "DiscoveredSite_reviewStatus_qualityScore_idx" ON "public"."DiscoveredSite"("reviewStatus", "qualityScore");

-- CreateIndex
CREATE INDEX "DiscoveredSite_discoveredAt_idx" ON "public"."DiscoveredSite"("discoveredAt");

-- CreateIndex
CREATE INDEX "DiscoveredSite_qualityScore_idx" ON "public"."DiscoveredSite"("qualityScore" DESC);

-- CreateIndex
CREATE INDEX "SiteReview_siteId_idx" ON "public"."SiteReview"("siteId");

-- CreateIndex
CREATE INDEX "SiteReview_userId_idx" ON "public"."SiteReview"("userId");

-- CreateIndex
CREATE INDEX "SiteReview_helpful_idx" ON "public"."SiteReview"("helpful");

-- CreateIndex
CREATE INDEX "SiteReview_rating_idx" ON "public"."SiteReview"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "SiteReview_siteId_userId_key" ON "public"."SiteReview"("siteId", "userId");

-- CreateIndex
CREATE INDEX "ConsentLog_userId_timestamp_idx" ON "public"."ConsentLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ConsentLog_type_action_idx" ON "public"."ConsentLog"("type", "action");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollection_userId_name_key" ON "public"."UserCollection"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserBookmark_userId_url_key" ON "public"."UserBookmark"("userId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkCommunitySubmission_bookmarkId_key" ON "public"."BookmarkCommunitySubmission"("bookmarkId");

-- CreateIndex
CREATE UNIQUE INDEX "DecorationItem_itemId_key" ON "public"."DecorationItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "DecorationItem_claimCode_key" ON "public"."DecorationItem"("claimCode");

-- CreateIndex
CREATE INDEX "DecorationItem_releaseType_idx" ON "public"."DecorationItem"("releaseType");

-- CreateIndex
CREATE INDEX "DecorationItem_releaseStartAt_releaseEndAt_idx" ON "public"."DecorationItem"("releaseStartAt", "releaseEndAt");

-- CreateIndex
CREATE INDEX "DecorationItem_claimCode_idx" ON "public"."DecorationItem"("claimCode");

-- CreateIndex
CREATE INDEX "DecorationItem_isActive_idx" ON "public"."DecorationItem"("isActive");

-- CreateIndex
CREATE INDEX "DecorationItem_itemId_idx" ON "public"."DecorationItem"("itemId");

-- CreateIndex
CREATE INDEX "UserDecorationClaim_userId_idx" ON "public"."UserDecorationClaim"("userId");

-- CreateIndex
CREATE INDEX "UserDecorationClaim_decorationId_idx" ON "public"."UserDecorationClaim"("decorationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDecorationClaim_userId_decorationId_key" ON "public"."UserDecorationClaim"("userId", "decorationId");

-- AddForeignKey
ALTER TABLE "public"."Handle" ADD CONSTRAINT "Handle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserHomeConfig" ADD CONSTRAINT "UserHomeConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserHomeDecoration" ADD CONSTRAINT "UserHomeDecoration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."UserHomeConfig"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PixelHomeVisitor" ADD CONSTRAINT "PixelHomeVisitor_homeOwnerId_fkey" FOREIGN KEY ("homeOwnerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PixelHomeVisitor" ADD CONSTRAINT "PixelHomeVisitor_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostMetrics" ADD CONSTRAINT "PostMetrics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostView" ADD CONSTRAINT "PostView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuestbookEntry" ADD CONSTRAINT "GuestbookEntry_profileOwner_fkey" FOREIGN KEY ("profileOwner") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PluginInstall" ADD CONSTRAINT "PluginInstall_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CapabilityGrant" ADD CONSTRAINT "CapabilityGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaKey" ADD CONSTRAINT "BetaKey_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaInviteCode" ADD CONSTRAINT "BetaInviteCode_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaInviteCode" ADD CONSTRAINT "BetaInviteCode_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."PhotoComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRing" ADD CONSTRAINT "ThreadRing_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRing" ADD CONSTRAINT "ThreadRing_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."ThreadRing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingMember" ADD CONSTRAINT "ThreadRingMember_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingMember" ADD CONSTRAINT "ThreadRingMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostThreadRing" ADD CONSTRAINT "PostThreadRing_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostThreadRing" ADD CONSTRAINT "PostThreadRing_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostThreadRing" ADD CONSTRAINT "PostThreadRing_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingInvite" ADD CONSTRAINT "ThreadRingInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingInvite" ADD CONSTRAINT "ThreadRingInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingInvite" ADD CONSTRAINT "ThreadRingInvite_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingFork" ADD CONSTRAINT "ThreadRingFork_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingFork" ADD CONSTRAINT "ThreadRingFork_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingFork" ADD CONSTRAINT "ThreadRingFork_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBadge" ADD CONSTRAINT "ThreadRingBadge_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBlock" ADD CONSTRAINT "ThreadRingBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBlock" ADD CONSTRAINT "ThreadRingBlock_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBlock" ADD CONSTRAINT "ThreadRingBlock_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RingHubOwnership" ADD CONSTRAINT "RingHubOwnership_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blockedThreadRingId_fkey" FOREIGN KEY ("blockedThreadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Emoji" ADD CONSTRAINT "Emoji_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteNews" ADD CONSTRAINT "SiteNews_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaLandingPage" ADD CONSTRAINT "BetaLandingPage_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaLandingPage" ADD CONSTRAINT "BetaLandingPage_endedBy_fkey" FOREIGN KEY ("endedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaLandingSignup" ADD CONSTRAINT "BetaLandingSignup_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "public"."BetaLandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaLandingSignup" ADD CONSTRAINT "BetaLandingSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IpSignupTracking" ADD CONSTRAINT "IpSignupTracking_blockedBy_fkey" FOREIGN KEY ("blockedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignupAttempt" ADD CONSTRAINT "SignupAttempt_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "public"."BetaLandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SignupAttempt" ADD CONSTRAINT "SignupAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaInviteShare" ADD CONSTRAINT "BetaInviteShare_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "public"."BetaInviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetaInviteShare" ADD CONSTRAINT "BetaInviteShare_sharedBy_fkey" FOREIGN KEY ("sharedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IndexedSite" ADD CONSTRAINT "IndexedSite_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IndexedSite" ADD CONSTRAINT "IndexedSite_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteVote" ADD CONSTRAINT "SiteVote_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."IndexedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteVote" ADD CONSTRAINT "SiteVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteTag" ADD CONSTRAINT "SiteTag_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."IndexedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteTag" ADD CONSTRAINT "SiteTag_suggestedBy_fkey" FOREIGN KEY ("suggestedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiscoveryPath" ADD CONSTRAINT "DiscoveryPath_discoveredBy_fkey" FOREIGN KEY ("discoveredBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteReview" ADD CONSTRAINT "SiteReview_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."IndexedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteReview" ADD CONSTRAINT "SiteReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCollection" ADD CONSTRAINT "UserCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBookmark" ADD CONSTRAINT "UserBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBookmark" ADD CONSTRAINT "UserBookmark_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."UserCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookmarkCommunitySubmission" ADD CONSTRAINT "BookmarkCommunitySubmission_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "public"."UserBookmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookmarkCommunitySubmission" ADD CONSTRAINT "BookmarkCommunitySubmission_indexedSiteId_fkey" FOREIGN KEY ("indexedSiteId") REFERENCES "public"."IndexedSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookmarkCommunitySubmission" ADD CONSTRAINT "BookmarkCommunitySubmission_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DecorationItem" ADD CONSTRAINT "DecorationItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDecorationClaim" ADD CONSTRAINT "UserDecorationClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDecorationClaim" ADD CONSTRAINT "UserDecorationClaim_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "public"."DecorationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

