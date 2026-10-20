import React, { useState } from 'react';
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer';
import Button from '@/components/ui/Button';
import type { PageTreeNode } from '@/lib/templates/rendering/page-tree';
import type { Island } from '@/lib/templates/compilation/compiler';
import { LESSON_SAMPLE_DATA } from '@/lib/templates-docs/lesson-sample-data';

/** A step's code, compiled on the server (pages/build/html/[slug].tsx) */
export interface CompiledExample {
  tree: PageTreeNode[];
  islands: Island[];
}

/**
 * A lesson step's code running for real, under the code, when you ask for
 * it. One at a time on purpose: page variables share one store, so two
 * examples that both make a "mood" would trip over each other. The lesson
 * page keeps track of which one is open.
 */
export default function LessonExample({ example, open, onToggle, stepId }: {
  example: CompiledExample;
  open: boolean;
  onToggle: () => void;
  stepId: string;
}) {
  const [run, setRun] = useState(0);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onToggle} aria-expanded={open} aria-controls={`example-${stepId}`}>
          {open ? 'Close it' : 'Run it here'}
        </Button>
        {open && (
          <Button variant="secondary" size="sm" onClick={() => setRun((n) => n + 1)}>
            Start it again
          </Button>
        )}
      </div>
      {open && (
        <div id={`example-${stepId}`} className="lesson-example mt-2 p-4 border-2 border-dashed border-thread-sage bg-white">
          <AdvancedProfileRenderer
            key={run}
            user={{ id: 'lesson-pat', handle: 'pat', profile: { templateMode: 'advanced', cssMode: 'inherit', compiledTemplate: example } }}
            residentData={LESSON_SAMPLE_DATA}
          />
        </div>
      )}
    </div>
  );
}
