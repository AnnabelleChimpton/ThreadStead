/**
 * Where a resident's own uploads live in storage, by key prefix. Only their
 * files are under these, so a key here is safe to treat as theirs (to put in
 * their page download, or to delete with their account).
 */
export function ownUploadPrefixes(userId: string): string[] {
  return [
    `media/${userId}/`, // photos, MIDI and each song's sound bank (pages/api/media/upload.ts)
    `profile-photos/${userId}/`, // pages/api/profile/upload-photo.ts
    `profile-banners/${userId}/`, // pages/api/profile/upload-banner.ts
    `pixel-homes/custom/${userId}-`, // lib/pixel-homes/custom-asset-uploader.ts
    `pixel-homes/snapshots/${userId}.`, // lib/pixel-homes/snapshot/service.ts
  ];
}
