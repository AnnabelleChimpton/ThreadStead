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
          <span className="text-sm opacity-70">You're not logged in.</span>
          <LoginButton />
          <button
            onClick={() => setShowIdentityManager(!showIdentityManager)}
            className="border border-black px-3 py-1 bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000] text-sm"
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
        <span className="text-sm">
          Signed in as <b>{me.user?.primaryHandle || me.user?.did}</b>
        </span>
        <Link
          href={"/me"}
          className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
        >
          My page
        </Link>
        <button
          onClick={logout}
          className="border border-black px-3 py-1 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
        >
          Log out
        </button>
        <button
          onClick={() => setShowIdentityManager(!showIdentityManager)}
          className="border border-black px-3 py-1 bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000] text-sm"
        >
          Manage Identity
        </button>
      </div>
      {showIdentityManager && <IdentityManager />}
    </div>
  );
}
