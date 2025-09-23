/**
 * ValidationFeedback Component
 * Phase 2: CSS Validation Layer
 *
 * Provides real-time visual feedback for CSS validation results
 * Shows errors, warnings, and suggestions to help users input valid CSS
 */

import React from 'react';
import type { ValidationResult } from '@/lib/templates/visual-builder/css-validator';

interface ValidationFeedbackProps {
  validation: ValidationResult;
  property: string;
  className?: string;
}

/**
 * Visual feedback component for CSS validation results
 */
export default function ValidationFeedback({
  validation,
  property,
  className = ''
}: ValidationFeedbackProps) {
  // Reserve space but don't show content for valid values with no suggestions
  if (validation.errorType === 'none') {
    return (
      <div
        className={`validation-feedback-placeholder ${className}`}
        style={{
          marginTop: '4px',
          height: '0px', // Reserve minimal space to prevent layout shift
          overflow: 'hidden'
        }}
      />
    );
  }

  // Get styling based on validation result
  const getStyles = () => {
    switch (validation.errorType) {
      case 'dangerous':
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fca5a5',
          color: '#dc2626',
          icon: '🚨'
        };
      case 'invalid':
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fca5a5',
          color: '#dc2626',
          icon: '❌'
        };
      case 'warning':
        return {
          backgroundColor: '#fffbeb',
          borderColor: '#fcd34d',
          color: '#d97706',
          icon: '⚠️'
        };
      default:
        return {
          backgroundColor: '#f0f9ff',
          borderColor: '#93c5fd',
          color: '#2563eb',
          icon: 'ℹ️'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`validation-feedback ${className}`}
      style={{
        marginTop: '4px',
        padding: '8px 10px',
        borderRadius: '4px',
        border: `1px solid ${styles.borderColor}`,
        backgroundColor: styles.backgroundColor,
        fontSize: '12px',
        lineHeight: '1.4'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
        <span style={{ fontSize: '14px', flexShrink: 0 }}>
          {styles.icon}
        </span>
        <div style={{ flex: 1 }}>
          {/* Error/warning message */}
          {validation.errorMessage && (
            <div style={{
              color: styles.color,
              fontWeight: '500',
              marginBottom: validation.suggestion ? '4px' : '0'
            }}>
              {validation.errorMessage}
            </div>
          )}

          {/* Suggestion/auto-correction info */}
          {validation.suggestion && (
            <div style={{
              color: styles.color,
              opacity: 0.8,
              fontSize: '11px',
              fontStyle: 'italic'
            }}>
              💡 {validation.suggestion}
            </div>
          )}

          {/* Show sanitized value if different from input */}
          {validation.sanitizedValue && validation.errorType === 'warning' && (
            <div style={{
              marginTop: '4px',
              padding: '4px 6px',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '3px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: styles.color
            }}>
              Applied: <code>{validation.sanitizedValue}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline validation indicator for input fields
 */
interface ValidationIndicatorProps {
  validation: ValidationResult;
  className?: string;
}

export function ValidationIndicator({
  validation,
  className = ''
}: ValidationIndicatorProps) {
  const getIcon = () => {
    if (validation.errorType === 'none') {
      return '✅';
    }
    switch (validation.errorType) {
      case 'dangerous':
        return '🚨';
      case 'invalid':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <span
      className={`validation-indicator ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '6px',
        fontSize: '14px',
        minWidth: '20px', // Ensure consistent width to prevent layout shifts
        justifyContent: 'center'
      }}
      title={validation.errorMessage || validation.suggestion}
    >
      {getIcon()}
    </span>
  );
}

/**
 * Get border color for input styling based on validation
 */
export function getValidationBorderColor(validation: ValidationResult): string {
  switch (validation.errorType) {
    case 'dangerous':
    case 'invalid':
      return '#f87171'; // red-400
    case 'warning':
      return '#fbbf24'; // yellow-400
    case 'none':
      return '#34d399'; // green-400
    default:
      return '#d1d5db'; // gray-300
  }
}