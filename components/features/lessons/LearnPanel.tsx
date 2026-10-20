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
 * Save, like any other edit.
 */
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
  useEffect(() => {
    setResult(null);
    setAnswered(null);
  }, [slug, stepNumber]);

  if (!lesson) return null;
  const index = Math.min(Math.max(stepNumber, 1), lesson.steps.length) - 1;
  const step = lesson.steps[index];
  const last = index === lesson.steps.length - 1;
  const after = nextLesson(lesson.slug);

  return (
    <section aria-label="Lesson" className="mb-4 border-2 border-thread-sage bg-thread-paper p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="thread-label m-0">
          {lesson.title}: step {index + 1} of {lesson.steps.length}
        </p>
        <button type="button" className="ts-bare text-sm underline text-nb-ink" onClick={onClose}>
          Close the lesson
        </button>
      </div>
      <h3 className="text-lg font-semibold text-nb-ink mt-1 mb-2">{step.title}</h3>
      <div
        className="thread-content text-sm text-nb-ink"
        dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(autoLinkComponents(step.body)) }}
      />

      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" onClick={() => { setAnswered(null); setResult(checkStep(step.checks, page)); }}>
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
