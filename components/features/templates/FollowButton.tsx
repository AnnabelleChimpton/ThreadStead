import React from 'react';
import { useResidentData } from './ResidentDataProvider';
import OriginalFollowButton from '../../core/social/FollowButton';
import { PreviewAsVisitor } from './preview-as-visitor';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface FollowButtonProps extends UniversalCSSProps {
  className?: string;
}

export default function FollowButton(props: FollowButtonProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;
  const { owner } = useResidentData();
  // The editor's "As a visitor" preview: the signed-out button, not the owner's nothing
  const asVisitor = React.useContext(PreviewAsVisitor);

  // Apply CSS properties as inline styles to wrapper
  const style = applyCSSProps(cssProps);

  const baseClasses = 'follow-button-wrapper';
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);

  const wrapperClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  return (
    <div className={wrapperClassName} style={style}>
      <OriginalFollowButton username={owner.handle} asVisitor={asVisitor} />
    </div>
  );
}