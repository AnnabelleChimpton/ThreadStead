import React from 'react'

export type HouseTemplate = 'cottage_v1' | 'townhouse_v1' | 'loft_v1' | 'cabin_v1'
export type ColorPalette = 'thread_sage' | 'charcoal_nights' | 'pixel_petals' | 'crt_glow' | 'classic_linen'

export interface HouseCustomizations {
  windowStyle?: 'default' | 'round' | 'arched' | 'bay'
  doorStyle?: 'default' | 'arched' | 'double' | 'cottage'  
  roofTrim?: 'default' | 'ornate' | 'scalloped' | 'gabled'
  // Color overrides - when provided, override palette colors
  wallColor?: string      // Override base color
  roofColor?: string      // Override primary color  
  trimColor?: string      // Override secondary color
  windowColor?: string    // Override accent color
  detailColor?: string    // Override detail color
  // Text customizations
  houseTitle?: string        // Custom title (max 50 chars)
  houseDescription?: string  // Custom description (max 200 chars)
  houseBoardText?: string    // Custom text for house board/sign (max 30 chars)
}

interface HouseSVGProps {
  template: HouseTemplate
  palette: ColorPalette
  className?: string
  onClick?: () => void
  customizations?: HouseCustomizations
}

const PALETTE_COLORS = {
  thread_sage: {
    primary: '#A18463',    // sage
    secondary: '#2E4B3F',  // pine  
    accent: '#8EC5E8',     // sky
    base: '#F5E9D4',       // cream
    detail: '#4FAF6D'      // meadow
  },
  charcoal_nights: {
    primary: '#2F2F2F',    // charcoal
    secondary: '#B8B8B8',  // stone
    accent: '#E27D60',     // sunset
    base: '#FCFAF7',       // paper
    detail: '#A18463'      // sage
  },
  pixel_petals: {
    primary: '#E27D60',    // sunset
    secondary: '#4FAF6D',  // meadow
    accent: '#8EC5E8',     // sky
    base: '#F5E9D4',       // cream
    detail: '#2E4B3F'      // pine
  },
  crt_glow: {
    primary: '#8EC5E8',    // sky
    secondary: '#2F2F2F',  // charcoal
    accent: '#4FAF6D',     // meadow
    base: '#FCFAF7',       // paper
    detail: '#E27D60'      // sunset
  },
  classic_linen: {
    primary: '#F5E9D4',    // cream
    secondary: '#A18463',  // sage
    accent: '#2E4B3F',     // pine
    base: '#FCFAF7',       // paper
    detail: '#8EC5E8'      // sky
  }
}

