import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { SiteConfig } from '@/lib/config/site/dynamic';
import { useState, useEffect } from 'react';

interface HomeHeroProps {
    siteConfig: SiteConfig;
    userCount?: number;
}

// Inline pixel-art tiles so the hero has no image dependencies
// (the /assets/patterns/*.png files this originally referenced never existed)
const CLOUD_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='120'%3E%3Cg fill='%23ffffff' fill-opacity='0.9'%3E%3Crect x='16' y='28' width='72' height='20'/%3E%3Crect x='32' y='20' width='40' height='8'/%3E%3Crect x='44' y='12' width='16' height='8'/%3E%3Crect x='150' y='78' width='56' height='16'/%3E%3Crect x='162' y='70' width='28' height='8'/%3E%3C/g%3E%3C/svg%3E")`;

const GRASS_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='24'%3E%3Crect y='12' width='16' height='12' fill='%234FAF6D'/%3E%3Crect x='2' y='6' width='3' height='6' fill='%234FAF6D'/%3E%3Crect x='8' y='4' width='3' height='8' fill='%234FAF6D'/%3E%3Crect x='13' y='8' width='3' height='4' fill='%234FAF6D'/%3E%3Crect x='4' y='16' width='2' height='2' fill='%232E4B3F'/%3E%3Crect x='11' y='18' width='2' height='2' fill='%232E4B3F'/%3E%3C/svg%3E")`;

export default function HomeHero({ siteConfig, userCount }: HomeHeroProps) {
    // Use real user count if available, otherwise fallback to a default range for demo/loading
    const displayCount = userCount || 42;

    return (
        <div className="relative w-full overflow-hidden rounded-xl border-2 border-black shadow-[4px_4px_0_#000] mb-8 bg-[#87CEEB]">
            {/* Drifting pixel clouds */}
            <div
                className="absolute inset-0 opacity-50 hero-clouds"
                style={{ backgroundImage: CLOUD_TILE, backgroundSize: '240px 120px' }}
                aria-hidden="true"
            ></div>

            {/* Hero Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center py-12 px-4 sm:px-8 text-center bg-gradient-to-b from-transparent via-white/20 to-white/80">

                {/* Main Headline with Pixel Shadow */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#2E4B3F] mb-4 drop-shadow-[2px_2px_0_rgba(255,255,255,0.8)] tracking-tight">
                    Have a home page <br className="sm:hidden" /> again.
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl md:text-2xl text-gray-900 font-bold mb-8 max-w-2xl leading-relaxed drop-shadow-sm">
                    A little pixel house on a street of real people. <br className="hidden sm:block" />
                    Decorate the yard, keep your page behind the front door, sign your neighbors&apos; guestbooks.
                </p>

                {/* Primary CTA */}
                <div className="flex flex-col sm:flex-row gap-4 items-center animate-bounce-subtle">
                    <Link
                        href="/signup"
                        className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#FFD700] hover:bg-[#FFED4A] text-black border-2 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black text-xl rounded-lg"
                    >
                        <PixelIcon name="home" size={24} className="mr-3" />
                        <span>Claim your plot</span>
                    </Link>

                    <Link
                        href="/feed"
                        className="inline-flex items-center justify-center px-8 py-4 bg-white hover:bg-gray-50 text-black border-2 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-bold text-lg rounded-lg"
                    >
                        <PixelIcon name="eye" size={24} className="mr-3" />
                        <span>Have a look around</span>
                    </Link>
                </div>

                <p className="mt-3 text-sm text-gray-700">It&apos;s free. Bring a lawn chair.</p>

                {/* Secondary Quick Links */}
                <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base font-bold text-[#2E4B3F]">
                    <Link href="/landing" className="hover:text-[#1a2e26] hover:underline inline-flex items-center gap-2 py-2 transition-colors">
                        <PixelIcon name="script" size={16} />
                        How it works
                    </Link>
                    <Link href="/help/faq" className="hover:text-[#1a2e26] hover:underline inline-flex items-center gap-2 py-2 transition-colors">
                        <PixelIcon name="info-box" size={16} />
                        FAQ
                    </Link>
                    <Link href="/neighborhood/explore/all" className="hover:text-[#1a2e26] hover:underline inline-flex items-center gap-2 py-2 transition-colors">
                        <PixelIcon name="home" size={16} />
                        Walk the neighborhoods
                    </Link>
                </div>

                {/* Live Stats Badge */}
                <div className="mt-8 inline-flex items-center gap-2 bg-black/80 text-white px-4 py-2 rounded-full border-2 border-white/50 backdrop-blur-sm shadow-lg">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="font-mono text-sm font-bold tracking-wide">
                        {displayCount} neighbors have moved in
                    </span>
                </div>
            </div>

            {/* Pixel grass strip */}
            <div
                className="absolute bottom-0 left-0 right-0 h-6 bg-repeat-x"
                style={{ backgroundImage: GRASS_TILE, backgroundSize: '16px 24px', imageRendering: 'pixelated' }}
                aria-hidden="true"
            ></div>

            <style jsx>{`
                .hero-clouds {
                    animation: hero-clouds-drift 60s linear infinite;
                }
                @keyframes hero-clouds-drift {
                    from { background-position: 0 0; }
                    to { background-position: -240px 0; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .hero-clouds {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}
