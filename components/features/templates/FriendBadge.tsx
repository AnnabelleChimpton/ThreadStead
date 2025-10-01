import React from "react";
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface FriendBadgeProps extends UniversalCSSProps {
  className?: string;
}

export default function FriendBadge(props: FriendBadgeProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;

  const baseClasses = "inline-flex items-center gap-1 bg-green-200 border border-black px-2 py-0.5 text-xs font-bold shadow-[2px_2px_0_#000] rounded";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const badgeClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  return (
    <span className={badgeClassName} style={style}>
      <span>🤝</span> Friend
    </span>
  );
}