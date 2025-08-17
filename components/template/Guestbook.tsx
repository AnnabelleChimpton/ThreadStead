import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import OriginalGuestbook from '../Guestbook';

export default function Guestbook() {
  const { owner } = useResidentData();

  return (
    <OriginalGuestbook username={owner.handle} />
  );
}