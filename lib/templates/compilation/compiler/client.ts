// Client-side utilities for template compilation
import type { CompileProfileRequest, CompileProfileResponse } from '@/pages/api/templates/compile-profile';

// Compile a profile template via API
export async function compileProfileTemplate(
  request: CompileProfileRequest
): Promise<CompileProfileResponse> {
  const response = await fetch('/api/templates/compile-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Hook for React components to compile templates
import { useState, useCallback } from 'react';

export interface UseTemplateCompilerResult {
  compile: (request: CompileProfileRequest) => Promise<CompileProfileResponse>;
  isCompiling: boolean;
  lastResult: CompileProfileResponse | null;
  error: string | null;
}

export function useTemplateCompiler(): UseTemplateCompilerResult {
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastResult, setLastResult] = useState<CompileProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compile = useCallback(async (request: CompileProfileRequest) => {
    setIsCompiling(true);
    setError(null);

    try {
      const result = await compileProfileTemplate(request);
      setLastResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCompiling(false);
    }
  }, []);

  return {
    compile,
    isCompiling,
    lastResult,
    error,
  };
}

// Utility to check if a template needs recompilation
export function shouldRecompile(
  templateCompiledAt: Date | null,
  profileUpdatedAt: Date | null
): boolean {
  if (!templateCompiledAt) return true;
  if (!profileUpdatedAt) return false;
  
  return profileUpdatedAt > templateCompiledAt;
}