import React, { useEffect, useState } from "react";
import AuthenticationDropdown from "@/components/AuthenticationDropdown";
import UserDropdown from "@/components/UserDropdown";

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
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">visitor mode</span>
        <AuthenticationDropdown />
      </div>
    );
  }

  return <UserDropdown />;
}
