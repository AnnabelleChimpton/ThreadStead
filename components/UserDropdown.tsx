import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";

export default function UserDropdown() {
  const { me } = useMe();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function logout() {
    await fetch("/api/auth/logout");
    window.location.reload();
  }

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

  const userDisplayName = me.user?.primaryHandle || me.user?.did || "User";
  const isAdmin = me.user?.role === "admin";
  const username = me.user?.primaryHandle?.split("@")[0] || "User";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm text-thread-charcoal"
      >
        <span className="thread-label">{userDisplayName}</span>
        <span className="text-xs text-thread-sage">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 border border-thread-sage bg-thread-paper shadow-cozy rounded z-50">
          <div className="p-2 border-b border-thread-sage bg-thread-cream">
            <div className="text-xs thread-label">signed in as</div>
            <div className="font-medium text-thread-pine text-sm">@{userDisplayName}</div>
          </div>
          
          <div className="py-1">
            <Link
              href="/me"
              className="flex items-center gap-2 px-3 py-2 text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>👤</span>
              My Page
            </Link>
            
            <Link
              href="/identity"
              className="flex items-center gap-2 px-3 py-2 text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>🔑</span>
              Identity
            </Link>
            
            <Link
              href={`/resident/${username}/edit`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-thread-charcoal hover:bg-thread-cream"
              onClick={() => setIsOpen(false)}
            >
              <span>✏️</span>
              Edit Profile
            </Link>
            
            {isAdmin && (
              <Link
                href="/settings/admin"
                className="flex items-center gap-2 px-3 py-2 text-sm text-thread-charcoal hover:bg-thread-cream"
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
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-thread-charcoal hover:bg-thread-cream text-left"
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