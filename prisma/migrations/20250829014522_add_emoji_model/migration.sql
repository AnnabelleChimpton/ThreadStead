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

-- CreateIndex
CREATE UNIQUE INDEX "Emoji_name_key" ON "public"."Emoji"("name");

-- CreateIndex
CREATE INDEX "Emoji_name_idx" ON "public"."Emoji"("name");

-- CreateIndex
CREATE INDEX "Emoji_createdBy_idx" ON "public"."Emoji"("createdBy");

-- AddForeignKey
ALTER TABLE "public"."Emoji" ADD CONSTRAINT "Emoji_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
