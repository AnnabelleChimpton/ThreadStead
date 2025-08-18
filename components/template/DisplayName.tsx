import React from 'react';
import { useResidentData } from './ResidentDataProvider';

interface DisplayNameProps {
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  showLabel?: boolean;
}

export default function DisplayName({ as = 'h2', showLabel = false }: DisplayNameProps) {
  const { owner } = useResidentData();
  
  const className = "ts-profile-display-name thread-headline text-3xl font-bold text-thread-pine mb-1";
  const style = { fontSize: '24px', fontWeight: 'bold', color: 'darkgreen', margin: '8px 0' };
  const content = showLabel ? `Display Name: ${owner.displayName}` : owner.displayName;
  
  const Element = as;
  
  return (
    <Element className={className} style={style}>
      {content}
    </Element>
  );
}