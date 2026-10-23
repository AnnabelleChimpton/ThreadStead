/**
 * Runs webmention work in the background of this process, a few at a time,
 * with a short line behind them. No table and no scheduler: a restart drops
 * whatever was waiting, which at this volume is fine (senders can resend).
 */

export interface Gate {
  /** Starts `task` now or when a slot frees up; false when the line is full. */
  tryRun(task: () => Promise<void>): boolean
}

export function createGate(concurrency: number, maxWaiting: number): Gate {
  let running = 0
  const waiting: Array<() => Promise<void>> = []

  const next = () => {
    while (running < concurrency && waiting.length) {
      const task = waiting.shift()!
      running++
      task()
        .catch((error) => console.error('Webmention work failed:', error))
        .finally(() => {
          running--
          next()
        })
    }
  }

  return {
    tryRun(task) {
      if (waiting.length >= maxWaiting) return false
      waiting.push(task)
      next()
      return true
    },
  }
}

// On globalThis so every route bundle (and dev reloads) shares one line.
const globalGates = globalThis as unknown as { webmentionGates?: { receive: Gate; send: Gate } }

const gates = () => (globalGates.webmentionGates ??= { receive: createGate(2, 20), send: createGate(2, 50) })

/** Checking mentions that come in: 2 at a time, 20 waiting. */
export const receiveGate = (): Gate => gates().receive

/** Telling sites a post links to, one post per task: 2 at a time, 50 waiting. */
export const sendGate = (): Gate => gates().send
