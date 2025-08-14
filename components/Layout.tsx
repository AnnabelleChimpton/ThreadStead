import React from "react";
import Link from "next/link";
import LoginStatus from "./LoginStatus";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen thread-surface">
      <header className="border-b border-thread-sage bg-thread-cream px-6 py-4">
        <nav className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="thread-headline text-2xl font-bold text-thread-pine">HomePageAgain</h1>
            <span className="thread-label">@ ThreadStead</span>
          </div>
          <div className="flex items-center gap-6">
            <Link className="text-thread-pine hover:text-thread-sunset transition-colors" href="/">Home</Link>
            <Link className="text-thread-pine hover:text-thread-sunset transition-colors" href="/directory">Directory</Link>
            <LoginStatus />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>

      <footer className="border-t border-thread-sage bg-thread-cream px-6 py-4">
        <div className="mx-auto max-w-5xl text-center">
          <span className="thread-label">A cozy corner of the web</span>
          <p className="text-sm text-thread-sage mt-1">© {new Date().getFullYear()} ThreadStead</p>
        </div>
      </footer>
    </div>
  );
}
