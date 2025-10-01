import React from "react";
import { useResidentData } from './ResidentDataProvider';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface WebsiteDisplayProps extends UniversalCSSProps {
  className?: string;
}

export default function WebsiteDisplay(props: WebsiteDisplayProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName } = componentProps;
  const { websites } = useResidentData();

  // Filter valid websites first
  const validWebsites = websites?.filter(website => website && website.id) || [];

  const baseClasses = "border border-black p-3 bg-white shadow-[2px_2px_0_#000]";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const containerClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  if (!websites || websites.length === 0 || validWebsites.length === 0) {
    return (
      <div className={containerClassName} style={style}>
        <h4 className="font-bold mb-2">Website Recommendations</h4>
        <p className="text-gray-500 text-sm">No websites added yet.</p>
      </div>
    );
  }

  return (
    <div className={`websites-section ${containerClassName}`} style={style}>
      <h4 className="section-heading font-bold mb-3">Website Recommendations</h4>
      <div className="websites-list space-y-3">
        {validWebsites.map((website) => (
          <div key={website.id} className="website-item border-l-4 border-blue-400 pl-3">
            <div className="website-content flex items-start justify-between">
              <div className="website-info flex-1">
                <h5 className="website-title font-semibold">
                  <a 
                    href={website.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="website-link text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {website.label || 'Untitled'}
                  </a>
                </h5>
                {website.blurb && (
                  <p className="website-blurb text-sm text-gray-700 mt-1">{website.blurb}</p>
                )}
                <div className="website-url text-xs text-gray-500 mt-1">
                  {website.url || 'No URL'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}