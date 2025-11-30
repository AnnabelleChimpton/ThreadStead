import React from 'react'

export type HouseTemplate = 'cottage_v1' | 'townhouse_v1' | 'loft_v1' | 'cabin_v1'
export type ColorPalette = 'thread_sage' | 'charcoal_nights' | 'pixel_petals' | 'crt_glow' | 'classic_linen'

export interface HouseCustomizations {
  windowStyle?: 'default' | 'round' | 'arched' | 'bay'
  doorStyle?: 'default' | 'arched' | 'double' | 'cottage'
  roofTrim?: 'default' | 'ornate' | 'scalloped' | 'gabled'

  // New base pattern variations
  foundationStyle?: 'default' | 'stone' | 'brick' | 'raised'
  wallPattern?: 'default' | 'shingles' | 'board_batten' | 'stone_veneer'
  windowTreatments?: 'default' | 'shutters' | 'flower_boxes' | 'awnings'
  roofMaterial?: 'default' | 'shingles' | 'tile' | 'metal' | 'thatch'
  chimneyStyle?: 'default' | 'brick' | 'stone' | 'none'

  // Color overrides
  wallColor?: string
  roofColor?: string
  trimColor?: string
  windowColor?: string
  detailColor?: string
  foundationColor?: string

  // Text customizations
  houseTitle?: string
  houseDescription?: string
  houseBoardText?: string
}

interface HouseSVGProps {
  template: HouseTemplate
  palette: ColorPalette
  className?: string
  onClick?: () => void
  customizations?: HouseCustomizations
  variant?: 'detailed' | 'simplified'
}

const PALETTE_COLORS = {
  thread_sage: { primary: '#A18463', secondary: '#2E4B3F', accent: '#8EC5E8', base: '#F5E9D4', detail: '#4FAF6D' },
  charcoal_nights: { primary: '#2F2F2F', secondary: '#B8B8B8', accent: '#E27D60', base: '#FCFAF7', detail: '#A18463' },
  pixel_petals: { primary: '#E27D60', secondary: '#4FAF6D', accent: '#8EC5E8', base: '#F5E9D4', detail: '#2E4B3F' },
  crt_glow: { primary: '#8EC5E8', secondary: '#2F2F2F', accent: '#4FAF6D', base: '#FCFAF7', detail: '#E27D60' },
  classic_linen: { primary: '#F5E9D4', secondary: '#A18463', accent: '#2E4B3F', base: '#FCFAF7', detail: '#8EC5E8' }
}

