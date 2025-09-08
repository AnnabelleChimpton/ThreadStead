import React, { useEffect, useState } from "react";
import AuthenticationDropdown from "@/components/features/auth/AuthenticationDropdown";
import UserDropdown from "@/components/features/auth/UserDropdown";

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

  if (!me.loggedIn) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">visitor mode</span>
        <AuthenticationDropdown />
      </div>
    );
  }

  return <UserDropdown />;
}
