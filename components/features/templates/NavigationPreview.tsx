import React from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import MinimalNavBar from '@/components/ui/navigation/MinimalNavBar';
import { useNavPages } from '@/hooks/useNavPages';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';

interface NavigationPreviewProps extends UniversalCSSProps {
  // Visual Builder styling props
  navBackgroundColor?: string; // Renamed to avoid collision
  navTextColor?: string; // Renamed to avoid collision
  navOpacity?: number;
  navBlur?: number;
  navBorderColor?: string; // Renamed to avoid collision
  navBorderWidth?: number;
  // Dropdown styling props
  dropdownBackgroundColor?: string;
  dropdownTextColor?: string;
  dropdownBorderColor?: string;
  dropdownHoverColor?: string;
  className?: string;
}

/**
 * Unstyled dropdown component for NavigationPreview
 */
interface UnstyledDropdownProps {
  title: string;
  items: { href: string; label: string }[];
  textColor: string;
  dropdownBackgroundColor: string;
  dropdownTextColor: string;
  dropdownBorderColor: string;
  dropdownHoverColor: string;
}

function UnstyledDropdown({
  title,
  items,
  textColor,
  dropdownBackgroundColor,
  dropdownTextColor,
  dropdownBorderColor,
  dropdownHoverColor
}: UnstyledDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [buttonRect, setButtonRect] = React.useState<DOMRect | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Handle outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonStyle = {
    textDecoration: 'none',
    color: textColor === 'inherit' ? 'inherit' : textColor,
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    fontSize: 'inherit',
    fontFamily: 'inherit'
  };


  const itemStyle = {
    display: 'block',
    padding: '8px 16px',
    color: dropdownTextColor,
    textDecoration: 'none',
    transition: 'background-color 0.2s, color 0.2s',
  };

  return (
    <div
      style={{ position: 'relative' }}
      ref={dropdownRef}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        style={buttonStyle}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => {
          if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setButtonRect(rect);
          }
          setIsOpen(true);
        }}
      >
        {title}
        <svg
          style={{
            width: '16px',
            height: '16px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Portal the dropdown to document.body to bypass stacking context issues */}
      {isOpen && buttonRect && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${buttonRect.bottom + 8}px`,
            left: `${buttonRect.left}px`,
            width: '192px',
            backgroundColor: dropdownBackgroundColor,
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: `1px solid ${dropdownBorderColor}`,
            padding: '8px 0',
            zIndex: 999999, // Very high z-index since it's now in document.body
          }}
          onMouseLeave={() => setIsOpen(false)}
        >
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              style={itemStyle}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = dropdownHoverColor;
                (e.target as HTMLElement).style.color = textColor;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = dropdownTextColor;
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * Navigation Preview component for Visual Builder
 * Wraps MinimalNavBar with customizable styling properties
 * This component is non-draggable and fixed to the top position
 */
export default function NavigationPreview(props: NavigationPreviewProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    navBackgroundColor = 'rgba(0, 0, 0, 0.1)',
    navTextColor = 'inherit',
    navOpacity = 1,
    navBlur = 10,
    navBorderColor = 'rgba(255, 255, 255, 0.2)',
    navBorderWidth = 1,
    dropdownBackgroundColor = 'white',
    dropdownTextColor = '#374151', // gray-700
    dropdownBorderColor = '#e5e7eb', // gray-200
    dropdownHoverColor = '#f3f4f6', // gray-100
    className: customClassName
  } = componentProps;

  // Create component-specific styles
  const componentStyles: React.CSSProperties = {
    backgroundColor: navBackgroundColor,
    color: navTextColor,
    opacity: navOpacity,
    backdropFilter: `blur(${navBlur}px)`,
    borderBottomColor: navBorderColor,
    borderBottomWidth: `${navBorderWidth}px`,
    borderBottomStyle: 'solid',
    // Visual Builder compatible positioning and sizing
    display: 'block',
    width: '100%',
    minWidth: '100%',
    minHeight: '70px', // Ensure consistent height
    boxSizing: 'border-box',
    position: 'relative',
    zIndex: 1000, // Higher z-index to ensure navigation and dropdowns render above components
    overflow: 'visible', // Ensure content isn't clipped
  };

  // Merge with CSS props (CSS props win)
  const customHeaderStyle = {
    ...componentStyles,
    ...applyCSSProps(cssProps)
  };

  return (
    <div
      className={customClassName}
      style={customHeaderStyle}
      data-component-type="navigation"
    >
      {/* Use a modified version of MinimalNavBar content */}
      <NavigationContent
        backgroundColor={navBackgroundColor}
        textColor={navTextColor}
        blur={navBlur}
        borderColor={navBorderColor}
        borderWidth={navBorderWidth}
        dropdownBackgroundColor={dropdownBackgroundColor}
        dropdownTextColor={dropdownTextColor}
        dropdownBorderColor={dropdownBorderColor}
        dropdownHoverColor={dropdownHoverColor}
      />

      {/* Visual Builder helper: ensure full width background coverage */}
      <style jsx global>{`
        /* Target the outer wrapper div that contains navigation */
        div[data-component-id*="threadsteadnavigation"] {
          /* Force full width and height override */
          width: 100% !important;
          min-width: 100% !important;
          height: auto !important;
          min-height: 70px !important;
          max-height: 100px !important;
          left: 0 !important;
        }

        div[data-component-type="navigation"] {
          /* Force full width in Visual Builder canvas */
          min-width: 100% !important;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}

/**
 * Navigation content component - mirrors MinimalNavBar but with customizable styling and dropdowns
 */
function NavigationContent({
  backgroundColor,
  textColor,
  blur,
  borderColor,
  borderWidth,
  dropdownBackgroundColor,
  dropdownTextColor,
  dropdownBorderColor,
  dropdownHoverColor
}: {
  backgroundColor: string;
  textColor: string;
  blur: number;
  borderColor: string;
  borderWidth: number;
  dropdownBackgroundColor: string;
  dropdownTextColor: string;
  dropdownBorderColor: string;
  dropdownHoverColor: string;
}) {
  const [me, setMe] = React.useState<{ loggedIn: boolean; user?: { primaryHandle?: string } }>({ loggedIn: false });
  const { pages: navPages } = useNavPages();

  // Organize navigation pages by dropdown
  const topLevelPages = navPages.filter(page => !page.navDropdown);
  const discoveryPages = navPages.filter(page => page.navDropdown === 'discovery');
  const threadRingsPages = navPages.filter(page => page.navDropdown === 'threadrings');
  const helpPages = navPages.filter(page => page.navDropdown === 'help');

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (alive) setMe(data);
      } catch (error) {
        console.warn("Failed to fetch user data for navigation preview");
      }
    })();
    return () => { alive = false; };
  }, []);

  const linkStyle = {
    textDecoration: 'none',
    color: textColor === 'inherit' ? 'inherit' : textColor,
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  };

  const buttonStyle = {
    ...linkStyle,
    backgroundColor: `${textColor === 'inherit' ? 'rgba(255, 255, 255, 0.1)' : textColor + '20'}`,
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      minWidth: '100%',
      boxSizing: 'border-box',
      padding: '1rem 2rem',
      margin: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: textColor === 'inherit' ? 'inherit' : textColor }}>
          ThreadStead
        </h1>
        <span style={{ opacity: 0.7, fontSize: '0.9rem', color: textColor === 'inherit' ? 'inherit' : textColor }}>
          @ ThreadStead
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {/* Main Navigation Links with Dropdowns */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/" style={linkStyle}>Home</Link>
          <Link href="/discover" style={linkStyle}>Discover</Link>

          {/* My Space dropdown - personal content */}
          {me.loggedIn && (
            <UnstyledDropdown
              title="My Space"
              textColor={textColor === 'inherit' ? 'inherit' : textColor}
              dropdownBackgroundColor={dropdownBackgroundColor}
              dropdownTextColor={dropdownTextColor}
              dropdownBorderColor={dropdownBorderColor}
              dropdownHoverColor={dropdownHoverColor}
              items={[
                { href: "/bookmarks", label: "Bookmarks" },
                { href: "/feed", label: "Feed" },
                ...(me.user?.primaryHandle ? [
                  { href: `/home/${me.user.primaryHandle.split('@')[0]}`, label: "My Pixel Home" },
                  { href: `/resident/${me.user.primaryHandle.split('@')[0]}`, label: "My Profile" }
                ] : [])
              ]}
            />
          )}

          {/* Community dropdown - social features */}
          <UnstyledDropdown
            title="Community"
            textColor={textColor === 'inherit' ? 'inherit' : textColor}
            dropdownBackgroundColor={dropdownBackgroundColor}
            dropdownTextColor={dropdownTextColor}
            dropdownBorderColor={dropdownBorderColor}
            dropdownHoverColor={dropdownHoverColor}
            items={[
              { href: "/neighborhood/explore/all", label: "All Homes" },
              { href: "/neighborhood/explore/recent", label: "Recent Activity" },
              { href: "/directory", label: "Directory" },
              { href: "/threadrings", label: "ThreadRings" },
              { href: "/tr/spool", label: "The Spool" },
              { href: "/threadrings/genealogy", label: "Genealogy" },
              ...discoveryPages.map(page => ({
                href: `/page/${page.slug}`,
                label: page.title
              })),
              ...threadRingsPages.map(page => ({
                href: `/page/${page.slug}`,
                label: page.title
              }))
            ]}
          />

          {/* Help dropdown - resources and tutorials */}
          <UnstyledDropdown
            title="Help"
            textColor={textColor === 'inherit' ? 'inherit' : textColor}
            dropdownBackgroundColor={dropdownBackgroundColor}
            dropdownTextColor={dropdownTextColor}
            dropdownBorderColor={dropdownBorderColor}
            dropdownHoverColor={dropdownHoverColor}
            items={[
              { href: "/getting-started", label: "Getting Started" },
              { href: "/design-tutorial", label: "Design Tutorial" },
              { href: "/design-css-tutorial", label: "Design CSS Tutorial" },
              ...helpPages.map(page => ({
                href: `/page/${page.slug}`,
                label: page.title
              })),
              ...topLevelPages.map(page => ({
                href: `/page/${page.slug}`,
                label: page.title
              }))
            ]}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {me.loggedIn && (
            <Link href="/post/new" style={buttonStyle}>New Post</Link>
          )}

          {me.loggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ opacity: 0.8, fontSize: '0.9rem', color: textColor === 'inherit' ? 'inherit' : textColor }}>
                {me.user?.primaryHandle || 'User'}
              </span>
              <Link href="/settings" style={linkStyle}>Settings</Link>
              <Link href="/logout" style={linkStyle}>Logout</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/login" style={linkStyle}>Login</Link>
              <Link href="/signup" style={buttonStyle}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}