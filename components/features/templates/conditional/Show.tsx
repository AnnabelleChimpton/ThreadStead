import React from 'react';
import { useResidentData } from '../ResidentDataProvider';

interface ShowProps {
  when?: string;
  data?: string;
  equals?: string;
  exists?: string;
  children: React.ReactNode;
}

// Helper function to safely get nested property values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Helper function to evaluate conditions
function evaluateCondition(condition: string, data: any): boolean {
  // Handle simple boolean expressions
  if (condition === 'true') return true;
  if (condition === 'false') return false;
  
  // Handle negation
  if (condition.startsWith('!')) {
    return !evaluateCondition(condition.slice(1), data);
  }
  
  // Handle data path existence checks
  if (condition.startsWith('has:')) {
    const path = condition.slice(4);
    const value = getNestedValue(data, path);
    return value !== undefined && value !== null && value !== '';
  }
  
  // Handle data path truthy checks
  const value = getNestedValue(data, condition);
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export default function Show({ when, data, equals, exists, children }: ShowProps) {
  const residentData = useResidentData();
  
  let shouldShow = false;
  
  if (when) {
    shouldShow = evaluateCondition(when, residentData);
  } else if (data) {
    const value = getNestedValue(residentData, data);
    if (equals !== undefined) {
      shouldShow = String(value) === equals;
    } else if (exists !== undefined) {
      shouldShow = value !== undefined && value !== null;
    } else {
      // Default: check if value is truthy
      shouldShow = Array.isArray(value) ? value.length > 0 : Boolean(value);
    }
  } else if (exists) {
    shouldShow = getNestedValue(residentData, exists) !== undefined;
  }
  
  return shouldShow ? <>{children}</> : null;
}