// Dynamic rendering helpers for house customizations
const renderWindows = (windowStyle: string = 'default', colors: any, leftPos: {x: number, y: number, w: number, h: number}, rightPos: {x: number, y: number, w: number, h: number}) => {
  switch (windowStyle) {
    case 'round':
      return (
        <>
          <circle cx={leftPos.x + leftPos.w/2} cy={leftPos.y + leftPos.h/2} r={leftPos.w/2} fill={colors.accent} stroke={colors.secondary} strokeWidth="1"/>
          <circle cx={rightPos.x + rightPos.w/2} cy={rightPos.y + rightPos.h/2} r={rightPos.w/2} fill={colors.accent} stroke={colors.secondary} strokeWidth="1"/>
          <line x1={leftPos.x + leftPos.w/2} y1={leftPos.y} x2={leftPos.x + leftPos.w/2} y2={leftPos.y + leftPos.h} stroke={colors.secondary} strokeWidth="0.5"/>
          <line x1={leftPos.x} y1={leftPos.y + leftPos.h/2} x2={leftPos.x + leftPos.w} y2={leftPos.y + leftPos.h/2} stroke={colors.secondary} strokeWidth="0.5"/>
          <line x1={rightPos.x + rightPos.w/2} y1={rightPos.y} x2={rightPos.x + rightPos.w/2} y2={rightPos.y + rightPos.h} stroke={colors.secondary} strokeWidth="0.5"/>
          <line x1={rightPos.x} y1={rightPos.y + rightPos.h/2} x2={rightPos.x + rightPos.w} y2={rightPos.y + rightPos.h/2} stroke={colors.secondary} strokeWidth="0.5"/>
        </>
      )
    case 'arched':
      return (
        <>
          <path d={`M${leftPos.x} ${leftPos.y + leftPos.h} Q${leftPos.x} ${leftPos.y} ${leftPos.x + leftPos.w/2} ${leftPos.y} Q${leftPos.x + leftPos.w} ${leftPos.y} ${leftPos.x + leftPos.w} ${leftPos.y + leftPos.h} Z`} fill={colors.accent} stroke={colors.secondary} strokeWidth="1"/>
          <path d={`M${rightPos.x} ${rightPos.y + rightPos.h} Q${rightPos.x} ${rightPos.y} ${rightPos.x + rightPos.w/2} ${rightPos.y} Q${rightPos.x + rightPos.w} ${rightPos.y} ${rightPos.x + rightPos.w} ${rightPos.y + rightPos.h} Z`} fill={colors.accent} stroke={colors.secondary} strokeWidth="1"/>
          <line x1={leftPos.x + leftPos.w/2} y1={leftPos.y} x2={leftPos.x + leftPos.w/2} y2={leftPos.y + leftPos.h} stroke={colors.secondary} strokeWidth="0.5"/>
          <line x1={rightPos.x + rightPos.w/2} y1={rightPos.y} x2={rightPos.x + rightPos.w/2} y2={rightPos.y + rightPos.h} stroke={colors.secondary} strokeWidth="0.5"/>
        </>
      )
    case 'bay':
      return (
        <>
          <path d={`M${leftPos.x + 2} ${leftPos.y + leftPos.h} L${leftPos.x + 2} ${leftPos.y + 3} L${leftPos.x - 2} ${leftPos.y - 2} L${leftPos.x + leftPos.w + 2} ${leftPos.y - 2} L${leftPos.x + leftPos.w - 2} ${leftPos.y + 3} L${leftPos.x + leftPos.w - 2} ${leftPos.y + leftPos.h} Z`} fill={colors.base} stroke={colors.primary} strokeWidth="1"/>
          <rect x={leftPos.x} y={leftPos.y + 3} width={leftPos.w - 4} height={leftPos.h - 6} fill={colors.accent} stroke={colors.secondary} strokeWidth="0.5"/>
          <path d={`M${rightPos.x + 2} ${rightPos.y + rightPos.h} L${rightPos.x + 2} ${rightPos.y + 3} L${rightPos.x - 2} ${rightPos.y - 2} L${rightPos.x + rightPos.w + 2} ${rightPos.y - 2} L${rightPos.x + rightPos.w - 2} ${rightPos.y + 3} L${rightPos.x + rightPos.w - 2} ${rightPos.y + rightPos.h} Z`} fill={colors.base} stroke={colors.primary} strokeWidth="1"/>
          <rect x={rightPos.x} y={rightPos.y + 3} width={rightPos.w - 4} height={rightPos.h - 6} fill={colors.accent} stroke={colors.secondary} strokeWidth="0.5"/>
          <line x1={leftPos.x + leftPos.w/2 - 2} y1={leftPos.y + 3} x2={leftPos.x + leftPos.w/2 - 2} y2={leftPos.y + leftPos.h - 3} stroke={colors.secondary} strokeWidth="0.3"/>
          <line x1={rightPos.x + rightPos.w/2 - 2} y1={rightPos.y + 3} x2={rightPos.x + rightPos.w/2 - 2} y2={rightPos.y + rightPos.h - 3} stroke={colors.secondary} strokeWidth="0.3"/>
        </>
      )
    default: // default rectangular windows
      return (
        <>
          <rect x={leftPos.x} y={leftPos.y} width={leftPos.w} height={leftPos.h} fill={colors.accent} stroke={colors.secondary} strokeWidth="1"/>
          <rect x={rightPos.x} y={rightPos.y} width={rightPos.w} height={rightPos.h} fill={colors.accent} stroke={colors.secondary} strokeWidth="1"/>
          <line x1={leftPos.x + leftPos.w/2} y1={leftPos.y} x2={leftPos.x + leftPos.w/2} y2={leftPos.y + leftPos.h} stroke={colors.secondary} strokeWidth="0.5"/>
          <line x1={leftPos.x} y1={leftPos.y + leftPos.h/2} x2={leftPos.x + leftPos.w} y2={leftPos.y + leftPos.h/2} stroke={colors.secondary} strokeWidth="0.5"/>
          <line x1={rightPos.x + rightPos.w/2} y1={rightPos.y} x2={rightPos.x + rightPos.w/2} y2={rightPos.y + rightPos.h} stroke={colors.secondary} strokeWidth="0.5"/>
          <line x1={rightPos.x} y1={rightPos.y + rightPos.h/2} x2={rightPos.x + rightPos.w} y2={rightPos.y + rightPos.h/2} stroke={colors.secondary} strokeWidth="0.5"/>
        </>
      )
  }
}

