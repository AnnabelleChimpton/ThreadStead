import React, { useEffect, useState } from "react";
import LoginButton from "@/components/LoginButton";
import IdentityManager from "@/components/IdentityManager";
import Link from "next/link";

type Me = { loggedIn: boolean; user?: { id: string; did: string; primaryHandle: string | null } };

export default function LoginStatus() {
  const [me, setMe] = useState<Me>({ loggedIn: false });
  const [showIdentityManager, setShowIdentityManager] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (alive) setMe(data);
    })();
    return () => { alive = false; };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout");
    window.location.reload();
  }

  if (!me.loggedIn) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="thread-label">visitor mode</span>
          <LoginButton />
          <button
            onClick={() => setShowIdentityManager(!showIdentityManager)}
            className="thread-button text-sm"
          >
            Manage Identity
          </button>
        </div>
        {showIdentityManager && <IdentityManager />}
      </div>
    );
  }

  const path = me.user?.primaryHandle
    ? `/${me.user.primaryHandle.split("@")[0]}`
    : `/u/${me.user?.id}`; // fallback route if you add one later

  return (
    <div className="space-y-4">
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
          className="thread-button text-sm"
        >
          Identity
        </button>
      </div>
      {showIdentityManager && <IdentityManager />}
    </div>
  );
}
