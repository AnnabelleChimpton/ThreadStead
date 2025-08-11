// lib/useHighlight.ts
import { useEffect, useRef } from "react";
import hljs from "highlight.js";

export function useHighlight(deps: any[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll("pre code").forEach((el) => {
      hljs.highlightElement(el as HTMLElement);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