const renderDoor = (doorStyle: string = 'default', colors: any, pos: {x: number, y: number, w: number, h: number}) => {
  switch (doorStyle) {
    case 'arched':
      return (
        <>
          <path d={`M${pos.x} ${pos.y + pos.h} L${pos.x} ${pos.y + pos.h/2} Q${pos.x} ${pos.y} ${pos.x + pos.w/2} ${pos.y} Q${pos.x + pos.w} ${pos.y} ${pos.x + pos.w} ${pos.y + pos.h/2} L${pos.x + pos.w} ${pos.y + pos.h} Z`} fill={colors.secondary} stroke={colors.primary} strokeWidth="1"/>
          <rect x={pos.x + 2} y={pos.y + 5} width={pos.w - 4} height={pos.h/3} fill="none" stroke={colors.primary} strokeWidth="0.5"/>
          <rect x={pos.x + 2} y={pos.y + pos.h/2 + 2} width={pos.w - 4} height={pos.h/3} fill="none" stroke={colors.primary} strokeWidth="0.5"/>
          <circle cx={pos.x + pos.w - 4} cy={pos.y + pos.h/2 + 3} r="1" fill={colors.accent}/>
        </>
      )
    case 'double':
      return (
        <>
          <rect x={pos.x} y={pos.y} width={pos.w/2 - 1} height={pos.h} fill={colors.secondary} stroke={colors.primary} strokeWidth="1"/>
          <rect x={pos.x + pos.w/2 + 1} y={pos.y} width={pos.w/2 - 1} height={pos.h} fill={colors.secondary} stroke={colors.primary} strokeWidth="1"/>
          <rect x={pos.x + 2} y={pos.y + 5} width={pos.w/2 - 6} height={pos.h/3} fill="none" stroke={colors.primary} strokeWidth="0.5"/>
          <rect x={pos.x + pos.w/2 + 3} y={pos.y + 5} width={pos.w/2 - 6} height={pos.h/3} fill="none" stroke={colors.primary} strokeWidth="0.5"/>
          <circle cx={pos.x + pos.w/2 - 3} cy={pos.y + pos.h/2} r="1" fill={colors.accent}/>
          <circle cx={pos.x + pos.w/2 + 4} cy={pos.y + pos.h/2} r="1" fill={colors.accent}/>
        </>
      )
    case 'cottage':
      return (
        <>
          <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} fill="#D2691E" stroke="#8B4513" strokeWidth="1"/>
          <line x1={pos.x} y1={pos.y + pos.h/2} x2={pos.x + pos.w} y2={pos.y} stroke="#8B4513" strokeWidth="0.8"/>
          <line x1={pos.x} y1={pos.y} x2={pos.x + pos.w} y2={pos.y + pos.h/2} stroke="#8B4513" strokeWidth="0.8"/>
          <line x1={pos.x + pos.w/4} y1={pos.y} x2={pos.x + pos.w/4} y2={pos.y + pos.h} stroke="#8B4513" strokeWidth="0.3"/>
          <line x1={pos.x + pos.w/2} y1={pos.y} x2={pos.x + pos.w/2} y2={pos.y + pos.h} stroke="#8B4513" strokeWidth="0.3"/>
          <line x1={pos.x + 3*pos.w/4} y1={pos.y} x2={pos.x + 3*pos.w/4} y2={pos.y + pos.h} stroke="#8B4513" strokeWidth="0.3"/>
          <circle cx={pos.x + pos.w - 3} cy={pos.y + pos.h/2} r="1" fill="#2F2F2F"/>
        </>
      )
    default: // default rectangular door
      return (
        <>
          <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} fill={colors.secondary} stroke={colors.primary} strokeWidth="1"/>
          <circle cx={pos.x + pos.w - 4} cy={pos.y + pos.h/2} r="1.5" fill={colors.accent}/>
        </>
      )
  }
}

