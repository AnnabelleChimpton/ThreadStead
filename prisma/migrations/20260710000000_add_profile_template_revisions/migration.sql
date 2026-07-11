-- CreateTable
CREATE TABLE "ProfileTemplateRevision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customTemplate" TEXT,
    "customCSS" TEXT,
    "cssMode" TEXT NOT NULL DEFAULT 'inherit',
    "templateMode" "TemplateMode" NOT NULL DEFAULT 'default',
    "hideNavigation" BOOLEAN NOT NULL DEFAULT false,
    "trigger" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileTemplateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileTemplateRevision_userId_createdAt_idx" ON "ProfileTemplateRevision"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ProfileTemplateRevision" ADD CONSTRAINT "ProfileTemplateRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
