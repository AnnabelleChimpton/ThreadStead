import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface NavPage {
  id: string;
  title: string;
  slug: string;
}

interface DropdownMenuProps {
  title: string;
  items: { href: string; label: string }[];
}

function DropdownMenu({ title, items }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="relative" ref={dropdownRef}>
      <button
        className="nav-link text-thread-pine hover:text-thread-sunset font-medium flex items-center gap-1"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
      >
        {title}
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          onMouseLeave={() => setIsOpen(false)}
        >
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="block px-4 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavigationLinks() {
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

  const discoveryItems = [
    { href: "/feed", label: "Feed" },
    { href: "/directory", label: "Directory" },
    { href: "/threadrings", label: "ThreadRings" },
  ];

  const helpItems = [
    { href: "/getting-started", label: "Getting Started" },
    { href: "/design-tutorial", label: "Design Tutorial" },
    { href: "/design-css-tutorial", label: "Design CSS Tutorial" },
  ];

  // Add custom pages to help menu if they exist
  const allHelpItems = [
    ...helpItems,
    ...navPages.map(page => ({
      href: `/page/${page.slug}`,
      label: page.title
    }))
  ];

  return (
    <div className="site-nav-links flex items-center gap-6">
      <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium" href="/">
        Home
      </Link>
      
      <DropdownMenu title="Discovery" items={discoveryItems} />
      
      <DropdownMenu title="Help" items={allHelpItems} />
    </div>
  );
}