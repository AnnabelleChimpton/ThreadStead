import { useEffect, useState } from "react";
import { getExistingDid } from "@/lib/api/did/did-client";
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
      
      // More intelligent mismatch detection:
      // 1. If no local identity exists, this might be:
      //    - An email-only login (legitimate)  
      //    - A fresh session after clearing storage (legitimate)
      //    - A device without stored keys (legitimate)
      // 2. Only show mismatch if we have local identity but wrong DID
      const mismatch = Boolean(localIdentity && localIdentity.did !== me.user.did);
      
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