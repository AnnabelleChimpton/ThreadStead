-- CreateTable
CREATE TABLE "UserDID" (
    "userId" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "publicKeyMultibase" TEXT NOT NULL,
    "secretKeyEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDID_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDID_did_key" ON "UserDID"("did");

-- CreateIndex
CREATE UNIQUE INDEX "UserDID_userHash_key" ON "UserDID"("userHash");

-- AddForeignKey
ALTER TABLE "UserDID" ADD CONSTRAINT "UserDID_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
