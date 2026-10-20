/**
 * View source and "Start from this page": who may read a resident's template
 * and CSS, in one place. The source page (/resident/[username]/source), its
 * API (pages/api/profile/[username]/source.ts) and the HTML editor's
 * ?from=<handle> all ask lookUpSource, so the rules can't drift apart.
 *
 * The rules: the viewer must be allowed to see the profile at all
 * (residentAccess: visibility, blocks either way, suspended or banned), and
 * the owner must have turned on Profile.showTemplateSource ("Visitors can
 * view my source"). Owners always see their own.
 */
import type { Visibility } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { getSiteBaseUrl } from "@/lib/config/site-url";
import { residentAccess } from "@/lib/domain/users/profile-access";
import { layoutOf } from "@/lib/domain/profile/layout";

type Viewer = Parameters<typeof residentAccess>[0];

export type SourceLookup =
  | { status: "not_found" }
  | {
      /** The viewer may not see this profile; show the private-profile page */
      status: "hidden";
      username: string;
      displayName: string;
      avatarUrl: string;
      visibility: Exclude<Visibility, "public">;
      suspended: boolean;
    }
  | {
      status: "found";
      username: string;
      isOwner: boolean;
      sharing: boolean;
      templateMode: string;
      cssMode: string;
      /** Blank unless sharing is on or the viewer is the owner */
      customTemplate: string;
      customCSS: string;
    };

/** A local resident's source, as far as `viewer` may read it. */
export async function lookUpSource(viewer: Viewer, username: string): Promise<SourceLookup> {
  const handle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: { user: { include: { profile: true } } },
  });
  if (!handle || !handle.user.profile) return { status: "not_found" };
  const profile = handle.user.profile;

  const access = await residentAccess(viewer, handle.user.id, profile.visibility);
  if (!access.visible) {
    return {
      status: "hidden",
      username: handle.handle,
      displayName: profile.displayName || handle.handle,
      avatarUrl: profile.avatarUrl || "/assets/default-avatar.gif",
      visibility: access.visibility,
      suspended: access.suspended === true,
    };
  }

  const isOwner = viewer?.id === handle.user.id;
  const sharing = profile.showTemplateSource === true;
  const canRead = sharing || isOwner;
  return {
    status: "found",
    username: handle.handle,
    isOwner,
    sharing,
    templateMode: profile.templateMode,
    cssMode: profile.cssMode,
    customTemplate: canRead ? profile.customTemplate || "" : "",
    customCSS: canRead ? profile.customCSS || "" : "",
  };
}

/** Whether a found source is a page of the resident's own HTML that others may start from. */
export function canStartFrom(source: Extract<SourceLookup, { status: "found" }>): boolean {
  return source.sharing && layoutOf(source.templateMode) === "html" && source.customTemplate.trim() !== "";
}

/**
 * The note at the top of a page started from someone else's:
 * `<!-- Started from @pat's page: https://site/resident/pat -->`.
 * Handles may hold "--", which would end an HTML comment early, so the
 * text spaces it out and the link spells the hyphens as %2D.
 */
export function creditComment(username: string, baseUrl: string = getSiteBaseUrl()): string {
  const base = baseUrl.replace(/\/+$/, "");
  const text = username.replace(/-{2,}/g, (run) => run.split("").join(" "));
  const path = username.includes("--")
    ? encodeURIComponent(username).replace(/-/g, "%2D")
    : encodeURIComponent(username);
  return `<!-- Started from @${text}'s page: ${base}/resident/${path} -->`;
}

export type StartFromResult =
  | { ok: true; username: string; template: string; css: string; cssMode: string }
  | { ok: false; reason: "not_found" | "not_shared" | "no_html" | "own_page" };

/** Handles are lowercase letters, digits, "_" and "-" (lib/domain/validation/username.ts). */
const HANDLE_SHAPE = /^[a-z0-9_-]{1,64}$/i;

/**
 * Someone's page as a starting point for `viewer`'s HTML editor: their
 * template with the credit note on top, and their CSS. Refuses anything the
 * view-source page wouldn't show, and pages with no HTML of their own.
 */
export async function startFromPage(
  viewer: NonNullable<Viewer>,
  fromHandle: string,
  baseUrl?: string
): Promise<StartFromResult> {
  if (!HANDLE_SHAPE.test(fromHandle)) return { ok: false, reason: "not_found" };

  const source = await lookUpSource(viewer, fromHandle);
  if (source.status === "not_found") return { ok: false, reason: "not_found" };
  // A suspended page 404s everywhere; a private or blocked one only says it's private
  if (source.status === "hidden") return { ok: false, reason: source.suspended ? "not_found" : "not_shared" };
  if (source.isOwner) return { ok: false, reason: "own_page" };
  if (!source.sharing) return { ok: false, reason: "not_shared" };
  if (!canStartFrom(source)) return { ok: false, reason: "no_html" };

  return {
    ok: true,
    username: source.username,
    template: `${creditComment(source.username, baseUrl)}\n${source.customTemplate}`,
    css: source.customCSS,
    cssMode: source.cssMode,
  };
}
