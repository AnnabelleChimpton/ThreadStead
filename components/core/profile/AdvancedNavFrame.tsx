import React, { useLayoutEffect, useRef, useState } from "react";
import NavigationPreview from "@/components/features/templates/NavigationPreview";

interface AdvancedNavFrameProps {
  showNavigation: boolean;
  /** Site chrome under the nav, e.g. "Step back outside" */
  afterNav?: React.ReactNode;
  children: React.ReactNode;
}

// Advanced templates get the site nav as a position: fixed bar, so the page
// has to leave room under it. It used to leave a flat 70px, but the bar is
// taller than that (about 89px on desktop), so anything placed right under
// it was hidden. Measure the bar instead. The template itself renders
// client-side only (AdvancedProfileRenderer is ssr: false), so measuring
// before paint doesn't shift anything a visitor sees.
export default function AdvancedNavFrame({ showNavigation, afterNav, children }: AdvancedNavFrameProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(70);

  useLayoutEffect(() => {
    const bar = navRef.current?.firstElementChild as HTMLElement | null;
    if (!showNavigation || !bar) return;
    const measure = () => setNavHeight(Math.ceil(bar.getBoundingClientRect().height) || 70);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [showNavigation]);

  return (
    <>
      {/* The wrapper takes no space: its only child is position: fixed */}
      {showNavigation && <div ref={navRef}><NavigationPreview /></div>}
      <div style={{ marginTop: showNavigation ? `${navHeight}px` : 0 }}>
        {afterNav}
        {/* Absolute template children position from here, below afterNav */}
        <div style={{ position: "relative" }}>{children}</div>
      </div>
    </>
  );
}
