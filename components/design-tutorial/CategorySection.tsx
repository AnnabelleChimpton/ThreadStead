import React from 'react';
import ComponentCard from './ComponentCard';

interface ComponentInfo {
  name: string;
  description: string;
  whenToUse?: string;
  props?: Array<{
    name: string;
    type: string;
    options?: string[];
    default: string;
    description: string;
  }> | string[];
  example: string;
  preview?: React.ReactNode;
  stylingGuide?: {
    classes: Array<{
      name: string;
      description: string;
    }>;
    examples: Array<{
      title: string;
      css: string;
    }>;
  };
}

interface CategorySectionProps {
  title: string;
  description: string;
  icon: string;
  components: ComponentInfo[];
  isActive: boolean;
}

export default function CategorySection({ 
  title, 
  description, 
  icon, 
  components, 
  isActive 
}: CategorySectionProps) {
  if (!isActive) return null;

  return (
    <div className="space-y-8">
      {/* Category Header */}
      <div className="text-center mb-12">
        <div className="inline-block bg-red-400 border-4 border-black shadow-[8px_8px_0_#000] p-6 transform rotate-1">
          <div className="text-6xl mb-4">{icon}</div>
          <h2 className="text-4xl font-bold text-black mb-2">{title}</h2>
          <p className="text-xl text-gray-800 leading-relaxed max-w-2xl">{description}</p>
        </div>
      </div>

      {/* Components */}
      <div className="space-y-8">
        {components.map((component) => (
          <ComponentCard
            key={component.name}
            {...component}
          />
        ))}
      </div>
    </div>
  );
}