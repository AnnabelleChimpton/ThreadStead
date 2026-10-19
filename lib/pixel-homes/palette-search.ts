/**
 * Palette search (pixel-homes PLAN.md, Phase 3 step 5): a word matches an
 * item's name or id, or the category it's in, including everyday words for
 * that category, so "lamp" finds the lighting and "flower" finds plants.
 * Every word typed has to match something.
 */
const CATEGORY_WORDS: Record<string, string[]> = {
  plants: ['plant', 'flower', 'tree', 'bush', 'shrub', 'garden', 'hedge'],
  furniture: ['furniture', 'bench', 'chair', 'table', 'seat', 'swing'],
  lighting: ['lighting', 'light', 'lamp', 'lantern', 'lamppost'],
  water: ['water', 'pond', 'fountain', 'bath', 'well'],
  structures: ['structure', 'building', 'shed', 'gazebo', 'arch', 'fence', 'trellis'],
  paths: ['path', 'stone', 'walk', 'step', 'paving'],
  features: ['feature', 'sign', 'mailbox', 'gnome', 'decoration'],
  custom: ['my art', 'mine', 'custom', 'upload'],
}

function words(text: string): string[] {
  return text.toLowerCase().replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean)
}

/** Whether `item` (shown under `category`) matches every word of `query`. */
export function matchesSearch(item: { id: string; name: string; type?: string }, category: string, query: string): boolean {
  const wanted = words(query)
  if (wanted.length === 0) return true
  const own = [...words(item.name), ...words(item.id), ...(item.type ? words(item.type) : [])]
  const categoryWords = [category, ...(CATEGORY_WORDS[category] ?? [])].flatMap(words)
  // "lamps" finds "lamp", "flower" finds "flowers": either may be the start of the other
  const hit = (w: string, candidate: string) => candidate.startsWith(w) || w.startsWith(candidate)
  return wanted.every((w) => own.some((o) => hit(w, o)) || categoryWords.some((c) => hit(w, c)))
}
