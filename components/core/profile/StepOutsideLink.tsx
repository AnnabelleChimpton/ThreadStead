import React from "react";
import Link from "next/link";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { trackNavigation } from "@/lib/analytics/pixel-homes";

interface StepOutsideLinkProps {
  username: string;
}

// The profile is the inside of the house; this is the way back out to
// /home/<u>. It's site chrome, not part of the resident's page: a full-width
// strip right under the site nav, in the same place on every profile.
//
// Its look lives in styles/globals.css (.ts-step-outside), unlayered and
// !important so advanced-template CSS can't restyle it, and data-site-chrome
// keeps default/enhanced profile CSS away from it (scopeAwayFromSiteChrome).
export default function StepOutsideLink({ username }: StepOutsideLinkProps) {
  return (
    <div data-site-chrome className="ts-step-outside">
      <Link
        href={`/home/${encodeURIComponent(username)}`}
        onClick={() => trackNavigation("profile", "pixel_home", username)}
      >
        <PixelIcon name="arrow-left" size={14} />
        Step back outside
      </Link>
    </div>
  );
}
