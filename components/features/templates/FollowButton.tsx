import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import OriginalFollowButton from '../../core/social/FollowButton';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface FollowButtonProps extends UniversalCSSProps {
  className?: string;
}

export default function FollowButton(props: FollowButtonProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;
  const { owner } = useResidentData();

  // Apply CSS properties as inline styles to wrapper
  const style = applyCSSProps(cssProps);

  const baseClasses = 'follow-button-wrapper';
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);

  const wrapperClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  return (
    <div className={wrapperClassName} style={style}>
      <OriginalFollowButton username={owner.handle} />
    </div>
  );
}