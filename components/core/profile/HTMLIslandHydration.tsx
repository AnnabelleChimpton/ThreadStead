// A compiled page (or widget slot) with its components in place.
//
// With a page tree (built on the server from the stored artifact) it
// renders on the server and hydrates like any React page. With only the
// compiled HTML (the widget slot, a lesson's example) the browser parses it
// after mount into the same tree. Either way IslandPage renders it, and the
// component registry (PageWithComponents, every component's code) loads only
// for a page that has components.

import React from 'react';
import dynamic from 'next/dynamic';
import IslandPage from '@/lib/templates/rendering/IslandPage';
import { treeFromDom, type PageTreeNode } from '@/lib/templates/rendering/page-tree';
import type { StaticHTMLWithIslandsProps } from './types';

const PageWithComponents = dynamic(
  () => import(/* webpackChunkName: "template-runtime" */ '@/lib/templates/rendering/PageWithComponents')
);

export function StaticHTMLWithIslands({
  staticHTML,
  tree,
  islands,
  residentData,
}: StaticHTMLWithIslandsProps) {
  const [parsed, setParsed] = React.useState<PageTreeNode[] | null>(null);

  React.useEffect(() => {
    if (tree || staticHTML == null) return;
    const container = document.createElement('div');
    container.innerHTML = staticHTML;
    setParsed(treeFromDom(container));
  }, [tree, staticHTML]);

  // The page as written: the root around it (AdvancedProfileRenderer) has
  // the #profile-<id>. A second wrapper with the same id used to go inside,
  // so the id was there twice and `body > header` never found the page's
  // own top level (template audit 01 #21, 14 #6d).
  const page = tree ?? parsed;
  if (!page) return null;

  return islands.length > 0
    ? <PageWithComponents tree={page} islands={islands} residentData={residentData} />
    : <IslandPage tree={page} islands={islands} residentData={residentData} />;
}
