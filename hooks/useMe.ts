import { useEffect, useState } from "react";
type Me = { loggedIn: boolean; user?: { id: string; did: string; primaryHandle: string | null } };

export function useMe() {
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
  return me;
}
