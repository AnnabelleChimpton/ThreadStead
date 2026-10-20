/**
 * A moderator puts someone's profile page back to the standard layout: their
 * custom HTML and CSS come off the profile, and the page renders the way a
 * new account's does. Nothing is lost. The old version is written to their
 * revision history in the same transaction, so they can see it, fix it and
 * bring it back from the editor's History. The action goes in the moderation
 * log, and resolves the report it came from.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { ApiError } from "@/lib/api/errors";
import { MAX_REVISIONS_PER_USER } from "@/lib/templates/revisions/template-revisions";
import { layoutFields, layoutOf, siteStylesOn } from "@/lib/domain/profile/layout";

export interface ResetPageInput {
  actorId: string;
  userId: string;
  reason: string;
  reportId?: string;
}

export interface ResetPageResult {
  userId: string;
  handle: string | null;
  /** False when there was no custom page to take down */
  hadCustomPage: boolean;
  actionId: string;
}

export async function resetProfilePage({ actorId, userId, reason, reportId }: ResetPageInput): Promise<ResetPageResult> {
  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      primaryHandle: true,
      profile: {
        select: { customTemplate: true, customCSS: true, cssMode: true, templateMode: true, hideNavigation: true },
      },
    },
  });
  if (!target) throw new ApiError(404, "User not found");

  // Anything that makes the page look different from a new account's
  const page = target.profile;
  const hadCustomPage =
    !!page &&
    (!!page.customTemplate?.trim() ||
      !!page.customCSS?.trim() ||
      layoutOf(page.templateMode) === "html" ||
      !siteStylesOn(page.cssMode));
  const now = new Date();

  const action = await db.$transaction(async (tx) => {
    if (page && hadCustomPage) {
      await tx.profileTemplateRevision.create({
        data: {
          userId,
          customTemplate: page.customTemplate,
          customCSS: page.customCSS,
          cssMode: page.cssMode,
          templateMode: page.templateMode,
          hideNavigation: page.hideNavigation,
          trigger: "moderator-reset",
        },
      });
      await tx.profile.update({
        where: { userId },
        data: {
          ...layoutFields({ layout: "standard", siteStyles: true }),
          customTemplate: null,
          compiledTemplate: Prisma.DbNull,
          templateCompiledAt: null,
          customCSS: null,
          hideNavigation: false,
        },
      });
    }
    if (reportId) {
      await tx.userReport.update({
        where: { id: reportId },
        data: { status: "resolved", resolution: `Page reset: ${reason}`, reviewedBy: actorId, reviewedAt: now },
      });
    }
    return tx.moderationAction.create({
      data: { action: "reset_page", userId, userHandle: target.primaryHandle, actorId, reason, reportId: reportId ?? null, createdAt: now },
      select: { id: true },
    });
  });

  // Keep history to its usual size (the save path does the same)
  if (hadCustomPage) {
    const extra = await db.profileTemplateRevision.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: MAX_REVISIONS_PER_USER,
      select: { id: true },
    });
    if (extra.length > 0) {
      await db.profileTemplateRevision.deleteMany({ where: { id: { in: extra.map((r) => r.id) } } });
    }
  }

  return { userId, handle: target.primaryHandle, hadCustomPage, actionId: action.id };
}
