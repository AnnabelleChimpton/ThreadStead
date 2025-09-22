import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import FloatingToolbar from './visual-builder/FloatingToolbar';

export interface TextElementProps {
  content?: string;
  tag?: 'div' | 'span' | 'p';
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
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
  _positioningMode,
  _size,
  _isInVisualBuilder = false,
  _onContentChange,
  ...rest
}: TextElementProps) {

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

  // Build classes with consistent text wrapping
  const classes = [
    'break-words', // Ensure text wrapping at word boundaries
    'hyphens-auto', // Enable automatic hyphenation
    className,
    isAbsolutePositioned && _size ? 'h-full flex items-center justify-start' : '',
    // Add editing indicators
    _isInVisualBuilder && isEditing ? 'outline outline-2 outline-blue-500 bg-blue-50' : '',
    _isInVisualBuilder && !isEditing ? 'hover:outline hover:outline-1 hover:outline-gray-300 cursor-pointer' : '',
  ].filter(Boolean).join(' ');

  // Merge styles with consistent text wrapping behavior
  const finalStyle: React.CSSProperties = {
    ...style,
    // Apply custom size if in absolute positioning mode
    ...(isAbsolutePositioned && _size ? {
      width: _size.width,
      height: _size.height,
    } : {}),
    // Add minimum styling for visual builder
    ...(_isInVisualBuilder ? {
      minHeight: '1.5em',
      minWidth: '60px',
      padding: '4px',
    } : {}),
    // Add editing styles
    ...(isEditing ? {
      minHeight: '1.5em', // Ensure minimum height when editing
    } : {}),
    // CRITICAL: Ensure consistent text wrapping behavior across both contexts
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    // Prevent text from overflowing horizontally
    overflowX: 'hidden',
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