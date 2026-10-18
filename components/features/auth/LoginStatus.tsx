import React from "react";
import AuthenticationDropdown from "@/components/features/auth/AuthenticationDropdown";
import UserDropdown from "@/components/features/auth/UserDropdown";
import { useMe } from "@/hooks/useMe";

export default function LoginStatus() {
  const { me, isLoading } = useMe();

  if (isLoading) {
    // Hold the space until /api/auth/me answers, so signed-in users never see "visitor mode"
    return <div className="w-24 h-8" aria-hidden="true" />;
  }

  if (!me.loggedIn) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm text-nb-ink-mid whitespace-nowrap hidden sm:inline">visitor mode</span>
        <AuthenticationDropdown />
      </div>
    );
  }

  return <UserDropdown />;
}
