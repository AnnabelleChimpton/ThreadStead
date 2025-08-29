-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "midiAutoplay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "midiLoop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileMidiId" TEXT;
