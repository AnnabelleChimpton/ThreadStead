/**
 * @deprecated This page is deprecated and redirects to /templates
 *
 * REASON FOR DEPRECATION:
 * - /design-tutorial was redundant with the unified /templates system
 * - Visual Builder doesn't need a separate tutorial page (it's self-explanatory via drag-and-drop UI)
 * - The real component reference lives at /templates/components
 * - CSS customization guide moved to /design-css-tutorial
 *
 * MIGRATION PATH:
 * - All links now point to /templates (unified hub)
 * - A redirect is configured in next.config.ts: /design-tutorial → /templates
 *
 * TODO FOR FUTURE CLEANUP:
 * - Remove this file (pages/design-tutorial.tsx)
 * - Remove components/design-tutorial/ directory (RetroHeader, RetroNavigation, etc.)
 * - Remove componentData.tsx (CSS classes moved to /design-css-tutorial)
 * - Verify no external links point to /design-tutorial
 *
 * Date deprecated: January 2025
 * Can be safely removed: After 1-2 months (March 2025+)
 */

import React, { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";

// Import new componentized design tutorial components
import RetroHeader from "@/components/design-tutorial/RetroHeader";
import RetroNavigation from "@/components/design-tutorial/RetroNavigation";
import CategorySection from "@/components/design-tutorial/CategorySection";
import RetroFooter from "@/components/design-tutorial/RetroFooter";
import { componentCategories, componentData } from "@/components/design-tutorial/componentData";

interface DesignTutorialPageProps {
  siteConfig: SiteConfig;
}

export default function DesignTutorialPage({ siteConfig }: DesignTutorialPageProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('visual-builder');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Set initial category from URL parameter
  useEffect(() => {
    const { category } = router.query;
    if (category && typeof category === 'string') {
      const validCategories = componentCategories.map(cat => cat.id);
      if (validCategories.includes(category)) {
        setActiveCategory(category);
      }
    }
  }, [router.query]);

  // Get current user info
  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          const username = data.primaryHandle?.split('@')[0];
          setCurrentUser(username || null);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    }
    
    checkUser();
  }, []);

  // Get active category data
  const activeData = componentCategories.find(cat => cat.id === activeCategory);
  const components = componentData[activeCategory as keyof typeof componentData] || [];

  return (
    <Layout siteConfig={siteConfig}>
      <div className="min-h-screen bg-yellow-50 bg-pattern">
        {/* Add retro background pattern */}
        <style jsx global>{`
          .bg-pattern {
            background-image: 
              radial-gradient(circle at 25px 25px, rgba(255,255,255,.2) 2px, transparent 0),
              radial-gradient(circle at 75px 75px, rgba(255,255,255,.2) 2px, transparent 0);
            background-size: 100px 100px;
          }
        `}</style>

        <div className="w-full px-4 sm:px-6 py-8 sm:py-12 max-w-6xl mx-auto">
          {/* Mode Banner */}
          <div className="mb-4 p-3 bg-purple-50 border-2 border-purple-300 rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <span className="text-sm font-semibold">Visual Builder Mode</span>
            </div>
            <Link
              href="/templates"
              className="text-xs px-3 py-1 bg-white border border-purple-400 hover:bg-purple-100 transition-colors rounded"
            >
              Switch to Template Language →
            </Link>
          </div>

          {/* Breadcrumbs */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <Link href="/templates" className="hover:underline font-medium">
              Templates
            </Link>
            <span>→</span>
            <span className="text-gray-600">Visual Builder</span>
            <span>→</span>
            <span className="font-bold">Design Guide</span>
          </div>

          {/* Header */}
          <RetroHeader />

          {/* Navigation */}
          <RetroNavigation 
            categories={componentCategories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Category Content */}
          {activeData && (
            <CategorySection
              key={activeCategory}
              title={activeData.title}
              description={activeData.description}
              icon={activeData.icon}
              components={components}
              isActive={true}
            />
          )}

          {/* Component Reference CTA */}
          <div className="mt-16 mb-8">
            <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 border-4 border-black shadow-[12px_12px_0_#000] p-8 transform -rotate-1">
              <div className="bg-white border-4 border-black p-8 transform rotate-1">
                <div className="text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <h2 className="text-4xl font-black mb-4">Ready to Build?</h2>
                  <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
                    Browse our complete library of 200+ components available in the Visual Builder.
                    Find content, layout, retro, and interactive components with full documentation.
                  </p>
                  <Link
                    href="/templates/components?filter=visual-builder"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-purple-400 text-black font-black text-xl border-4 border-black shadow-[4px_4px_0_#000] hover:bg-purple-300 hover:shadow-[6px_6px_0_#000] transform hover:-translate-x-1 hover:-translate-y-1 transition-all"
                  >
                    🎨 Browse All Visual Builder Components →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <RetroFooter />
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<DesignTutorialPageProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};