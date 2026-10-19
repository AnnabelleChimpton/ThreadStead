/**
 * The editor's unsaved work, kept in this browser so a crash, a closed tab
 * or a dead battery doesn't lose it (pixel-homes PLAN.md, Phase 3 step 5).
 * One draft per resident; it goes away when they save or discard it.
 *
 * Storage can be missing or full (private windows, blocked site data), so
 * every read and write is allowed to fail quietly.
 */
import { docKey, type EditorDoc } from './editor-doc'

export interface EditorDraft {
  /** When it was written, in ms since the epoch. */
  at: number
  doc: EditorDoc
}

const keyFor = (username: string) => `pixelHomeDraft:${username.toLowerCase()}`

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readDraft(username: string, store = storage()): EditorDraft | null {
  try {
    const raw = store?.getItem(keyFor(username))
    if (!raw) return null
    const draft = JSON.parse(raw) as EditorDraft
    if (typeof draft?.at !== 'number' || !draft.doc || !Array.isArray(draft.doc.decorations)) return null
    return draft
  } catch {
    return null
  }
}

export function writeDraft(username: string, doc: EditorDoc, at = Date.now(), store = storage()): void {
  try {
    store?.setItem(keyFor(username), JSON.stringify({ at, doc }))
  } catch {
    // Full or blocked: the editor still works, it just can't keep a copy
  }
}

export function clearDraft(username: string, store = storage()): void {
  try {
    store?.removeItem(keyFor(username))
  } catch {
    // nothing to do
  }
}

/** A draft worth offering: one that differs from the home as it opened. */
export function draftToOffer(username: string, opened: EditorDoc, store = storage()): EditorDraft | null {
  const draft = readDraft(username, store)
  if (!draft) return null
  if (docKey(draft.doc) === docKey(opened)) {
    clearDraft(username, store)
    return null
  }
  return draft
}

/** "10:42", or "Oct 18, 10:42" for an older one. */
export function draftTime(at: number, now = Date.now()): string {
  const when = new Date(at)
  const time = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return new Date(now).toDateString() === when.toDateString()
    ? time
    : `${when.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}
