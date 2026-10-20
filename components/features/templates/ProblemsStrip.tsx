import React from 'react';
import type { StrippedEntry } from './ValidationFeedbackPanel';

/**
 * What's wrong with the page as you type it, under the code: the editor
 * compiles on every pause for the preview anyway, and this shows what that
 * compile found, with each line number taking you to the line. Before, these
 * only showed after Save, by which time the page was already live.
 */
export interface LiveProblems {
  /** 'failed': the page can't be saved as it is; the preview shows the last version that worked */
  status: 'idle' | 'ok' | 'failed';
  errors: string[];
  warnings: string[];
  stripped: StrippedEntry[];
}

export const NO_PROBLEMS: LiveProblems = { status: 'idle', errors: [], warnings: [], stripped: [] };

/** "Line 3: …" → 3 and the rest; the first line only (errors carry the code and a Tip below it) */
export function splitLine(message: string): { line?: number; text: string } {
  const m = message.match(/^Line (\d+):\s*([\s\S]*)$/);
  return m ? { line: Number(m[1]), text: m[2] } : { text: message };
}

/** The first line a problem is on, for the preview's "Line N has a problem" */
export function firstProblemLine(problems: LiveProblems): number | undefined {
  for (const e of problems.errors) {
    const { line } = splitLine(e);
    if (line) return line;
  }
  return undefined;
}

export default function ProblemsStrip({ problems, onJump }: { problems: LiveProblems; onJump: (line: number) => void }) {
  if (problems.status === 'idle') return null;
  const taken = problems.stripped.filter((s) => s.category !== 'document');
  const count = problems.errors.length + problems.warnings.length + taken.length;

  const row = (key: string, kind: string, message: string, line?: number) => {
    const parts = splitLine(message);
    const at = line ?? parts.line;
    return (
      <li key={key} className="flex gap-2 items-start py-1 border-t border-black/10 first:border-t-0">
        {at ? (
          <button
            type="button"
            className="ts-bare shrink-0 font-mono text-xs underline text-nb-ink"
            onClick={() => onJump(at)}
            title={`Go to line ${at}`}
          >
            Line {at}
          </button>
        ) : (
          <span className="shrink-0 font-mono text-xs text-nb-ink-mid">Page</span>
        )}
        <span className="text-sm text-nb-ink whitespace-pre-wrap">
          <span className="font-semibold">{kind}: </span>
          {parts.text}
        </span>
      </li>
    );
  };

  return (
    <section aria-live="polite" className="border-t-2 border-thread-sage bg-thread-paper px-3 py-2 flex-shrink-0">
      {count === 0 ? (
        <p className="text-sm text-nb-ink-mid m-0">No problems found.</p>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-nb-ink m-0 mb-1">
            {problems.errors.length > 0
              ? `Can't save yet: ${problems.errors.length === 1 ? 'one thing needs fixing' : `${problems.errors.length} things need fixing`}`
              : `${count === 1 ? 'One thing' : `${count} things`} won't work as written`}
          </h3>
          <ul className="list-none p-0 m-0 max-h-48 overflow-y-auto">
            {problems.errors.map((e, i) => row(`e${i}`, 'Needs fixing', e))}
            {problems.warnings.map((w, i) => row(`w${i}`, "Won't work", w))}
            {taken.map((s, i) => row(`s${i}`, s.category === 'safety' ? 'Taken out' : 'Not used', `<${s.name}>: ${s.reason ?? ''}`, s.line))}
          </ul>
        </>
      )}
    </section>
  );
}
