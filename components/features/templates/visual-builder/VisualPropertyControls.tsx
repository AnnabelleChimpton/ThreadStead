/**
 * VisualPropertyControls - Modern, intuitive property editors
 * Replaces technical forms with visual controls and smart interfaces
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Base prop editor interface
export interface PropertyEditorProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  description?: string;
  disabled?: boolean;
}

/**
 * Color picker with visual preview and hex input
 */
export function ColorEditor({ label, value, onChange, description, disabled }: PropertyEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentColor = value || '#000000';

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px',
      }}>
        {label}
      </label>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        background: 'white',
      }}>
        {/* Color preview swatch */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: currentColor,
            border: '2px solid #f3f4f6',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        />

        {/* Color input */}
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '40px',
            height: '32px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: 'transparent',
          }}
        />

        {/* Hex input */}
        <input
          type="text"
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="#000000"
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        />

        {/* Clear button */}
        <button
          onClick={() => onChange('')}
          disabled={disabled}
          style={{
            padding: '4px',
            border: 'none',
            background: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '14px',
          }}
          title="Clear color"
        >
          ✕
        </button>
      </div>

      {description && (
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          margin: '4px 0 0 0',
          lineHeight: '1.4',
        }}>
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Slider with numeric input for sizes, opacity, etc.
 */
interface SliderEditorProps extends PropertyEditorProps {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export function SliderEditor({
  label,
  value,
  onChange,
  description,
  disabled,
  min = 0,
  max = 100,
  step = 1,
  unit = ''
}: SliderEditorProps) {
  const numericValue = parseFloat(value) || min;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <label style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#374151',
        }}>
          {label}
        </label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <input
            type="number"
            value={numericValue}
            onChange={(e) => onChange(parseFloat(e.target.value) || min)}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            style={{
              width: '60px',
              padding: '4px 6px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '12px',
              textAlign: 'right',
            }}
          />
          {unit && (
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              minWidth: '20px',
            }}>
              {unit}
            </span>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{
          fontSize: '11px',
          color: '#9ca3af',
          minWidth: '20px',
        }}>
          {min}
        </span>
        <input
          type="range"
          value={numericValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          style={{
            flex: 1,
            height: '6px',
            borderRadius: '3px',
            background: '#e5e7eb',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <span style={{
          fontSize: '11px',
          color: '#9ca3af',
          minWidth: '20px',
        }}>
          {max}
        </span>
      </div>

      {description && (
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          margin: '4px 0 0 0',
          lineHeight: '1.4',
        }}>
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Toggle switch for boolean properties
 */
export function ToggleEditor({ label, value, onChange, description, disabled }: PropertyEditorProps) {
  const isOn = Boolean(value);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <label style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#374151',
            cursor: 'pointer',
          }}>
            {label}
          </label>
          {description && (
            <p style={{
              fontSize: '11px',
              color: '#6b7280',
              margin: '2px 0 0 0',
              lineHeight: '1.4',
            }}>
              {description}
            </p>
          )}
        </div>

        <button
          onClick={() => onChange(!isOn)}
          disabled={disabled}
          style={{
            position: 'relative',
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            background: isOn ? '#3b82f6' : '#d1d5db',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: isOn ? '22px' : '2px',
              width: '20px',
              height: '20px',
              borderRadius: '10px',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
            }}
          />
        </button>
      </div>
    </div>
  );
}

/**
 * Dropdown select with visual options
 */
interface SelectEditorProps extends PropertyEditorProps {
  options: Array<{
    value: string;
    label: string;
    icon?: string;
    description?: string;
  }>;
}

