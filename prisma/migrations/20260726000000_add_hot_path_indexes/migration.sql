-- Hot-path indexes for the core social read paths.
--
-- Postgres does not create indexes for foreign keys automatically, and these
-- four tables had none covering the columns they are actually filtered by, so
-- each read below was a sequential scan of the whole table.
--
-- Note for deploys against a populated database: plain CREATE INDEX takes a
-- SHARE lock and blocks writes to the table for the duration. On a large table
-- run the CONCURRENTLY variants by hand outside this migration instead --
-- CREATE INDEX CONCURRENTLY cannot run inside Prisma's migration transaction.

-- Comment: thread loads filter (postId, status) ordered by createdAt, and post
-- views recount comments on the same pair.
CREATE INDEX "Comment_postId_status_createdAt_idx" ON "Comment"("postId", "status", "createdAt");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- GuestbookEntry: every profile view reads that owner's visible entries.
CREATE INDEX "GuestbookEntry_profileOwner_status_createdAt_idx" ON "GuestbookEntry"("profileOwner", "status", "createdAt");

-- Follow: the primary key ([followerId, followeeId]) already serves
-- followerId-prefixed lookups. Follower counts filter on followeeId alone,
-- which that key cannot serve.
CREATE INDEX "Follow_followeeId_status_idx" ON "Follow"("followeeId", "status");

-- User: primaryHandle is resolved on nearly every username-addressed route.
CREATE INDEX "User_primaryHandle_idx" ON "User"("primaryHandle");

-- Post: profile feeds filter by authorId ordered by createdAt desc (take 20),
-- with visibility applied over that small slice.
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");
