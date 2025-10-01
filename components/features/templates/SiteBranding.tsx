import React, { useState, useEffect } from "react";
import Link from "next/link";
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface SiteConfig {
  site_name: string;
  site_tagline: string;
}

interface SiteBrandingProps extends UniversalCSSProps {
  className?: string;
}

export default function SiteBranding(props: SiteBrandingProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;
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
        // Site config fetch failed silently
      }
    };

    fetchConfig();
  }, []);

  const baseClasses = "site-branding text-decoration-none";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const linkClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  return (
    <Link href="/" className={linkClassName} style={style}>
      <h1 className="site-title thread-headline text-2xl font-bold text-thread-pine">{config.site_name}</h1>
      <span className="site-tagline thread-label">{config.site_tagline}</span>
    </Link>
  );
}