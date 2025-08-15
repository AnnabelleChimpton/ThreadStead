import { useEffect, useState } from "react";

type Me = { 
  loggedIn: boolean; 
  isLoading?: boolean; 
  user?: { 
    id: string; 
    did: string; 
    role: string;
    primaryHandle: string | null;
  } 
};

export function useMe() {
  const [me, setMe] = useState<Me>({ loggedIn: false, isLoading: true });
  
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (alive) setMe({ ...data, isLoading: false });
      } catch (error) {
        if (alive) setMe({ loggedIn: false, isLoading: false });
      }
    })();
    return () => { alive = false; };
  }, []);
  
  return { me, isLoading: me.isLoading };
}
