import React from "react";
import { useRouter } from "next/router";

export default function AuthenticationDropdown() {
  const router = useRouter();

  function handleSignIn() {
    router.push('/login');
  }

  function handleCreateAccount() {
    router.push('/signup');
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSignIn}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-black bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
      >
        <span>🔐</span>
        Sign In
      </button>
      
      <button
        onClick={handleCreateAccount}
        className="flex items-center gap-2 px-4 py-2 text-sm border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
      >
        <span>✨</span>
        Sign Up
      </button>
    </div>
  );
}