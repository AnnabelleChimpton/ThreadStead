import React from "react";
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface FriendBadgeProps extends UniversalCSSProps {
  className?: string;
}

export default function FriendBadge(props: FriendBadgeProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;
  const { viewer } = useResidentData();

  const baseClasses = "inline-flex items-center gap-1 bg-green-200 border border-black px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_#000] rounded";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const badgeClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  // Only true friends (they follow each other) see it, never the owner or
  // a stranger.
  if (!viewer?.isFriend) return null;

  return (
    <span className={badgeClassName} style={style}>
      <PixelIcon name="users" /> Friend
    </span>
  );
}