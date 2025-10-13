import React, { useState, useMemo } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import ComponentSearch from "@/components/templates-docs/ComponentSearch";
import ComponentCard from "@/components/templates-docs/ComponentCard";
import {
  unifiedCategories,
  unifiedComponentData,
  getAllUnifiedComponents,
  filterByAvailability,
  UnifiedComponent
} from "@/lib/templates-docs/unifiedComponentData";

interface ComponentsPageProps {
  siteConfig: SiteConfig;
}

export default function ComponentsPage({ siteConfig }: ComponentsPageProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'visual-builder' | 'code-only'>('all');

  // Get category from URL query parameter
  React.useEffect(() => {
    if (router.query.category && typeof router.query.category === 'string') {
      setActiveCategory(router.query.category);
    }
  }, [router.query.category]);

  // Get filter from URL query parameter
  React.useEffect(() => {
    if (router.query.filter && typeof router.query.filter === 'string') {
      const filter = router.query.filter as 'all' | 'visual-builder' | 'code-only';
      if (['all', 'visual-builder', 'code-only'].includes(filter)) {
        setAvailabilityFilter(filter);
      }
    }
  }, [router.query.filter]);

  // Filter components based on search, category, and availability
  const filteredComponents = useMemo(() => {
    let allComponents = getAllUnifiedComponents();

    // Filter by availability
    allComponents = filterByAvailability(allComponents, availabilityFilter);

    // Filter by category
    if (activeCategory !== 'all') {
      allComponents = allComponents.filter(
        (item) => item.categoryId === activeCategory
      );
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      allComponents = allComponents.filter((item) => {
        const component = item.component;
        return (
          component.name.toLowerCase().includes(searchLower) ||
          component.description.toLowerCase().includes(searchLower) ||
          (component.useCases && component.useCases.some((useCase) =>
            useCase.toLowerCase().includes(searchLower)
          ))
        );
      });
    }

    return allComponents;
  }, [searchTerm, activeCategory, availabilityFilter]);

  // Get active category data
  const activeCategoryData = unifiedCategories.find(
    (cat) => cat.id === activeCategory
  );

  return (
    <Layout siteConfig={siteConfig}>
      <div className="min-h-screen bg-cyan-50">
        <div className="w-full px-4 sm:px-6 py-8 sm:py-12 max-w-6xl mx-auto">
          {/* Mode Banner */}
          <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💻</span>
              <span className="text-sm font-semibold">Template Language Mode</span>
            </div>
            <Link
              href="/templates"
              className="text-xs px-3 py-1 bg-white border border-blue-400 hover:bg-blue-100 transition-colors rounded"
            >
              Switch to Visual Builder →
            </Link>
          </div>

          {/* Breadcrumbs */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <Link href="/templates" className="hover:underline font-medium">
              Templates
            </Link>
            <span>→</span>
            <span className="font-bold">Component Reference</span>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-black mb-4 text-gray-900 text-center">
              📚 Component Reference
            </h1>
            <p className="text-lg text-gray-700 text-center max-w-3xl mx-auto">
              Browse all {filteredComponents.length === 0 ? '200+' : filteredComponents.length} components. Filter by Visual Builder availability, categories, or search by name.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8">
            <RetroCard>
              <ComponentSearch
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                categories={unifiedCategories.map(cat => ({
                  id: cat.id,
                  title: cat.title,
                  icon: cat.icon,
                  color: cat.color || 'bg-gray-200'
                }))}
                availabilityFilter={availabilityFilter}
                onAvailabilityFilterChange={setAvailabilityFilter}
              />
            </RetroCard>
          </div>

          {/* Results Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {activeCategory === 'all' ? (
                <span>
                  All Components
                  {searchTerm && <span className="text-purple-600"> matching &quot;{searchTerm}&quot;</span>}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>{activeCategoryData?.icon}</span>
                  <span>{activeCategoryData?.title}</span>
                  {searchTerm && <span className="text-purple-600 text-lg"> matching &quot;{searchTerm}&quot;</span>}
                </span>
              )}
            </h2>
            <p className="text-gray-600 mt-1">
              {filteredComponents.length} component{filteredComponents.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Component Cards */}
          {filteredComponents.length > 0 ? (
            <div className="space-y-4">
              {filteredComponents.map((item, index) => {
                const category = unifiedCategories.find(
                  (cat) => cat.id === item.categoryId
                );
                return (
                  <ComponentCard
                    key={`${item.categoryId}-${item.component.id}-${index}`}
                    component={item.component}
                    category={{
                      ...category!,
                      color: category?.color || 'bg-gray-200',
                      hoverColor: category?.hoverColor || 'hover:bg-gray-100'
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <RetroCard>
                <div className="py-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold mb-2">No components found</h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search or filter criteria
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setActiveCategory("all");
                    }}
                    className="px-6 py-3 bg-purple-200 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] transition-all font-bold"
                  >
                    Clear Filters
                  </button>
                </div>
              </RetroCard>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="mt-12 grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/templates')}
              className="px-6 py-4 bg-purple-200 border-3 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] transition-all font-bold text-center"
            >
              ← Back to Home
            </button>
            <button
              onClick={() => router.push('/templates/tutorials/your-first-template')}
              className="px-6 py-4 bg-green-200 border-3 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] transition-all font-bold text-center"
            >
              📚 Start Learning
            </button>
            <button
              onClick={() => router.push('/templates/examples/todo-list')}
              className="px-6 py-4 bg-yellow-200 border-3 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] transition-all font-bold text-center"
            >
              View Examples →
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<ComponentsPageProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};
