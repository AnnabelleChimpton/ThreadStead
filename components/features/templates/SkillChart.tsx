import React, { useState, useMemo } from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface SkillChartProps extends UniversalCSSProps {
  title?: string;
  displayMode?: 'bars' | 'radial' | 'bubbles' | 'tags';
  theme?: 'modern' | 'neon' | 'professional' | 'minimal';
  layout?: 'grid' | 'columns' | 'flow';
  showValues?: boolean;
  showCategories?: boolean;
  sortBy?: 'proficiency' | 'category' | 'name' | 'custom';
  maxDisplay?: number;
  chartSize?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
}

interface SkillProps {
  name: string;
  level: number;
  category?: string;
  color?: string;
  icon?: string;
  description?: string;
  yearsExperience?: number;
  priority?: number;
  max?: number;
  children?: React.ReactNode;
}

export function Skill({ name, level, category, color, icon, description, yearsExperience, priority = 5, max = 100 }: SkillProps) {
  // This component is rendered by the parent SkillChart
  // We use a data attribute approach similar to other nested components
  return (
    <div 
      data-skill-name={name}
      data-skill-level={level}
      data-skill-category={category}
      data-skill-color={color}
      data-skill-icon={icon}
      data-skill-description={description}
      data-skill-years={yearsExperience}
      data-skill-priority={priority}
      data-skill-max={max}
    >
      {name}: {level}/{max}
    </div>
  );
}

interface SkillData {
  name: string;
  level: number;
  category: string;
  color: string;
  icon: string;
  description: string;
  yearsExperience: number;
  priority: number;
  max: number;
  percentage: number;
}

