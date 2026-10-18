import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { SiteConfig } from '@/lib/config/site/dynamic';

interface HomeHeroProps {
    siteConfig: SiteConfig;
    userCount?: number;
}

// Inline pixel-art tiles so the hero has no image dependencies
// (the /assets/patterns/*.png files this originally referenced never existed)
const CLOUD_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='120'%3E%3Cg fill='%23ffffff' fill-opacity='0.9'%3E%3Crect x='16' y='28' width='72' height='20'/%3E%3Crect x='32' y='20' width='40' height='8'/%3E%3Crect x='44' y='12' width='16' height='8'/%3E%3Crect x='150' y='78' width='56' height='16'/%3E%3Crect x='162' y='70' width='28' height='8'/%3E%3C/g%3E%3C/svg%3E")`;

const GRASS_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='24'%3E%3Crect y='12' width='16' height='12' fill='%234FAF6D'/%3E%3Crect x='2' y='6' width='3' height='6' fill='%234FAF6D'/%3E%3Crect x='8' y='4' width='3' height='8' fill='%234FAF6D'/%3E%3Crect x='13' y='8' width='3' height='4' fill='%234FAF6D'/%3E%3Crect x='4' y='16' width='2' height='2' fill='%232E4B3F'/%3E%3Crect x='11' y='18' width='2' height='2' fill='%232E4B3F'/%3E%3C/svg%3E")`;

export default function HomeHero({ siteConfig, userCount }: HomeHeroProps) {
    return (
        <div className="relative w-full overflow-hidden rounded-cozy border-2 border-nb-ink-mid shadow-nb mb-8 bg-thread-sky">
            {/* Drifting pixel clouds */}
            <div
                className="absolute inset-0 opacity-50 hero-clouds"
                style={{ backgroundImage: CLOUD_TILE, backgroundSize: '240px 120px' }}
                aria-hidden="true"
            ></div>

            {/* Hero Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center pt-12 pb-14 px-4 sm:px-8 text-center">

                <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black text-nb-ink mb-4 drop-shadow-[2px_2px_0_rgba(255,255,255,0.8)] tracking-tight">
                    Have a home page <br className="sm:hidden" /> again.
                </h1>

                <p className="text-lg sm:text-xl text-nb-ink font-semibold mb-8 max-w-2xl leading-relaxed">
                    A little pixel house on a street of real people. <br className="hidden sm:block" />
                    Decorate the yard, keep your page behind the front door, sign your neighbors&apos; guestbooks.
                </p>

                {/* Primary CTA — .btn hooks take the site theme; utilities are the fallback */}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <Link
                        href="/signup"
                        className="btn btn--primary btn--lg inline-block px-6 py-3 text-lg font-bold no-underline bg-thread-cream text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                        <PixelIcon name="home" size={20} className="inline-block align-[-3px] mr-2" />
                        <span>Claim your plot</span>
                    </Link>

                    <Link
                        href="/neighborhood"
                        className="btn btn--secondary btn--lg inline-block px-6 py-3 text-lg font-bold no-underline bg-thread-paper text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                        <span>Have a look around</span>
                    </Link>
                </div>

                <p className="mt-3 text-sm text-nb-ink">It&apos;s free. Bring a lawn chair.</p>

                {/* Secondary links */}
                <div className="mt-5 flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-sm font-semibold text-nb-ink">
                    <Link href="/landing" className="py-1">How it works</Link>
                    <span aria-hidden="true">·</span>
                    <Link href="/help/faq" className="py-1">FAQ</Link>
                    <span aria-hidden="true">·</span>
                    <Link href="/feed" className="py-1">Read the feed</Link>
                </div>

                {/* Real resident count (hidden when zero) */}
                {userCount ? (
                    <div className="badge mt-6 inline-block bg-thread-paper border border-thread-sage rounded-full px-3 py-0.5 font-mono text-xs font-bold tracking-wide">
                        {userCount} neighbors have moved in
                    </div>
                ) : null}
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
