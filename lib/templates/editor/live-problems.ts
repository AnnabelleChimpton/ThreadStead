/**
 * What's wrong with the page as you type it: the editor's live compile (or,
 * for the CSS pane, its own checks) finds it, the list under the code shows
 * it (ProblemsStrip), and each one with a line is marked on that line in the
 * gutter too (problemMarks, for @codemirror/lint).
 */
import type { Text } from '@codemirror/state';
import type { Diagnostic } from '@codemirror/lint';

export type StrippedCategory = 'document' | 'unsupported' | 'safety';

/** A tag the compile took out, from its report (template-parser reportStrippedTags) */
export interface StrippedEntry {
  name: string;
  line?: number;
  reason?: string;
  /** 'document' wrappers (expected), 'unsupported' here, or removed for 'safety' */
  category?: StrippedCategory;
  /** Further occurrences of the same tag */
  count?: number;
}

/** Taken-out tags worth saying anything about: a pasted page's <html>, <head> and <body> are expected */
export function hasStrippedNeedingAttention(entries: StrippedEntry[] | undefined): boolean {
  return (entries || []).some((entry) => entry.category !== 'document');
}

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

/** The first line a problem that stops a save is on */
export function firstProblemLine(problems: Pick<LiveProblems, 'errors'>): number | undefined {
  for (const e of problems.errors) {
    const { line } = splitLine(e);
    if (line) return line;
  }
  return undefined;
}

/**
 * Each problem with a line, marked on it: from its first character to its
 * end. What stops a save is an error; what won't work, and taken-out tags,
 * are warnings. Problems with no line stay in the list only.
 */
export function problemMarks(doc: Text, problems: LiveProblems): Diagnostic[] {
  const mark = (lineNumber: number, severity: Diagnostic['severity'], message: string): Diagnostic => {
    const line = doc.line(Math.min(Math.max(lineNumber, 1), doc.lines));
    const from = line.from + (line.text.length - line.text.trimStart().length);
    return { from, to: Math.max(from, line.to), severity, message };
  };
  const marks: Diagnostic[] = [];
  for (const [list, severity] of [[problems.errors, 'error'], [problems.warnings, 'warning']] as const) {
    for (const message of list) {
      const { line, text } = splitLine(message);
      if (line) marks.push(mark(line, severity, text));
    }
  }
  for (const entry of problems.stripped) {
    if (entry.category !== 'document' && entry.line) marks.push(mark(entry.line, 'warning', `<${entry.name}>: ${entry.reason ?? ''}`));
  }
  return marks;
}
