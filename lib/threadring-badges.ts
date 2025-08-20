export interface BadgeTemplate {
  id: string;
  name: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  gradient?: {
    from: string;
    to: string;
    direction?: 'horizontal' | 'vertical' | 'diagonal';
  };
  pattern?: 'solid' | 'dots' | 'stripes' | 'checkerboard';
  textStyle?: {
    fontSize: string;
    fontWeight: string;
    fontFamily?: string;
    textShadow?: string;
  };
}

export const BADGE_TEMPLATES: BadgeTemplate[] = [
  {
    id: 'classic_blue',
    name: 'Classic Blue',
    description: 'Traditional blue webring badge',
    backgroundColor: '#4A90E2',
    textColor: '#FFFFFF',
    borderColor: '#2171B5',
    textStyle: {
      fontSize: '10px',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
      textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
    }
  },
  {
    id: 'retro_green',
    name: 'Retro Green',
    description: 'Classic green terminal style',
    backgroundColor: '#228B22',
    textColor: '#00FF00',
    borderColor: '#006400',
    textStyle: {
      fontSize: '9px',
      fontWeight: 'bold',
      fontFamily: 'monospace',
      textShadow: '0px 0px 2px #00FF00'
    }
  },
  {
    id: 'neon_pink',
    name: 'Neon Pink',
    description: 'Bright 90s neon aesthetic',
    backgroundColor: '#FF1493',
    textColor: '#FFFFFF',
    borderColor: '#FF69B4',
    gradient: {
      from: '#FF1493',
      to: '#FF69B4',
      direction: 'diagonal'
    },
    textStyle: {
      fontSize: '10px',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
      textShadow: '0px 0px 3px #FFFFFF'
    }
  },
  {
    id: 'sunset_orange',
    name: 'Sunset Orange',
    description: 'Warm sunset gradient',
    backgroundColor: '#FF4500',
    textColor: '#FFFFFF',
    gradient: {
      from: '#FF6347',
      to: '#FF4500',
      direction: 'vertical'
    },
    textStyle: {
      fontSize: '10px',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif'
    }
  },
  {
    id: 'deep_purple',
    name: 'Deep Purple',
    description: 'Rich purple with gold text',
    backgroundColor: '#4B0082',
    textColor: '#FFD700',
    borderColor: '#6A0DAD',
    textStyle: {
      fontSize: '10px',
      fontWeight: 'bold',
      fontFamily: 'serif',
      textShadow: '1px 1px 1px rgba(0,0,0,0.8)'
    }
  },
  {
    id: 'matrix_black',
    name: 'Matrix Black',
    description: 'Black background with green text',
    backgroundColor: '#000000',
    textColor: '#00FF41',
    borderColor: '#008F11',
    textStyle: {
      fontSize: '9px',
      fontWeight: 'normal',
      fontFamily: 'monospace',
      textShadow: '0px 0px 1px #00FF41'
    }
  },
  {
    id: 'cyber_teal',
    name: 'Cyber Teal',
    description: 'Cyberpunk teal and blue',
    backgroundColor: '#008B8B',
    textColor: '#E0FFFF',
    borderColor: '#20B2AA',
    gradient: {
      from: '#008B8B',
      to: '#4682B4',
      direction: 'horizontal'
    },
    textStyle: {
      fontSize: '10px',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif'
    }
  },
  {
    id: 'golden_yellow',
    name: 'Golden Yellow',
    description: 'Bright yellow with dark text',
    backgroundColor: '#FFD700',
    textColor: '#8B4513',
    borderColor: '#FFA500',
    textStyle: {
      fontSize: '10px',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
      textShadow: '1px 1px 1px rgba(255,255,255,0.5)'
    }
  }
];

export function getBadgeTemplate(templateId: string): BadgeTemplate | undefined {
  return BADGE_TEMPLATES.find(template => template.id === templateId);
}