const renderRoofTrim = (roofTrim: string = 'default', colors: any, roofPath: string) => {
  switch (roofTrim) {
    case 'ornate':
      return (
        <>
          <path d={roofPath} fill={colors.primary} stroke={colors.secondary} strokeWidth="2"/>
          <path d="M40 110 Q50 105 60 110 Q70 105 80 110 Q90 105 100 110 Q110 105 120 110 Q130 105 140 110 Q150 105 160 110" 
                fill="none" stroke={colors.secondary} strokeWidth="1.5"/>
          <circle cx="60" cy="110" r="2" fill={colors.secondary}/>
          <circle cx="100" cy="110" r="2" fill={colors.secondary}/>
          <circle cx="140" cy="110" r="2" fill={colors.secondary}/>
          <rect x="35" y="115" width="130" height="5" fill={colors.secondary}/>
        </>
      )
    case 'scalloped':
      return (
        <>
          <path d={roofPath} fill={colors.primary} stroke={colors.secondary} strokeWidth="2"/>
          <path d="M40 112 Q50 105 60 112 Q70 105 80 112 Q90 105 100 112 Q110 105 120 112 Q130 105 140 112 Q150 105 160 112 L160 118 L40 118 Z" 
                fill={colors.secondary} stroke={colors.primary} strokeWidth="0.5"/>
          <circle cx="55" cy="110" r="1" fill={colors.primary}/>
          <circle cx="85" cy="110" r="1" fill={colors.primary}/>
          <circle cx="115" cy="110" r="1" fill={colors.primary}/>
          <circle cx="145" cy="110" r="1" fill={colors.primary}/>
        </>
      )
    case 'gabled':
      return (
        <>
          <path d={roofPath} fill={colors.primary} stroke={colors.secondary} strokeWidth="2"/>
          <polygon points="100,60 95,70 105,70" fill={colors.secondary} stroke={colors.primary} strokeWidth="0.5"/>
          <rect x="35" y="115" width="130" height="5" fill={colors.secondary} stroke={colors.primary} strokeWidth="0.5"/>
          <path d="M50 115 Q55 110 60 115" fill="none" stroke={colors.primary} strokeWidth="1"/>
          <path d="M85 115 Q90 110 95 115" fill="none" stroke={colors.primary} strokeWidth="1"/>
          <path d="M105 115 Q110 110 115 115" fill="none" stroke={colors.primary} strokeWidth="1"/>
          <path d="M140 115 Q145 110 150 115" fill="none" stroke={colors.primary} strokeWidth="1"/>
        </>
      )
    default: // default roof
      return <path d={roofPath} fill={colors.primary} stroke={colors.secondary} strokeWidth="2"/>
  }
}

const CottageTemplate: React.FC<{ colors: typeof PALETTE_COLORS.thread_sage, customizations?: HouseCustomizations }> = ({ colors, customizations = {} }) => (
  <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base */}
    <rect x="40" y="120" width="120" height="50" fill={colors.base} stroke={colors.primary} strokeWidth="2"/>
    
    {/* Roof - dynamic with trim */}
    {renderRoofTrim(customizations.roofTrim, colors, "M30 120 L100 60 L170 120 Z")}
    
    {/* Door - dynamic */}
    {renderDoor(customizations.doorStyle, colors, {x: 90, y: 140, w: 20, h: 30})}
    
    {/* Windows - dynamic */}
    {renderWindows(customizations.windowStyle, colors, 
      {x: 55, y: 135, w: 15, h: 15}, 
      {x: 130, y: 135, w: 15, h: 15}
    )}
    
    {/* Chimney */}
    <rect x="130" y="70" width="12" height="30" fill={colors.secondary} stroke={colors.primary} strokeWidth="1"/>
    
    {/* Details */}
    <rect x="75" y="100" width="50" height="20" fill={colors.detail} stroke={colors.primary} strokeWidth="1"/>
    <text x="100" y="112" textAnchor="middle" fontSize="8" fill={colors.base} fontFamily="serif">
      {customizations.houseBoardText || "~home~"}
    </text>
  </svg>
)

