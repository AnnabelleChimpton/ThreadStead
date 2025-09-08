import React from "react";

interface SplitLayoutProps {
  ratio?: '1:1' | '1:2' | '2:1' | '1:3' | '3:1';
  vertical?: boolean;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
  children: React.ReactNode;
}

export default function SplitLayout({ 
  ratio = '1:1',
  vertical = false,
  gap = 'md',
  responsive = true,
  children 
}: SplitLayoutProps) {
  const childrenArray = React.Children.toArray(children);
  const firstChild = childrenArray[0];
  const secondChild = childrenArray[1];

  // Mobile-first: start with stacked layout, add complexity only when needed
  const baseClasses = "w-full flex flex-col";
  
  // Spacing between children
  const gapClasses = {
    'xs': 'gap-1',
    'sm': 'gap-2', 
    'md': 'gap-4',
    'lg': 'gap-6',
    'xl': 'gap-8'
  }[gap];

  // On larger screens, optionally switch to side-by-side
  let layoutClasses = baseClasses;
  
  if (responsive) {
    // Responsive: stack on mobile, split on larger screens (lg = 1024px+)
    layoutClasses = `${baseClasses} lg:flex-row`;
  } else if (!vertical) {
    // Non-responsive horizontal: always side-by-side
    layoutClasses = "w-full flex flex-row";
  }
  // If vertical and non-responsive, keep the base flex-col layout

  // Width classes for the children when in row layout
  const getChildWidths = () => {
    if (vertical || (!responsive && vertical)) {
      // Vertical layout - children take full width
      return { first: "w-full", second: "w-full" };
    }

    // Horizontal layout width ratios
    switch (ratio) {
      case '1:1':
        return { first: "w-full lg:w-1/2", second: "w-full lg:w-1/2" };
      case '1:2':
        return { first: "w-full lg:w-1/3", second: "w-full lg:w-2/3" };
      case '2:1':
        return { first: "w-full lg:w-2/3", second: "w-full lg:w-1/3" };
      case '1:3':
        return { first: "w-full lg:w-1/4", second: "w-full lg:w-3/4" };
      case '3:1':
        return { first: "w-full lg:w-3/4", second: "w-full lg:w-1/4" };
      default:
        return { first: "w-full lg:w-1/2", second: "w-full lg:w-1/2" };
    }
  };

  const { first: firstWidth, second: secondWidth } = getChildWidths();

  return (
    <div className={`${layoutClasses} ${gapClasses}`}>
      <div className={firstWidth}>
        {firstChild}
      </div>
      <div className={secondWidth}>
        {secondChild}
      </div>
    </div>
  );
}