export function generateBadgeCSS(template: BadgeTemplate, title: string, subtitle?: string): string {
  const hasGradient = template.gradient;
  const background = hasGradient 
    ? `linear-gradient(${
        template.gradient!.direction === 'vertical' ? 'to bottom' :
        template.gradient!.direction === 'diagonal' ? 'to bottom right' :
        'to right'
      }, ${template.gradient!.from}, ${template.gradient!.to})`
    : template.backgroundColor;

  return `
    .badge-88x31 {
      width: 88px;
      height: 31px;
      background: ${background};
      color: ${template.textColor};
      border: 1px solid ${template.borderColor || template.backgroundColor};
      font-family: ${template.textStyle?.fontFamily || 'Arial, sans-serif'};
      font-size: ${template.textStyle?.fontSize || '10px'};
      font-weight: ${template.textStyle?.fontWeight || 'bold'};
      text-shadow: ${template.textStyle?.textShadow || 'none'};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      line-height: 1;
      box-sizing: border-box;
      cursor: pointer;
      text-decoration: none;
      overflow: hidden;
      position: relative;
    }

    .badge-88x31:hover {
      opacity: 0.9;
      transform: scale(1.02);
      transition: all 0.2s ease;
    }

    .badge-title {
      font-size: ${subtitle ? '8px' : template.textStyle?.fontSize || '10px'};
      line-height: 1;
      margin: 0;
      padding: 0;
      max-width: 86px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge-subtitle {
      font-size: 7px;
      line-height: 1;
      margin: 0;
      padding: 0;
      max-width: 86px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.9;
    }
  `;
}

export function generateBadgeHTML(
  template: BadgeTemplate, 
  title: string, 
  subtitle?: string,
  linkUrl?: string
): string {
  const css = generateBadgeCSS(template, title, subtitle);
  const content = `
    <div class="badge-88x31">
      <div class="badge-title">${title}</div>
      ${subtitle ? `<div class="badge-subtitle">${subtitle}</div>` : ''}
    </div>
  `;

  const badge = linkUrl 
    ? `<a href="${linkUrl}" class="badge-88x31" target="_blank" rel="noopener">${content.replace('<div class="badge-88x31">', '').replace('</div>', '')}</a>`
    : content;

  return `
    <style>
      ${css}
    </style>
    ${badge}
  `;
}

// Utility function to generate badge data URL for images
export function generateBadgeDataURL(
  template: BadgeTemplate,
  title: string,
  subtitle?: string
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 88;
  canvas.height = 31;
  const ctx = canvas.getContext('2d')!;

  // Background
  if (template.gradient) {
    const gradient = ctx.createLinearGradient(
      0, 0,
      template.gradient.direction === 'horizontal' ? 88 : 0,
      template.gradient.direction === 'vertical' ? 31 : 
      template.gradient.direction === 'diagonal' ? 31 : 0
    );
    gradient.addColorStop(0, template.gradient.from);
    gradient.addColorStop(1, template.gradient.to);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = template.backgroundColor;
  }
  ctx.fillRect(0, 0, 88, 31);

  // Border
  if (template.borderColor) {
    ctx.strokeStyle = template.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 88, 31);
  }

  // Text
  ctx.fillStyle = template.textColor;
  ctx.font = `${template.textStyle?.fontWeight || 'bold'} ${template.textStyle?.fontSize || '10px'} ${template.textStyle?.fontFamily || 'Arial'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (subtitle) {
    // Title and subtitle
    ctx.font = `${template.textStyle?.fontWeight || 'bold'} 8px ${template.textStyle?.fontFamily || 'Arial'}`;
    ctx.fillText(title, 44, 12);
    ctx.font = `normal 7px ${template.textStyle?.fontFamily || 'Arial'}`;
    ctx.fillText(subtitle, 44, 22);
  } else {
    // Just title
    ctx.fillText(title, 44, 15.5);
  }

  return canvas.toDataURL('image/png');
}