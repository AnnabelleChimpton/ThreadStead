/**
 * Paragraph - Web Standards Edition
 *
 * This is the new version of Paragraph that follows web standards
 * and demonstrates clean content/children handling without internal prop pollution.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StandardComponentProps,
  TextContentProps,
  separateSystemProps,
} from '@/lib/templates/core/standard-component-interface';
import { useCSSNativeStyles } from '@/lib/templates/styling/css-native-styling';
import { withMigrationSupport } from '@/lib/templates/core/migration-utilities';

/**
 * Standard Paragraph props - follows HTML <p> element patterns
 */
export interface ParagraphProps extends TextContentProps {
  // Content can be provided via children (React way) or content prop (for templates)
  content?: string; // Alternative to children for template systems

  // Standard HTML paragraph attributes
  cite?: string; // For quotes/citations

  // Editing capabilities (when in visual builder)
  editable?: boolean; // Public prop to enable editing
  onContentChange?: (content: string) => void; // Public callback for content changes

  // Text-specific styling (convenience props that map to CSS)
  textIndent?: string;
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';
  wordBreak?: 'normal' | 'break-all' | 'keep-all' | 'break-word';
  overflowWrap?: 'normal' | 'break-word' | 'anywhere';
}

/**
 * New Paragraph implementation using web standards
 */
function ParagraphNew({
  // Content props
  content,
  children,
  placeholder = 'Enter text here...',

  // Editing props
  editable = false,
  onContentChange,

  // Text styling props
  textIndent,
  whiteSpace = 'normal',
  wordBreak = 'normal',
  overflowWrap = 'break-word',

  // Standard props
  className = '',
  cite,

  ...rest
}: ParagraphProps) {
  // Separate system props from public props
  const { publicProps, systemProps } = separateSystemProps(rest);

  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const textRef = useRef<HTMLParagraphElement>(null);

  // Determine if we're in visual builder mode
  const isInVisualBuilder = systemProps?.isInVisualBuilder || false;
  const canEdit = editable || isInVisualBuilder;

  // Get current content from props
  const currentContent = children
    ? (typeof children === 'string' ? children : '')
    : (content || '');

  // Build styles using CSS-native system
  const baseStyles = useCSSNativeStyles({
    // Default paragraph styling
    lineHeight: '1.6',
    marginBottom: '1em',

    // Text-specific styling
    textIndent,
    whiteSpace,
    wordBreak,
    overflowWrap,

    // Apply all other CSS props
    ...publicProps,
  });

  // Visual builder specific styles
  const visualBuilderStyles = isInVisualBuilder
    ? {
        minHeight: '1.5em',
        minWidth: '8rem',
        cursor: canEdit ? 'text' : 'default',
        outline: systemProps?.isSelected ? '2px solid #3b82f6' : 'none',
        backgroundColor: systemProps?.isHovered ? '#f8fafc' : undefined,
      }
    : {};

  // Editing styles
  const editingStyles = isEditing
    ? {
        outline: '2px solid #10b981',
        backgroundColor: '#f0fff4',
        cursor: 'text',
      }
    : {};

  const finalStyles = {
    ...baseStyles,
    ...visualBuilderStyles,
    ...editingStyles,
  };

  // Handle double-click to start editing
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (canEdit && !isEditing) {
      e.preventDefault();
      e.stopPropagation();
      setEditingContent(currentContent);
      setIsEditing(true);
    }
  }, [canEdit, isEditing, currentContent]);

  // Handle content changes during editing
  const handleInput = useCallback((e: React.FormEvent<HTMLParagraphElement>) => {
    const newContent = e.currentTarget.textContent || '';
    setEditingContent(newContent);
  }, []);

  // Handle ending edit mode
  const handleBlur = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);

      // Call content change callbacks
      const finalContent = editingContent.trim() || placeholder;

      if (onContentChange) {
        onContentChange(finalContent);
      }

      if (systemProps?.onContentChange) {
        systemProps.onContentChange(finalContent);
      }
    }
  }, [isEditing, editingContent, placeholder, onContentChange, systemProps]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isEditing) {
      e.stopPropagation(); // Prevent visual builder shortcuts

      if (e.key === 'Escape') {
        setEditingContent(currentContent);
        setIsEditing(false);
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleBlur();
      }
    }
  }, [isEditing, currentContent, handleBlur]);

  // Focus when entering edit mode
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();

      // Select all text
      const selection = window.getSelection();
      if (selection) {
        selection.selectAllChildren(textRef.current);
      }
    }
  }, [isEditing]);

  // Determine what content to display
  const displayContent = isEditing
    ? editingContent
    : currentContent || (isInVisualBuilder ? placeholder : '');

  // Clean props for DOM
  const domProps = {
    ref: textRef,
    className,
    style: finalStyles,

    // HTML attributes
    cite,
    title: publicProps.title,
    id: publicProps.id,
    role: publicProps.role,
    'aria-label': publicProps['aria-label'],
    'aria-labelledby': publicProps['aria-labelledby'],
    'aria-describedby': publicProps['aria-describedby'],

    // Editing attributes
    contentEditable: isEditing,
    suppressContentEditableWarning: true,

    // Event handlers
    onDoubleClick: handleDoubleClick,
    onInput: isEditing ? handleInput : undefined,
    onBlur: isEditing ? handleBlur : undefined,
    onKeyDown: isEditing ? handleKeyDown : undefined,
  };

  return <p {...domProps}>{displayContent}</p>;
}

/**
 * Enhanced Paragraph with backward compatibility
 */
const Paragraph = withMigrationSupport(ParagraphNew, 'Paragraph');

export default Paragraph;

/**
 * Usage Examples:
 *
 * // Standard React way (web developers understand this!)
 * <Paragraph>This is a simple paragraph.</Paragraph>
 *
 * // With standard CSS styling
 * <Paragraph
 *   color="#374151"
 *   fontSize="1.125rem"
 *   lineHeight="1.8"
 *   textAlign="center"
 * >
 *   Styled paragraph text
 * </Paragraph>
 *
 * // Template system way (using content prop)
 * <Paragraph
 *   content="Dynamic content from template"
 *   backgroundColor="#f9fafb"
 *   padding="1rem"
 * />
 *
 * // Editable paragraph with callback
 * <Paragraph
 *   editable={true}
 *   onContentChange={(newContent) => console.log('Content changed:', newContent)}
 * >
 *   Click to edit this text
 * </Paragraph>
 *
 * // Advanced styling with CSS
 * <Paragraph
 *   css={{
 *     background: 'linear-gradient(45deg, #667eea, #764ba2)',
 *     WebkitBackgroundClip: 'text',
 *     WebkitTextFillColor: 'transparent',
 *     fontSize: '2rem',
 *     fontWeight: 'bold'
 *   }}
 * >
 *   Gradient text effect
 * </Paragraph>
 */