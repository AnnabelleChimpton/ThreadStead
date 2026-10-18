import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import { useRouter } from "next/router";
import { PixelIcon } from '@/components/ui/PixelIcon';
import { accountMenuItems, isCurrentHref, pathOnly } from '@/components/ui/navigation/siteNav';

export default function UserDropdown() {
  const { me } = useMe();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right?: number; left?: number }>({ top: 0, right: 0 });

  async function logout() {
    await fetch("/api/auth/logout");
    window.location.href = "/";
  }

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Desktop: Align with button's right edge, but ensure it doesn't go off-screen
      const dropdownWidth = 192; // w-48 = 192px
      const rightPosition = viewportWidth - rect.right;
      const topPosition = rect.bottom + 4;

      // Check if dropdown would go off the left edge
      if (rightPosition > viewportWidth - dropdownWidth) {
        // Position from left edge instead
        setDropdownPosition({
          top: topPosition,
          left: Math.max(8, rect.left - dropdownWidth + rect.width)
        });
      } else {
        // Standard right-aligned positioning
        setDropdownPosition({
          top: topPosition,
          right: rightPosition
        });
      }
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!me?.loggedIn) {
    return null;
  }

  const username = me.user?.primaryHandle?.split("@")[0] || "User";
  const isAdmin = me.user?.role === "admin";
  const currentPath = pathOnly(router.asPath);

  // Desktop dropdown view
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="user-dropdown-trigger flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozy-sm text-thread-charcoal"
        title={username}
        aria-label={`Account menu for ${username}`}
        aria-expanded={isOpen}
      >
        {/* Icon until xl, handle from xl up (long handles truncate), so the nav bar fits at 1024 and 1280px */}
        <PixelIcon name="user" size={16} className="xl:hidden" aria-hidden="true" />
        <span className="thread-label hidden xl:inline-block max-w-[8rem] 2xl:max-w-[14rem] truncate align-bottom">{username}</span>
        <span className="text-xs text-thread-sage">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div
          className="user-dropdown-menu fixed w-48 max-w-[calc(100vw-1rem)] border border-thread-sage bg-thread-paper shadow-cozy rounded z-[10000]"
          style={{
            top: `${dropdownPosition.top}px`,
            ...(dropdownPosition.left !== undefined
              ? { left: `${dropdownPosition.left}px` }
              : { right: `${dropdownPosition.right}px` }
            )
          }}
        >
          <div className="p-2 border-b border-thread-sage bg-thread-cream">
            <div className="text-xs thread-label">signed in as</div>
            <div className="font-medium text-thread-pine text-xs sm:text-sm overflow-hidden text-ellipsis">{username}</div>
          </div>
          
          <div className="py-1">
            {accountMenuItems(username, isAdmin).map((item) => {
              const current = isCurrentHref(item.href, currentPath);
              return (
                <React.Fragment key={item.key}>
                  {item.groupStart && <div className="border-t border-thread-sage my-1"></div>}
                  <Link
                    href={item.href}
                    className={`user-dropdown-item flex items-center gap-2 px-3 py-2 text-xs sm:text-sm hover:bg-thread-cream ${current ? "text-thread-sunset font-medium" : "text-thread-charcoal"}`}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                  >
                    <PixelIcon name={item.icon} />
                    {item.label}
                  </Link>
                </React.Fragment>
              );
            })}

            <div className="border-t border-thread-sage my-1"></div>
            
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="user-dropdown-item flex items-center gap-2 w-full px-3 py-2 text-xs sm:text-sm text-thread-charcoal hover:bg-thread-cream text-left"
            >
              <PixelIcon name="logout" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}