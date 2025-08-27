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
        router.push("/login");
        return;
      }
      const handle = me.user?.primaryHandle?.split("@")[0];
      if (!handle) {
        router.push("/");
        return;
      }
      router.push(`/settings`);
    })();
  }, [router]);

  return (
    <Layout>
      <RetroCard title="Redirecting...">
        <div className="text-center py-8">
          <p className="mb-4">Redirecting to the unified settings page...</p>
          <p className="text-sm text-thread-sage">
            All user settings have been consolidated into a single, intuitive location.
          </p>
        </div>
      </RetroCard>
    </Layout>
  );
}