export default function SkillChart(props: SkillChartProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const {
    title = 'Skills',
    displayMode = 'bars',
    theme = 'modern',
    layout = 'grid',
    showValues = true,
    showCategories = true,
    sortBy = 'proficiency',
    maxDisplay,
    chartSize = 'md',
    children,
    className: customClassName
  } = componentProps;

  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName) 
    ? customClassName.join(' ')
    : customClassName;

  // Extract skill data from children
  const getSkills = (): SkillData[] => {
    const childArray = React.Children.toArray(children);
    const skills = childArray.map((child) => {
      if (React.isValidElement(child)) {
        // P3.3 FIX: Unwrap IslandErrorBoundary and ResidentDataProvider to find Skill components
        let actualChild = child;
        let props = child.props as any;

        // Unwrap IslandErrorBoundary if present
        if (typeof child.type === 'function' &&
            (child.type.name === 'IslandErrorBoundary' ||
             (child.type as any).displayName === 'IslandErrorBoundary')) {
          const boundaryChildren = React.Children.toArray((child.props as any).children);
          if (boundaryChildren.length > 0 && React.isValidElement(boundaryChildren[0])) {
            actualChild = boundaryChildren[0];
            props = actualChild.props as any;
          }
        }

        // Unwrap ResidentDataProvider if present
        if (typeof actualChild.type === 'function' &&
            (actualChild.type.name === 'ResidentDataProvider' ||
             (actualChild.type as any).displayName === 'ResidentDataProvider')) {
          const providerChildren = React.Children.toArray((actualChild.props as any).children);
          if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
            actualChild = providerChildren[0];
            props = actualChild.props as any;
          }
        }

        // Check if it's a Skill component
        if (actualChild.type === Skill) {
          return {
            name: props.name,
            level: props.level,
            category: props.category || 'Other',
            color: props.color || getDefaultColor(props.category || 'Other'),
            icon: props.icon || '',
            description: props.description || '',
            yearsExperience: props.yearsExperience || 0,
            priority: props.priority || 5,
            max: props.max || 100,
            percentage: Math.round((props.level / (props.max || 100)) * 100)
          };
        }
        // Check for data attributes (from template rendering)
        if (props['data-skill-name']) {
          const max = Number(props['data-skill-max']) || 100;
          const level = Number(props['data-skill-level']) || 0;
          return {
            name: props['data-skill-name'],
            level: level,
            category: props['data-skill-category'] || 'Other',
            color: props['data-skill-color'] || getDefaultColor(props['data-skill-category'] || 'Other'),
            icon: props['data-skill-icon'] || '',
            description: props['data-skill-description'] || '',
            yearsExperience: Number(props['data-skill-years']) || 0,
            priority: Number(props['data-skill-priority']) || 5,
            max: max,
            percentage: Math.round((level / max) * 100)
          };
        }
      }
      return null;
    }).filter(Boolean) as SkillData[];

    // Apply sorting
    let sortedSkills = [...skills];
    switch (sortBy) {
      case 'proficiency':
        sortedSkills.sort((a, b) => b.percentage - a.percentage);
        break;
      case 'category':
        sortedSkills.sort((a, b) => a.category.localeCompare(b.category) || b.percentage - a.percentage);
        break;
      case 'name':
        sortedSkills.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'custom':
        sortedSkills.sort((a, b) => b.priority - a.priority);
        break;
    }

    // Apply max display limit
    if (maxDisplay && maxDisplay > 0) {
      sortedSkills = sortedSkills.slice(0, maxDisplay);
    }

    return sortedSkills;
  };

  // Get default color for categories
  const getDefaultColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'Frontend': '#3B82F6', // blue
      'Backend': '#10B981',  // green
      'Database': '#8B5CF6', // purple
      'Languages': '#F59E0B', // yellow
      'Tools': '#EF4444',    // red
      'Design': '#EC4899',   // pink
      'Other': '#6B7280'     // gray
    };
    
    // If exact match not found, generate color from category string
    if (!colors[category]) {
      let hash = 0;
      for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = hash % 360;
      return `hsl(${hue}, 60%, 50%)`;
    }
    
    return colors[category];
  };

  const skills = useMemo(() => getSkills(), [children, sortBy, maxDisplay]);

  // Group skills by category
  const groupedSkills = useMemo(() => {
    const groups: { [key: string]: SkillData[] } = {};
    skills.forEach(skill => {
      if (!groups[skill.category]) {
        groups[skill.category] = [];
      }
      groups[skill.category].push(skill);
    });
    return groups;
  }, [skills]);

  // Toggle category collapse
  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Theme styles
  const themeClasses = {
    modern: {
      container: 'bg-white border border-gray-200 shadow-sm',
      header: 'bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200',
      category: 'bg-gray-50 border border-gray-200',
      skill: 'bg-white hover:bg-gray-50 border border-gray-100',
      bar: 'bg-gradient-to-r from-blue-500 to-purple-500',
      text: 'text-gray-700',
      value: 'text-blue-600'
    },
    neon: {
      container: 'bg-gray-900 border-2 border-cyan-400 shadow-lg shadow-cyan-400/25',
      header: 'bg-gradient-to-r from-cyan-900 to-purple-900 border-b border-cyan-400',
      category: 'bg-gray-800 border border-cyan-400',
      skill: 'bg-gray-800 hover:bg-gray-700 border border-gray-600',
      bar: 'bg-gradient-to-r from-cyan-400 to-pink-400',
      text: 'text-cyan-100',
      value: 'text-cyan-400'
    },
    professional: {
      container: 'bg-slate-50 border border-slate-300 shadow-md',
      header: 'bg-slate-100 border-b border-slate-300',
      category: 'bg-slate-100 border border-slate-300',
      skill: 'bg-white hover:bg-slate-50 border border-slate-200',
      bar: 'bg-slate-600',
      text: 'text-slate-700',
      value: 'text-slate-800'
    },
    minimal: {
      container: 'bg-white border border-gray-300',
      header: 'bg-white border-b border-gray-300',
      category: 'bg-white border-b border-gray-200',
      skill: 'hover:bg-gray-50',
      bar: 'bg-gray-600',
      text: 'text-gray-900',
      value: 'text-gray-600'
    }
  };

  const currentTheme = themeClasses[theme];

  // Size classes
  const sizeClasses = {
    sm: { container: 'text-sm', icon: 'text-sm', bar: 'h-2' },
    md: { container: 'text-base', icon: 'text-base', bar: 'h-3' },
    lg: { container: 'text-lg', icon: 'text-lg', bar: 'h-4' }
  };

  const currentSize = sizeClasses[chartSize];

  if (skills.length === 0) {
    return (
      <div className={`ts-skill-chart-empty ${currentTheme.container} rounded-lg p-6 text-center ${currentSize.container} ${normalizedCustomClassName || ''}`}>
        <div className="text-4xl mb-2">📊</div>
        <div className="font-medium text-gray-600">No skills provided</div>
        <div className="text-sm text-gray-500 mt-1">Add Skill components to display your skills</div>
      </div>
    );
  }

  // Render individual skill based on display mode
  const renderSkill = (skill: SkillData, index: number) => {
    const isHovered = hoveredSkill === skill.name;
    
    const skillContent = () => {
      switch (displayMode) {
        case 'bars':
          return (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {skill.icon && <span className={`ts-skill-icon ${currentSize.icon}`}>{skill.icon}</span>}
                  <span className={`ts-skill-label font-medium ${currentTheme.text}`}>{skill.name}</span>
                </div>
                {showValues && (
                  <span className={`ts-skill-value text-sm ${currentTheme.value}`}>
                    {skill.level}/{skill.max} ({skill.percentage}%)
                  </span>
                )}
              </div>
              <div className={`ts-skill-bar-track bg-gray-200 rounded-full ${currentSize.bar}`}>
                <div 
                  className={`ts-skill-bar-fill ${currentTheme.bar} ${currentSize.bar} rounded-full transition-all duration-500 ease-out`}
                  style={{ 
                    width: `${skill.percentage}%`,
                    backgroundColor: skill.color 
                  }}
                />
              </div>
            </div>
          );

        case 'radial':
          const circumference = 2 * Math.PI * 40;
          const strokeDashoffset = circumference - (skill.percentage / 100) * circumference;
          
          return (
            <div className="flex flex-col items-center space-y-2">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={skill.color}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out ts-skill-radial"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {skill.icon ? (
                    <span className={`${currentSize.icon}`}>{skill.icon}</span>
                  ) : (
                    showValues && <span className={`text-xs font-bold ${currentTheme.value}`}>{skill.percentage}%</span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className={`ts-skill-label font-medium ${currentTheme.text} text-sm`}>{skill.name}</div>
                {showValues && !skill.icon && (
                  <div className={`ts-skill-value text-xs ${currentTheme.value}`}>
                    {skill.level}/{skill.max}
                  </div>
                )}
              </div>
            </div>
          );

        case 'bubbles':
          const bubbleSize = Math.max(40, Math.min(120, (skill.percentage / 100) * 100 + 40));
          
          return (
            <div 
              className={`ts-skill-bubble relative rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer`}
              style={{ 
                width: `${bubbleSize}px`, 
                height: `${bubbleSize}px`,
                backgroundColor: skill.color + '20',
                border: `2px solid ${skill.color}`
              }}
            >
              <div className="text-center">
                {skill.icon && <div className={`${currentSize.icon} mb-1`}>{skill.icon}</div>}
                <div className={`ts-skill-label font-medium ${currentTheme.text} text-xs`}>{skill.name}</div>
                {showValues && (
                  <div className={`ts-skill-value text-xs ${currentTheme.value}`}>{skill.percentage}%</div>
                )}
              </div>
            </div>
          );

        case 'tags':
          const tagIntensity = Math.max(0.1, skill.percentage / 100);
          
          return (
            <div 
              className={`ts-skill-tag inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105`}
              style={{ 
                backgroundColor: skill.color + Math.floor(tagIntensity * 255).toString(16).padStart(2, '0'),
                color: tagIntensity > 0.6 ? 'white' : skill.color,
                border: `1px solid ${skill.color}`
              }}
            >
              {skill.icon && <span className="text-sm">{skill.icon}</span>}
              <span className="ts-skill-label">{skill.name}</span>
              {showValues && <span className="ts-skill-value text-xs opacity-75">({skill.level})</span>}
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div
        key={skill.name}
        className={`ts-skill-item ${currentTheme.skill} p-3 rounded-lg transition-colors relative group`}
        onMouseEnter={() => setHoveredSkill(skill.name)}
        onMouseLeave={() => setHoveredSkill(null)}
        title={skill.description || undefined}
      >
        {skillContent()}
        
        {/* Tooltip */}
        {isHovered && skill.description && (
          <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-48">
            <div className="font-medium">{skill.name}</div>
            <div className="text-xs opacity-90">{skill.description}</div>
            {skill.yearsExperience > 0 && (
              <div className="text-xs opacity-75">{skill.yearsExperience} year{skill.yearsExperience !== 1 ? 's' : ''} experience</div>
            )}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  };

  // Layout classes
  const getLayoutClasses = () => {
    const baseClasses = {
      grid: displayMode === 'radial' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' :
            displayMode === 'bubbles' ? 'flex flex-wrap gap-4 justify-center' :
            displayMode === 'tags' ? 'flex flex-wrap gap-2' : 'space-y-4',
      columns: displayMode === 'radial' ? 'columns-2 md:columns-3 gap-4 space-y-4' :
               displayMode === 'tags' ? 'flex flex-wrap gap-2' : 'space-y-4',
      flow: 'flex flex-wrap gap-3'
    };
    return baseClasses[layout];
  };

  const baseClasses = [
    'ts-skill-chart',
    currentTheme.container,
    'rounded-lg',
    'overflow-hidden',
    currentSize.container
  ].filter(Boolean).join(' ');

  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const containerClassName = normalizedCustomClassName
    ? `${filteredClasses} ${normalizedCustomClassName}`
    : filteredClasses;

  return (
    <div className={containerClassName} style={style}>
      {/* Header */}
      <div className={`ts-skill-chart-header ${currentTheme.header} px-4 py-3`}>
        <h3 className={`ts-skill-chart-title font-semibold ${currentTheme.text}`}>{title}</h3>
        <div className={`text-xs ${currentTheme.value} mt-1`}>
          {skills.length} skill{skills.length !== 1 ? 's' : ''} • Sorted by {sortBy}
        </div>
      </div>

      {/* Content */}
      <div className="ts-skill-chart-content p-4">
        {showCategories && Object.keys(groupedSkills).length > 1 ? (
          // Grouped by categories
          <div className="space-y-4">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div key={category} className="ts-skill-category">
                <button
                  onClick={() => toggleCategory(category)}
                  className={`ts-skill-category-header w-full flex items-center justify-between p-2 ${currentTheme.category} rounded-lg text-left hover:bg-black/5 transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${currentTheme.text}`}>{category}</span>
                    <span className={`text-sm ${currentTheme.value}`}>({categorySkills.length})</span>
                  </div>
                  <svg 
                    className={`w-4 h-4 transition-transform ${collapsedCategories.has(category) ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <polyline points="6,9 12,15 18,9"></polyline>
                  </svg>
                </button>
                
                {!collapsedCategories.has(category) && (
                  <div className={`ts-skill-category-content mt-3 ${getLayoutClasses()}`}>
                    {categorySkills.map((skill, index) => renderSkill(skill, index))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // All skills in one layout
          <div className={`ts-skill-list ${getLayoutClasses()}`}>
            {skills.map((skill, index) => renderSkill(skill, index))}
          </div>
        )}
      </div>

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Showing {skills.length} skills in {displayMode} format, theme: {theme}
      </div>
    </div>
  );
}