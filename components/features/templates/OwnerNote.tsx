import React from 'react';

/**
 * What the owner sees where a component has nothing to show yet, with where
 * to set it up. Visitors see nothing there: the component returns null for
 * them, so a new page never shows boxes that say there's nothing. Each
 * component keeps its own class names on it, for pages that style them.
 */
export default function OwnerNote({ className, style, children }: {
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <p className={`${className} text-sm text-thread-sage border border-dashed border-thread-sage/60 rounded p-2`} style={style}>
      {children} Only you see this note.
    </p>
  );
}
