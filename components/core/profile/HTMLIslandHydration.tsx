// A compiled page (or widget slot) with its components in place.
//
// With a page tree (built on the server from the stored compile result) it
// renders on the server and hydrates like any React page. With only the
// compiled HTML (the editor's live preview, the widget slot) the browser
// parses it after mount into the same tree. Either way IslandPage renders it.

import React from 'react';
import IslandPage from '@/lib/templates/rendering/IslandPage';
import { treeFromDom, withProfileRoot, type PageTreeNode } from '@/lib/templates/rendering/page-tree';
import type { StaticHTMLWithIslandsProps } from './types';

export function StaticHTMLWithIslands({
  staticHTML,
  tree,
  islands,
  residentData,
  profileId,
}: StaticHTMLWithIslandsProps) {
  const [parsed, setParsed] = React.useState<PageTreeNode[] | null>(null);

  React.useEffect(() => {
    if (tree || staticHTML == null) return;
    const container = document.createElement('div');
    container.innerHTML = staticHTML;
    setParsed(treeFromDom(container));
  }, [tree, staticHTML]);

  const source = tree ?? parsed;
  const page = React.useMemo(
    () => (source && profileId ? withProfileRoot(source, profileId) : source),
    [source, profileId]
  );
  if (!page) return null;

  return <IslandPage tree={page} islands={islands} residentData={residentData} />;
}
