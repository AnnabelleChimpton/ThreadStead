import React, { useState } from 'react';
import { useGridCompatibilityContext } from './GridCompatibleWrapper';

interface ContactCardProps {
  expanded?: boolean;
  theme?: 'modern' | 'business' | 'creative' | 'minimal';
  layout?: 'compact' | 'detailed' | 'grid';
  showHeader?: boolean;
  collapsible?: boolean;
  maxMethods?: number;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

interface ContactMethodProps {
  type: 'email' | 'phone' | 'linkedin' | 'github' | 'twitter' | 'website' | 'discord' | 'custom';
  value: string;
  label?: string;
  icon?: string;
  copyable?: boolean;
  priority?: number;
  children?: React.ReactNode;
}

export function ContactMethod({ type, value, label, icon, copyable = true, priority = 5 }: ContactMethodProps) {
  // This component is rendered by the parent ContactCard
  // We use a data attribute approach similar to other nested components
  return (
    <div 
      data-contact-type={type}
      data-contact-value={value}
      data-contact-label={label}
      data-contact-icon={icon}
      data-contact-copyable={copyable}
      data-contact-priority={priority}
    >
      {label || type}: {value}
    </div>
  );
}

interface ContactMethodData {
  type: string;
  value: string;
  label: string;
  icon: string;
  copyable: boolean;
  priority: number;
}

export default function ContactCard({
  expanded: initialExpanded = false,
  theme = 'modern',
  layout = 'compact',
  showHeader = true,
  collapsible = true,
  maxMethods = 3,
  title = 'Contact Me',
  children,
  className: customClassName
}: ContactCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const { isInGrid } = useGridCompatibilityContext();

  // Handle className being passed as array or string
  const normalizedCustomClassName = Array.isArray(customClassName) 
    ? customClassName.join(' ')
    : customClassName;

  // Extract contact method data from children
  const getContactMethods = (): ContactMethodData[] => {
    const childArray = React.Children.toArray(children);
    const contactMethods = childArray.map((child) => {
      if (React.isValidElement(child)) {
        const props = child.props as any;
        
        // Check if it's a ContactMethod component
        if (child.type === ContactMethod) {
          return {
            type: props.type,
            value: props.value,
            label: props.label || getDefaultLabel(props.type),
            icon: props.icon || getDefaultIcon(props.type),
            copyable: props.copyable !== false,
            priority: props.priority || 5
          };
        }
        
        // Check if it's wrapped in ResidentDataProvider (from our DOM parsing)
        if ((child.type as any)?.name === 'ResidentDataProvider' && props.children) {
          const wrappedChild = props.children;
          if (React.isValidElement(wrappedChild)) {
            const wrappedProps = wrappedChild.props as any;
            
            // Check if the wrapped child is a ContactMethod component
            if (wrappedChild.type === ContactMethod) {
              return {
                type: wrappedProps.type,
                value: wrappedProps.value,
                label: wrappedProps.label || getDefaultLabel(wrappedProps.type),
                icon: wrappedProps.icon || getDefaultIcon(wrappedProps.type),
                copyable: wrappedProps.copyable !== false,
                priority: wrappedProps.priority || 5
              };
            }
          }
        }
        
        // Check for data attributes (from template rendering)
        if (props['data-contact-type']) {
          return {
            type: props['data-contact-type'],
            value: props['data-contact-value'],
            label: props['data-contact-label'] || getDefaultLabel(props['data-contact-type']),
            icon: props['data-contact-icon'] || getDefaultIcon(props['data-contact-type']),
            copyable: props['data-contact-copyable'] !== 'false',
            priority: Number(props['data-contact-priority']) || 5
          };
        }
      }
      return null;
    }).filter(Boolean) as ContactMethodData[];

    // Sort by priority (higher first), then by order of appearance
    return contactMethods.sort((a, b) => b.priority - a.priority);
  };

  // Get default labels for contact types
  const getDefaultLabel = (type: string): string => {
    const labels = {
      email: 'Email',
      phone: 'Phone',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      twitter: 'Twitter',
      website: 'Website',
      discord: 'Discord',
      custom: 'Contact'
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Get default icons for contact types
  const getDefaultIcon = (type: string): string => {
    const icons = {
      email: '📧',
      phone: '📞',
      linkedin: '💼',
      github: '🐙',
      twitter: '🐦',
      website: '🌐',
      discord: '💬',
      custom: '📬'
    };
    return icons[type as keyof typeof icons] || '📬';
  };

  // Get contact action (URL/action for the contact method)
  const getContactAction = (type: string, value: string): { href?: string; action?: () => void } => {
    switch (type) {
      case 'email':
        return { href: `mailto:${value}` };
      case 'phone':
        return { href: `tel:${value}` };
      case 'website':
        const websiteUrl = value.startsWith('http') ? value : `https://${value}`;
        return { href: websiteUrl };
      case 'linkedin':
        const linkedinUrl = value.startsWith('http') ? value : `https://${value}`;
        return { href: linkedinUrl };
      case 'github':
        const githubUrl = value.startsWith('http') ? value : `https://${value}`;
        return { href: githubUrl };
      case 'twitter':
        const twitterUrl = value.startsWith('http') ? value : `https://${value}`;
        return { href: twitterUrl };
      default:
        return {};
    }
  };

  // Copy to clipboard functionality
  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copied!`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setCopyFeedback('Copy failed');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const contactMethods = getContactMethods();
  const displayedMethods = isExpanded ? contactMethods : contactMethods.slice(0, maxMethods);
  const hasMoreMethods = contactMethods.length > maxMethods;

  // Theme styles
  const themeClasses = {
    modern: {
      container: 'bg-white border border-gray-200 shadow-sm',
      header: 'bg-gray-50 border-b border-gray-200',
      method: 'hover:bg-gray-50 border-b border-gray-100',
      icon: 'text-blue-500',
      value: 'text-gray-700',
      label: 'text-gray-600',
      button: 'text-blue-600 hover:text-blue-800'
    },
    business: {
      container: 'bg-slate-50 border border-slate-300 shadow-md',
      header: 'bg-slate-100 border-b border-slate-300',
      method: 'hover:bg-slate-100 border-b border-slate-200',
      icon: 'text-slate-600',
      value: 'text-slate-800 font-medium',
      label: 'text-slate-600',
      button: 'text-slate-700 hover:text-slate-900'
    },
    creative: {
      container: 'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 shadow-lg',
      header: 'bg-gradient-to-r from-purple-100 to-pink-100 border-b border-purple-200',
      method: 'hover:bg-white/50 border-b border-purple-100',
      icon: 'text-purple-600',
      value: 'text-purple-800',
      label: 'text-purple-600',
      button: 'text-pink-600 hover:text-pink-800'
    },
    minimal: {
      container: 'bg-white border border-gray-300',
      header: 'bg-white border-b border-gray-300',
      method: 'hover:bg-gray-50 border-b border-gray-200',
      icon: 'text-gray-500',
      value: 'text-gray-900',
      label: 'text-gray-500',
      button: 'text-gray-600 hover:text-gray-800'
    }
  };

  const currentTheme = themeClasses[theme];

  // Layout-specific classes
  const layoutClasses = {
    compact: 'space-y-2',
    detailed: 'space-y-4',
    grid: 'grid grid-cols-2 gap-3'
  };

  if (contactMethods.length === 0) {
    return (
      <div className={`ts-contact-card-empty ${currentTheme.container} rounded-lg p-6 text-center ${normalizedCustomClassName || ''}`}>
        <div className="text-4xl mb-2">📇</div>
        <div className="font-medium text-gray-600">No contact information provided</div>
        <div className="text-sm text-gray-500 mt-1">Add ContactMethod components to display contact details</div>
      </div>
    );
  }

  // Grid-adaptive container styling
  const gridAdaptiveClasses = isInGrid ? 'w-full h-full' : '';

  const containerClassName = [
    'ts-contact-card',
    currentTheme.container,
    'rounded-lg',
    'overflow-hidden',
    'relative',
    gridAdaptiveClasses,
    normalizedCustomClassName
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClassName}>
      {/* Header */}
      {showHeader && (
        <div className={`ts-contact-header ${currentTheme.header} px-4 py-3 flex items-center justify-between`}>
          <h3 className="ts-contact-title font-semibold text-sm">{title}</h3>
          {collapsible && hasMoreMethods && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`ts-contact-toggle ${currentTheme.button} hover:bg-black/5 rounded p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label={isExpanded ? 'Show less' : 'Show more'}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Contact Methods */}
      <div className={`ts-contact-list ${isInGrid ? 'p-2' : 'p-4'} ${layout !== 'grid' ? layoutClasses[layout] : ''}`}>
        <div className={layout === 'grid' ? layoutClasses[layout] : 'space-y-0'}>
          {displayedMethods.map((method, index) => {
            const { href, action } = getContactAction(method.type, method.value);
            
            const methodContent = (
              <>
                {/* Icon and Label */}
                <div className="flex items-center gap-2 mb-1">
                  <span className={`ts-contact-icon ${currentTheme.icon}`}>{method.icon}</span>
                  {layout === 'detailed' && (
                    <span className={`ts-contact-label text-xs font-medium ${currentTheme.label}`}>
                      {method.label}
                    </span>
                  )}
                </div>

                {/* Value and Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {href ? (
                      <a
                        href={href}
                        target={method.type === 'email' || method.type === 'phone' ? undefined : '_blank'}
                        rel={method.type === 'email' || method.type === 'phone' ? undefined : 'noopener noreferrer'}
                        className={`ts-contact-value ${currentTheme.value} hover:underline text-sm truncate block`}
                      >
                        {method.value}
                      </a>
                    ) : (
                      <span className={`ts-contact-value ${currentTheme.value} text-sm truncate block`}>
                        {method.value}
                      </span>
                    )}
                    {layout === 'compact' && (
                      <span className={`ts-contact-label text-xs ${currentTheme.label}`}>
                        {method.label}
                      </span>
                    )}
                  </div>

                  {/* Copy Button */}
                  {method.copyable && (
                    <button
                      onClick={() => copyToClipboard(method.value, method.label)}
                      className={`ts-contact-action ${currentTheme.button} hover:bg-black/5 rounded p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0`}
                      aria-label={`Copy ${method.label}`}
                      title={`Copy ${method.label}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  )}
                </div>
              </>
            );

            return (
              <div
                key={index}
                className={`ts-contact-method ${currentTheme.method} p-3 transition-colors ${
                  layout === 'grid' ? 'rounded border border-gray-200' : 
                  index < displayedMethods.length - 1 ? 'border-b last:border-b-0' : ''
                }`}
              >
                {methodContent}
              </div>
            );
          })}
        </div>

        {/* Show More/Less Button */}
        {!isExpanded && hasMoreMethods && layout !== 'grid' && collapsible && (
          <button
            onClick={() => setIsExpanded(true)}
            className={`ts-contact-show-more w-full text-center py-2 ${currentTheme.button} hover:bg-black/5 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            Show {contactMethods.length - maxMethods} more method{contactMethods.length - maxMethods !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Copy Feedback */}
      {copyFeedback && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg animate-fade-in-out">
          {copyFeedback}
        </div>
      )}

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isExpanded ? `Showing all ${contactMethods.length} contact methods` : `Showing ${displayedMethods.length} of ${contactMethods.length} contact methods`}
      </div>
    </div>
  );
}