const darken = (color: string, amount: number = 20) => {
  if (!color.startsWith('#')) return color;
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const lighten = (color: string, amount: number = 20) => {
  if (!color.startsWith('#')) return color;
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const seededRandom = (x: number, y: number) => {
  const n = x * 12.9898 + y * 78.233;
  return (Math.sin(n) * 43758.5453123) % 1;
}

// --- ADVANCED TEXTURE HELPERS ---

const renderBrickTexture = (x: number, y: number, w: number, h: number, color: string, simplified = false) => {
  const brickColor = color;
  const mortarColor = darken(color, 10);
  const shadowColor = darken(color, 20);

  if (simplified) {
    return (
      <g>
        {/* Base color */}
        <rect x={x} y={y} width={w} height={h} fill={brickColor} />
        {/* Simple horizontal lines for brick effect */}
        {Array.from({ length: Math.floor(h / 8) }).map((_, i) => (
          <rect key={i} x={x} y={y + i * 8} width={w} height={1} fill={mortarColor} />
        ))}
      </g>
    )
  }

  const bricks = [];
  const brickH = 4;
  const brickW = 6;

  for (let r = 0; r < h / brickH; r++) {
    const offset = (r % 2) * (brickW / 2);
    for (let c = 0; c < w / brickW + 1; c++) {
      const bx = x + c * brickW - offset;
      const by = y + r * brickH;

      // Clip to bounds
      if (bx < x - brickW || bx > x + w) continue;

      bricks.push(
        <g key={`${r}-${c}`}>
          <rect x={Math.max(x, bx)} y={by} width={Math.min(brickW - 1, x + w - bx)} height={brickH - 1} fill={brickColor} />
          {/* Subtle highlight on top edge */}
          <rect x={Math.max(x, bx)} y={by} width={Math.min(brickW - 1, x + w - bx)} height={1} fill={lighten(brickColor, 10)} />
          {/* Shadow on bottom/right */}
          <rect x={Math.max(x, bx) + Math.min(brickW - 1, x + w - bx) - 1} y={by} width={1} height={brickH - 1} fill={shadowColor} />
        </g>
      );
    }
  }
  return <g>{bricks}</g>;
}

const renderStoneTexture = (x: number, y: number, w: number, h: number, color: string, simplified = false) => {
  const stoneColor = color;
  const shadowColor = darken(color, 30);
  const highlightColor = lighten(color, 20);

  if (simplified) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={stoneColor} />
        {/* Simple noise pattern */}
        {Array.from({ length: 5 }).map((_, i) => (
          <rect
            key={i}
            x={x + (i * 20) % w}
            y={y + (i * 15) % h}
            width={4}
            height={3}
            fill={shadowColor}
            opacity="0.3"
          />
        ))}
      </g>
    )
  }

  const stones = [];

  // Procedural-ish irregular stones with deterministic random
  for (let i = 0; i < 30; i++) {
    const r1 = Math.abs(seededRandom(x + i, y + i));
    const r2 = Math.abs(seededRandom(x - i, y + i));
    const r3 = Math.abs(seededRandom(x + i, y - i));
    const r4 = Math.abs(seededRandom(x - i, y - i));

    const sx = x + r1 * (w - 10);
    const sy = y + r2 * (h - 5);
    const sw = 4 + r3 * 6;
    const sh = 3 + r4 * 4;

    stones.push(
      <g key={i}>
        <rect x={sx} y={sy} width={sw} height={sh} fill={stoneColor} rx="1" />
        <rect x={sx} y={sy} width={sw} height={1} fill={highlightColor} opacity="0.5" />
        <rect x={sx} y={sy + sh - 1} width={sw} height={1} fill={shadowColor} opacity="0.5" />
      </g>
    )
  }
  return <g>{stones}</g>;
}

const renderWoodSiding = (x: number, y: number, w: number, h: number, color: string, simplified = false) => {
  const plankH = 5;
  const shadowColor = darken(color, 20);

  if (simplified) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={color} />
        {Array.from({ length: Math.floor(h / plankH) }).map((_, i) => (
          <rect key={i} x={x} y={y + i * plankH + plankH - 1} width={w} height={1} fill={shadowColor} opacity="0.5" />
        ))}
      </g>
    )
  }

  const planks = [];

  for (let i = 0; i < h / plankH; i++) {
    const py = y + i * plankH;
    const r1 = Math.abs(seededRandom(x, py));
    const r2 = Math.abs(seededRandom(x + 1, py));
    const r3 = Math.abs(seededRandom(x + 2, py));
    const r4 = Math.abs(seededRandom(x + 3, py));

    planks.push(
      <g key={i}>
        <rect x={x} y={py} width={w} height={plankH - 1} fill={color} />
        <rect x={x} y={py + plankH - 1} width={w} height={1} fill={shadowColor} />
        {/* Wood grain details */}
        <rect x={x + r1 * w} y={py + 1} width={r2 * 10} height={1} fill={shadowColor} opacity="0.1" />
        <rect x={x + r3 * w} y={py + 2} width={r4 * 10} height={1} fill={shadowColor} opacity="0.1" />
      </g>
    )
  }
  return <g>{planks}</g>;
}

// --- ARCHITECTURAL ELEMENTS ---

