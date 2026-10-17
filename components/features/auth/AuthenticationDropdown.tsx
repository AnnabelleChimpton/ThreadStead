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
    <div className="auth-buttons flex items-center gap-2">
      <button
        onClick={handleSignIn}
        className="auth-button thread-button-secondary btn btn--secondary whitespace-nowrap text-xs sm:text-sm"
      >
        Sign In
      </button>
      
      <button
        onClick={handleCreateAccount}
        className="auth-button thread-button btn btn--primary whitespace-nowrap text-xs sm:text-sm"
      >
        Sign Up
      </button>
    </div>
  );
}