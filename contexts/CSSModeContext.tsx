import React, { createContext, useContext, ReactNode } from 'react';

export type CSSMode = 'inherit' | 'override' | 'disable';
export type TemplateMode = 'default' | 'enhanced' | 'advanced';

interface CSSModeContextValue {
  cssMode: CSSMode;
  templateMode: TemplateMode;
}

const CSSModeContext = createContext<CSSModeContextValue>({
  cssMode: 'inherit',
  templateMode: 'default',
});

interface CSSModeProviderProps {
  children: ReactNode;
  cssMode: CSSMode;
  templateMode: TemplateMode;
}

export function CSSModeProvider({
  children,
  cssMode,
  templateMode,
}: CSSModeProviderProps) {
  return (
    <CSSModeContext.Provider value={{ cssMode, templateMode }}>
      {children}
    </CSSModeContext.Provider>
  );
}

export function useCSSMode() {
  return useContext(CSSModeContext);
}

export { CSSModeContext };