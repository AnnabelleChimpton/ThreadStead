import React from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import UserDropdown from '@/components/features/auth/UserDropdown';
import NotificationDropdown from '@/components/ui/feedback/NotificationDropdown';
import { useSiteConfig } from '@/hooks/useSiteConfig';

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
  // Positioning mode - fixed for profiles, absolute for Visual Builder canvas
  positionMode?: 'fixed' | 'absolute';
}

/**
 * Unstyled dropdown component for NavigationPreview
 */
interface UnstyledDropdownProps {
  title: string;
  items: { href: string; label: string }[];
  href: string; // Link to the hub/landing page
  textColor: string;
  dropdownBackgroundColor: string;
  dropdownTextColor: string;
  dropdownBorderColor: string;
  dropdownHoverColor: string;
}

function UnstyledDropdown({
  title,
  items,
  href,
  textColor,
  dropdownBackgroundColor,
  dropdownTextColor,
  dropdownBorderColor,
  dropdownHoverColor
}: UnstyledDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [buttonRect, setButtonRect] = React.useState<DOMRect | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const splitButtonRef = React.useRef<HTMLDivElement>(null);

  // Icon mapping for navigation items
  const getItemIcon = (label: string): string => {
    const iconMap: { [key: string]: string } = {
      'Neighborhoods': '🏘️',
      'Search': '🔍',
      'Feed': '📰',
      'Residents': '👥',
      'Templates': '🎨',
      'Getting Started': '🚀',
      'Browse Rings': '💍',
      'The Spool': '🧵',
      'FAQ': '❓',
      'Contact': '✉️',
    };
    return iconMap[label] || '•';
  };

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

  const linkStyle = {
    textDecoration: 'none',
    color: textColor === 'inherit' ? 'inherit' : textColor,
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    fontSize: 'inherit',
    fontFamily: 'inherit'
  };

  const buttonStyle = {
    color: textColor === 'inherit' ? 'inherit' : textColor,
    padding: '0.5rem 0.75rem',
    borderRadius: '0 4px 4px 0',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    border: 'none',
    borderLeft: `1px solid ${textColor === 'inherit' ? 'rgba(161, 132, 99, 0.3)' : 'rgba(161, 132, 99, 0.3)'}`,
    background: 'transparent',
    fontSize: 'inherit',
    fontFamily: 'inherit'
  };

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    color: dropdownTextColor,
    textDecoration: 'none',
    transition: 'background-color 0.2s, color 0.2s',
  };

  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      ref={dropdownRef}
    >
      {/* Split button: Link + toggle */}
      <div ref={splitButtonRef} style={{ display: 'flex', alignItems: 'center' }}>
        {/* Left side: Link to hub page */}
        <Link href={href} style={linkStyle}>
          {title}
        </Link>

        {/* Right side: Dropdown toggle */}
        <button
          style={buttonStyle}
          onClick={() => {
            if (splitButtonRef.current) {
              const rect = splitButtonRef.current.getBoundingClientRect();
              setButtonRect(rect);
            }
            setIsOpen(!isOpen);
          }}
        >
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
      </div>

      {/* Portal the dropdown to document.body to bypass stacking context issues */}
      {isOpen && buttonRect && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${buttonRect.bottom + 8}px`,
            left: `${buttonRect.left}px`,
            minWidth: '224px',
            backgroundColor: dropdownBackgroundColor,
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: `1px solid ${dropdownBorderColor}`,
            padding: '8px 0',
            zIndex: 999999, // Very high z-index since it's now in document.body
          }}
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
              <span style={{ fontSize: '0.875rem' }}>{getItemIcon(item.label)}</span>
              <span>{item.label}</span>
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
    className: customClassName,
    positionMode = 'fixed' // Default to fixed for profiles
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
    position: positionMode,
    // Only set top/left/right for fixed mode (absolute mode relies on parent wrapper)
    ...(positionMode === 'fixed' && {
      top: 0,
      left: 0,
      right: 0,
    }),
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
  const { config } = useSiteConfig();

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
      <Link href="/" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: textColor === 'inherit' ? '#2E4B3F' : textColor,
            fontFamily: 'Georgia, Times New Roman, serif'
          }}>
            {config.site_name}
          </h1>
          <span style={{
            fontSize: '0.75rem',
            fontFamily: 'Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
            fontWeight: 'bold',
            padding: '0.125rem 0.5rem',
            backgroundColor: '#F5E9D4',
            border: '1px solid #A18463',
            borderRadius: '0.25rem',
            color: '#A18463',
            textTransform: 'uppercase',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            Beta
          </span>
        </div>
        <span style={{
          display: 'inline-block',
          fontSize: '0.875rem',
          opacity: 0.8,
          marginTop: '0.25rem',
          color: textColor === 'inherit' ? '#2E4B3F' : textColor
        }}>
          {config.site_tagline}
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {/* Main Navigation Links with Dropdowns */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/" style={linkStyle}>Home</Link>

          {/* Discover dropdown - Neighborhoods as hero */}
          <UnstyledDropdown
            title="Discover"
            href="/discover"
            textColor={textColor === 'inherit' ? 'inherit' : textColor}
            dropdownBackgroundColor={dropdownBackgroundColor}
            dropdownTextColor={dropdownTextColor}
            dropdownBorderColor={dropdownBorderColor}
            dropdownHoverColor={dropdownHoverColor}
            items={[
              { href: "/neighborhood/explore/all", label: "Neighborhoods" },
              { href: "/discover/residents", label: "Residents" },
              { href: "/discover/feed", label: "Feed" },
              { href: "/discover/search", label: "Search" },
            ]}
          />

          {/* Build dropdown */}
          <UnstyledDropdown
            title="Build"
            href="/build"
            textColor={textColor === 'inherit' ? 'inherit' : textColor}
            dropdownBackgroundColor={dropdownBackgroundColor}
            dropdownTextColor={dropdownTextColor}
            dropdownBorderColor={dropdownBorderColor}
            dropdownHoverColor={dropdownHoverColor}
            items={[
              { href: "/build/templates", label: "Templates" },
              { href: "/build/getting-started", label: "Getting Started" }
            ]}
          />

          {/* ThreadRings dropdown */}
          <UnstyledDropdown
            title="ThreadRings"
            href="/threadrings"
            textColor={textColor === 'inherit' ? 'inherit' : textColor}
            dropdownBackgroundColor={dropdownBackgroundColor}
            dropdownTextColor={dropdownTextColor}
            dropdownBorderColor={dropdownBorderColor}
            dropdownHoverColor={dropdownHoverColor}
            items={[
              { href: "/threadrings", label: "Browse Rings" },
              { href: "/tr/spool", label: "The Spool" },
            ]}
          />

          {/* Help dropdown */}
          <UnstyledDropdown
            title="Help"
            href="/help"
            textColor={textColor === 'inherit' ? 'inherit' : textColor}
            dropdownBackgroundColor={dropdownBackgroundColor}
            dropdownTextColor={dropdownTextColor}
            dropdownBorderColor={dropdownBorderColor}
            dropdownHoverColor={dropdownHoverColor}
            items={[
              { href: "/help/faq", label: "FAQ" },
              { href: "/help/contact", label: "Contact" },
            ]}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {me.loggedIn ? (
            <>
              {/* Notification Bell - wrapped for inline style compatibility */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <NotificationDropdown />
              </div>
              {/* User Dropdown - wrapped for inline style compatibility */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <UserDropdown />
              </div>
            </>
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