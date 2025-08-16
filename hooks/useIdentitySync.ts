import { useEffect, useState } from "react";
import { getExistingDid } from "@/lib/did-client";
import { useMe } from "@/hooks/useMe";

export function useIdentitySync() {
  const { me } = useMe();
  const [hasMismatch, setHasMismatch] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      setIsChecking(false);
      return;
    }
    
    // Only check if user is logged in on server
    if (me?.loggedIn && me.user) {
      const localIdentity = getExistingDid();
      
      // Check for mismatch: user logged in on server but no local identity or DID mismatch
      const mismatch = !localIdentity || localIdentity.did !== me.user.did;
      setHasMismatch(mismatch);
    } else {
      setHasMismatch(false);
    }
    
    setIsChecking(false);
  }, [me]);

  const fixMismatch = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return {
    hasMismatch,
    isChecking,
    fixMismatch,
    user: me?.user
  };
}