const renderWindow = (x: number, y: number, w: number, h: number, style: string, colors: any, simplified = false) => {
  const frame = colors.secondary;
  const glass = colors.accent;
  const shadow = darken(colors.base, 40);
  const highlight = lighten(colors.accent, 40);

  if (simplified) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={frame} />
        <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill={glass} />
      </g>
    )
  }

  const baseWindow = (
    <g>
      {/* Deep Shadow */}
      <rect x={x + 1} y={y + 1} width={w} height={h} fill={shadow} />
      {/* Frame */}
      <rect x={x} y={y} width={w} height={h} fill={frame} />
      {/* Glass */}
      <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill={glass} />
      {/* Reflection */}
      <path d={`M${x + 3} ${y + h - 3} L${x + w - 3} ${y + 3} L${x + w - 2} ${y + 3} L${x + 4} ${y + h - 2} Z`} fill={highlight} opacity="0.4" />
    </g>
  );

  if (style === 'arched') {
    return (
      <g>
        {/* Arch Top */}
        <rect x={x} y={y} width={w} height={4} fill={frame} rx="2" />
        {/* Main Body */}
        <rect x={x} y={y + 2} width={w} height={h - 2} fill={frame} />
        {/* Glass */}
        <rect x={x + 2} y={y + 4} width={w - 4} height={h - 6} fill={glass} />
        <rect x={x + 2} y={y + 2} width={w - 4} height={4} fill={glass} rx="2" />
        {/* Muntins */}
        <rect x={x + w / 2 - 1} y={y + 2} width={2} height={h - 4} fill={frame} />
        <rect x={x + 2} y={y + h / 2} width={w - 4} height={2} fill={frame} />
      </g>
    )
  }

  if (style === 'round') {
    return (
      <g>
        {/* Round Window */}
        <rect x={x} y={y} width={w} height={h} fill={frame} rx={w / 2} />
        <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill={glass} rx={(w - 4) / 2} />
        <rect x={x + w / 2 - 1} y={y} width={2} height={h} fill={frame} />
        <rect x={x} y={y + h / 2 - 1} width={w} height={2} fill={frame} />
      </g>
    )
  }

  // Default with muntins
  return (
    <g>
      {baseWindow}
      <rect x={x + w / 2 - 1} y={y + 2} width={2} height={h - 4} fill={frame} />
      <rect x={x + 2} y={y + h / 3} width={w - 4} height={2} fill={frame} />
      <rect x={x + 2} y={y + 2 * h / 3} width={w - 4} height={2} fill={frame} />
    </g>
  )
}

const renderDoor = (x: number, y: number, w: number, h: number, style: string, colors: any, simplified = false) => {
  const doorColor = colors.secondary;
  const frameColor = darken(colors.primary, 30);
  const shadow = darken(colors.base, 40);

  if (simplified) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={doorColor} />
        <rect x={x - 1} y={y - 1} width={w + 2} height={h + 1} fill={frameColor} opacity="0.5" />
      </g>
    )
  }

  return (
    <g>
      {/* Frame Shadow */}
      <rect x={x} y={y} width={w + 2} height={h + 1} fill={shadow} opacity="0.5" />
      {/* Frame */}
      <rect x={x - 1} y={y - 1} width={w + 2} height={h + 1} fill={frameColor} />
      {/* Door */}
      <rect x={x} y={y} width={w} height={h} fill={doorColor} />
      {/* Panels */}
      <rect x={x + 3} y={y + 3} width={w - 6} height={h / 2 - 5} fill={darken(doorColor, 15)} />
      <rect x={x + 3} y={y + h / 2 + 2} width={w - 6} height={h / 2 - 5} fill={darken(doorColor, 15)} />
      {/* Knob */}
      <rect x={x + w - 4} y={y + h / 2} width={2} height={2} fill="#FFD700" />
    </g>
  )
}

// --- TEMPLATES ---

