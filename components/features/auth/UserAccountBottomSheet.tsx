import React, { useEffect } from "react";
import Link from "next/link";
import { useMe } from "@/hooks/useMe";
import { PixelIcon } from "@/components/ui/PixelIcon";

interface UserAccountBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserAccountBottomSheet({ isOpen, onClose }: UserAccountBottomSheetProps) {
  const { me } = useMe();

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
    await fetch("/api/auth/logout");
    window.location.href = "/";
  }

  if (!me?.loggedIn) {
    return null;
  }

  const username = me.user?.primaryHandle?.split("@")[0] || "User";
  const isAdmin = me.user?.role === "admin";

  return (
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
            {/* Personal Navigation */}
            <Link
              href={`/home/${username}`}
              className="block px-3 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-3 min-h-[48px]"
              onClick={onClose}
            >
              <PixelIcon name="home" size={20} />
              <span className="font-medium">My Pixel Home</span>
            </Link>

            <Link
              href={`/resident/${username}`}
              className="block px-3 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-3 min-h-[48px]"
              onClick={onClose}
            >
              <PixelIcon name="user" size={20} />
              <span className="font-medium">My Profile</span>
            </Link>

            <Link
              href="/bookmarks"
              className="block px-3 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-3 min-h-[48px]"
              onClick={onClose}
            >
              <PixelIcon name="bookmark" size={20} />
              <span className="font-medium">Bookmarks</span>
            </Link>

            <div className="border-t border-gray-200 my-2"></div>

            {/* Settings & Account */}
            <Link
              href="/me"
              className="block px-3 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-3 min-h-[48px]"
              onClick={onClose}
            >
              <PixelIcon name="file" size={20} />
              <span className="font-medium">My Page</span>
            </Link>

            <Link
              href="/settings"
              className="block px-3 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-3 min-h-[48px]"
              onClick={onClose}
            >
              <PixelIcon name="sliders" size={20} />
              <span className="font-medium">Settings</span>
            </Link>

            {isAdmin && (
              <Link
                href="/settings/admin"
                className="block px-3 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center gap-3 min-h-[48px]"
                onClick={onClose}
              >
                <PixelIcon name="sliders" size={20} />
                <span className="font-medium">Admin Panel</span>
              </Link>
            )}
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
            className="account-logout-button w-full px-3 py-3 bg-red-50 border-2 border-red-400 text-red-700 hover:bg-red-100 hover:border-red-500 rounded flex items-center justify-center gap-3 min-h-[48px] font-medium active:scale-[0.98] transition-transform"
          >
            <PixelIcon name="external-link" size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
