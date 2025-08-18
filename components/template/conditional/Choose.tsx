import React from 'react';
import { useResidentData } from '../ResidentDataProvider';

interface ChooseProps {
  children: React.ReactNode;
}

interface WhenProps {
  condition?: string;
  data?: string;
  equals?: string;
  exists?: boolean;
  children: React.ReactNode;
}

interface OtherwiseProps {
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
  if (condition === 'true') return true;
  if (condition === 'false') return false;
  
  if (condition.startsWith('has:')) {
    const path = condition.slice(4);
    const value = getNestedValue(data, path);
    return value !== undefined && value !== null && value !== '';
  }
  
  const value = getNestedValue(data, condition);
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export function When({ condition, data, equals, exists, children }: WhenProps): React.ReactElement | null {
  const residentData = useResidentData();
  
  let shouldShow = false;
  
  if (condition) {
    shouldShow = evaluateCondition(condition, residentData);
  } else if (data) {
    const value = getNestedValue(residentData, data);
    if (equals !== undefined) {
      shouldShow = String(value) === equals;
    } else if (exists !== undefined) {
      shouldShow = (value !== undefined && value !== null) === exists;
    } else {
      shouldShow = Array.isArray(value) ? value.length > 0 : Boolean(value);
    }
  }
  
  // This component is only used inside Choose, which handles the rendering logic
  return shouldShow ? <>{children}</> : null;
}

export function Otherwise({ children }: OtherwiseProps): React.ReactElement {
  // This component is only used inside Choose, which handles the rendering logic
  return <>{children}</>;
}

export default function Choose({ children }: ChooseProps) {
  const residentData = useResidentData();
  const childArray = React.Children.toArray(children);
  
  for (const child of childArray) {
    if (React.isValidElement(child)) {
      // Check if this is a When component
      if (child.type === When) {
        const props = child.props as WhenProps;
        let shouldShow = false;
        
        if (props.condition) {
          shouldShow = evaluateCondition(props.condition, residentData);
        } else if (props.data) {
          const value = getNestedValue(residentData, props.data);
          if (props.equals !== undefined) {
            shouldShow = String(value) === props.equals;
          } else if (props.exists !== undefined) {
            shouldShow = (value !== undefined && value !== null) === props.exists;
          } else {
            shouldShow = Array.isArray(value) ? value.length > 0 : Boolean(value);
          }
        }
        
        if (shouldShow) {
          return <>{props.children}</>;
        }
      } else if (child.type === Otherwise) {
        // If we reach Otherwise, no When conditions were met
        return <>{(child.props as OtherwiseProps).children}</>;
      }
    }
  }
  
  return null;
}