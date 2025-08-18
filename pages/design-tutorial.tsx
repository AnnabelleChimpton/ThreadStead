import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";

// Import new componentized design tutorial components
import RetroHeader from "@/components/design-tutorial/RetroHeader";
import RetroNavigation from "@/components/design-tutorial/RetroNavigation";
import CategorySection from "@/components/design-tutorial/CategorySection";
import RetroFooter from "@/components/design-tutorial/RetroFooter";
import { componentCategories, componentData } from "@/components/design-tutorial/componentData";

export default function DesignTutorialPage() {
  const [activeCategory, setActiveCategory] = useState('content');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

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
    <Layout>
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

        <div className="container mx-auto px-6 py-12 max-w-6xl">
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

          {/* Footer */}
          <RetroFooter currentUser={currentUser} />
        </div>
      </div>
    </Layout>
  );
}