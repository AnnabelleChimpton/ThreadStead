import type { UploadContext } from "@prisma/client";

/**
 * Pictures a resident uploads for their own page from the editor (a tile,
 * a cursor, an 88×31): not gallery photos. Stored as UploadContext "other",
 * which nothing else uses. They used to be filed as gallery uploads, so each
 * one became a public "Featured" photo with comments (template audit 08).
 */
export const PAGE_ASSET_CONTEXT: UploadContext = "other";

/** What the editor's picker sends as the upload's context */
export const PAGE_ASSET_UPLOAD = "page_asset";
