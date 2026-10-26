/**
 * What the post editor sends to create or edit a post
 * (components/ui/forms/PostEditor.tsx), as a schema, and the journal
 * metadata a post keeps. metadata was stored as sent and spread last into
 * what goes to the ring hub, so a crafted one replaced the post's title,
 * type, author handle or spoiler flag there. Only the editor's five journal
 * fields are kept now, as short text, and only they reach the hub.
 */
import { z } from 'zod';
import { PostIntent, Visibility } from '@prisma/client';

export const JOURNAL_FIELDS = ['mood', 'listeningTo', 'reading', 'drinking', 'location'] as const;
export type JournalMetadata = Partial<Record<(typeof JOURNAL_FIELDS)[number], string>>;
const JOURNAL_FIELD_MAX = 200;

/** The journal fields in `raw`, trimmed and capped; null when there are none */
export function journalMetadata(raw: unknown): JournalMetadata | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const kept: JournalMetadata = {};
  for (const field of JOURNAL_FIELDS) {
    const value = (raw as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.trim()) kept[field] = value.trim().slice(0, JOURNAL_FIELD_MAX);
  }
  return Object.keys(kept).length > 0 ? kept : null;
}

const BODY_MAX = 500_000;

/** The fields create and edit share; every one optional (edit leaves out what doesn't change) */
export const postFieldsSchema = z.object({
  title: z.string().max(1000).optional(),
  bodyText: z.string().max(BODY_MAX).optional(),
  bodyHtml: z.string().max(BODY_MAX).optional(),
  bodyMarkdown: z.string().max(BODY_MAX).optional(),
  visibility: z.enum(Visibility).optional(),
  threadRingIds: z.array(z.string().max(200)).max(50).optional(),
  intent: z.enum(PostIntent).nullable().optional(),
  promptId: z.string().max(200).optional(),
  isSpoiler: z.boolean().optional(),
  contentWarning: z.string().max(100).nullable().optional(),
  /** Anything; journalMetadata keeps what's kept */
  metadata: z.unknown().optional(),
  cap: z.string().max(5000).optional(),
});

export const updatePostSchema = postFieldsSchema.extend({ id: z.string().min(1).max(200) });
