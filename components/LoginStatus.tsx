import React, { useEffect, useState } from "react";
import LoginButton from "@/components/LoginButton";
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
        <span className="thread-label text-sm">visitor mode</span>
        <LoginButton />
      </div>
    );
  }

  return <UserDropdown />;
}
