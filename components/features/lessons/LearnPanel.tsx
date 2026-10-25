import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { getLesson, nextLesson, type LessonStep } from '@/lib/templates-docs/lessons';
import { checkStep, type CheckablePage, type CheckResult } from '@/lib/templates-docs/lesson-checks';
import { autoLinkComponents } from '@/lib/templates-docs/tutorialLinkProcessor';
import { markdownToSafeHtml } from '@/lib/utils/sanitization/html';

/**
 * A lesson, one step at a time, beside your own page in the editor
 * (?learn=<lesson>&step=<n>). "Show me" puts the step's code in; "Check my
 * work" reads the page the preview already compiled. Nothing is saved until
 * Save, like any other edit. It folds to one line, to give the code room,
 * and stays folded next time.
 */

const FOLDED_KEY = 'ts-learn-folded';
export default function LearnPanel({ slug, step: stepNumber, onStep, page, onShowMe, onClose }: {
  slug: string;
  /** From 1 */
  step: number;
  onStep: (step: number) => void;
  page: CheckablePage | null;
  onShowMe: (step: LessonStep) => void;
  onClose: () => void;
}) {
  const lesson = getLesson(slug);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [answered, setAnswered] = useState<'yes' | 'not-yet' | null>(null);
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    try { setFolded(window.localStorage.getItem(FOLDED_KEY) === 'true'); } catch { /* open, then */ }
  }, []);
  const fold = (on: boolean) => {
    setFolded(on);
    try { window.localStorage.setItem(FOLDED_KEY, String(on)); } catch { /* not remembered, that's all */ }
  };
  useEffect(() => {
    setResult(null);
    setAnswered(null);
  }, [slug, stepNumber]);

  if (!lesson) return null;
  const index = Math.min(Math.max(stepNumber, 1), lesson.steps.length) - 1;
  const step = lesson.steps[index];
  const last = index === lesson.steps.length - 1;
  const after = nextLesson(lesson.slug);
  const check = () => {
    setAnswered(null);
    setResult(checkStep(step.checks, page));
  };

  if (folded) {
    return (
      <section aria-label="Lesson" className="mb-3 border-2 border-thread-sage bg-thread-paper px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-nb-ink">
        {/* Its own line on a phone, rather than squeezed to nothing by the buttons */}
        <span className="min-w-[12rem] flex-1 truncate">
          <strong>Step {index + 1} of {lesson.steps.length}:</strong> {step.title}
        </span>
        {/* The answer shows in the open panel */}
        <Button size="sm" onClick={() => { check(); fold(false); }}>Check my work</Button>
        <Button size="sm" variant="secondary" onClick={() => onShowMe(step)}>Show me</Button>
        <button type="button" className="ts-bare underline" aria-expanded="false" onClick={() => fold(false)}>
          Open
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Lesson" className="mb-4 border-2 border-thread-sage bg-thread-paper p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="thread-label m-0">
          {lesson.title}: step {index + 1} of {lesson.steps.length}
        </p>
        <span className="inline-flex gap-3">
          <button type="button" className="ts-bare text-sm underline text-nb-ink" aria-expanded="true" onClick={() => fold(true)}>
            Fold
          </button>
          <button type="button" className="ts-bare text-sm underline text-nb-ink" onClick={onClose}>
            Close the lesson
          </button>
        </span>
      </div>
      <h3 className="text-lg font-semibold text-nb-ink mt-1 mb-2">{step.title}</h3>
      <div
        className="thread-content text-sm text-nb-ink"
        dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(autoLinkComponents(step.body)) }}
      />

      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" onClick={check}>
          Check my work
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onShowMe(step)}>
          Show me
        </Button>
      </div>

      {result && (
        <div role="status" className="mt-3 text-sm text-nb-ink">
          {result.status === 'hint' && <p className="m-0">Not quite yet. {result.hint}</p>}
          {result.status === 'ok' && <p className="m-0">That works.</p>}
          {result.status === 'ask' && !answered && (
            <div className="flex flex-wrap items-center gap-2">
              <span>{result.question}</span>
              <Button size="sm" variant="secondary" onClick={() => setAnswered('yes')}>Yes</Button>
              <Button size="sm" variant="secondary" onClick={() => setAnswered('not-yet')}>Not yet</Button>
            </div>
          )}
          {answered === 'yes' && <p className="m-0">That works.</p>}
          {answered === 'not-yet' && (
            <p className="m-0">Press Show me to see the code that does it, and compare it with yours.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-black/10 text-sm">
        {index > 0 && (
          <button type="button" className="ts-bare underline text-nb-ink" onClick={() => onStep(index)}>
            Previous step
          </button>
        )}
        {!last && (
          <button type="button" className="ts-bare underline text-nb-ink font-semibold" onClick={() => onStep(index + 2)}>
            Next step
          </button>
        )}
        {last && (
          <span className="text-nb-ink">
            {lesson.wrapUp}{' '}
            {after ? (
              <a className="underline" href={`?learn=${after.slug}&step=1`}>Next lesson: {after.title}</a>
            ) : (
              <a className="underline" href="/build/html" target="_blank" rel="noopener noreferrer">All lessons</a>
            )}
          </span>
        )}
      </div>
      <p className="mt-2 mb-0 text-xs text-nb-ink-mid">Nothing goes on your page until you press Save &amp; Go Live.</p>
    </section>
  );
}
