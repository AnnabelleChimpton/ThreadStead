export interface TemplatePreviewStyles {
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  borderStyle?: string;
  gradients?: string[];
}

export const TEMPLATE_PREVIEW_STYLES: Record<string, TemplatePreviewStyles> = {
  'abstract-art': {
    backgroundColor: '#f8f8f8',
    primaryColor: '#e74c3c',
    secondaryColor: '#3498db',
    accentColor: '#f1c40f',
    fontFamily: 'Righteous, Fredoka',
    borderStyle: 'solid',
    gradients: [
      'radial-gradient(ellipse at 15% 25%, rgba(231, 76, 60, 0.15) 0%, transparent 25%)',
      'radial-gradient(ellipse at 85% 75%, rgba(52, 152, 219, 0.12) 0%, transparent 30%)',
      'radial-gradient(ellipse at 60% 10%, rgba(155, 89, 182, 0.1) 0%, transparent 35%)'
    ]
  },
  'charcoal-nights': {
    backgroundColor: '#0a0e14',
    primaryColor: '#00ff88',
    secondaryColor: '#ff00ff',
    accentColor: '#00ffff',
    fontFamily: 'Courier New, monospace',
    borderStyle: 'solid',
    gradients: [
      'radial-gradient(circle at 20% 50%, rgba(0, 255, 136, 0.1) 0%, transparent 50%)',
      'radial-gradient(circle at 80% 30%, rgba(255, 0, 255, 0.05) 0%, transparent 40%)'
    ]
  },
  'pixel-petals': {
    backgroundColor: '#ffe0f0',
    primaryColor: '#ff69b4',
    secondaryColor: '#ff1493',
    accentColor: '#ffb6c1',
    fontFamily: 'Comic Sans MS, Quicksand',
    borderStyle: 'dashed',
    gradients: [
      'radial-gradient(circle at 30% 30%, rgba(255, 105, 180, 0.15) 0%, transparent 40%)',
      'linear-gradient(135deg, rgba(255, 182, 193, 0.1) 0%, rgba(255, 105, 180, 0.05) 100%)'
    ]
  },
  'retro-social': {
    backgroundColor: '#000428',
    primaryColor: '#ff6600',
    secondaryColor: '#0066ff',
    accentColor: '#ffcc00',
    fontFamily: 'Impact, Bebas Neue',
    borderStyle: 'ridge',
    gradients: [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'radial-gradient(circle at top right, rgba(102, 126, 234, 0.4) 0%, transparent 50%)'
    ]
  },
  'classic-linen': {
    backgroundColor: '#f5f2e8',
    primaryColor: '#8b7355',
    secondaryColor: '#a0826d',
    accentColor: '#d4af37',
    fontFamily: 'Playfair Display, Crimson Text',
    borderStyle: 'dotted',
    gradients: [
      'radial-gradient(circle at 25% 25%, rgba(139, 115, 85, 0.05) 0%, transparent 35%)',
      'linear-gradient(45deg, transparent 48%, rgba(139, 115, 85, 0.02) 50%, transparent 52%)'
    ]
  }
};

export function getTemplatePreviewStyle(templateType: string): React.CSSProperties {
  const styles = TEMPLATE_PREVIEW_STYLES[templateType];
  if (!styles) return {};

  const cssStyles: React.CSSProperties = {
    backgroundColor: styles.backgroundColor,
    color: styles.primaryColor,
    fontFamily: styles.fontFamily?.split(',')[0],
    position: 'relative',
    overflow: 'hidden'
  };

  if (styles.borderStyle) {
    cssStyles.borderStyle = styles.borderStyle as any;
  }

  return cssStyles;
}

export function getTemplateGradientOverlay(templateType: string): React.CSSProperties {
  const styles = TEMPLATE_PREVIEW_STYLES[templateType];
  if (!styles || !styles.gradients || styles.gradients.length === 0) return {};

  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: styles.gradients.join(', '),
    pointerEvents: 'none',
    opacity: 0.8
  };
}