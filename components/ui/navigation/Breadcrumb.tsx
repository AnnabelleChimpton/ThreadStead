import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  autoGenerate?: boolean;
}

export default function Breadcrumb({ items, className = "", autoGenerate = false }: BreadcrumbProps) {
  const router = useRouter();

  // Auto-generate breadcrumbs from URL if enabled and no items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = router.asPath.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Format segment name
      const label = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
        active: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || (autoGenerate ? generateBreadcrumbs() : []);

  if (breadcrumbItems.length <= 1) return null;

  return (
    <nav 
      className={`breadcrumb ${className}`}
      aria-label="Breadcrumb navigation"
      data-component="breadcrumb"
    >
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg 
                className="w-4 h-4 mx-2 text-thread-sage" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {item.href && !item.active ? (
              <Link 
                href={item.href}
                className="breadcrumb-link hover:text-thread-sunset transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className="breadcrumb-active font-medium text-thread-pine"
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}