const CottageTemplate: React.FC<{ colors: any, customizations: HouseCustomizations, simplified: boolean }> = ({ colors, customizations, simplified }) => {
  const wallColor = customizations.wallColor || colors.base;
  const roofColor = customizations.roofColor || colors.primary;

  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      {/* Shadow under house */}
      <rect x="40" y="165" width="120" height="5" fill="black" opacity="0.2" rx="2" />

      {/* Foundation - Stone */}
      <rect x="40" y="150" width="120" height="20" fill="#777" />
      {renderStoneTexture(40, 150, 120, 20, "#888", simplified)}

      {/* Walls - Stucco/Plaster with texture */}
      <rect x="45" y="110" width="110" height="40" fill={wallColor} />
      {/* Wall texture noise */}
      {!simplified && Array.from({ length: 50 }).map((_, i) => {
        const r1 = Math.abs(seededRandom(i, 110));
        const r2 = Math.abs(seededRandom(i, 150));
        return <rect key={i} x={45 + r1 * 110} y={110 + r2 * 40} width={1} height={1} fill={darken(wallColor, 10)} opacity="0.3" />
      })}

      {/* Timber Framing (Tudor style) */}
      <rect x="45" y="110" width="5" height="40" fill={colors.secondary} />
      <rect x="150" y="110" width="5" height="40" fill={colors.secondary} />
      <rect x="45" y="110" width="110" height="4" fill={colors.secondary} />
      <rect x="98" y="110" width="4" height="40" fill={colors.secondary} />
      {/* Diagonal beams */}
      <path d="M50 114 L98 150 M150 114 L102 150" stroke={colors.secondary} strokeWidth="4" />

      {/* Chimney - MOVED BEFORE ROOF */}
      <rect x="130" y="60" width="15" height="40" fill="#8B4513" />
      {renderBrickTexture(130, 60, 15, 40, "#8B4513", simplified)}
      <rect x="128" y="58" width="19" height="4" fill="#555" />

      {/* Roof - Thatch/Shingle - Curved/Organic feel */}
      {/* Gable Fill (Behind roof trim) */}
      <path d="M30 110 Q100 50 170 110 Z" fill={wallColor} />
      {/* Roof Trim */}
      <path d="M25 110 Q100 40 175 110 L165 115 Q100 55 35 115 Z" fill={roofColor} />
      <path d="M25 110 Q100 40 175 110" stroke={darken(roofColor, 20)} strokeWidth="2" fill="none" />

      {/* Windows */}
      {renderWindow(55, 125, 15, 15, customizations.windowStyle || 'default', colors, simplified)}
      {renderWindow(130, 125, 15, 15, customizations.windowStyle || 'default', colors, simplified)}

      {/* Door - Round top */}
      {renderDoor(90, 135, 20, 35, 'cottage', colors, simplified)}

      {/* Flower Boxes */}
      {!simplified && (
        <>
          <rect x="53" y="142" width="19" height="4" fill="#8B4513" />
          <rect x="55" y="140" width="2" height="2" fill="#FF69B4" />
          <rect x="60" y="139" width="2" height="2" fill="#FFFF00" />
          <rect x="65" y="140" width="2" height="2" fill="#FF4500" />

          <rect x="128" y="142" width="19" height="4" fill="#8B4513" />
          <rect x="130" y="140" width="2" height="2" fill="#FF69B4" />
          <rect x="135" y="139" width="2" height="2" fill="#FFFF00" />
          <rect x="140" y="140" width="2" height="2" fill="#FF4500" />
        </>
      )}

      {/* Lantern */}
      {!simplified && (
        <>
          <rect x="115" y="135" width="4" height="6" fill="#222" />
          <rect x="116" y="136" width="2" height="4" fill="#FFD700" opacity="0.8" />
        </>
      )}
    </svg>
  )
}

