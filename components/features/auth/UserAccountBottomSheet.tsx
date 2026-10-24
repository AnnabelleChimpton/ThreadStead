import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import { useRouter } from "next/router";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { accountMenuItems, isCurrentHref, pathOnly } from "@/components/ui/navigation/siteNav";

interface UserAccountBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserAccountBottomSheet({ isOpen, onClose }: UserAccountBottomSheetProps) {
  const { me } = useMe();
  const router = useRouter();

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  // The header that renders this is blurred (backdrop-filter), which makes
  // it the box a fixed child is placed in: from body, the sheet is fixed to
  // the screen
  if (!me?.loggedIn || typeof document === "undefined") {
    return null;
  }

  const username = me.user?.primaryHandle?.split("@")[0] || "User";
  const isAdmin = me.user?.role === "admin";
  const currentPath = pathOnly(router.asPath);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`bottom-sheet-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className={`mobile-bottom-sheet ${isOpen ? 'open' : ''} bg-thread-paper border-t-2 border-thread-sage`}
        style={{
          maxHeight: '80vh',
        }}
      >
        {/* Drag Handle - Down Arrow to Close */}
        <button
          onClick={onClose}
          className="bottom-sheet-handle flex justify-center pt-3 pb-2 w-full cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
          aria-label="Close account menu"
        >
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* User Info Header */}
        <div className="account-sheet-header px-4 py-3 bg-thread-cream/50 border-b border-thread-sage">
          <div className="text-xs text-gray-500">signed in as</div>
          <div className="font-medium text-thread-pine text-base">{username}</div>
        </div>

        {/* Scrollable Content */}
        <div
          className="bottom-sheet-content overflow-y-auto"
          style={{
            maxHeight: 'calc(80vh - 120px)',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="px-4 py-3 space-y-1">
            {accountMenuItems(username, isAdmin).map((item) => {
              const current = isCurrentHref(item.href, currentPath);
              return (
                <React.Fragment key={item.key}>
                  {item.groupStart && <div className="border-t border-thread-sage/40 my-2"></div>}
                  <Link
                    href={item.href}
                    className={`block px-3 py-3 hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-3 min-h-[48px] ${current ? "bg-thread-background text-thread-sunset" : "text-thread-pine"}`}
                    aria-current={current ? "page" : undefined}
                    onClick={onClose}
                  >
                    <PixelIcon name={item.icon} size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Bottom Safe Area with Logout Button */}
        <div
          className="bottom-sheet-safe-area border-t border-thread-sage bg-thread-paper px-4 pt-3"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="account-logout-button w-full px-3 py-3 bg-thread-paper border-2 border-thread-sage text-thread-pine hover:bg-thread-cream rounded flex items-center justify-center gap-3 min-h-[48px] font-medium active:scale-[0.98] transition-transform"
          >
            <PixelIcon name="logout" size={20} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