const TownhouseTemplate: React.FC<{ colors: typeof PALETTE_COLORS.thread_sage, customizations?: HouseCustomizations }> = ({ colors, customizations = {} }) => (
  <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base structure */}
    <rect x="20" y="100" width="160" height="70" fill={colors.base} stroke={colors.primary} strokeWidth="2"/>
    
    {/* Flat roof - dynamic with trim */}
    {customizations.roofTrim === 'ornate' ? (
      <>
        <rect x="15" y="95" width="170" height="10" fill={colors.primary} stroke={colors.secondary} strokeWidth="2"/>
        <path d="M20 92 Q30 87 40 92 Q50 87 60 92 Q70 87 80 92 Q90 87 100 92 Q110 87 120 92 Q130 87 140 92 Q150 87 160 92 Q170 87 180 92" 
              fill="none" stroke={colors.secondary} strokeWidth="1.5"/>
        <circle cx="40" cy="92" r="2" fill={colors.secondary}/>
        <circle cx="80" cy="92" r="2" fill={colors.secondary}/>
        <circle cx="120" cy="92" r="2" fill={colors.secondary}/>
        <circle cx="160" cy="92" r="2" fill={colors.secondary}/>
        <rect x="12" y="88" width="176" height="4" fill={colors.secondary}/>
      </>
    ) : customizations.roofTrim === 'scalloped' ? (
      <>
        <rect x="15" y="95" width="170" height="10" fill={colors.primary} stroke={colors.secondary} strokeWidth="2"/>
        <path d="M20 94 Q30 87 40 94 Q50 87 60 94 Q70 87 80 94 Q90 87 100 94 Q110 87 120 94 Q130 87 140 94 Q150 87 160 94 Q170 87 180 94 L180 100 L20 100 Z" 
              fill={colors.secondary} stroke={colors.primary} strokeWidth="0.5"/>
        <circle cx="35" cy="92" r="1" fill={colors.primary}/>
        <circle cx="65" cy="92" r="1" fill={colors.primary}/>
        <circle cx="95" cy="92" r="1" fill={colors.primary}/>
        <circle cx="125" cy="92" r="1" fill={colors.primary}/>
        <circle cx="155" cy="92" r="1" fill={colors.primary}/>
      </>
    ) : customizations.roofTrim === 'gabled' ? (
      <>
        <rect x="15" y="95" width="170" height="10" fill={colors.primary} stroke={colors.secondary} strokeWidth="2"/>
        <rect x="12" y="88" width="176" height="4" fill={colors.secondary} stroke={colors.primary} strokeWidth="0.5"/>
        <path d="M30 88 Q35 83 40 88" fill="none" stroke={colors.primary} strokeWidth="1"/>
        <path d="M65 88 Q70 83 75 88" fill="none" stroke={colors.primary} strokeWidth="1"/>
        <path d="M95 88 Q100 83 105 88" fill="none" stroke={colors.primary} strokeWidth="1"/>
        <path d="M125 88 Q130 83 135 88" fill="none" stroke={colors.primary} strokeWidth="1"/>
        <path d="M155 88 Q160 83 165 88" fill="none" stroke={colors.primary} strokeWidth="1"/>
      </>
    ) : (
      <rect x="15" y="95" width="170" height="10" fill={colors.primary} stroke={colors.secondary} strokeWidth="2"/>
    )}
    
    {/* Door - dynamic */}
    {renderDoor(customizations.doorStyle, colors, {x: 90, y: 140, w: 20, h: 30})}
    
    {/* Large windows - dynamic */}
    {renderWindows(customizations.windowStyle, colors, 
      {x: 40, y: 115, w: 25, h: 20}, 
      {x: 135, y: 115, w: 25, h: 20}
    )}
    
    {/* Upper floor windows */}
    <rect x="50" y="110" width="12" height="12" fill={colors.detail} stroke={colors.primary} strokeWidth="1"/>
    <rect x="138" y="110" width="12" height="12" fill={colors.detail} stroke={colors.primary} strokeWidth="1"/>
    
    {/* Balcony */}
    <rect x="75" y="140" width="50" height="3" fill={colors.primary} stroke={colors.secondary} strokeWidth="1"/>
    
    {/* Address sign */}
    <rect x="85" y="115" width="30" height="8" fill={colors.detail} stroke={colors.primary} strokeWidth="1"/>
    <text x="100" y="121" textAnchor="middle" fontSize="6" fill={colors.base} fontFamily="mono">
      {customizations.houseBoardText || "@user"}
    </text>
  </svg>
)

