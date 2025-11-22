-- Add topic fields to ChatRoom
ALTER TABLE "ChatRoom" ADD COLUMN "topic" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN "topicSetBy" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN "topicSetAt" TIMESTAMP(3);

-- Add isAction field to ChatMessage
ALTER TABLE "ChatMessage" ADD COLUMN "isAction" BOOLEAN NOT NULL DEFAULT false;
