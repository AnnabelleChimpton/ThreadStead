/**
 * CSS Property Editors - Phase 3 Implementation
 *
 * Modern, CSS-native property editors for the Visual Builder PropertyPanel.
 * These components provide intuitive editing of real CSS properties using
 * standard CSS values and syntax.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================================
// CSS DOCUMENTATION HELPER COMPONENT
// ============================================================================

interface CSSDocLinkProps {
  property: string;
  url?: string;
  children?: React.ReactNode;
}

const CSSDocLink: React.FC<CSSDocLinkProps> = ({
  property,
  url = `https://developer.mozilla.org/en-US/docs/Web/CSS/${property}`,
  children
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => window.open(url, '_blank')}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '1px solid #d1d5db',
          backgroundColor: '#f9fafb',
          color: '#6b7280',
          fontSize: '10px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#3b82f6';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.borderColor = '#3b82f6';
          setShowTooltip(true);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f9fafb';
          e.currentTarget.style.color = '#6b7280';
          e.currentTarget.style.borderColor = '#d1d5db';
          setShowTooltip(false);
        }}
        title={`Learn more about ${property} on MDN`}
      >
        ?
      </button>

      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '20px',
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxWidth: '200px'
        }}>
          Click to view CSS {property} documentation
          {children && (
            <div style={{
              marginTop: '4px',
              fontSize: '11px',
              color: '#d1d5db',
              borderTop: '1px solid #374151',
              paddingTop: '4px'
            }}>
              {children}
            </div>
          )}
          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '-4px',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            borderRight: '4px solid #1f2937'
          }} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SHARED TYPES AND UTILITIES
// ============================================================================

export interface BasePropertyEditorProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

// CSS Unit utilities
export const CSS_UNITS = {
  length: ['px', 'rem', 'em', '%', 'vh', 'vw', 'vmin', 'vmax', 'ch', 'ex'],
  color: ['hex', 'rgb', 'rgba', 'hsl', 'hsla', 'named'],
  time: ['s', 'ms'],
  angle: ['deg', 'rad', 'grad', 'turn']
};

// Common CSS value suggestions
export const CSS_SUGGESTIONS = {
  gap: ['0', '0.25rem', '0.5rem', '1rem', '1.5rem', '2rem', '3rem'],
  padding: ['0', '0.25rem', '0.5rem', '1rem', '1.5rem', '2rem'],
  margin: ['0', '0.25rem', '0.5rem', '1rem', '1.5rem', '2rem', 'auto'],
  borderRadius: ['0', '2px', '4px', '8px', '12px', '16px', '24px', '50%'],
  fontSize: ['12px', '14px', '16px', '18px', '24px', '32px', '48px'],
  colors: ['#ffffff', '#000000', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
};

// Enhanced CSS validation utilities
export const validateCSSValue = (property: string, value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Empty values are valid (use defaults)
  }

  const trimmedValue = value.trim();

  switch (property) {
    case 'gap':
    case 'padding':
    case 'margin':
    case 'width':
    case 'height':
    case 'minWidth':
    case 'maxWidth':
    case 'minHeight':
    case 'maxHeight':
    case 'top':
    case 'right':
    case 'bottom':
    case 'left':
      return validateLength(trimmedValue);

    case 'backgroundColor':
    case 'color':
    case 'textColor':
    case 'borderColor':
    case 'accentColor':
      return validateColor(trimmedValue);

    case 'fontSize':
      return validateFontSize(trimmedValue);

    case 'borderRadius':
      return validateBorderRadius(trimmedValue);

    case 'opacity':
      return validateOpacity(trimmedValue);

    case 'zIndex':
      return validateZIndex(trimmedValue);

    case 'fontWeight':
      return validateFontWeight(trimmedValue);

    case 'lineHeight':
      return validateLineHeight(trimmedValue);

    case 'textAlign':
      return validateTextAlign(trimmedValue);

    case 'display':
      return validateDisplay(trimmedValue);

    case 'position':
      return validatePosition(trimmedValue);

    case 'flexDirection':
      return validateFlexDirection(trimmedValue);

    case 'justifyContent':
      return validateJustifyContent(trimmedValue);

    case 'alignItems':
      return validateAlignItems(trimmedValue);

    case 'boxShadow':
      return validateBoxShadow(trimmedValue);

    case 'border':
      return validateBorder(trimmedValue);

    case 'gridTemplateColumns':
    case 'gridTemplateRows':
      return validateGridTemplate(trimmedValue);

    default:
      return { isValid: true }; // Unknown properties are assumed valid
  }
};

const validateLength = (value: string): ValidationResult => {
  const lengthRegex = /^(auto|0|[-+]?\d*\.?\d+)(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)?$/;
  if (lengthRegex.test(value.trim())) {
    return { isValid: true };
  }
  return {
    isValid: false,
    error: 'Must be a valid length (e.g., 10px, 1rem, 50%, auto)'
  };
};

const validateColor = (value: string): ValidationResult => {
  // Hex colors
  if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
    return { isValid: true };
  }

  // RGB/RGBA
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/i.test(value)) {
    return { isValid: true };
  }

  // HSL/HSLA
  if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/i.test(value)) {
    return { isValid: true };
  }

  // Named colors (simplified check)
  const namedColors = ['transparent', 'inherit', 'currentColor', 'white', 'black', 'red', 'green', 'blue'];
  if (namedColors.includes(value.toLowerCase())) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Must be a valid color (hex, rgb, hsl, or named color)'
  };
};

const validateFontSize = (value: string): ValidationResult => {
  const result = validateLength(value);
  if (result.isValid) {
    const numValue = parseFloat(value);
    if (numValue < 8) {
      return { isValid: true, warning: 'Very small font size - may be hard to read' };
    }
    if (numValue > 72) {
      return { isValid: true, warning: 'Very large font size - may cause layout issues' };
    }
  }
  return result;
};

const validateBorderRadius = (value: string): ValidationResult => {
  if (value === '50%') return { isValid: true }; // Circle
  return validateLength(value);
};

const validateOpacity = (value: string): ValidationResult => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { isValid: false, error: 'Opacity must be a number' };
  }
  if (num < 0 || num > 1) {
    return { isValid: false, error: 'Opacity must be between 0 and 1' };
  }
  return { isValid: true };
};

const validateZIndex = (value: string): ValidationResult => {
  if (value === 'auto') return { isValid: true };
  const num = parseInt(value);
  if (isNaN(num)) {
    return { isValid: false, error: 'z-index must be a number or "auto"' };
  }
  if (num < -2147483648 || num > 2147483647) {
    return { isValid: false, error: 'z-index is out of valid range' };
  }
  return { isValid: true };
};

const validateFontWeight = (value: string): ValidationResult => {
  const validValues = ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  if (validValues.includes(value)) {
    return { isValid: true };
  }
  const num = parseInt(value);
  if (!isNaN(num) && num >= 1 && num <= 1000) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Invalid font-weight value' };
};

const validateLineHeight = (value: string): ValidationResult => {
  if (value === 'normal') return { isValid: true };

  // Number values (unitless)
  const num = parseFloat(value);
  if (!isNaN(num) && num > 0) {
    if (num < 0.5) {
      return { isValid: true, warning: 'Very tight line height - may cause text overlap' };
    }
    if (num > 3) {
      return { isValid: true, warning: 'Very loose line height - may affect readability' };
    }
    return { isValid: true };
  }

  // Length values
  return validateLength(value);
};

const validateTextAlign = (value: string): ValidationResult => {
  const validValues = ['left', 'right', 'center', 'justify', 'start', 'end'];
  if (validValues.includes(value)) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Invalid text-align value' };
};

const validateDisplay = (value: string): ValidationResult => {
  const validValues = ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none', 'table', 'table-cell', 'list-item'];
  if (validValues.includes(value)) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Invalid display value' };
};

const validatePosition = (value: string): ValidationResult => {
  const validValues = ['static', 'relative', 'absolute', 'fixed', 'sticky'];
  if (validValues.includes(value)) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Invalid position value' };
};

const validateFlexDirection = (value: string): ValidationResult => {
  const validValues = ['row', 'row-reverse', 'column', 'column-reverse'];
  if (validValues.includes(value)) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Invalid flex-direction value' };
};

const validateJustifyContent = (value: string): ValidationResult => {
  const validValues = ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly', 'start', 'end'];
  if (validValues.includes(value)) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Invalid justify-content value' };
};

const validateAlignItems = (value: string): ValidationResult => {
  const validValues = ['flex-start', 'flex-end', 'center', 'stretch', 'baseline', 'start', 'end'];
  if (validValues.includes(value)) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Invalid align-items value' };
};

const validateBoxShadow = (value: string): ValidationResult => {
  if (value === 'none') return { isValid: true };

  // Basic shadow format: offset-x offset-y blur-radius spread-radius color
  // This is a simplified validation - CSS box-shadow can be quite complex
  const shadowPattern = /^(\d+px\s+){2,4}(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)(\s*,\s*(\d+px\s+){2,4}(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+))*$/;

  if (shadowPattern.test(value.replace(/\s+/g, ' ').trim())) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid box-shadow format. Use: offset-x offset-y blur-radius color' };
};

const validateBorder = (value: string): ValidationResult => {
  if (value === 'none') return { isValid: true };

  // Basic border format: width style color
  const borderPattern = /^(\d+px|thin|medium|thick)\s+(solid|dashed|dotted|double|groove|ridge|inset|outset)\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)$/;

  if (borderPattern.test(value.trim())) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid border format. Use: width style color (e.g., "1px solid #000")' };
};

const validateGridTemplate = (value: string): ValidationResult => {
  if (value === 'none') return { isValid: true };

  // Basic validation for grid template values
  // Can be: track sizes, repeat(), fit-content(), minmax(), etc.
  const basicPattern = /^(\d+(?:px|fr|%|em|rem)|auto|min-content|max-content|repeat\([^)]+\)|minmax\([^)]+\)|fit-content\([^)]+\))(\s+(\d+(?:px|fr|%|em|rem)|auto|min-content|max-content|repeat\([^)]+\)|minmax\([^)]+\)|fit-content\([^)]+\)))*$/;

  if (basicPattern.test(value.trim())) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid grid template format. Use track sizes like "1fr 200px auto"' };
};

// ============================================================================
// CSS LENGTH EDITOR
// ============================================================================

export interface CSSLengthEditorProps extends BasePropertyEditorProps {
  units?: string[];
  min?: number;
  max?: number;
  step?: number;
  suggestions?: string[];
  allowNegative?: boolean;
  showPreview?: boolean;
  docProperty?: string;  // MDN property name for documentation link
  docUrl?: string;       // Custom documentation URL
}

export const CSSLengthEditor: React.FC<CSSLengthEditorProps> = ({
  label,
  value = '',
  onChange,
  description,
  disabled = false,
  units = ['px', 'rem', 'em', '%'],
  min = 0,
  max = 1000,
  step = 1,
  suggestions = [],
  allowNegative = false,
  showPreview = false,
  docProperty,
  docUrl,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const validation = useMemo(() => validateCSSValue('gap', inputValue), [inputValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Real-time validation and update
    const validation = validateCSSValue('gap', newValue);
    if (validation.isValid) {
      onChange(newValue);
    }
  }, [onChange]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
  }, [onChange]);

  return (
    <div className={`css-length-editor ${className}`}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {/* Label */}
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {label}
          {(docProperty || docUrl) && (
            <CSSDocLink
              property={docProperty || 'length'}
              url={docUrl || (docProperty ? `https://developer.mozilla.org/en-US/docs/Web/CSS/${docProperty}` : 'https://developer.mozilla.org/en-US/docs/Web/CSS/length')}
            >
              {docProperty ? `Learn about CSS ${docProperty}` : 'Supports px, rem, em, %, vh, vw, and more'}
            </CSSDocLink>
          )}
          {description && (
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: 'normal'
            }}>
              ({description})
            </span>
          )}
        </label>

        {/* Input with suggestions */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder="e.g., 1rem, 16px, 100%"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${validation.isValid ? '#d1d5db' : '#ef4444'}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: disabled ? '#f9fafb' : 'white',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              setShowSuggestions(true);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = validation.isValid ? '#d1d5db' : '#ef4444';
              setTimeout(() => setShowSuggestions(false), 150);
            }}
          />

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onMouseDown={() => handleSuggestionSelect(suggestion)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    borderBottom: index < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Validation feedback */}
        {!validation.isValid && validation.error && (
          <div style={{
            fontSize: '12px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>⚠️</span>
            {validation.error}
          </div>
        )}

        {validation.isValid && validation.warning && (
          <div style={{
            fontSize: '12px',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>⚠️</span>
            {validation.warning}
          </div>
        )}

        {/* Quick unit buttons */}
        <div style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          {units.map(unit => (
            <button
              key={unit}
              onClick={() => {
                const numValue = parseFloat(inputValue) || 0;
                const newValue = `${numValue}${unit}`;
                setInputValue(newValue);
                onChange(newValue);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CSS COLOR EDITOR
// ============================================================================

export interface CSSColorEditorProps extends BasePropertyEditorProps {
  format?: 'hex' | 'rgb' | 'hsl' | 'named';
  showAlpha?: boolean;
  swatches?: string[];
  showEyedropper?: boolean;
}

export const CSSColorEditor: React.FC<CSSColorEditorProps> = ({
  label,
  value = '#ffffff',
  onChange,
  description,
  disabled = false,
  format = 'hex',
  showAlpha = false,
  swatches = CSS_SUGGESTIONS.colors,
  showEyedropper = false,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [showPicker, setShowPicker] = useState(false);

  const validation = useMemo(() => validateColor(inputValue), [inputValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const validation = validateColor(newValue);
    if (validation.isValid) {
      onChange(newValue);
    }
  }, [onChange]);

  const handleSwatchSelect = useCallback((color: string) => {
    setInputValue(color);
    onChange(color);
  }, [onChange]);

  return (
    <div className={`css-color-editor ${className}`}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {/* Label */}
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {label}
          <CSSDocLink property="color_value" url="https://developer.mozilla.org/en-US/docs/Web/CSS/color_value">
            Supports hex, rgb(), hsl(), and named colors
          </CSSDocLink>
          {description && (
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: 'normal'
            }}>
              ({description})
            </span>
          )}
        </label>

        {/* Color input with preview */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Color preview square */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: validation.isValid ? inputValue : '#f3f4f6',
              cursor: 'pointer',
              flexShrink: 0
            }}
            onClick={() => setShowPicker(!showPicker)}
            title="Click to open color picker"
          />

          {/* Text input */}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder="#ffffff, rgb(255,255,255), etc."
            style={{
              flex: 1,
              padding: '8px 12px',
              border: `1px solid ${validation.isValid ? '#d1d5db' : '#ef4444'}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: disabled ? '#f9fafb' : 'white',
              outline: 'none'
            }}
          />
        </div>

        {/* Color swatches */}
        <div style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          {swatches.map((color, index) => (
            <div
              key={index}
              onClick={() => handleSwatchSelect(color)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title={color}
            />
          ))}
        </div>

        {/* Validation feedback */}
        {!validation.isValid && validation.error && (
          <div style={{
            fontSize: '12px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>⚠️</span>
            {validation.error}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// CSS FLEXBOX EDITOR
// ============================================================================

export interface CSSFlexboxEditorProps {
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  gap?: string;
  onFlexPropsChange: (props: {
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    gap?: string;
  }) => void;
}

export const CSSFlexboxEditor: React.FC<CSSFlexboxEditorProps> = ({
  label,
  description,
  disabled = false,
  className = '',
  flexDirection = 'row',
  justifyContent = 'flex-start',
  alignItems = 'flex-start',
  gap = '0px',
  onFlexPropsChange
}) => {
  const [localProps, setLocalProps] = useState({
    flexDirection,
    justifyContent,
    alignItems,
    gap
  });

  // Update local state when props change
  useEffect(() => {
    setLocalProps({ flexDirection, justifyContent, alignItems, gap });
  }, [flexDirection, justifyContent, alignItems, gap]);

  const handlePropChange = useCallback((property: string, value: string) => {
    const newProps = { ...localProps, [property]: value };
    setLocalProps(newProps);
    onFlexPropsChange(newProps);
  }, [localProps, onFlexPropsChange]);

  // Flexbox direction options
  const directionOptions = [
    { value: 'row', label: 'Row →', icon: '→' },
    { value: 'column', label: 'Column ↓', icon: '↓' },
    { value: 'row-reverse', label: 'Row ←', icon: '←' },
    { value: 'column-reverse', label: 'Column ↑', icon: '↑' }
  ];

  // Justify content options
  const justifyOptions = [
    { value: 'flex-start', label: 'Start', preview: '●○○' },
    { value: 'center', label: 'Center', preview: '○●○' },
    { value: 'flex-end', label: 'End', preview: '○○●' },
    { value: 'space-between', label: 'Between', preview: '●○●' },
    { value: 'space-around', label: 'Around', preview: '○●○●○' },
    { value: 'space-evenly', label: 'Evenly', preview: '○●○●○' }
  ];

  // Align items options
  const alignOptions = [
    { value: 'flex-start', label: 'Start', icon: '⏶' },
    { value: 'center', label: 'Center', icon: '■' },
    { value: 'flex-end', label: 'End', icon: '⏷' },
    { value: 'stretch', label: 'Stretch', icon: '▥' },
    { value: 'baseline', label: 'Baseline', icon: '⏤' }
  ];

  const commonGapValues = ['0', '0.25rem', '0.5rem', '1rem', '1.5rem', '2rem'];

  return (
    <div className={`css-flexbox-editor ${className}`}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Label */}
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {label}
          <CSSDocLink property="CSS_Flexible_Box_Layout" url="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout">
            Complete guide to CSS Flexbox layout
          </CSSDocLink>
          {description && (
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: 'normal'
            }}>
              ({description})
            </span>
          )}
        </label>

        {/* Visual Preview */}
        <div style={{
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: localProps.flexDirection as any,
            justifyContent: localProps.justifyContent as any,
            alignItems: localProps.alignItems as any,
            gap: localProps.gap,
            width: '100%',
            height: '100%',
            minHeight: '60px',
            border: '1px dashed #d1d5db',
            borderRadius: '4px',
            padding: '8px'
          }}>
            {/* Sample flex items */}
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}
              >
                {i}
              </div>
            ))}
          </div>
        </div>

        {/* Flex Direction */}
        <div>
          <label style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px',
            display: 'block'
          }}>
            Direction
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px'
          }}>
            {directionOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handlePropChange('flexDirection', option.value)}
                disabled={disabled}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  backgroundColor: localProps.flexDirection === option.value ? '#3b82f6' : '#f3f4f6',
                  color: localProps.flexDirection === option.value ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Justify Content */}
        <div>
          <label style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px',
            display: 'block'
          }}>
            Justify Content
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '4px'
          }}>
            {justifyOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handlePropChange('justifyContent', option.value)}
                disabled={disabled}
                style={{
                  padding: '6px 8px',
                  fontSize: '10px',
                  backgroundColor: localProps.justifyContent === option.value ? '#3b82f6' : '#f3f4f6',
                  color: localProps.justifyContent === option.value ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px'
                }}
                title={option.label}
              >
                <span style={{ fontSize: '8px', letterSpacing: '1px' }}>{option.preview}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Align Items */}
        <div>
          <label style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px',
            display: 'block'
          }}>
            Align Items
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
            gap: '4px'
          }}>
            {alignOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handlePropChange('alignItems', option.value)}
                disabled={disabled}
                style={{
                  padding: '6px 4px',
                  fontSize: '10px',
                  backgroundColor: localProps.alignItems === option.value ? '#3b82f6' : '#f3f4f6',
                  color: localProps.alignItems === option.value ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px'
                }}
                title={option.label}
              >
                <span style={{ fontSize: '12px' }}>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Gap */}
        <div>
          <label style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px',
            display: 'block'
          }}>
            Gap
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={localProps.gap}
              onChange={(e) => handlePropChange('gap', e.target.value)}
              disabled={disabled}
              placeholder="e.g., 1rem, 16px"
              style={{
                flex: 1,
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: disabled ? '#f9fafb' : 'white'
              }}
            />
            <div style={{ display: 'flex', gap: '2px' }}>
              {commonGapValues.map(value => (
                <button
                  key={value}
                  onClick={() => handlePropChange('gap', value)}
                  disabled={disabled}
                  style={{
                    padding: '4px 6px',
                    fontSize: '10px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    color: '#6b7280'
                  }}
                >
                  {value || '0'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CSS BOX SHADOW EDITOR WITH VISUAL PREVIEW
// ============================================================================

export interface CSSBoxShadowEditorProps extends BasePropertyEditorProps {
  presets?: Array<{ name: string; value: string; }>;
}

export const CSSBoxShadowEditor: React.FC<CSSBoxShadowEditorProps> = ({
  label,
  value = 'none',
  onChange,
  description,
  disabled = false,
  className = '',
  presets = [
    { name: 'None', value: 'none' },
    { name: 'Small', value: '0 1px 3px rgba(0, 0, 0, 0.12)' },
    { name: 'Medium', value: '0 4px 6px rgba(0, 0, 0, 0.12)' },
    { name: 'Large', value: '0 10px 15px rgba(0, 0, 0, 0.12)' },
    { name: 'Extra Large', value: '0 20px 25px rgba(0, 0, 0, 0.15)' },
    { name: 'Inner', value: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }
  ]
}) => {
  const [inputValue, setInputValue] = useState(value);
  const validation = useMemo(() => validateBoxShadow(inputValue), [inputValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const validation = validateBoxShadow(newValue);
    if (validation.isValid) {
      onChange(newValue);
    }
  }, [onChange]);

  return (
    <div className={`css-box-shadow-editor ${className}`}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {/* Label */}
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {label}
          <CSSDocLink property="box-shadow">
            Create depth with shadows - supports multiple shadows
          </CSSDocLink>
          {description && (
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: 'normal'
            }}>
              ({description})
            </span>
          )}
        </label>

        {/* Visual Preview */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: validation.isValid ? inputValue : 'none',
              transition: 'box-shadow 0.2s ease'
            }}
          />
        </div>

        {/* Input */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder="0 4px 6px rgba(0, 0, 0, 0.1)"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${validation.isValid ? '#d1d5db' : '#ef4444'}`,
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: disabled ? '#f9fafb' : 'white'
          }}
        />

        {/* Presets */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px'
        }}>
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => {
                setInputValue(preset.value);
                onChange(preset.value);
              }}
              disabled={disabled}
              style={{
                padding: '6px 8px',
                fontSize: '11px',
                backgroundColor: inputValue === preset.value ? '#3b82f6' : '#f3f4f6',
                color: inputValue === preset.value ? 'white' : '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
              title={preset.value}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Validation feedback */}
        {!validation.isValid && validation.error && (
          <div style={{
            fontSize: '12px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>⚠️</span>
            {validation.error}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// CSS SPACING EDITOR WITH VISUAL PREVIEW
// ============================================================================

export interface CSSSpacingEditorProps extends BasePropertyEditorProps {
  type: 'padding' | 'margin';
  showPreview?: boolean;
}

export const CSSSpacingEditor: React.FC<CSSSpacingEditorProps> = ({
  label,
  value = '0',
  onChange,
  description,
  disabled = false,
  className = '',
  type,
  showPreview = true
}) => {
  const [inputValue, setInputValue] = useState(value);
  const validation = useMemo(() => validateLength(inputValue), [inputValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const validation = validateLength(newValue);
    if (validation.isValid) {
      onChange(newValue);
    }
  }, [onChange]);

  const commonValues = ['0', '4px', '8px', '12px', '16px', '24px', '32px'];

  return (
    <div className={`css-spacing-editor ${className}`}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {/* Label */}
        <label style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {label}
          <CSSDocLink property={type} url={`https://developer.mozilla.org/en-US/docs/Web/CSS/${type}`}>
            Control element spacing with {type}
          </CSSDocLink>
          {description && (
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: 'normal'
            }}>
              ({description})
            </span>
          )}
        </label>

        {/* Visual Preview */}
        {showPreview && (
          <div style={{
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{
              position: 'relative',
              width: '60px',
              height: '60px',
              backgroundColor: type === 'padding' ? '#3b82f6' : '#e5e7eb',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              ...(type === 'padding' ? { padding: validation.isValid ? inputValue : '0' } : {}),
              ...(type === 'margin' ? { margin: validation.isValid ? inputValue : '0' } : {})
            }}>
              {type === 'padding' ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '2px'
                }} />
              ) : (
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '2px'
                }} />
              )}
            </div>
          </div>
        )}

        {/* Input and quick values */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder="e.g., 8px, 1rem"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: `1px solid ${validation.isValid ? '#d1d5db' : '#ef4444'}`,
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: disabled ? '#f9fafb' : 'white'
            }}
          />
        </div>

        {/* Quick values */}
        <div style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          {commonValues.map(val => (
            <button
              key={val}
              onClick={() => {
                setInputValue(val);
                onChange(val);
              }}
              disabled={disabled}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: inputValue === val ? '#3b82f6' : '#f3f4f6',
                color: inputValue === val ? 'white' : '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            >
              {val}
            </button>
          ))}
        </div>

        {/* Validation feedback */}
        {!validation.isValid && validation.error && (
          <div style={{
            fontSize: '12px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>⚠️</span>
            {validation.error}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

const CSSPropertyEditors = {
  CSSLengthEditor,
  CSSColorEditor,
  CSSFlexboxEditor,
  CSSBoxShadowEditor,
  CSSSpacingEditor,
  validateCSSValue,
  CSS_UNITS,
  CSS_SUGGESTIONS
};

export default CSSPropertyEditors;