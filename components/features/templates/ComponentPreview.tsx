import React, { useEffect, useState } from 'react';
import AdvancedProfileRenderer from '@/components/core/profile/AdvancedProfileRenderer';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { isPageArtifact, renderArtifact } from '@/lib/templates/rendering/page-artifact';
import type { PageForRender } from '@/lib/templates/rendering/page-artifact';

// Each example compiled once a visit
const compiled = new Map<string, Promise<PageForRender | null>>();

/** An example compiled as a page would be (the editor's compile route), as its owner sees it */
function compileExample(example: string): Promise<PageForRender | null> {
  let page = compiled.get(example);
  if (!page) {
    page = csrfFetch('/api/templates/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: example }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => (isPageArtifact(result?.artifact) ? renderArtifact(result.artifact, { isOwner: true }) : null))
      .catch(() => null);
    compiled.set(example, page);
    // A failure isn't remembered: the next look tries again
    page.then((result) => { if (!result) compiled.delete(example); });
  }
  return page;
}

/**
 * The palette's look at a component: its example running for real, with
 * your own page's data, the way the lesson pages run theirs
 * (components/features/lessons/LessonExample.tsx). Loaded when you pick a
 * component, so the editor carries none of it until then.
 */
export default function ComponentPreview({ example, residentData }: { example: string; residentData: ResidentData }) {
  const [page, setPage] = useState<PageForRender | null | 'failed'>(null);
  useEffect(() => {
    let current = true;
    setPage(null);
    compileExample(example).then((result) => { if (current) setPage(result ?? 'failed'); });
    return () => { current = false; };
  }, [example]);

  if (page === null) return <p className="m-0 text-xs text-nb-ink-mid">Getting it ready…</p>;
  if (page === 'failed') return <p className="m-0 text-xs text-nb-ink-mid">I couldn&apos;t show this one here. Put it in and look at the preview.</p>;
  return (
    <AdvancedProfileRenderer
      user={{ id: 'component-preview', handle: residentData.owner.handle, profile: { templateMode: 'advanced', cssMode: 'inherit', compiledTemplate: page } }}
      residentData={residentData}
    />
  );
}
