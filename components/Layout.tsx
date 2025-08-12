import React from "react";
import Link from "next/link";
import LoginButton from "./LoginButton";
import LoginStatus from "./LoginStatus";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen retro-surface">
      <header className="border-b border-black bg-yellow-200 px-4 py-3">
        <nav className="mx-auto max-w-4xl flex items-center justify-between">
          <h1 className="text-2xl font-bold retro-header-text">Social Media Template</h1>
          <div className="space-x-4">
            <Link className="underline" href="/">Home</Link>
            <Link className="underline" href="/directory">Directory</Link>
            <LoginStatus />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl p-4">{children}</main>

      <footer className="border-t border-black bg-yellow-200 px-4 py-3 text-center">
        © {new Date().getFullYear()} Retro Social
      </footer>
    </div>
  );
}
