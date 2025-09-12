import React, { useState } from 'react'

interface HotspotProps {
  x: number
  y: number
  width: number
  height: number
  onClick: () => void
  onHover?: (isHovered: boolean) => void
  label: string
  description: string
  className?: string
  children?: React.ReactNode
}

export default function Hotspot({ 
  x, 
  y, 
  width, 
  height, 
  onClick, 
  onHover,
  label, 
  description, 
  className = '',
  children 
}: HotspotProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    onHover?.(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onHover?.(false)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className={`
        absolute cursor-pointer
        ${isHovered || isFocused ? 'bg-thread-sky bg-opacity-20' : 'bg-transparent'}
        transition-all duration-200 ease-in-out
        border-2 border-transparent
        ${isFocused ? 'border-thread-sky border-opacity-60' : ''}
        rounded-md
        ${className}
      `}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-describedby={`hotspot-desc-${x}-${y}`}
    >
      {children}
      
      {/* Tooltip */}
      {(isHovered || isFocused) && (
        <div 
          id={`hotspot-desc-${x}-${y}`}
          className="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg pointer-events-none"
          style={{
            bottom: '110%',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap'
          }}
        >
          {description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
}

// Predefined hotspot components for common house elements
export const DoorHotspot: React.FC<{ onClick: () => void; className?: string; onHover?: (isHovered: boolean) => void }> = ({ onClick, className, onHover }) => (
  <Hotspot
    x={45}
    y={77}
    width={10}
    height={16}
    onClick={onClick}
    onHover={onHover}
    label="Enter house"
    description="Click to visit profile page"
    className={className}
  />
)

export const MailboxHotspot: React.FC<{ onClick: () => void; className?: string; onHover?: (isHovered: boolean) => void }> = ({ onClick, className, onHover }) => (
  <Hotspot
    x={15}
    y={80}
    width={8}
    height={12}
    onClick={onClick}
    onHover={onHover}
    label="Open mailbox"
    description="View guestbook messages"
    className={className}
  />
)

export const ThreadbookHotspot: React.FC<{ onClick: () => void; className?: string; onHover?: (isHovered: boolean) => void }> = ({ onClick, className, onHover }) => (
  <Hotspot
    x={77}
    y={80}
    width={8}
    height={12}
    onClick={onClick}
    onHover={onHover}
    label="View threadbook"
    description="Explore ThreadRing lineage"
    className={className}
  />
)

export const FlagHotspot: React.FC<{ onClick: () => void; className?: string; onHover?: (isHovered: boolean) => void }> = ({ onClick, className, onHover }) => (
  <Hotspot
    x={65}
    y={55}
    width={6}
    height={10}
    onClick={onClick}
    onHover={onHover}
    label="View rings"
    description="See ThreadRing memberships"
    className={className}
  />
)