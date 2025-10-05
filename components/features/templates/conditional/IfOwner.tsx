'use client';

import React from 'react';
import { useResidentData } from '../ResidentDataProvider';

interface IfOwnerProps {
  children: React.ReactNode;
}

interface IfVisitorProps {
  children: React.ReactNode;
}

export function IfOwner({ children }: IfOwnerProps) {
  const residentData = useResidentData();

  // Show content if viewer is the owner
  const isOwner = residentData.viewer.id === residentData.owner.id;

  return isOwner ? <>{children}</> : null;
}

export function IfVisitor({ children }: IfVisitorProps) {
  const residentData = useResidentData();

  // Show content if viewer is NOT the owner
  const isVisitor = residentData.viewer.id !== residentData.owner.id;

  return isVisitor ? <>{children}</> : null;
}

export default IfOwner;