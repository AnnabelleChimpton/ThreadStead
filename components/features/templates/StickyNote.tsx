import React from "react";
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'] as const;
type NoteColor = (typeof NOTE_COLORS)[number];

// Dark ink, so the text reads on every note colour whatever the page's text
// colour is. A page picks another with --ts-note-ink (component-parts.ts).
const INK = 'var(--ts-note-ink, #3b2f1e)';

function isNoteColor(value: unknown): value is NoteColor {
  return NOTE_COLORS.includes(value as NoteColor);
}

interface StickyNoteProps extends UniversalCSSProps {
  noteColor?: NoteColor;
  size?: 'sm' | 'md' | 'lg';
  rotation?: number;
  children: React.ReactNode;
}

export default function StickyNote(props: StickyNoteProps) {
  const { cssProps: allCSSProps, componentProps } = separateCSSProps(props);

  // Templates write the note colour as `color`; it arrives as noteColor.
  // Pages saved before props reached components store it as `style.color`
  // instead, with no noteColor. For those, a note-colour name there still
  // means the note; anything else is the ink.
  const { color: cssColor, ...otherCSSProps } = allCSSProps;
  const colorFromTemplate =
    componentProps.noteColor === undefined && isNoteColor(cssColor) ? cssColor : undefined;
  const cssProps = colorFromTemplate ? otherCSSProps : allCSSProps;

  const {
    noteColor = colorFromTemplate ?? 'yellow',
    size = 'md',
    rotation = 0,
    children
  } = componentProps;

  const colorClasses = {
    'yellow': 'bg-yellow-200 border-yellow-300',
    'pink': 'bg-pink-200 border-pink-300',
    'blue': 'bg-blue-200 border-blue-300',
    'green': 'bg-green-200 border-green-300',
    'orange': 'bg-orange-200 border-orange-300',
    'purple': 'bg-purple-200 border-purple-300'
  }[noteColor];

  const sizeClasses = {
    'sm': 'w-32 h-32 p-3 text-xs',
    'md': 'w-48 h-48 p-4 text-sm',
    'lg': 'w-64 h-64 p-6 text-base'
  }[size];

  const baseContainerClasses = [
    'ts-sticky-note',
    'inline-block',
    colorClasses,
    sizeClasses,
    'border border-dashed shadow-md font-handwriting relative overflow-hidden'
  ].filter(Boolean).join(' ');

  const filteredClasses = removeTailwindConflicts(baseContainerClasses, cssProps);
  const appliedStyles = applyCSSProps(cssProps);

  // Merge component styles with CSS props (CSS props win)
  const mergedStyles = {
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center',
    color: INK,
    ...appliedStyles
  };

  return (
    <div
      className={filteredClasses}
      style={mergedStyles}
    >
      {/* Tape effect */}
      <div className="ts-sticky-note-tape absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-4 bg-white bg-opacity-70 border border-gray-300 rounded-sm"></div>

      <div className="relative z-10 ">
        {children}
      </div>
    </div>
  );
}