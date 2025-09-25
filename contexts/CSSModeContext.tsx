import React, { createContext, useContext, ReactNode } from 'react';

export type CSSMode = 'inherit' | 'override' | 'disable';
export type TemplateMode = 'default' | 'enhanced' | 'advanced';

interface CSSModeContextValue {
  cssMode: CSSMode;
  templateMode: TemplateMode;
  isVisualBuilder: boolean;
}

const CSSModeContext = createContext<CSSModeContextValue>({
  cssMode: 'inherit',
  templateMode: 'default',
  isVisualBuilder: false
});

interface CSSModeProviderProps {
  children: ReactNode;
  cssMode: CSSMode;
  templateMode: TemplateMode;
  isVisualBuilder?: boolean;
}

export function CSSModeProvider({
  children,
  cssMode,
  templateMode,
  isVisualBuilder = false
}: CSSModeProviderProps) {
  return (
    <CSSModeContext.Provider value={{ cssMode, templateMode, isVisualBuilder }}>
      {children}
    </CSSModeContext.Provider>
  );
}

export function useCSSMode() {
  return useContext(CSSModeContext);
}

export { CSSModeContext };