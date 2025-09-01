import React from 'react';

interface RetroNavigationProps {
  categories: Array<{
    id: string;
    title: string;
    icon: string;
  }>;
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function RetroNavigation({ 
  categories, 
  activeCategory, 
  onCategoryChange 
}: RetroNavigationProps) {
  return (
    <div className="bg-blue-300 border-4 border-black shadow-[8px_8px_0_#000] p-4 mb-8">
      <h3 className="font-bold text-black text-lg mb-4 text-center">
        Choose Your Adventure
      </h3>
      <div className="grid md:grid-cols-4 gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`p-4 border-4 border-black font-bold text-lg transition-all transform hover:scale-105 ${
              activeCategory === category.id
                ? 'bg-yellow-300 text-black shadow-[4px_4px_0_#000] scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-[2px_2px_0_#000]'
            }`}
          >
            <div className="text-lg font-bold mb-2">{category.icon}</div>
            <div className="text-sm">{category.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}