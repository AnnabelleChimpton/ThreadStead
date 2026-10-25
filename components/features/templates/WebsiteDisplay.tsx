import React from "react";
import Link from "next/link";
import { useResidentData } from './ResidentDataProvider';
import { componentHeading } from './component-heading';
import OwnerNote from './OwnerNote';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface WebsiteDisplayProps extends UniversalCSSProps {
  className?: string;
  heading?: string;
}

export default function WebsiteDisplay(props: WebsiteDisplayProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className: customClassName, heading } = componentProps;
  const headingText = componentHeading(heading, 'Website Recommendations');
  const { websites, owner, viewer } = useResidentData();

  // Filter valid websites first
  const validWebsites = websites?.filter(website => website && website.id) || [];

  const baseClasses = "border border-black p-3 bg-white shadow-[2px_2px_0_#000]";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const containerClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  if (!websites || websites.length === 0 || validWebsites.length === 0) {
    // Only the owner hears there are none yet; visitors see nothing
    if (!viewer?.id || viewer.id !== owner?.id) return null;
    return (
      <OwnerNote className={`websites-section websites-section--empty ${customClassName ?? ''}`} style={style}>
        No websites yet. <Link href="/settings?tab=profile">Add the ones you like in Settings</Link>.
      </OwnerNote>
    );
  }

  return (
    <div className={`websites-section ${containerClassName}`} style={style}>
      {headingText && <h4 className="section-heading font-bold mb-3">{headingText}</h4>}
      <div className="websites-list space-y-3">
        {validWebsites.map((website) => (
          <div key={website.id} className="website-item border-l-4 border-blue-400 pl-3">
            <div className="website-content flex items-start justify-between">
              <div className="website-info flex-1">
                <h5 className="website-title font-semibold">
                  <a 
                    href={website.url || '#'}
                    target="_blank"
                    rel={website.mine ? "me noopener" : "noopener noreferrer"}
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