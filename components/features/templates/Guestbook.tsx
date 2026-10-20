import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import { componentHeading } from './component-heading';
import OriginalGuestbook from '../../shared/Guestbook';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

interface GuestbookProps extends UniversalCSSProps {
  className?: string;
  heading?: string;
}

export default function Guestbook(props: GuestbookProps) {
  // Separate CSS properties from component-specific properties
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className, heading } = componentProps;

  const { owner } = useResidentData();

  // Apply CSS properties as inline styles to wrapper
  const style = applyCSSProps(cssProps);

  return (
    <div style={style} className={className}>
      <OriginalGuestbook username={owner?.handle || ''} heading={componentHeading(heading, 'Guestbook')} />
    </div>
  );
}