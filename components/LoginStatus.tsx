import React, { useEffect, useState, useRef } from "react";
import LoginButton from "@/components/LoginButton";
import IdentityManager from "@/components/IdentityManager";
import Link from "next/link";

type Me = { loggedIn: boolean; user?: { id: string; did: string; primaryHandle: string | null } };

export default function LoginStatus() {
  const [me, setMe] = useState<Me>({ loggedIn: false });
  const [showIdentityManager, setShowIdentityManager] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (alive) setMe(data);
    })();
    return () => { alive = false; };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowIdentityManager(false);
      }
    }

    if (showIdentityManager) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showIdentityManager]);

  async function logout() {
    await fetch("/api/auth/logout");
    window.location.reload();
  }

  if (!me.loggedIn) {
    return (
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-3">
          <span className="thread-label">visitor mode</span>
          <LoginButton 
            onToggleIdentity={() => setShowIdentityManager(!showIdentityManager)}
            isIdentityOpen={showIdentityManager}
          />
          <button
            onClick={() => setShowIdentityManager(!showIdentityManager)}
            className="px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
          >
            Identity
          </button>
        </div>
        {showIdentityManager && (
          <div className="absolute top-full right-0 mt-2 z-50 bg-thread-paper border border-thread-sage rounded-lg shadow-lg max-w-lg min-w-80 sm:min-w-96">
            <div className="max-h-96 overflow-y-auto p-4">
              <IdentityManager />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <span className="thread-label">signed in as</span>
          <span className="ml-1 font-medium text-thread-pine">{me.user?.primaryHandle || me.user?.did}</span>
        </div>
        <Link
          href={"/me"}
          className="thread-button text-sm"
        >
          My Page
        </Link>
        <button
          onClick={logout}
          className="px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded shadow-cozySm transition-all"
        >
          Log Out
        </button>
        <button
          onClick={() => setShowIdentityManager(!showIdentityManager)}
          className="px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded shadow-cozySm transition-all"
        >
          Identity
        </button>
      </div>
      {showIdentityManager && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-thread-paper border border-thread-sage rounded-lg shadow-lg max-w-lg min-w-80 sm:min-w-96">
          <div className="max-h-96 overflow-y-auto p-4">
            <IdentityManager />
          </div>
        </div>
      )}
    </div>
  );
}
