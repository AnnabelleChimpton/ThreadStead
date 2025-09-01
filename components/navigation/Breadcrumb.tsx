import React from "react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`breadcrumb ${className}`} data-component="breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="breadcrumb-separator mx-2 text-thread-sage">
              ›
            </span>
          )}
          {item.href && !item.active ? (
            <Link 
              href={item.href} 
              className="breadcrumb-link text-thread-pine hover:text-thread-sunset transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span 
              className={`breadcrumb-item ${
                item.active ? 'breadcrumb-active text-thread-charcoal' : 'text-thread-charcoal'
              }`}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}