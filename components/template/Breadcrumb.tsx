import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Breadcrumb() {
  const router = useRouter();
  
  // Generate breadcrumb items based on current route
  const generateBreadcrumbs = () => {
    const pathArray = router.asPath.split('/').filter(path => path);
    const breadcrumbs = [{ label: 'Home', href: '/' }];
    
    let currentPath = '';
    
    pathArray.forEach((path, index) => {
      currentPath += `/${path}`;
      
      // Skip query parameters
      const cleanPath = path.split('?')[0];
      
      // Create readable labels for common paths
      let label = cleanPath;
      if (cleanPath === 'feed') label = 'Feed';
      else if (cleanPath === 'directory') label = 'Directory';
      else if (cleanPath === 'notifications') label = 'Notifications';
      else if (cleanPath === 'settings') label = 'Settings';
      else if (cleanPath === 'resident') label = 'Profiles';
      else if (cleanPath.startsWith('page')) label = 'Page';
      else {
        // Capitalize and decode URI components
        label = decodeURIComponent(cleanPath)
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      const breadcrumbItem: any = { label };
      if (index !== pathArray.length - 1) {
        breadcrumbItem.href = currentPath;
      }
      breadcrumbs.push(breadcrumbItem);
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  
  // Don't show breadcrumbs for home page
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="breadcrumb mb-4" data-component="breadcrumb">
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="breadcrumb-separator mx-2 text-thread-sage">
              ›
            </span>
          )}
          {item.href ? (
            <Link 
              href={item.href} 
              className="breadcrumb-link text-thread-pine hover:text-thread-sunset transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-active text-thread-charcoal font-medium">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}