const TownhouseTemplate: React.FC<{ colors: any, customizations: HouseCustomizations, simplified: boolean }> = ({ colors, customizations, simplified }) => {
  const wallColor = customizations.wallColor || colors.base;

  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      {/* Shadow */}
      <rect x="40" y="170" width="120" height="5" fill="black" opacity="0.2" />

      {/* Main Structure - Brick */}
      <rect x="40" y="80" width="120" height="90" fill={wallColor} />
      {renderBrickTexture(40, 80, 120, 90, wallColor, simplified)}

      {/* Cornice / Roof Trim */}
      <rect x="35" y="75" width="130" height="8" fill={colors.secondary} />
      <rect x="38" y="83" width="124" height="2" fill={darken(colors.secondary, 20)} />
      {/* Dentils */}
      {!simplified && Array.from({ length: 20 }).map((_, i) => (
        <rect key={i} x={38 + i * 6} y={79} width={2} height={2} fill={darken(colors.secondary, 30)} />
      ))}

      {/* Quoins (Corner stones) */}
      <rect x="40" y="80" width="8" height="90" fill={colors.detail} opacity="0.5" />
      <rect x="152" y="80" width="8" height="90" fill={colors.detail} opacity="0.5" />

      {/* Windows - Tall Victorian */}
      {renderWindow(55, 95, 20, 30, 'default', colors, simplified)}
      {renderWindow(125, 95, 20, 30, 'default', colors, simplified)}
      {/* Window Lintels */}
      <rect x="53" y="92" width="24" height="3" fill={colors.secondary} />
      <rect x="123" y="92" width="24" height="3" fill={colors.secondary} />

      {/* Door with Steps */}
      <rect x="85" y="135" width="30" height="35" fill="none" />
      {renderDoor(90, 135, 20, 35, 'double', colors, simplified)}

      {/* Steps */}
      <rect x="85" y="170" width="30" height="3" fill="#888" />
      <rect x="80" y="173" width="40" height="3" fill="#777" />
      <rect x="75" y="176" width="50" height="3" fill="#666" />

      {/* Railings */}
      {!simplified && (
        <>
          <rect x="80" y="155" width="2" height="18" fill="#222" />
          <rect x="118" y="155" width="2" height="18" fill="#222" />
          <rect x="80" y="155" width="10" height="2" fill="#222" />
          <rect x="110" y="155" width="10" height="2" fill="#222" />
        </>
      )}
    </svg>
  )
}

const LoftTemplate: React.FC<{ colors: any, customizations: HouseCustomizations, simplified: boolean }> = ({ colors, customizations, simplified }) => {
  const wallColor = customizations.wallColor || colors.base;

  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      {/* Shadow */}
      <rect x="40" y="170" width="120" height="5" fill="black" opacity="0.2" />

      {/* Vents/Pipes - MOVED BEFORE MAIN BLOCK */}
      <rect x="150" y="40" width="6" height="30" fill="#555" />
      <rect x="148" y="38" width="10" height="4" fill="#666" />
      {!simplified && <path d="M153 38 Q160 30 165 25" stroke="#DDD" strokeWidth="2" opacity="0.3" />}

      {/* Main Block - Concrete/Industrial */}
      <rect x="40" y="70" width="120" height="100" fill={wallColor} />
      {/* Concrete seams */}
      <rect x="40" y="100" width="120" height="1" fill={darken(wallColor, 10)} />
      <rect x="40" y="135" width="120" height="1" fill={darken(wallColor, 10)} />
      <rect x="100" y="70" width="1" height="100" fill={darken(wallColor, 10)} />

      {/* Roof - Flat with parapet */}
      <rect x="38" y="65" width="124" height="5" fill="#333" />

      {/* Large Industrial Windows */}
      <rect x="50" y="80" width="30" height="40" fill="#222" />
      <rect x="52" y="82" width="26" height="36" fill={colors.accent} opacity="0.8" />
      {/* Grid */}
      <rect x="64" y="80" width="2" height="40" fill="#222" />
      <rect x="50" y="100" width="30" height="2" fill="#222" />

      <rect x="120" y="80" width="30" height="40" fill="#222" />
      <rect x="122" y="82" width="26" height="36" fill={colors.accent} opacity="0.8" />
      <rect x="134" y="80" width="2" height="40" fill="#222" />
      <rect x="120" y="100" width="30" height="2" fill="#222" />

      {/* Door - Metal */}
      <rect x="90" y="140" width="20" height="30" fill="#444" />
      {!simplified && <rect x="90" y="140" width="20" height="30" fill="url(#metalPattern)" opacity="0.2" />}
      <rect x="105" y="155" width="2" height="4" fill="#888" />

      {/* Fire Escape / Balcony */}
      {!simplified && (
        <>
          <rect x="45" y="125" width="40" height="2" fill="#222" />
          <rect x="45" y="115" width="40" height="1" fill="#222" />
          <rect x="45" y="115" width="2" height="10" fill="#222" />
          <rect x="83" y="115" width="2" height="10" fill="#222" />
          <rect x="55" y="115" width="1" height="10" fill="#222" />
          <rect x="65" y="115" width="1" height="10" fill="#222" />
          <rect x="75" y="115" width="1" height="10" fill="#222" />
        </>
      )}
    </svg>
  )
}

