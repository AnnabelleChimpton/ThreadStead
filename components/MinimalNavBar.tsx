import React, { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Completely unstyled navigation bar for advanced templates.
 * Zero CSS classes, zero styling, zero interference.
 * Users can style this entirely with their own CSS.
 */
export default function MinimalNavBar() {
  const [me, setMe] = useState<{ loggedIn: boolean; user?: { primaryHandle?: string } }>({ loggedIn: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (alive) setMe(data);
      } catch (error) {
        console.warn("Failed to fetch user data for minimal nav");
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      backgroundColor: 'rgba(0, 0, 0, 0.1)'
    }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>ThreadStead</h1>
          <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>@ ThreadStead</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background-color 0.2s' }}>Home</Link>
            <Link href="/directory" style={{ textDecoration: 'none', color: 'inherit', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background-color 0.2s' }}>Discovery</Link>
            <Link href="/threadrings" style={{ textDecoration: 'none', color: 'inherit', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background-color 0.2s' }}>ThreadRings</Link>
            <Link href="/help" style={{ textDecoration: 'none', color: 'inherit', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background-color 0.2s' }}>Help</Link>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {me.loggedIn && (
              <Link href="/post/new" style={{ 
                textDecoration: 'none', 
                color: 'inherit', 
                padding: '0.5rem 1rem', 
                borderRadius: '4px', 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transition: 'background-color 0.2s'
              }}>New Post</Link>
            )}
            
            {me.loggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ opacity: 0.8, fontSize: '0.9rem' }}>{me.user?.primaryHandle || 'User'}</span>
                <Link href="/settings" style={{ textDecoration: 'none', color: 'inherit', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background-color 0.2s' }}>Settings</Link>
                <Link href="/logout" style={{ textDecoration: 'none', color: 'inherit', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background-color 0.2s' }}>Logout</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Link href="/login" style={{ textDecoration: 'none', color: 'inherit', padding: '0.5rem 1rem', borderRadius: '4px', transition: 'background-color 0.2s' }}>Login</Link>
                <Link href="/signup" style={{ 
                  textDecoration: 'none', 
                  color: 'inherit', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transition: 'background-color 0.2s'
                }}>Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}