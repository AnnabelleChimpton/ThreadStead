import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import OriginalFollowButton from '../../core/social/FollowButton';

export default function Guestbook() {
  const { owner } = useResidentData();

  return (
    <OriginalFollowButton username={owner.handle} />
  );
}