import React from "react";
import Link from "next/link";

interface SimpleNavigationBarProps {
  className?: string;
  fullWidth?: boolean;
}

export default function SimpleNavigationBar({ className = "", fullWidth = false }: SimpleNavigationBarProps) {
  // Static component with no dynamic behavior - safe for compilation
  return (
    <header className={`site-header border-b border-thread-sage bg-thread-cream px-4 sm:px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95 relative ${className}`}>
      <nav className={`site-navigation ${fullWidth ? 'w-full px-2 sm:px-4' : 'mx-auto max-w-5xl'} flex items-center justify-between`}>
        <div className="site-branding flex-shrink-0">
          <Link href="/" className="no-underline">
            <h1 className="site-title thread-headline text-xl sm:text-2xl font-bold text-thread-pine">ThreadStead</h1>
            <span className="site-tagline thread-label hidden sm:inline">Connect through creativity</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="site-nav-container hidden lg:flex items-center gap-8">
          <div className="site-nav-links flex items-center gap-6">
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/">Home</Link>
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/feed">Discovery</Link>
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/threadrings">ThreadRings</Link>
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/getting-started">Help</Link>
          </div>
          
          <div className="site-nav-actions flex items-center gap-4">
            <div className="site-auth">
              <div className="flex items-center gap-2">
                <Link className="text-thread-pine hover:text-thread-sunset" href="/login">Login</Link>
                <Link className="text-sm text-thread-sage hover:text-thread-sunset" href="/register">Sign Up</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden items-center gap-2">
          <button className="p-2 text-thread-pine hover:text-thread-sunset" aria-label="Toggle menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
}