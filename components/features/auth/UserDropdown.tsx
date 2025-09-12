import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";

export default function UserDropdown() {
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
      
      if (viewportWidth < 640) {
        // Mobile: Center the dropdown
        const dropdownWidth = Math.min(320, viewportWidth - 32); // Max 320px or viewport - 32px padding
        const centerPosition = (viewportWidth - dropdownWidth) / 2;
        const topPosition = rect.bottom + 4;
        
        setDropdownPosition({
          top: topPosition,
          left: centerPosition
        });
      } else {
        // Desktop: Align with button's right edge
        const rightPosition = viewportWidth - rect.right;
        const topPosition = rect.bottom + 4;
        
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
          className="user-dropdown-menu fixed w-80 max-w-[calc(100vw-2rem)] sm:w-48 border border-thread-sage bg-thread-paper shadow-cozy rounded z-[10000]"
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
            <Link
              href="/me"
              className="user-dropdown-item flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>👤</span>
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