export function SelectEditor({ label, value, onChange, description, disabled, options }: SelectEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  // Calculate dropdown position when opening
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 200; // Max height we set
      const gap = 4;


      // Calculate vertical position - flip to top if not enough space below
      let top = rect.bottom + gap;
      if (top + dropdownHeight > window.innerHeight) {
        // Not enough space below, show above the button
        top = rect.top - dropdownHeight - gap;
        // If still not enough space above, position at bottom with available space
        if (top < 0) {
          top = Math.max(gap, window.innerHeight - dropdownHeight - gap);
        }
      }

      // Calculate horizontal position - ensure it fits in viewport
      let left = rect.left;
      const dropdownWidth = Math.max(200, rect.width);
      if (left + dropdownWidth > window.innerWidth) {
        // Align to right edge if it would overflow
        left = window.innerWidth - dropdownWidth - gap;
      }
      left = Math.max(gap, left); // Ensure minimum left margin

      const position = {
        top: Math.max(gap, top),
        left,
        width: dropdownWidth
      };


      setDropdownPosition(position);
    }
  }, [label]);

  // Handle opening dropdown
  const handleToggle = useCallback(() => {

    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  }, [isOpen, updateDropdownPosition, label]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't close if clicking on the button or inside the dropdown
      const isClickingButton = buttonRef.current?.contains(target);
      const isClickingDropdown = dropdownRef.current?.contains(target);

      if (!isClickingButton && !isClickingDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handlePositionUpdate = () => {
      updateDropdownPosition();
    };

    window.addEventListener('scroll', handlePositionUpdate, true);
    window.addEventListener('resize', handlePositionUpdate);

    return () => {
      window.removeEventListener('scroll', handlePositionUpdate, true);
      window.removeEventListener('resize', handlePositionUpdate);
    };
  }, [isOpen, updateDropdownPosition]);

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px',
      }}>
        {label}
      </label>

      {/* Selected value display */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          background: 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '13px',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {selectedOption?.icon && (
            <span style={{ fontSize: '14px' }}>{selectedOption.icon}</span>
          )}
          <span>{selectedOption?.label || 'Select...'}</span>
        </div>
        <span style={{
          fontSize: '12px',
          color: '#9ca3af',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▼
        </span>
      </button>

      {/* Portal-rendered dropdown options */}
      {isOpen && typeof document !== 'undefined' && (() => {

        const dropdownElement = (
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 99999,
              maxHeight: '200px',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                border: 'none',
                background: option.value === value ? '#f3f4f6' : 'white',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  (e.target as HTMLButtonElement).style.background = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) {
                  (e.target as HTMLButtonElement).style.background = 'white';
                }
              }}
            >
              {option.icon && (
                <span style={{ fontSize: '14px' }}>{option.icon}</span>
              )}
              <div>
                <div>{option.label}</div>
                {option.description && (
                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    marginTop: '1px',
                  }}>
                    {option.description}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        );

        return createPortal(dropdownElement, document.body);
      })()}

      {description && (
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          margin: '4px 0 0 0',
          lineHeight: '1.4',
        }}>
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Text input with enhanced styling and local state management
 */
export function TextEditor({ label, value, onChange, description, disabled }: PropertyEditorProps) {
  // Local state to manage input value during typing
  const [localValue, setLocalValue] = useState(value || '');

  // Sync local state with prop value when it changes externally
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Store onChange in a ref to avoid recreating handlers when it changes
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Debounce timer ref to batch updates
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      onChangeRef.current(newValue);
    }, 300); // 300ms debounce delay
  }, []); // No dependencies - uses refs

  const handleBlur = useCallback(() => {
    // Clear any pending debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    // Ensure final value is sent on blur using current local value
    onChangeRef.current(localValue);
  }, [localValue]); // Only depend on localValue

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px',
      }}>
        {label}
      </label>

      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '13px',
          background: 'white',
          outline: 'none',
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => {
          (e.target as HTMLInputElement).style.borderColor = '#3b82f6';
        }}
      />

      {description && (
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          margin: '4px 0 0 0',
          lineHeight: '1.4',
        }}>
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Multi-line text area with local state management
 */
