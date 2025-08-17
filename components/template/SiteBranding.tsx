import React, { useState, useEffect } from "react";
import Link from "next/link";

interface SiteConfig {
  site_name: string;
  site_tagline: string;
}

export default function SiteBranding() {
  const [config, setConfig] = useState<SiteConfig>({ site_name: "Loading...", site_tagline: "" });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/site-config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (error) {
        console.error("Failed to fetch site config:", error);
      }
    };

    fetchConfig();
  }, []);

  return (
    <Link href="/" className="site-branding text-decoration-none">
      <h1 className="site-title thread-headline text-2xl font-bold text-thread-pine">{config.site_name}</h1>
      <span className="site-tagline thread-label">{config.site_tagline}</span>
    </Link>
  );
}