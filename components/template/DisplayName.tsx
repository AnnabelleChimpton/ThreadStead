import React from 'react';
import { useResidentData } from './ResidentDataProvider';

export default function DisplayName() {
  const { owner } = useResidentData();
  
  return (
    <h2 className="ts-profile-display-name thread-headline text-3xl font-bold text-thread-pine mb-1" style={{fontSize: '24px', fontWeight: 'bold', color: 'darkgreen', margin: '8px 0'}}>
      Display Name: {owner.displayName}
    </h2>
  );
}