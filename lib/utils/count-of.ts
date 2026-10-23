/** "1 member", "2 members", "0 posts": a count with its noun, plural when it isn't 1. */
export function countOf(count: number, noun: string, plural = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : plural}`
}
