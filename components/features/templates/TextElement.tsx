import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import FloatingToolbar from './visual-builder/FloatingToolbar';

export interface TextElementProps {
  content?: string;
  tag?: 'div' | 'span' | 'p';
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  // Background CSS properties
  backgroundColor?: string;
  backgroundcolor?: string; // Legacy lowercase version
  // Text CSS properties (passed as flat props, will be merged into style)
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string;
  lineHeight?: string | number;
  textDecoration?: string;
  fontStyle?: string;
  textTransform?: string;
  letterSpacing?: string;
  // Internal props for visual builder
  _positioningMode?: 'absolute' | 'grid';
  _size?: { width: string; height: string };
  // Inline editing props
  _isInVisualBuilder?: boolean;
  _onContentChange?: (content: string) => void;
}

/**
 * Basic text element component for the visual builder
 * Provides editable text content that can be placed anywhere
 * Supports inline editing when in visual builder mode
 */
export default function TextElement({
  content,
  tag = 'div',
  style,
  className = '',
  children,
  backgroundColor,  // Explicitly destructure to prevent it from being in ...rest
  backgroundcolor,  // Legacy lowercase version
  // Text CSS properties (destructure to merge into style)
  fontSize,
  fontFamily,
  fontWeight,
  textAlign,
  textColor,
  lineHeight,
  textDecoration,
  fontStyle,
  textTransform,
  letterSpacing,
  _positioningMode,
  _size,
  _isInVisualBuilder = false,
  _onContentChange,
  ...rest
}: TextElementProps) {

  // CRITICAL FIX: If backgroundColor wasn't in style but was passed as a prop, add it to style
  // This handles cases where CSS extraction in CanvasRenderer didn't work
  const normalizedBackgroundColor = backgroundColor || backgroundcolor;
  if (normalizedBackgroundColor && !style?.backgroundColor) {
    style = { ...style, backgroundColor: normalizedBackgroundColor };
  }

  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(content);
  const editRef = useRef<any>(null);

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
      const finalContent = cleanContent || 'Edit this text'; // Fallback to default if empty

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

  // FIXED: Build classes without conflicting outline styles
  const classes = [
    'break-words', // Ensure text wrapping at word boundaries
    'hyphens-auto', // Enable automatic hyphenation
    className,
    isAbsolutePositioned && _size ? 'h-full flex items-center justify-start' : '',
    // REMOVED outline classes that conflict with CSS outline - use inline styles instead
    _isInVisualBuilder && !isEditing ? 'hover:ring-1 hover:ring-gray-300 cursor-pointer' : '',
  ].filter(Boolean).join(' ');

  // FIXED: Merge styles with proper priority - user CSS properties come LAST
  const finalStyle: React.CSSProperties = {
    // Base positioning and size styles first (lowest priority)
    ...(isAbsolutePositioned && _size ? {
      width: _size.width,
      height: _size.height,
    } : {}),

    // Non-conflicting Visual Builder base styles (don't override user CSS)
    ...(_isInVisualBuilder ? {
      minHeight: '1.5em',
      minWidth: '60px',
      // REMOVED padding: '4px' - was overriding user CSS padding!
    } : {}),

    // Consistent text wrapping behavior (non-conflicting)
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    overflowX: 'hidden',

    // TEXT CSS PROPERTIES from flat props (merge before style prop)
    ...(fontSize ? { fontSize } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontWeight ? { fontWeight } : {}),
    ...(textAlign ? { textAlign: textAlign as React.CSSProperties['textAlign'] } : {}),
    ...(textColor ? { color: textColor } : {}), // textColor maps to 'color' CSS property
    ...(lineHeight ? { lineHeight } : {}),
    ...(textDecoration ? { textDecoration: textDecoration as React.CSSProperties['textDecoration'] } : {}),
    ...(fontStyle ? { fontStyle: fontStyle as React.CSSProperties['fontStyle'] } : {}),
    ...(textTransform ? { textTransform: textTransform as React.CSSProperties['textTransform'] } : {}),
    ...(letterSpacing ? { letterSpacing } : {}),

    // USER CSS PROPERTIES COME LAST (highest priority)
    // Inline styles automatically have higher specificity than CSS classes,
    // so we don't need !important (which doesn't work in React inline styles anyway)
    ...style,

    // Only non-conflicting editing indicators (don't override user CSS)
    ...(isEditing ? {
      outline: '2px solid #3b82f6',
      outlineOffset: '2px',
    } : {}),
  };

  // Debug logging for WYSIWYG validation
  const getContentLength = () => {
    if (content && typeof content === 'string') return content.length;
    if (children && typeof children === 'string') return children.length;
    if (typeof children === 'number') return children.toString().length;
    return 0;
  };

  // Create the element dynamically based on tag prop
  const ElementTag = tag;

  return (
    <>
      <ElementTag
        ref={editRef}
        className={classes}
        style={finalStyle}
        contentEditable={_isInVisualBuilder && isEditing}
        suppressContentEditableWarning={true}
        onDoubleClick={handleDoubleClick}
        onBlur={isEditing ? handleEndEdit : undefined}
        onKeyDown={isEditing ? handleKeyDown : undefined}
        onInput={undefined}
        {...rest}
      >
        {(() => {
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
          return content || (_isInVisualBuilder ? 'Edit this text' : '');
        })()}
      </ElementTag>

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