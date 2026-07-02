import { useEffect, useState } from "react";
import { fetchAuthMe, peekAuthMe } from "./useCurrentUser";

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
  // Seed synchronously from the shared /api/auth/me cache when fresh.
  const cached = peekAuthMe();
  const [me, setMe] = useState<Me>(
    cached
      ? ({ ...cached, isLoading: false } as Me)
      : { loggedIn: false, isLoading: true }
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Shared cache + in-flight dedupe: concurrent mounts share one request.
        const data = await fetchAuthMe();
        if (alive) setMe({ ...data, isLoading: false } as Me);
      } catch (error) {
        if (alive) setMe({ loggedIn: false, isLoading: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  return { me, isLoading: me.isLoading };
}
