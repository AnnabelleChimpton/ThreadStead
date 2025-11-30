import React from 'react'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'

interface InteractiveHouseSVGProps {
  template: HouseTemplate
  palette: ColorPalette
  className?: string
  customizations?: HouseCustomizations
  hasUnreadGuestbook?: boolean
  isPlayingMusic?: boolean
  isUserOnline?: boolean
  showInteractiveHints?: boolean
}

// Template-specific positioning for interactive elements
const TEMPLATE_POSITIONS = {
  cottage_v1: {
    door: { cx: 100, cy: 155, r: 2 }, // Centered on door (x=90, w=20 -> center=100)
    mailbox: { x: 25, y: 150, postHeight: 20 },
    flag: { x: 160, y: 100, poleHeight: 25 },
    threadbook: { x: 135, y: 148, width: 8, height: 3 },
    windows: [
      { x: 55, y: 125, width: 15, height: 15 },
      { x: 130, y: 125, width: 15, height: 15 }
    ]
  },
  townhouse_v1: {
    door: { cx: 100, cy: 155, r: 2 }, // Centered on door (x=90, w=20 -> center=100)
    mailbox: { x: 15, y: 155, postHeight: 15 },
    flag: { x: 170, y: 85, poleHeight: 20 },
    threadbook: { x: 85, y: 110, width: 10, height: 3 }, // On address sign
    windows: [
      { x: 55, y: 95, width: 20, height: 30 },
      { x: 125, y: 95, width: 20, height: 30 }
    ]
  },
  loft_v1: {
    door: { cx: 100, cy: 155, r: 2 }, // Centered on door (x=90, w=20 -> center=100)
    mailbox: { x: 20, y: 155, postHeight: 15 },
    flag: { x: 160, y: 85, poleHeight: 20 },
    threadbook: { x: 70, y: 80, width: 12, height: 3 }, // On detail bar
    windows: [
      { x: 50, y: 80, width: 30, height: 40 },
      { x: 120, y: 80, width: 30, height: 40 }
    ]
  },
  cabin_v1: {
    door: { cx: 100, cy: 140, r: 2 }, // Centered on door (x=90, w=20 -> center=100)
    mailbox: { x: 20, y: 160, postHeight: 10 },
    flag: { x: 160, y: 90, poleHeight: 25 },
    threadbook: { x: 80, y: 165, width: 10, height: 3 }, // On porch
    windows: [
      { x: 55, y: 125, width: 15, height: 15 },
      { x: 130, y: 125, width: 15, height: 15 }
    ]
  }
}

