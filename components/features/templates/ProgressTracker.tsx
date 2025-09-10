import React from 'react';

interface ProgressTrackerProps {
  title?: string;
  display?: 'bars' | 'stars' | 'circles' | 'dots';
  theme?: 'modern' | 'retro' | 'neon' | 'minimal';
  showValues?: boolean;
  layout?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

interface ProgressItemProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  description?: string;
  children?: React.ReactNode;
}

export function ProgressItem({ label, value, max, color, description }: ProgressItemProps) {
  // This component is rendered by the parent ProgressTracker
  // We use a data attribute approach similar to Tabs
  return (
    <div 
      data-progress-label={label}
      data-progress-value={value}
      data-progress-max={max}
      data-progress-color={color}
      data-progress-description={description}
    >
      {label}: {value}{max ? `/${max}` : '%'}
    </div>
  );
}

export default function ProgressTracker({
  title,
  display = 'bars',
  theme = 'modern',
  showValues = true,
  layout = 'vertical',
  size = 'md',
  children,
  className: customClassName
}: ProgressTrackerProps) {
  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName) 
    ? customClassName.join(' ')
    : customClassName;

  // Extract progress item data from children
  const childArray = React.Children.toArray(children);
  const progressItems = childArray.map((child, index) => {
    if (React.isValidElement(child)) {
      const props = child.props as any;
      
      // Check if it's a ProgressItem component
      if (child.type === ProgressItem) {
        return {
          label: props.label,
          value: props.value,
          max: props.max,
          color: props.color,
          description: props.description
        };
      }
      
      // Check if it's wrapped in ResidentDataProvider (from our DOM parsing)
      if ((child.type as any)?.name === 'ResidentDataProvider' && props.children) {
        const wrappedChild = props.children;
        if (React.isValidElement(wrappedChild)) {
          const wrappedProps = wrappedChild.props as any;
          
          // Check if the wrapped child is a ProgressItem component
          if (wrappedChild.type === ProgressItem) {
            return {
              label: wrappedProps.label,
              value: wrappedProps.value,
              max: wrappedProps.max,
              color: wrappedProps.color,
              description: wrappedProps.description
            };
          }
        }
      }
      
      // Check for data attributes (from template rendering)
      if (props['data-progress-label']) {
        return {
          label: props['data-progress-label'],
          value: Number(props['data-progress-value']) || 0,
          max: props['data-progress-max'] ? Number(props['data-progress-max']) : undefined,
          color: props['data-progress-color'],
          description: props['data-progress-description']
        };
      }
    }
    return null;
  }).filter(Boolean) as Array<{
    label: string;
    value: number;
    max?: number;
    color?: string;
    description?: string;
  }>;

  // Set default max values based on display type
  const getDefaultMax = (display: string) => {
    switch (display) {
      case 'stars': return 5;
      case 'dots': return 10;
      case 'bars':
      case 'circles':
      default: return 100;
    }
  };

  // Normalize progress items with defaults
  const normalizedItems = progressItems.map(item => ({
    ...item,
    max: item.max || getDefaultMax(display),
    color: item.color || 'blue'
  }));

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'text-sm',
      title: 'text-base font-medium mb-2',
      item: 'mb-2',
      bar: 'h-2',
      circle: 'w-12 h-12',
      star: 'text-sm',
      dot: 'w-3 h-3'
    },
    md: {
      container: 'text-base',
      title: 'text-lg font-semibold mb-3',
      item: 'mb-3',
      bar: 'h-3',
      circle: 'w-16 h-16',
      star: 'text-base',
      dot: 'w-4 h-4'
    },
    lg: {
      container: 'text-lg',
      title: 'text-xl font-bold mb-4',
      item: 'mb-4',
      bar: 'h-4',
      circle: 'w-20 h-20',
      star: 'text-lg',
      dot: 'w-5 h-5'
    }
  };

  // Theme color schemes
  const themeColors = {
    modern: {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
      yellow: 'bg-yellow-500',
      default: 'bg-gray-500'
    },
    retro: {
      blue: 'bg-cyan-400',
      green: 'bg-lime-400',
      red: 'bg-rose-400',
      purple: 'bg-violet-400',
      pink: 'bg-fuchsia-400',
      yellow: 'bg-amber-400',
      default: 'bg-slate-400'
    },
    neon: {
      blue: 'bg-blue-400 shadow-blue-400/50',
      green: 'bg-green-400 shadow-green-400/50',
      red: 'bg-red-400 shadow-red-400/50',
      purple: 'bg-purple-400 shadow-purple-400/50',
      pink: 'bg-pink-400 shadow-pink-400/50',
      yellow: 'bg-yellow-400 shadow-yellow-400/50',
      default: 'bg-gray-400 shadow-gray-400/50'
    },
    minimal: {
      blue: 'bg-slate-600',
      green: 'bg-slate-600',
      red: 'bg-slate-600',
      purple: 'bg-slate-600',
      pink: 'bg-slate-600',
      yellow: 'bg-slate-600',
      default: 'bg-slate-600'
    }
  };

  const getColorClass = (color: string) => {
    const colorKey = color.toLowerCase() as keyof typeof themeColors.modern;
    return themeColors[theme][colorKey] || themeColors[theme].default;
  };

  // Render functions for different display types
  const renderProgressBar = (item: typeof normalizedItems[0], index: number) => {
    const percentage = Math.min((item.value / item.max) * 100, 100);
    const colorClass = getColorClass(item.color);
    
    return (
      <div key={index} className={`ts-progress-item ${sizeClasses[size].item}`}>
        <div className="flex justify-between items-center mb-1">
          <span className="ts-progress-label font-medium">{item.label}</span>
          {showValues && (
            <span className="ts-progress-value text-gray-600 text-sm">
              {item.value}{item.max === 100 ? '%' : `/${item.max}`}
            </span>
          )}
        </div>
        <div className={`ts-progress-bar-track bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size].bar}`}>
          <div 
            className={`ts-progress-bar-fill ${colorClass} ${sizeClasses[size].bar} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
            title={item.description}
          />
        </div>
      </div>
    );
  };

  const renderStarRating = (item: typeof normalizedItems[0], index: number) => {
    const filledStars = Math.floor(item.value);
    const hasHalfStar = item.value % 1 >= 0.5;
    const emptyStars = item.max - filledStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div key={index} className={`ts-progress-item ${sizeClasses[size].item}`}>
        <div className="flex justify-between items-center">
          <span className="ts-progress-label font-medium">{item.label}</span>
          <div className={`ts-progress-stars flex gap-1 ${sizeClasses[size].star}`} title={item.description}>
            {/* Filled stars */}
            {[...Array(filledStars)].map((_, i) => (
              <span key={`filled-${i}`} className="text-yellow-400">★</span>
            ))}
            {/* Half star */}
            {hasHalfStar && (
              <span className="text-yellow-400 relative">
                <span className="absolute inset-0 overflow-hidden w-1/2">★</span>
                <span className="text-gray-300">★</span>
              </span>
            )}
            {/* Empty stars */}
            {[...Array(emptyStars)].map((_, i) => (
              <span key={`empty-${i}`} className="text-gray-300">★</span>
            ))}
            {showValues && (
              <span className="ts-progress-value text-gray-600 text-sm ml-2">
                {item.value}/{item.max}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCircularProgress = (item: typeof normalizedItems[0], index: number) => {
    const percentage = Math.min((item.value / item.max) * 100, 100);
    const strokeDasharray = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;
    const colorClass = getColorClass(item.color);
    
    return (
      <div key={index} className={`ts-progress-item ${sizeClasses[size].item}`}>
        <div className="flex items-center gap-4">
          <div className={`ts-progress-circle relative ${sizeClasses[size].circle}`} title={item.description}>
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className={colorClass.replace('bg-', 'text-')}
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold">
                {showValues ? `${Math.round(percentage)}%` : ''}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="ts-progress-label font-medium">{item.label}</div>
            {showValues && (
              <div className="ts-progress-value text-gray-600 text-sm">
                {item.value}{item.max === 100 ? '%' : `/${item.max}`}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDotProgress = (item: typeof normalizedItems[0], index: number) => {
    const filledDots = Math.round(item.value);
    const emptyDots = item.max - filledDots;
    const colorClass = getColorClass(item.color);
    
    return (
      <div key={index} className={`ts-progress-item ${sizeClasses[size].item}`}>
        <div className="flex justify-between items-center">
          <span className="ts-progress-label font-medium">{item.label}</span>
          <div className={`ts-progress-dots flex gap-1 items-center`} title={item.description}>
            {/* Filled dots */}
            {[...Array(filledDots)].map((_, i) => (
              <div key={`filled-${i}`} className={`${colorClass} rounded-full ${sizeClasses[size].dot}`} />
            ))}
            {/* Empty dots */}
            {[...Array(emptyDots)].map((_, i) => (
              <div key={`empty-${i}`} className={`bg-gray-300 rounded-full ${sizeClasses[size].dot}`} />
            ))}
            {showValues && (
              <span className="ts-progress-value text-gray-600 text-sm ml-2">
                {item.value}/{item.max}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProgressItems = () => {
    switch (display) {
      case 'stars':
        return normalizedItems.map(renderStarRating);
      case 'circles':
        return normalizedItems.map(renderCircularProgress);
      case 'dots':
        return normalizedItems.map(renderDotProgress);
      case 'bars':
      default:
        return normalizedItems.map(renderProgressBar);
    }
  };

  if (normalizedItems.length === 0) {
    return (
      <div className="ts-progress-tracker-empty text-gray-500 italic p-4">
        No progress items to display
      </div>
    );
  }

  const containerClassName = [
    'ts-progress-tracker',
    sizeClasses[size].container,
    layout === 'horizontal' ? 'flex flex-wrap gap-4' : '',
    theme === 'neon' ? 'filter drop-shadow-lg' : '',
    normalizedCustomClassName
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClassName}>
      {title && (
        <h3 className={`ts-progress-tracker-title ${sizeClasses[size].title}`}>
          {title}
        </h3>
      )}
      <div className={layout === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-0'}>
        {renderProgressItems()}
      </div>
    </div>
  );
}