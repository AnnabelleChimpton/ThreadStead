import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SiteConfig } from '@/lib/config/site/dynamic';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface WelcomeModalProps {
  siteConfig: SiteConfig;
}

/**
 * WelcomeModal - Shows landing page content to visitors after brief exploration
 *
 * Features:
 * - Appears after 5-10s delay (7s default)
 * - Dismissible with X button
 * - Session storage tracks "dismissed" state
 * - Only shown once per session
 * - Contains full landing page content with CTAs
 */
export default function WelcomeModal({ siteConfig }: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Check if modal was already dismissed this session
    const wasDismissed = sessionStorage.getItem('welcomeModalDismissed') === 'true';

    if (wasDismissed) {
      return;
    }

    // Show modal after 7 second delay
    const timer = setTimeout(() => {
      setShouldRender(true);
      // Small additional delay for fade-in animation
      setTimeout(() => setIsVisible(true), 50);
    }, 7000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Mark as dismissed in session storage
    sessionStorage.setItem('welcomeModalDismissed', 'true');
    // Remove from DOM after animation
    setTimeout(() => setShouldRender(false), 300);
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop - Very light overlay */}
      <div
        className={`fixed inset-0 transition-all duration-300 ${
          isVisible ? 'bg-black bg-opacity-10 backdrop-blur-sm' : 'bg-opacity-0'
        }`}
        style={{ zIndex: 9999 }}
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 pointer-events-none transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: 10000 }}
      >
        <div
          className="bg-[#FCFAF7] border-2 border-[#A18463] rounded-lg shadow-[8px_8px_0_#000] max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="sticky top-4 right-4 float-right ml-4 mb-4 w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full border border-gray-400 transition-colors z-10"
            aria-label="Close modal"
          >
            <span className="text-lg leading-none">×</span>
          </button>

          {/* Modal Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Welcome Section */}
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-4 flex justify-center items-center gap-2">
                <PixelIcon name="home" size={48} /> <PixelIcon name="bookmark" size={48} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-[#2E4B3F]">
                Welcome to {siteConfig.site_name}
              </h1>
              <p className="text-base sm:text-lg text-gray-700 mb-4">
                <strong>Create your pixel home, join ThreadRings (themed communities), and connect with creative people in a retro-inspired social platform.</strong>
              </p>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Build your unique space, discover amazing communities, and share your creativity with the world.
              </p>

              {/* Primary CTA */}
              <div className="mb-4">
                <Link
                  href="/signup"
                  className="border border-black px-6 sm:px-8 py-3 sm:py-4 bg-yellow-200 hover:bg-yellow-100 shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] inline-block text-lg sm:text-xl font-bold transition-all transform hover:-translate-y-0.5"
                >
                  <PixelIcon name="zap" className="inline-block align-middle mr-1" /> Start Your Journey
                </Link>
              </div>

              {/* Secondary actions */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 mb-4">
                <Link
                  href="/feed"
                  onClick={handleDismiss}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-black shadow-[2px_2px_0_#000] font-medium text-sm transition-colors"
                >
                  <PixelIcon name="eye" />
                  <span>Browse as Guest</span>
                </Link>
                <Link
                  href="/getting-started"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-black shadow-[2px_2px_0_#000] font-medium text-sm transition-colors"
                >
                  <PixelIcon name="script" />
                  <span>Learn More</span>
                </Link>
              </div>

              {/* Login link */}
              <div className="text-sm">
                <span className="text-gray-500">Already a member?</span>{' '}
                <Link
                  href="/login"
                  className="text-thread-pine hover:text-thread-sunset underline font-medium"
                >
                  Sign in here
                </Link>
              </div>
            </div>

            {/* How It Works */}
            <div className="border-t-2 border-gray-200 pt-6">
              <h2 className="text-xl font-bold mb-4 text-center text-[#2E4B3F]">
                How {siteConfig.site_name} Works
              </h2>
              <div className="text-center mb-4">
                <p className="text-sm text-gray-700">
                  Modern communities inspired by the early web&apos;s <strong>WebRings</strong> — but better!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-gray-300 p-4 bg-blue-50 rounded text-center">
                  <div className="text-2xl mb-2 flex justify-center"><PixelIcon name="home" size={32} /></div>
                  <h3 className="font-bold mb-2 text-sm sm:text-base">Create Your Space</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Build a unique pixel home and customize your profile
                  </p>
                </div>
                <div className="border border-gray-300 p-4 bg-green-50 rounded text-center">
                  <div className="text-2xl mb-2 flex justify-center"><PixelIcon name="reload" size={32} /></div>
                  <h3 className="font-bold mb-2 text-sm sm:text-base">Join ThreadRings</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Find communities around your interests and hobbies
                  </p>
                </div>
                <div className="border border-gray-300 p-4 bg-purple-50 rounded text-center">
                  <div className="text-2xl mb-2 flex justify-center"><PixelIcon name="bookmark" size={32} /></div>
                  <h3 className="font-bold mb-2 text-sm sm:text-base">Share & Connect</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Post content that appears on your profile and in Ring feeds
                  </p>
                </div>
              </div>

              <div className="text-center mt-4">
                <Link
                  href="/threadrings"
                  className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] inline-block font-medium text-sm transition-all transform hover:-translate-y-0.5"
                >
                  <PixelIcon name="reload" className="inline-block align-middle mr-1" /> Explore Communities
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
