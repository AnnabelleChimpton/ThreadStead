import React, { useEffect, useState } from "react";
import LoginButton from "@/components/LoginButton";
import Link from "next/link";

type Me = { loggedIn: boolean; user?: { id: string; did: string; primaryHandle: string | null } };

export default function LoginStatus() {
  const [me, setMe] = useState<Me>({ loggedIn: false });

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
      <div className="flex items-center gap-3">
        <span className="thread-label">visitor mode</span>
        <LoginButton />
        <Link
          href="/identity"
          className="px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
        >
          Identity
        </Link>
      </div>
    );
  }

  return (
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
      <Link
        href="/identity"
        className="px-3 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded shadow-cozySm transition-all"
      >
        Identity
      </Link>
    </div>
  );
}
