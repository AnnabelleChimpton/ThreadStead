// Error boundary for island rendering

import React from 'react';

interface IslandErrorBoundaryProps {
  children: React.ReactNode;
  islandId: string;
  /** The component's name, for the owner's note */
  component?: string;
  /** The page's owner is looking: they get a note, visitors get nothing */
  ownerSees?: boolean;
}

// Error boundary for islands rendering (P3.3 - Per-Island Error Boundaries).
// A component that fails leaves its spot empty for visitors, who used to see
// "Island Error (island-…)", and a plain note for the page's owner.
export class IslandErrorBoundary extends React.Component<IslandErrorBoundaryProps, { hasError: boolean }> {
  // The action/event system unwraps this boundary by name; minified class
  // names break that in production without an explicit displayName.
  static displayName = 'IslandErrorBoundary';

  constructor(props: IslandErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Island ${this.props.islandId} rendering error:`, error, errorInfo);
  }

  // Each component draws inside a <ts-island>, which has no box of its own
  // (styles/page-defaults.css): the site's reset applies inside it, and the
  // browser's defaults on the page around it (styles/preflight.css)
  render() {
    if (this.state.hasError && !this.props.ownerSees) return null;
    return React.createElement(
      'ts-island',
      null,
      this.state.hasError ? (
        <p className="island-error-fallback" role="status" style={{ padding: '8px 12px', border: '1px dashed currentColor', fontSize: '14px' }}>
          {this.props.component ? `<${this.props.component}>` : 'This part'} couldn&apos;t show here. Only you see this note.
        </p>
      ) : this.props.children
    );
  }
}