const LoftTemplate: React.FC<{ colors: typeof PALETTE_COLORS.thread_sage, customizations?: HouseCustomizations }> = ({ colors, customizations = {} }) => (
  <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Modern base */}
    <rect x="30" y="80" width="140" height="90" fill={colors.base} stroke={colors.primary} strokeWidth="2"/>
    
    {/* Angular roof - dynamic with trim */}
    {renderRoofTrim(customizations.roofTrim, colors, "M25 80 L100 40 L175 80 Z")}
    
    {/* Large glass door - dynamic */}
    {renderDoor(customizations.doorStyle, colors, {x: 85, y: 130, w: 30, h: 40})}
    
    {/* Floor-to-ceiling windows - dynamic */}
    {renderWindows(customizations.windowStyle, colors, 
      {x: 45, y: 100, w: 20, h: 50}, 
      {x: 135, y: 100, w: 20, h: 50}
    )}
    
    {/* Modern details */}
    <rect x="70" y="85" width="60" height="8" fill={colors.detail} stroke={colors.primary} strokeWidth="1"/>
    <rect x="160" y="95" width="8" height="20" fill={colors.secondary} stroke={colors.primary} strokeWidth="1"/>
    
    {/* Minimal text */}
    <text x="100" y="90" textAnchor="middle" fontSize="6" fill={colors.base} fontFamily="sans-serif">
      {customizations.houseBoardText || "STUDIO"}
    </text>
  </svg>
)

const CabinTemplate: React.FC<{ colors: typeof PALETTE_COLORS.thread_sage, customizations?: HouseCustomizations }> = ({ colors, customizations = {} }) => (
  <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Log cabin base */}
    <rect x="35" y="110" width="130" height="60" fill={colors.base} stroke={colors.primary} strokeWidth="2"/>
    
    {/* Log lines */}
    <line x1="35" y1="125" x2="165" y2="125" stroke={colors.primary} strokeWidth="1"/>
    <line x1="35" y1="140" x2="165" y2="140" stroke={colors.primary} strokeWidth="1"/>
    <line x1="35" y1="155" x2="165" y2="155" stroke={colors.primary} strokeWidth="1"/>
    
    {/* Steep roof - dynamic with trim */}
    {renderRoofTrim(customizations.roofTrim, colors, "M25 110 L100 50 L175 110 Z")}
    
    {/* Rustic door - dynamic */}
    {renderDoor(customizations.doorStyle, colors, {x: 90, y: 135, w: 20, h: 35})}
    
    {/* Small windows - dynamic */}
    {renderWindows(customizations.windowStyle, colors, 
      {x: 55, y: 130, w: 12, h: 12}, 
      {x: 133, y: 130, w: 12, h: 12}
    )}
    <line x1="133" y1="136" x2="145" y2="136" stroke={colors.secondary} strokeWidth="0.5"/>
    
    {/* Chimney with smoke */}
    <rect x="125" y="65" width="15" height="30" fill={colors.primary} stroke={colors.secondary} strokeWidth="1"/>
    <circle cx="132.5" cy="60" r="3" fill={colors.detail} opacity="0.6"/>
    <circle cx="130" cy="55" r="2" fill={colors.detail} opacity="0.4"/>
    <circle cx="135" cy="52" r="2.5" fill={colors.detail} opacity="0.3"/>
    
    {/* Porch */}
    <rect x="75" y="160" width="50" height="10" fill={colors.detail} stroke={colors.primary} strokeWidth="1"/>
    <line x1="80" y1="160" x2="80" y2="170" stroke={colors.primary} strokeWidth="2"/>
    <line x1="120" y1="160" x2="120" y2="170" stroke={colors.primary} strokeWidth="2"/>
    
    {/* Wood grain detail */}
    <text x="100" y="120" textAnchor="middle" fontSize="8" fill={colors.primary} fontFamily="serif">⌂</text>
  </svg>
)

export default function HouseSVG({ template, palette, className = '', onClick, customizations }: HouseSVGProps) {
  const paletteColors = PALETTE_COLORS[palette]
  
  // For each color, use custom if set, otherwise use theme palette
  const colors = {
    base: customizations?.wallColor || paletteColors.base,
    primary: customizations?.roofColor || paletteColors.primary,
    secondary: customizations?.trimColor || paletteColors.secondary,
    accent: customizations?.windowColor || paletteColors.accent,
    detail: customizations?.detailColor || paletteColors.detail
  }
  
  const TemplateComponent = {
    cottage_v1: CottageTemplate,
    townhouse_v1: TownhouseTemplate, 
    loft_v1: LoftTemplate,
    cabin_v1: CabinTemplate
  }[template]

  return (
    <div 
      className={`inline-block cursor-pointer ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <TemplateComponent colors={colors} customizations={customizations} />
    </div>
  )
}