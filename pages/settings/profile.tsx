import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import RetroCard from "@/components/layout/RetroCard";

export default function SettingsProfile() {
  const router = useRouter();
  
  // Redirect to the new unified edit page
  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then(r => r.json());
      if (!me?.loggedIn) {
        router.push("/identity");
        return;
      }
      const handle = me.user?.primaryHandle?.split("@")[0];
      if (!handle) {
        router.push("/");
        return;
      }
      router.push(`/resident/${handle}/edit`);
    })();
  }, [router]);

  return (
    <Layout>
      <RetroCard title="Redirecting...">
        <div className="text-center py-8">
          <p className="mb-4">Redirecting to the new unified edit page...</p>
          <p className="text-sm text-thread-sage">
            Profile editing has been moved to a unified location with template editing.
          </p>
        </div>
      </RetroCard>
    </Layout>
  );
}
