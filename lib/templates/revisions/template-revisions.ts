import { db } from "@/lib/config/database/connection";

// Restore points, not version control: enough history to undo a bad save or
// an accidental preset load, small enough to never think about quota.
export const MAX_REVISIONS_PER_USER = 20;

export type RevisionTrigger = 'template-save' | 'css-save' | 'reset';

/**
 * Snapshot the profile's current customization before a save overwrites it.
 *
 * Never throws: a failed snapshot must not block the save itself — the save
 * carries the user's newest work, the snapshot only guards the previous state.
 */
export async function snapshotProfileBeforeSave(userId: string, trigger: RevisionTrigger): Promise<void> {
  try {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: {
        customTemplate: true,
        customCSS: true,
        cssMode: true,
        templateMode: true,
        hideNavigation: true,
      },
    });
    if (!profile) return;

    const hasContent =
      (profile.customTemplate && profile.customTemplate.trim() !== '') ||
      (profile.customCSS && profile.customCSS.trim() !== '');
    if (!hasContent) return;

    // Repeated saves of identical content shouldn't stack duplicate restore points.
    const latest = await db.profileTemplateRevision.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { customTemplate: true, customCSS: true, cssMode: true },
    });
    if (
      latest &&
      latest.customTemplate === profile.customTemplate &&
      latest.customCSS === profile.customCSS &&
      latest.cssMode === profile.cssMode
    ) {
      return;
    }

    await db.profileTemplateRevision.create({
      data: {
        userId,
        customTemplate: profile.customTemplate,
        customCSS: profile.customCSS,
        cssMode: profile.cssMode,
        templateMode: profile.templateMode,
        hideNavigation: profile.hideNavigation,
        trigger,
      },
    });

    const stale = await db.profileTemplateRevision.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: MAX_REVISIONS_PER_USER,
      select: { id: true },
    });
    if (stale.length > 0) {
      await db.profileTemplateRevision.deleteMany({
        where: { id: { in: stale.map((s) => s.id) } },
      });
    }
  } catch (error) {
    console.error('Failed to snapshot profile revision:', error);
  }
}
