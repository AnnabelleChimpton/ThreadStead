import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface NavPage {
  id: string;
  title: string;
  slug: string;
}

interface NavigationLinksProps extends UniversalCSSProps {
  className?: string;
}

interface DropdownMenuProps {
  title: string;
  items: { href: string; label: string }[];
  href: string; // Link to the hub/landing page
}

function DropdownMenu({ title, items, href }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Icon mapping for navigation items
  const getItemIcon = (label: string): string => {
    const iconMap: { [key: string]: string } = {
      // Discover items
      'Neighborhoods': '🏘️',
      'Search': '🔍',
      'Feed': '📰',
      'Residents': '👥',

      // Build items
      'Templates': '🎨',
      'Getting Started': '🚀',

      // ThreadRings items
      'Browse Rings': '💍',
      'The Spool': '🧵',

      // Help items
      'FAQ': '❓',
      'Contact': '✉️',
    };
    return iconMap[label] || '•';
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef} data-dropdown-container>
      {/* Split button: Link to hub page + dropdown toggle */}
      <div className="flex items-center">
        {/* Left side: Link to hub/landing page */}
        <Link
          href={href}
          className="nav-link text-thread-pine hover:text-thread-sunset font-medium pr-1"
        >
          {title}
        </Link>

        {/* Right side: Dropdown toggle button */}
        <button
          ref={buttonRef}
          className="text-thread-pine hover:text-thread-sunset focus:outline-none pl-1 border-l border-thread-sage/30"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`${title} menu`}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
        >
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <span className="text-sm" role="img" aria-hidden="true">
                {getItemIcon(item.label)}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavigationLinks(props: NavigationLinksProps = {}) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;
  const [navPages, setNavPages] = useState<NavPage[]>([]);

  useEffect(() => {
    const fetchNavPages = async () => {
      try {
        const res = await fetch("/api/custom-pages");
        if (res.ok) {
          const data = await res.json();
          // Filter for pages that should appear in navigation
          const pages = data.pages?.filter((page: any) => page.showInNav) || [];
          setNavPages(pages);
        }
      } catch (error) {
        // Navigation fetch failed silently
      }
    };

    fetchNavPages();
  }, []);

  const baseClasses = "site-nav-links flex items-center gap-6";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const containerClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  return (
    <div className={containerClassName} style={style}>
      <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium" href="/">
        Home
      </Link>

      <DropdownMenu
        title="Discover"
        href="/discover"
        items={[
          { href: "/neighborhood/explore/all", label: "Neighborhoods" },
          { href: "/discover/residents", label: "Residents" },
          { href: "/discover/feed", label: "Feed" },
          { href: "/discover/search", label: "Search" },
        ]}
      />

      <DropdownMenu
        title="Build"
        href="/build"
        items={[
          { href: "/build/templates", label: "Templates" },
          { href: "/build/getting-started", label: "Getting Started" }
        ]}
      />

      <DropdownMenu
        title="ThreadRings"
        href="/threadrings"
        items={[
          { href: "/threadrings", label: "Browse Rings" },
          { href: "/tr/spool", label: "The Spool" },
        ]}
      />

      <DropdownMenu
        title="Help"
        href="/help"
        items={[
          { href: "/help/faq", label: "FAQ" },
          { href: "/help/contact", label: "Contact" },
        ]}
      />
    </div>
  );
}