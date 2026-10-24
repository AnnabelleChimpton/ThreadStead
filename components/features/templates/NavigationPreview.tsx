import React from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { UniversalCSSProps, separateCSSProps, applyCSSProps } from '@/lib/templates/styling/universal-css-props';
import UserDropdown from '@/components/features/auth/UserDropdown';
import NotificationDropdown from '@/components/ui/feedback/NotificationDropdown';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { useNavPages } from '@/hooks/useNavPages';
import { NAV_SECTIONS } from '@/components/ui/navigation/siteNav';
import { MobileNavMenu, useIsDesktop } from '@/components/ui/navigation/NavBar';

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

  // Sizes in px, not rem: a page's own html font-size mustn't resize the
  // site's nav (template audit 03 F5b)
  const linkStyle = {
    textDecoration: 'none',
    color: textColor === 'inherit' ? 'inherit' : textColor,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 'inherit',
    fontFamily: 'inherit'
  };

  const buttonStyle = {
    color: textColor === 'inherit' ? 'inherit' : textColor,
    padding: '8px 12px',
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
          type="button"
          style={buttonStyle}
          aria-label={`${title} menu`}
          aria-expanded={isOpen}
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
        // data-site-chrome: portalled out of the nav, it's still the site's
        <div
          data-site-chrome
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
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={itemStyle}
              onClick={() => setIsOpen(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = dropdownHoverColor;
                e.currentTarget.style.color = textColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = dropdownTextColor;
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
  // One notification bell at a time: the phone menu has its own
  const isDesktop = useIsDesktop();
  const { pages: navPages } = useNavPages();

  // Admin-configured custom pages, placed the same way the site header places them
  const topLevelPages = navPages.filter((page) => !page.navDropdown);
  const customPageItems = (key?: string) =>
    key
      ? navPages
          .filter((page) => page.navDropdown === key)
          .map((page) => ({ href: `/page/${page.slug}`, label: page.title }))
      : [];

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
    padding: '8px 16px',
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
      padding: '16px 32px',
      margin: 0
    }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Not a heading: the page's own heading is its one <h1>
              (template audit 14 #7). Styled as the h1 it was. */}
          <span style={{
            display: 'block',
            margin: 0,
            fontSize: '24px',
            fontWeight: 'bold',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: textColor === 'inherit' ? '#2E4B3F' : textColor,
            fontFamily: 'Georgia, Times New Roman, serif'
          }}>
            {config.site_name}
          </span>
        </div>
        <span style={{
          display: 'inline-block',
          fontSize: '14px',
          opacity: 0.8,
          marginTop: '4px',
          color: textColor === 'inherit' ? '#2E4B3F' : textColor
        }}>
          {config.site_tagline}
        </span>
      </Link>

      {/* From lg (1024px), as the site header does; below it, the site's own phone menu */}
      <div className="hidden lg:flex" style={{ alignItems: 'center', gap: '32px' }}>
        {/* Main Navigation Links with Dropdowns */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {/* Same sections as the site header (siteNav.ts) */}
          {NAV_SECTIONS.map((section) => {
            const items = [
              ...(section.items ?? []).filter((item) => me.loggedIn || !item.signedInOnly),
              ...customPageItems(section.customPagesKey),
            ];
            if (!section.hubLabel) {
              return <Link key={section.key} href={section.href} style={linkStyle}>{section.title}</Link>;
            }
            return (
              <UnstyledDropdown
                key={section.key}
                title={section.title}
                href={section.href}
                textColor={textColor === 'inherit' ? 'inherit' : textColor}
                dropdownBackgroundColor={dropdownBackgroundColor}
                dropdownTextColor={dropdownTextColor}
                dropdownBorderColor={dropdownBorderColor}
                dropdownHoverColor={dropdownHoverColor}
                items={[{ href: section.href, label: section.hubLabel }, ...items]}
              />
            );
          })}

          {topLevelPages.map((page) => (
            <Link key={page.id} href={`/page/${page.slug}`} style={linkStyle}>{page.title}</Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {me.loggedIn ? (
            <>
              {/* Notification Bell - wrapped for inline style compatibility */}
              {isDesktop === true && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <NotificationDropdown />
                </div>
              )}
              {/* User Dropdown - wrapped for inline style compatibility */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <UserDropdown />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '16px' }}>
              <Link href="/login" style={linkStyle}>Login</Link>
              <Link href="/signup" style={buttonStyle}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
      <MobileNavMenu />
    </nav>
  );
}