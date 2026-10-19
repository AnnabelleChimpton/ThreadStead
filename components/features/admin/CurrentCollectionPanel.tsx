import React, { useEffect, useState } from 'react'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'
import { useToast } from '@/contexts/ToastContext'
import Button from '@/components/ui/Button'
import { shortDate, type CollectionSummary } from '@/lib/pixel-homes/collections'

/**
 * Admin: which seasonal collection is current. The street mentions it in
 * one line while some of its decorations are out for everyone.
 */
export default function CurrentCollectionPanel() {
  const { showSuccess, showError } = useToast()
  const [collections, setCollections] = useState<CollectionSummary[] | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  const [choice, setChoice] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const apply = (data: { collections: CollectionSummary[]; current: string | null }) => {
    setCollections(data.collections)
    setCurrent(data.current)
    setChoice(data.current ?? '')
  }

  useEffect(() => {
    fetch('/api/admin/decorations/collections')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(apply)
      .catch(() => setCollections([]))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await csrfFetch('/api/admin/decorations/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: choice || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That did not save.')
      apply(data)
      showSuccess('Saved.')
    } catch (error) {
      showError((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const window = (c: CollectionSummary) => {
    if (c.startsAt && c.endsAt) return `${shortDate(c.startsAt)} to ${shortDate(c.endsAt)}`
    if (c.endsAt) return `until ${shortDate(c.endsAt)}`
    return 'no end date'
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-4 mb-6" aria-labelledby="current-collection">
      <h2 id="current-collection" className="font-bold text-lg mb-1">Seasonal collection</h2>
      <p className="text-sm text-gray-600 mb-3">
        The street mentions the current collection while its decorations are out. Collections come from the
        Collection field on each decoration.
      </p>
      {collections === null ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : collections.length === 0 ? (
        <p className="text-sm text-gray-600">No decorations are in a collection yet.</p>
      ) : (
        <fieldset className="space-y-1">
          <legend className="sr-only">Current collection</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="current-collection" checked={choice === ''} onChange={() => setChoice('')} />
            None
          </label>
          {collections.map((c) => (
            <label key={c.name} className="flex items-center gap-2 text-sm">
              <input type="radio" name="current-collection" checked={choice === c.name} onChange={() => setChoice(c.name)} />
              <span className="font-semibold">{c.name}</span>
              <span className="text-gray-600">
                {c.items} {c.items === 1 ? 'decoration' : 'decorations'}, {c.outNow} out now, {window(c)}
              </span>
            </label>
          ))}
          <div className="pt-2">
            <Button size="sm" onClick={save} disabled={saving || choice === (current ?? '')}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </fieldset>
      )}
    </section>
  )
}
