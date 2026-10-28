import React from "react";
import Link from "next/link";
import { FOOTER_COLUMNS } from "./siteNav";
import { SITE_TITLE, SOURCE_CODE_URL } from "@/lib/config/site/constants";

interface SiteFooterProps {
  siteDescription: string;
  /** Advanced templates keep the footer above their own stacking context */
  raised?: boolean;
}

// The footer mirrors the header's five sections, plus legal.
export default function SiteFooter({ siteDescription, raised = false }: SiteFooterProps) {
  return (
    <footer
      data-site-chrome
      className={`site-footer border-t border-thread-sage bg-thread-cream px-4 sm:px-6 py-8 mt-auto${raised ? " relative z-[9998]" : ""}`}
    >
      <div className="footer-content mx-auto max-w-6xl">
        <nav aria-label="Site map" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 mb-8">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="font-bold text-thread-pine mb-3 text-base">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link prefetch={false} href={link.href} className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-thread-sage pt-6 text-center">
          <p className="footer-tagline thread-label mb-2">{siteDescription}</p>
          <p className="footer-cookies text-sm text-thread-sage mb-2">
            I only use cookies to keep you logged in. No tracking, analytics or marketing.
          </p>
          <p className="footer-copyright text-sm text-thread-sage">
            © {new Date().getFullYear()} {SITE_TITLE} · <a href={SOURCE_CODE_URL}>the code is open source</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
