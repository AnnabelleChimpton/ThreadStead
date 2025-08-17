import React, { useState, useEffect } from "react";
import Link from "next/link";

interface NavPage {
  id: string;
  title: string;
  slug: string;
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
        console.error("Failed to fetch navigation pages:", error);
      }
    };

    fetchNavPages();
  }, []);

  return (
    <div className="site-nav-links flex items-center gap-6">
      <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium" href="/">
        Home
      </Link>
      <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium" href="/feed">
        Feed
      </Link>
      <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium" href="/directory">
        Directory
      </Link>
      {navPages.map(page => (
        <Link 
          key={page.id} 
          className="nav-link text-thread-pine hover:text-thread-sunset font-medium" 
          href={`/page/${page.slug}`}
        >
          {page.title}
        </Link>
      ))}
    </div>
  );
}