export default function InteractiveHouseSVG({
  template,
  palette,
  className = '',
  customizations,
  hasUnreadGuestbook = false,
  isPlayingMusic = false,
  isUserOnline = false,
  showInteractiveHints = true
}: InteractiveHouseSVGProps) {
  const positions = TEMPLATE_POSITIONS[template]

  return (
    <div className={`relative ${className}`}>
      {/* Base House */}
      <HouseSVG template={template} palette={palette} customizations={customizations} className="w-full h-full" />

      {/* Interactive Overlays - Positioned absolutely over the house */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 200 180"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Door Handle Glow (template-specific position) */}
        {showInteractiveHints && (
          <g className="door-hotspot pointer-events-auto">
            <circle
              cx={positions.door.cx}
              cy={positions.door.cy}
              r={positions.door.r}
              className="door-handle"
              style={{ cursor: 'pointer' }}
            />
            {isUserOnline && (
              <line
                x1={positions.door.cx - 18}
                y1={positions.door.cy - 15}
                x2={positions.door.cx - 18}
                y2={positions.door.cy + 15}
                className="door-shadow"
                stroke="black"
                strokeWidth="1"
                opacity="0.3"
              />
            )}
          </g>
        )}

        {/* Mailbox with Flag - template-specific position */}
        {showInteractiveHints && (
          <g className="mailbox-hotspot pointer-events-auto" style={{ cursor: 'pointer' }}>
            {/* Mailbox post */}
            <rect
              x={positions.mailbox.x + 1}
              y={positions.mailbox.y}
              width="2"
              height={positions.mailbox.postHeight}
              fill="#654321"
            />
            {/* Mailbox body */}
            <rect
              x={positions.mailbox.x - 2}
              y={positions.mailbox.y - 5}
              width="8"
              height="5"
              fill="#4A5568"
              rx="1"
            />
            {/* Mailbox door */}
            <rect
              x={positions.mailbox.x - 2}
              y={positions.mailbox.y - 4}
              width="6"
              height="3"
              fill="#5A6B78"
              rx="0.5"
            />
            {/* Flag */}
            <g className={`mailbox-flag ${hasUnreadGuestbook ? 'up' : 'down'}`}>
              <rect
                x={positions.mailbox.x + 4}
                y={hasUnreadGuestbook ? positions.mailbox.y - 7 : positions.mailbox.y - 3}
                width="3"
                height="2"
                fill="red"
                rx="0.2"
                className="mailbox-flag-rect"
              />
            </g>
          </g>
        )}

        {/* Ring Flag - template-specific position */}
        {showInteractiveHints && (
          <g className="flag-hotspot pointer-events-auto" style={{ cursor: 'pointer' }}>
            {/* Flag pole */}
            <rect
              x={positions.flag.x}
              y={positions.flag.y}
              width="1"
              height={positions.flag.poleHeight}
              fill="#8B4513"
            />
            {/* Flag */}
            <path
              className="ring-flag"
              d={`M${positions.flag.x + 1},${positions.flag.y} L${positions.flag.x + 10},${positions.flag.y + 3} L${positions.flag.x + 10},${positions.flag.y + 8} L${positions.flag.x + 1},${positions.flag.y + 5} Z`}
              fill="#A18463"
              opacity="0.9"
            />
          </g>
        )}

        {/* Threadbook - template-specific position */}
        {showInteractiveHints && (
          <g className="threadbook-hotspot pointer-events-auto" style={{ cursor: 'pointer' }}>
            <g className="threadbook">
              {/* Book spine */}
              <rect
                x={positions.threadbook.x}
                y={positions.threadbook.y}
                width={positions.threadbook.width}
                height={positions.threadbook.height}
                fill="#8B4513"
                rx="0.5"
              />
              {/* Book cover that opens on hover */}
              <rect
                className="threadbook-cover"
                x={positions.threadbook.x}
                y={positions.threadbook.y}
                width={positions.threadbook.width}
                height={positions.threadbook.height}
                fill="#654321"
                rx="0.5"
                opacity="0.9"
              />
              {/* Book pages hint */}
              <rect
                x={positions.threadbook.x + 0.5}
                y={positions.threadbook.y + 0.2}
                width={positions.threadbook.width - 1}
                height={positions.threadbook.height - 0.4}
                fill="#F5F5DC"
                opacity="0.7"
                rx="0.2"
              />
            </g>
          </g>
        )}

        {/* Window Curtain Hints - template-specific positions */}
        {showInteractiveHints && (
          <g className="window-hotspot pointer-events-none">
            {positions.windows.map((window, index) => (
              <rect
                key={index}
                className="window-curtain"
                x={window.x}
                y={window.y}
                width={window.width}
                height="1"
                fill="white"
                opacity="0.8"
              />
            ))}
          </g>
        )}
      </svg>

      {/* Music Notes (floating outside the house) */}
      {isPlayingMusic && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="music-note">♪</span>
          <span className="music-note">♫</span>
          <span className="music-note">♪</span>
        </div>
      )}

      {/* Interactive Glow Effect */}
      {showInteractiveHints && (
        <div
          className="interactive-glow absolute inset-0 bg-yellow-300 opacity-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)',
            filter: 'blur(20px)'
          }}
        />
      )}
    </div>
  )
}