export function TextAreaEditor({ label, value, onChange, description, disabled }: PropertyEditorProps) {
  // Local state to manage textarea value during typing
  const [localValue, setLocalValue] = useState(value || '');

  // Sync local state with prop value when it changes externally
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Store onChange in a ref to avoid recreating handlers when it changes
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Debounce timer ref to batch updates
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      onChangeRef.current(newValue);
    }, 300); // 300ms debounce delay
  }, []); // No dependencies - uses refs

  const handleBlur = useCallback(() => {
    // Clear any pending debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    // Ensure final value is sent on blur using current local value
    onChangeRef.current(localValue);
  }, [localValue]); // Only depend on localValue

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px',
      }}>
        {label}
      </label>

      <textarea
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '13px',
          background: 'white',
          outline: 'none',
          transition: 'border-color 0.2s ease',
          resize: 'vertical',
          minHeight: '80px',
        }}
        onFocus={(e) => {
          (e.target as HTMLTextAreaElement).style.borderColor = '#3b82f6';
        }}
      />

      {description && (
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          margin: '4px 0 0 0',
          lineHeight: '1.4',
        }}>
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Spacing editor with individual controls for padding/margin
 */
interface SpacingEditorProps extends PropertyEditorProps {
  type: 'padding' | 'margin';
}

export function SpacingEditor({ label, value, onChange, description, disabled, type }: SpacingEditorProps) {
  // Parse spacing value (can be string like "10px" or object like {top: 10, right: 10, etc})
  const parseSpacing = (val: any) => {
    if (typeof val === 'string') {
      const num = parseFloat(val) || 0;
      return { top: num, right: num, bottom: num, left: num };
    }
    if (typeof val === 'object' && val) {
      return {
        top: val.top || 0,
        right: val.right || 0,
        bottom: val.bottom || 0,
        left: val.left || 0,
      };
    }
    return { top: 0, right: 0, bottom: 0, left: 0 };
  };

  const spacing = parseSpacing(value);

  const updateSpacing = (side: string, newValue: number) => {
    const updated = { ...spacing, [side]: newValue };
    // Convert back to CSS string format
    const cssValue = `${updated.top}px ${updated.right}px ${updated.bottom}px ${updated.left}px`;
    onChange(cssValue);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '12px',
      }}>
        {label}
      </label>

      {/* Visual spacing editor */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gridTemplateRows: 'auto 1fr auto',
        gap: '4px',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
      }}>
        {/* Top */}
        <div style={{ gridColumn: '2', textAlign: 'center' }}>
          <input
            type="number"
            value={spacing.top}
            onChange={(e) => updateSpacing('top', parseFloat(e.target.value) || 0)}
            disabled={disabled}
            style={{
              width: '50px',
              padding: '4px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Left */}
        <div style={{ gridColumn: '1', gridRow: '2', display: 'flex', alignItems: 'center' }}>
          <input
            type="number"
            value={spacing.left}
            onChange={(e) => updateSpacing('left', parseFloat(e.target.value) || 0)}
            disabled={disabled}
            style={{
              width: '50px',
              padding: '4px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Center label */}
        <div style={{
          gridColumn: '2',
          gridRow: '2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          border: '1px dashed #d1d5db',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '11px',
          color: '#6b7280',
        }}>
          {type}
        </div>

        {/* Right */}
        <div style={{ gridColumn: '3', gridRow: '2', display: 'flex', alignItems: 'center' }}>
          <input
            type="number"
            value={spacing.right}
            onChange={(e) => updateSpacing('right', parseFloat(e.target.value) || 0)}
            disabled={disabled}
            style={{
              width: '50px',
              padding: '4px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Bottom */}
        <div style={{ gridColumn: '2', gridRow: '3', textAlign: 'center' }}>
          <input
            type="number"
            value={spacing.bottom}
            onChange={(e) => updateSpacing('bottom', parseFloat(e.target.value) || 0)}
            disabled={disabled}
            style={{
              width: '50px',
              padding: '4px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              textAlign: 'center',
            }}
          />
        </div>
      </div>

      {description && (
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          margin: '4px 0 0 0',
          lineHeight: '1.4',
        }}>
          {description}
        </p>
      )}
    </div>
  );
}