const CabinTemplate: React.FC<{ colors: any, customizations: HouseCustomizations, simplified: boolean }> = ({ colors, customizations, simplified }) => {
  const wallColor = customizations.wallColor || colors.base;

  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      {/* Shadow */}
      <rect x="35" y="165" width="130" height="5" fill="black" opacity="0.2" />

      {/* Foundation - Raised Stone */}
      <rect x="40" y="150" width="120" height="20" fill="#555" />
      {renderStoneTexture(40, 150, 120, 20, "#666", simplified)}

      {/* Chimney - Stone - MOVED BEFORE ROOF */}
      <rect x="135" y="50" width="12" height="50" fill="#777" />
      {renderStoneTexture(135, 50, 12, 50, "#888", simplified)}

      {/* Log Walls */}
      <rect x="40" y="100" width="120" height="50" fill={wallColor} />
      {/* Logs */}
      {Array.from({ length: 6 }).map((_, i) => (
        <g key={i}>
          <rect x="38" y={100 + i * 8} width="124" height="7" fill={wallColor} rx="3" />
          <rect x="38" y={100 + i * 8 + 4} width="124" height="2" fill={darken(wallColor, 15)} opacity="0.5" />
          {/* Log Ends */}
          {!simplified && (
            <>
              <circle cx="42" cy={100 + i * 8 + 3.5} r="3" fill="#DEB887" />
              <circle cx="158" cy={100 + i * 8 + 3.5} r="3" fill="#DEB887" />
            </>
          )}
        </g>
      ))}

      {/* Roof - Green Metal or Shingle */}
      <path d="M30 100 L100 40 L170 100 Z" fill={colors.primary} />
      <path d="M30 100 L100 40 L170 100" stroke={darken(colors.primary, 20)} strokeWidth="2" fill="none" />

      {/* Porch */}
      <rect x="35" y="150" width="130" height="5" fill="#5C4033" />
      <rect x="45" y="120" width="5" height="30" fill="#5C4033" />
      <rect x="150" y="120" width="5" height="30" fill="#5C4033" />
      <rect x="98" y="120" width="4" height="30" fill="#5C4033" />

      {/* Door */}
      {renderDoor(90, 120, 20, 30, 'default', colors, simplified)}

      {/* Windows */}
      {renderWindow(55, 125, 15, 15, 'default', colors, simplified)}
      {renderWindow(130, 125, 15, 15, 'default', colors, simplified)}
    </svg>
  )
}

export default function HouseSVG({ template, palette, className = '', onClick, customizations, variant = 'detailed' }: HouseSVGProps) {
  const paletteColors = PALETTE_COLORS[palette]

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
    <svg
      viewBox="0 0 200 180"
      className={`house-svg ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      shapeRendering="crispEdges"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <TemplateComponent colors={colors} customizations={customizations || {}} simplified={variant === 'simplified'} />
    </svg>
  )
}