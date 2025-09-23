/**
 * StyleControls Component
 * Phase 1: Basic component-level styling controls
 * Phase 2: CSS Validation Layer
 *
 * Provides simple UI controls for basic CSS properties:
 * - Text color
 * - Background color
 * - Font size
 * - Font weight
 * - Text alignment
 *
 * Enhanced with CSS validation and security features
 */

import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { validateCSSProperty, type ValidationResult } from '@/lib/templates/visual-builder/css-validator';
import ValidationFeedback, { ValidationIndicator, getValidationBorderColor } from './ValidationFeedback';

interface StyleControlsProps {
  // Current styles (from component.props.style)
  styles?: React.CSSProperties;

  // Callback when styles change
  onStyleChange: (styles: React.CSSProperties) => void;

  // Optional className for styling
  className?: string;
}

// Predefined font sizes for dropdown
const FONT_SIZES = [
  { value: '12px', label: '12px - Small' },
  { value: '14px', label: '14px - Default' },
  { value: '16px', label: '16px - Medium' },
  { value: '18px', label: '18px - Large' },
  { value: '20px', label: '20px - X-Large' },
  { value: '24px', label: '24px - XX-Large' },
];

// Font weight options
const FONT_WEIGHTS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
];

// Text alignment options
const TEXT_ALIGNS: Array<{ value: 'left' | 'center' | 'right' | 'justify'; icon: string; label: string }> = [
  { value: 'left', icon: '◀', label: 'Left' },
  { value: 'center', icon: '■', label: 'Center' },
  { value: 'right', icon: '▶', label: 'Right' },
  { value: 'justify', icon: '☰', label: 'Justify' },
];

