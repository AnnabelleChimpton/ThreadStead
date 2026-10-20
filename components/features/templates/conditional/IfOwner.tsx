'use client';

import React from 'react';
import { useResidentData, type ResidentData } from '../ResidentDataProvider';

/**
 * Whether the viewer is the page's owner. The profile page's
 * getServerSideProps decides IfOwner / IfVisitor with this too (it leaves
 * the other side's content out of what it sends), so keep the one test here.
 */
export function viewerIsOwner(data: Pick<ResidentData, 'viewer' | 'owner'>): boolean {
  return data.viewer.id === data.owner.id;
}

interface IfOwnerProps {
  children: React.ReactNode;
}

interface IfVisitorProps {
  children: React.ReactNode;
}

export function IfOwner({ children }: IfOwnerProps) {
  const residentData = useResidentData();

  return viewerIsOwner(residentData) ? <>{children}</> : null;
}

export function IfVisitor({ children }: IfVisitorProps) {
  const residentData = useResidentData();

  return viewerIsOwner(residentData) ? null : <>{children}</>;
}

export default IfOwner;