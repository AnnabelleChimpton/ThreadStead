import React, { useState, useRef, useCallback, useEffect } from 'react';
import FloatingToolbar from './visual-builder/FloatingToolbar';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

export interface HeadingProps extends UniversalCSSProps {
  content?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  children?: React.ReactNode;
  // Legacy text CSS properties (kept for backward compatibility) - renamed to avoid conflicts
  headingBackgroundColor?: string;
  headingBackgroundcolor?: string; // Legacy lowercase version
  headingFontSize?: string;
  headingFontFamily?: string;
  headingFontWeight?: string | number;
  headingTextAlign?: 'left' | 'center' | 'right' | 'justify';
  headingTextColor?: string;
  headingLineHeight?: string | number;
  headingTextDecoration?: string;
  headingFontStyle?: string;
  headingTextTransform?: string;
  headingLetterSpacing?: string;
  // Internal props for visual builder
  _positioningMode?: 'absolute' | 'grid';
  _size?: { width: string; height: string };
  // Inline editing props
  _isInVisualBuilder?: boolean;
  _onContentChange?: (content: string) => void;
}

/**
 * Heading component for the visual builder
 * Provides semantic heading elements (h1-h6) with editable content
 * Supports inline editing when in visual builder mode
 */
export default function Heading(props: HeadingProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    content,
    level = 2,
    className,
    children,
    headingBackgroundColor,
    headingBackgroundcolor,
    headingFontSize,
    headingFontFamily,
    headingFontWeight,
    headingTextAlign,
    headingTextColor,
    headingLineHeight,
    headingTextDecoration,
    headingFontStyle,
    headingTextTransform,
    headingLetterSpacing,
    _positioningMode,
    _size,
    _isInVisualBuilder = false,
    _onContentChange
  } = componentProps;

  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(content);
  const editRef = useRef<HTMLHeadingElement>(null);

  // Apply height-aware pattern for absolute positioning
  const isAbsolutePositioned = _positioningMode === 'absolute';

  // Update editing content when prop changes
  useEffect(() => {
    // Use children as text if available, otherwise use content
    const displayText = children !== undefined ?
      (typeof children === 'string' ? children : '') :
      (content || '');
    setEditingContent(displayText);
  }, [content, children]);

  // Handle double-click to start editing (only in visual builder)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (_isInVisualBuilder && !isEditing) {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(true);
    }
  }, [_isInVisualBuilder, isEditing]);

  // Handle ending edit mode
  const handleEndEdit = useCallback(() => {
    if (isEditing && editRef.current) {
      setIsEditing(false);

      // Get the actual content from the DOM element
      const currentContent = editRef.current.textContent || '';
      const cleanContent = currentContent.trim();
      const finalContent = cleanContent || 'Heading Text'; // Fallback to default if empty

      // Get the current display text for comparison
      const currentDisplayText = children !== undefined ?
        (typeof children === 'string' ? children : '') :
        (content || '');

      if (_onContentChange && finalContent !== currentDisplayText) {
        _onContentChange(finalContent);
      }

      // Update local state to match what was saved
      setEditingContent(finalContent);
    }
  }, [isEditing, content, children, _onContentChange]);

  // Handle key events during editing
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent all key events from bubbling up when editing to avoid component deletion
    if (isEditing) {
      e.stopPropagation();
    }

    if (e.key === 'Escape') {
      // Reset to original content (children or content)
      const originalText = children !== undefined ?
        (typeof children === 'string' ? children : '') :
        (content || '');
      setEditingContent(originalText);
      setIsEditing(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEndEdit();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      // Allow backspace/delete but prevent bubbling to avoid component deletion
      e.stopPropagation();
    }
  }, [content, handleEndEdit, isEditing]);

  // Handle input changes (removed to prevent backwards typing)
  // Now we let the browser handle contentEditable natively

  // Handle text formatting
  const handleFormat = useCallback((formatType: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link') => {
    if (!isEditing || !editRef.current) return;

    // Apply formatting using document.execCommand (for basic formatting)
    try {
      document.execCommand(formatType, false, undefined);
      // Update the content after formatting
      setEditingContent(editRef.current.innerHTML || '');
    } catch (error) {
      console.warn('Formatting not supported:', formatType, error);
    }
  }, [isEditing]);

  // Focus the element when entering edit mode
  useEffect(() => {
    if (isEditing && editRef.current) {
      // Small delay to ensure the contentEditable is active
      setTimeout(() => {
        try {
          // Check if element still exists and is connected to DOM
          if (editRef.current && document.contains(editRef.current)) {
            editRef.current.focus();

            // Safe selection manipulation
            const selection = window.getSelection();
            if (selection && editRef.current.isConnected) {
              const range = document.createRange();
              range.selectNodeContents(editRef.current);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        } catch (error) {
          console.warn('Text selection failed:', error);
          // Fallback: just focus without selection
          if (editRef.current && document.contains(editRef.current)) {
            editRef.current.focus();
          }
        }
      }, 10);
    }
  }, [isEditing]);

  // FIXED: Only use Tailwind classes that don't conflict with CSS props
  const hasUserFontSize = cssProps.fontSize || headingFontSize;
  const hasUserFontWeight = cssProps.fontWeight || headingFontWeight;

  // Default heading styles (only applied if user hasn't set custom styles)
  const defaultHeadingStyles = !hasUserFontSize && !hasUserFontWeight ? {
    1: 'text-4xl font-bold',
    2: 'text-3xl font-bold',
    3: 'text-2xl font-semibold',
    4: 'text-xl font-semibold',
    5: 'text-lg font-medium',
    6: 'text-base font-medium',
  } : {
    // When user has custom font styles, only use non-conflicting classes
    1: '', 2: '', 3: '', 4: '', 5: '', 6: ''
  };

  const baseClasses = [
    defaultHeadingStyles[level], // Only if no user font styles
    'break-words', // Ensure text wrapping at word boundaries
    'hyphens-auto', // Enable automatic hyphenation
    isAbsolutePositioned && _size ? 'h-full flex items-center justify-start' : '',
    // REMOVED outline classes that conflict with CSS outline - use inline styles instead
    _isInVisualBuilder && !isEditing ? 'hover:ring-1 hover:ring-gray-300 cursor-pointer' : '',
  ].filter(Boolean).join(' ');

  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);

  const classes = className
    ? `${filteredClasses} ${className}`
    : filteredClasses;

  // FIXED: Merge styles with proper priority - user CSS properties come LAST
  const componentStyle: React.CSSProperties = {
    // Base positioning and size styles first (lowest priority)
    ...(isAbsolutePositioned && _size ? {
      width: _size.width,
      height: _size.height,
    } : {}),

    // Non-conflicting Visual Builder base styles (don't override user CSS)
    ...(_isInVisualBuilder ? {
      minHeight: '1.5em',
      minWidth: '80px',
    } : {}),

    // Consistent text wrapping behavior (non-conflicting)
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    overflowX: 'hidden',

    // Legacy text CSS properties (backward compatibility)
    ...(headingBackgroundColor || headingBackgroundcolor ? { backgroundColor: headingBackgroundColor || headingBackgroundcolor } : {}),
    ...(headingFontSize ? { fontSize: headingFontSize } : {}),
    ...(headingFontFamily ? { fontFamily: headingFontFamily } : {}),
    ...(headingFontWeight ? { fontWeight: headingFontWeight } : {}),
    ...(headingTextAlign ? { textAlign: headingTextAlign as React.CSSProperties['textAlign'] } : {}),
    ...(headingTextColor ? { color: headingTextColor } : {}),
    ...(headingLineHeight ? { lineHeight: headingLineHeight } : {}),
    ...(headingTextDecoration ? { textDecoration: headingTextDecoration as React.CSSProperties['textDecoration'] } : {}),
    ...(headingFontStyle ? { fontStyle: headingFontStyle as React.CSSProperties['fontStyle'] } : {}),
    ...(headingTextTransform ? { textTransform: headingTextTransform as React.CSSProperties['textTransform'] } : {}),
    ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}),

    // Only non-conflicting editing indicators (don't override user CSS)
    ...(isEditing ? {
      outline: '2px solid #3b82f6',
      outlineOffset: '2px',
    } : {}),
  };

  // Merge with UniversalCSSProps (CSS props win)
  const finalStyle = { ...componentStyle, ...applyCSSProps(cssProps) };

  // Create the heading element dynamically based on level
  const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <>
      {React.createElement(
        HeadingTag,
        {
          ref: editRef,
          className: classes,
          style: finalStyle,
          contentEditable: _isInVisualBuilder && isEditing,
          suppressContentEditableWarning: true,
          onDoubleClick: handleDoubleClick,
          onBlur: isEditing ? handleEndEdit : undefined,
          onKeyDown: isEditing ? handleKeyDown : undefined,
          onInput: undefined
        },
        (() => {
          // Handle children vs content priority with validation
          if (children !== undefined) {
            // If children is a string, use it
            if (typeof children === 'string') {
              return children;
            }
            // If children is an array with valid content, use it
            if (Array.isArray(children) && children.length > 0 && children.some(child => child !== undefined && child !== false && child !== null)) {
              return children;
            }
            // If children is invalid (empty array, array of undefined/false), fall back to content
          }
          // Use content prop or fallback
          return content || (_isInVisualBuilder ? 'Heading Text' : '');
        })()
      )}

      {/* Floating toolbar for formatting */}
      {_isInVisualBuilder && isEditing && (
        <FloatingToolbar
          visible={isEditing}
          targetElement={editRef.current}
          onFormat={handleFormat}
        />
      )}
    </>
  );
}