const StyleControls = React.memo(function StyleControls({
  styles = {},
  onStyleChange,
  className = ''
}: StyleControlsProps) {

  // DOM refs for direct input management (no React state during typing)
  const colorInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // Validation results for feedback (only updated on blur)
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

  // Debounce timeout refs
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Store callback in ref to avoid stale closures but prevent re-renders
  const onStyleChangeRef = useRef(onStyleChange);
  onStyleChangeRef.current = onStyleChange;

  // Initialize input values once only (no prop watching to prevent re-renders)
  useEffect(() => {
    // Set initial values if inputs exist and are not focused
    if (colorInputRef.current && !colorInputRef.current.matches(':focus')) {
      colorInputRef.current.value = styles.color || '';
    }
    if (backgroundInputRef.current && !backgroundInputRef.current.matches(':focus')) {
      backgroundInputRef.current.value = styles.backgroundColor || '';
    }
  }, []); // Empty deps - only run once on mount

  // Validate and apply styles (called from timeout or blur)
  const validateAndApplyStyles = useCallback((property: string, value: string) => {
    // Validate the value
    const validation = validateCSSProperty(property, value);

    // Update validation state (this will cause a re-render, but only after typing stops)
    setValidationResults(prev => ({
      ...prev,
      [property]: validation
    }));

    // Apply valid styles to parent component
    if (validation.isValid && !validation.isDangerous) {
      const newStyles = {
        ...styles,
        [property]: validation.sanitizedValue ?? value
      };

      // Remove empty values
      if (!value || value === '') {
        delete newStyles[property as keyof React.CSSProperties];
      }

      onStyleChangeRef.current(newStyles);
    }
  }, [styles]);

  // Handle input changes during typing - NO validation, NO state updates
  const handleInputChange = useCallback((property: string, value: string) => {
    // Clear any existing timeout to prevent validation during typing
    if (timeoutRefs.current[property]) {
      clearTimeout(timeoutRefs.current[property]);
    }
    // Don't validate or apply styles during typing
  }, []);

  // Handle blur events (apply immediately)
  const handleInputBlur = useCallback((property: string, value: string) => {
    // Clear any pending timeout
    if (timeoutRefs.current[property]) {
      clearTimeout(timeoutRefs.current[property]);
    }

    // Apply immediately on blur
    validateAndApplyStyles(property, value);
  }, [validateAndApplyStyles]);

  // Handle non-text input changes (dropdowns, buttons) - apply immediately
  const handleImmediateStyleChange = useCallback((property: keyof React.CSSProperties, value: any) => {
    const validation = validateCSSProperty(property as string, String(value || ''));

    if (validation.isValid && !validation.isDangerous) {
      const newStyles = {
        ...styles,
        [property]: validation.sanitizedValue ?? value
      };

      // Remove undefined values
      Object.keys(newStyles).forEach(key => {
        if (newStyles[key as keyof React.CSSProperties] === undefined ||
            newStyles[key as keyof React.CSSProperties] === '') {
          delete newStyles[key as keyof React.CSSProperties];
        }
      });

      onStyleChangeRef.current(newStyles);
    }
  }, [styles]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  return (
    <div className={`style-controls ${className}`}>
      {/* Text Color */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px'
        }}>
          Text Color
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            defaultValue={styles.color || '#000000'}
            onBlur={(e) => {
              const value = e.target.value;
              // Update text input to match color picker
              if (colorInputRef.current) {
                colorInputRef.current.value = value;
              }
              handleInputBlur('color', value);
            }}
            style={{
              width: '40px',
              height: '32px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              padding: '2px'
            }}
          />
          <input
            ref={colorInputRef}
            type="text"
            defaultValue={styles.color || ''}
            onChange={(e) => handleInputChange('color', e.target.value)}
            onBlur={(e) => handleInputBlur('color', e.target.value)}
            onKeyDown={(e) => {
              // Enhanced keyboard protection
              if (e.key === 'Backspace' || e.key === 'Delete') {
                e.stopPropagation();
              }
            }}
            placeholder="#000000"
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>
      </div>

      {/* Background Color */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px'
        }}>
          Background Color
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            defaultValue={styles.backgroundColor || '#ffffff'}
            onBlur={(e) => {
              const value = e.target.value;
              // Update text input to match color picker
              if (backgroundInputRef.current) {
                backgroundInputRef.current.value = value;
              }
              handleInputBlur('backgroundColor', value);
            }}
            style={{
              width: '40px',
              height: '32px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              padding: '2px'
            }}
          />
          <input
            ref={backgroundInputRef}
            type="text"
            defaultValue={styles.backgroundColor || ''}
            onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
            onBlur={(e) => handleInputBlur('backgroundColor', e.target.value)}
            onKeyDown={(e) => {
              // Enhanced keyboard protection
              if (e.key === 'Backspace' || e.key === 'Delete') {
                e.stopPropagation();
              }
            }}
            placeholder="transparent"
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>
      </div>

      {/* Font Size */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px'
        }}>
          Font Size
          <span style={{ marginLeft: '6px', fontSize: '14px' }}>✅</span>
        </label>
        <select
          value={styles.fontSize || '14px'}
          onChange={(e) => handleImmediateStyleChange('fontSize', e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          {FONT_SIZES.map(size => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Weight */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px'
        }}>
          Font Weight
          <span style={{ marginLeft: '6px', fontSize: '14px' }}>✅</span>
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {FONT_WEIGHTS.map(weight => (
            <button
              key={weight.value}
              onClick={() => handleImmediateStyleChange('fontWeight', weight.value)}
              style={{
                flex: 1,
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: styles.fontWeight === weight.value ? '#3b82f6' : 'white',
                color: styles.fontWeight === weight.value ? 'white' : '#374151',
                fontSize: '13px',
                fontWeight: weight.value as any,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {weight.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Alignment */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px'
        }}>
          Text Alignment
          <span style={{ marginLeft: '6px', fontSize: '14px' }}>✅</span>
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {TEXT_ALIGNS.map(align => (
            <button
              key={align.value}
              onClick={() => handleImmediateStyleChange('textAlign', align.value)}
              title={align.label}
              style={{
                flex: 1,
                padding: '6px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: styles.textAlign === align.value ? '#3b82f6' : 'white',
                color: styles.textAlign === align.value ? 'white' : '#374151',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {align.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Styles Button */}
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => {
            // Clear DOM inputs directly
            if (colorInputRef.current) {
              colorInputRef.current.value = '';
            }
            if (backgroundInputRef.current) {
              backgroundInputRef.current.value = '';
            }
            // Clear validation results
            setValidationResults({});
            // Clear all styles
            onStyleChangeRef.current({});
          }}
          style={{
            width: '100%',
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#6b7280',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          Clear All Styles
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if styles actually changed (not just reference)
  // This prevents re-renders from parent component updates
  const stylesChanged = JSON.stringify(prevProps.styles) !== JSON.stringify(nextProps.styles);
  const classNameChanged = prevProps.className !== nextProps.className;

  // Don't re-render if only the callback changed
  return !stylesChanged && !classNameChanged;
});

export default StyleControls;