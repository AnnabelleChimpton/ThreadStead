import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";

interface UserDropdownProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export default function UserDropdown({ isMobile = false, onItemClick }: UserDropdownProps) {
  const { me } = useMe();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right?: number; left?: number }>({ top: 0, right: 0 });

  async function logout() {
    await fetch("/api/auth/logout");
    window.location.href = "/";
  }

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Desktop: Align with button's right edge, but ensure it doesn't go off-screen
      const dropdownWidth = 192; // w-48 = 192px
      const rightPosition = viewportWidth - rect.right;
      const topPosition = rect.bottom + 4;

      // Check if dropdown would go off the left edge
      if (rightPosition > viewportWidth - dropdownWidth) {
        // Position from left edge instead
        setDropdownPosition({
          top: topPosition,
          left: Math.max(8, rect.left - dropdownWidth + rect.width)
        });
      } else {
        // Standard right-aligned positioning
        setDropdownPosition({
          top: topPosition,
          right: rightPosition
        });
      }
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!me?.loggedIn) {
    return null;
  }

  const username = me.user?.primaryHandle?.split("@")[0] || "User";
  const isAdmin = me.user?.role === "admin";

  // Mobile inline view - renders as menu items instead of dropdown
  if (isMobile) {
    return (
      <div className="space-y-1">
        {/* User info header */}
        <div className="px-3 py-2 bg-thread-cream/50 rounded">
          <div className="text-xs text-gray-500">signed in as</div>
          <div className="font-medium text-thread-pine text-sm">{username}</div>
        </div>

        {/* User menu items - Personal Navigation */}
        <Link
          href={`/home/${username}`}
          className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-2"
          onClick={onItemClick}
        >
          <span>🏠</span>
          My Pixel Home
        </Link>

        <Link
          href={`/resident/${username}`}
          className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-2"
          onClick={onItemClick}
        >
          <span>👤</span>
          My Profile
        </Link>

        <Link
          href="/bookmarks"
          className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-2"
          onClick={onItemClick}
        >
          <span>🔖</span>
          Bookmarks
        </Link>

        <div className="border-t border-gray-200 my-1"></div>

        <Link
          href="/me"
          className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-2"
          onClick={onItemClick}
        >
          <span>📄</span>
          My Page
        </Link>

        <Link
          href="/settings"
          className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-2"
          onClick={onItemClick}
        >
          <span>⚙️</span>
          Settings
        </Link>

        {isAdmin && (
          <Link
            href="/settings/admin"
            className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-2"
            onClick={onItemClick}
          >
            <span>⚙️</span>
            Admin Panel
          </Link>
        )}

        <div className="border-t border-gray-200 my-1"></div>

        <button
          onClick={() => {
            onItemClick?.();
            logout();
          }}
          className="block w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-2"
        >
          <span>🚪</span>
          Log Out
        </button>
      </div>
    );
  }

  // Desktop dropdown view
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="user-dropdown-trigger flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm text-thread-charcoal"
      >
        <span className="thread-label">{username}</span>
        <span className="text-xs text-thread-sage">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div
          className="user-dropdown-menu fixed w-48 max-w-[calc(100vw-1rem)] border border-thread-sage bg-thread-paper shadow-cozy rounded z-[10000]"
          style={{
            top: `${dropdownPosition.top}px`,
            ...(dropdownPosition.left !== undefined
              ? { left: `${dropdownPosition.left}px` }
              : { right: `${dropdownPosition.right}px` }
            )
          }}
        >
          <div className="p-2 border-b border-thread-sage bg-thread-cream">
            <div className="text-xs thread-label">signed in as</div>
            <div className="font-medium text-thread-pine text-xs sm:text-sm overflow-hidden text-ellipsis">{username}</div>
          </div>
          
          <div className="py-1">
            {/* Personal Navigation */}
            <Link
              href={`/home/${username}`}
              className="user-dropdown-item flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>🏠</span>
              My Pixel Home
            </Link>

            <Link
              href={`/resident/${username}`}
              className="user-dropdown-item flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>👤</span>
              My Profile
            </Link>

            <Link
              href="/bookmarks"
              className="user-dropdown-item flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>🔖</span>
              Bookmarks
            </Link>

            <div className="border-t border-thread-sage my-1"></div>

            {/* Settings & Account */}
            <Link
              href="/me"
              className="user-dropdown-item flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>📄</span>
              My Page
            </Link>

            <Link
              href="/settings"
              className="user-dropdown-item flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>⚙️</span>
              Settings
            </Link>
            
            {isAdmin && (
              <Link
                href="/settings/admin"
                className="user-dropdown-item flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream"
                onClick={() => setIsOpen(false)}
              >
                <span>⚙️</span>
                Admin Panel
              </Link>
            )}
            
            <div className="border-t border-thread-sage my-1"></div>
            
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="user-dropdown-item flex items-center gap-2 w-full px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream text-left"
            >
              <span>🚪</span>
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}