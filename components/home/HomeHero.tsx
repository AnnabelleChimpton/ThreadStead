import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { SiteConfig } from '@/lib/config/site/dynamic';
import { useState, useEffect } from 'react';

interface HomeHeroProps {
    siteConfig: SiteConfig;
    userCount?: number;
}

export default function HomeHero({ siteConfig, userCount }: HomeHeroProps) {
    // Use real user count if available, otherwise fallback to a default range for demo/loading
    const displayCount = userCount || 42;

    return (
        <div className="relative w-full overflow-hidden rounded-xl border-2 border-black shadow-[4px_4px_0_#000] mb-8 bg-[#87CEEB]">
            {/* Animated Background Layers (CSS animations would be ideal here, using static for now with structure for anims) */}
            <div className="absolute inset-0 bg-[url('/assets/patterns/clouds-pixel.png')] opacity-50 animate-slide-slow" style={{ backgroundSize: '200px' }}></div>

            {/* Hero Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center py-12 px-4 sm:px-8 text-center bg-gradient-to-b from-transparent via-white/20 to-white/80">

                {/* Main Headline with Pixel Shadow */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#2E4B3F] mb-4 drop-shadow-[2px_2px_0_rgba(255,255,255,0.8)] tracking-tight">
                    Welcome Home, <br className="sm:hidden" /> Neighbor.
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl md:text-2xl text-gray-900 font-bold mb-8 max-w-2xl leading-relaxed drop-shadow-sm">
                    Build your pixel home. Join themed neighborhoods. <br className="hidden sm:block" />
                    The internet is fun again.
                </p>

                {/* Primary CTA */}
                <div className="flex flex-col sm:flex-row gap-4 items-center animate-bounce-subtle">
                    <Link
                        href="/signup"
                        className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#FFD700] hover:bg-[#FFED4A] text-black border-2 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black text-xl rounded-lg"
                    >
                        <PixelIcon name="gift" size={24} className="mr-3" />
                        <span>Claim Your Plot</span>
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-black shadow-sm transform rotate-12 group-hover:rotate-0 transition-transform">
                            FREE!
                        </div>
                    </Link>

                    <Link
                        href="/feed"
                        className="inline-flex items-center justify-center px-8 py-4 bg-white hover:bg-gray-50 text-black border-2 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-bold text-lg rounded-lg"
                    >
                        <PixelIcon name="map" size={24} className="mr-3" />
                        <span>Explore Map</span>
                    </Link>
                </div>

                {/* Secondary Quick Links */}
                <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base font-bold text-[#2E4B3F]">
                    <Link href="/landing" className="hover:text-[#1a2e26] hover:underline inline-flex items-center gap-2 py-2 transition-colors">
                        <PixelIcon name="script" size={16} />
                        Learn More
                    </Link>
                    <Link href="/help/faq" className="hover:text-[#1a2e26] hover:underline inline-flex items-center gap-2 py-2 transition-colors">
                        <PixelIcon name="info-box" size={16} />
                        FAQ
                    </Link>
                    <Link href="/neighborhood/explore/all" className="hover:text-[#1a2e26] hover:underline inline-flex items-center gap-2 py-2 transition-colors">
                        <PixelIcon name="home" size={16} />
                        Explore Homes
                    </Link>
                </div>

                {/* Live Stats Badge */}
                <div className="mt-8 inline-flex items-center gap-2 bg-black/80 text-white px-4 py-2 rounded-full border-2 border-white/50 backdrop-blur-sm shadow-lg">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="font-mono text-sm font-bold tracking-wide">
                        <span className="text-green-400">JOIN:</span> {displayCount} PLOTS CLAIMED
                    </span>
                </div>
            </div>

            {/* Decorative Bottom Border */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-[url('/assets/patterns/grass-pixel.png')] bg-repeat-x" style={{ backgroundSize: '32px' }}></div>
        </div>
    );
}
