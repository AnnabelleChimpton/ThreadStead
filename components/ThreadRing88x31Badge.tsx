import React from 'react';
import { getBadgeTemplate, generateBadgeCSS } from '@/lib/threadring-badges';

interface ThreadRing88x31BadgeProps {
  templateId?: string;
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  imageUrl?: string;
  linkUrl?: string;
  className?: string;
  onClick?: () => void;
}

export default function ThreadRing88x31Badge({
  templateId,
  title,
  subtitle,
  backgroundColor = '#4A90E2',
  textColor = '#FFFFFF',
  imageUrl,
  linkUrl,
  className = '',
  onClick
}: ThreadRing88x31BadgeProps) {
  // If we have a custom image, use that
  if (imageUrl) {
    const BadgeElement = linkUrl ? 'a' : 'div';
    const props = linkUrl ? {
      href: linkUrl,
      target: '_blank',
      rel: 'noopener noreferrer'
    } : {};

    return (
      <BadgeElement
        {...props}
        className={`inline-block cursor-pointer transition-transform hover:scale-105 ${className}`}
        onClick={onClick}
      >
        <img
          src={imageUrl}
          alt={`${title} ThreadRing Badge`}
          width={88}
          height={31}
          className="threadring-badge-image border border-gray-400"
        />
      </BadgeElement>
    );
  }

  // Use template or custom colors
  let template;
  if (templateId) {
    template = getBadgeTemplate(templateId);
  }

  // If no template found, create a basic one with provided colors
  if (!template) {
    template = {
      id: 'custom',
      name: 'Custom',
      description: 'Custom badge',
      backgroundColor,
      textColor,
      textStyle: {
        fontSize: '10px',
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif'
      }
    };
  }

  const BadgeElement = linkUrl ? 'a' : 'div';
  const linkProps = linkUrl ? {
    href: linkUrl,
    target: '_blank',
    rel: 'noopener noreferrer'
  } : {};

  const badgeStyle: React.CSSProperties = {
    width: '88px',
    height: '31px',
    maxWidth: '88px',
    maxHeight: '31px',
    background: template.gradient 
      ? `linear-gradient(${
          template.gradient.direction === 'vertical' ? 'to bottom' :
          template.gradient.direction === 'diagonal' ? 'to bottom right' :
          'to right'
        }, ${template.gradient.from}, ${template.gradient.to})`
      : template.backgroundColor,
    color: template.textColor,
    border: `1px solid ${template.borderColor || template.backgroundColor}`,
    fontFamily: template.textStyle?.fontFamily || 'Arial, sans-serif',
    fontSize: subtitle ? '8px' : (template.textStyle?.fontSize || '10px'),
    fontWeight: template.textStyle?.fontWeight || 'bold',
    textShadow: template.textStyle?.textShadow || 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    lineHeight: 1,
    boxSizing: 'border-box',
    textDecoration: 'none',
    overflow: 'hidden',
    position: 'relative'
  };

  return (
    <BadgeElement
      {...linkProps}
      style={badgeStyle}
      className={`inline-block cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <div 
        style={{ 
          fontSize: subtitle ? '8px' : (template.textStyle?.fontSize || '10px'),
          lineHeight: 1,
          margin: 0,
          padding: 0,
          maxWidth: '86px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div 
          style={{ 
            fontSize: '7px',
            lineHeight: 1,
            margin: 0,
            padding: 0,
            maxWidth: '86px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            opacity: 0.9
          }}
        >
          {subtitle}
        </div>
      )}
    </BadgeElement>
  );
}