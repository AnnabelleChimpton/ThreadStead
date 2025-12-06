import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const LightingSVGs = ({ id, variant, scale, className }: AssetProps) => {
    switch (id) {
        case 'garden_lantern':
            return (
                <svg width={16 * scale} height={32 * scale} viewBox="0 0 16 32" className={className} shapeRendering="crispEdges">
                    <rect x="7" y="16" width="2" height="14" fill="#2F2F2F" />
                    <rect x="4" y="14" width="8" height="2" fill="#4A4A4A" />
                    <rect x="5" y="6" width="6" height="8" fill="#FFF8DC" fillOpacity="0.8" />
                    <rect x="6" y="4" width="4" height="2" fill="#2F2F2F" />
                    <rect x="7" y="2" width="2" height="2" fill="#2F2F2F" />
                    <rect x="7" y="9" width="2" height="2" fill="#FFD700" />
                </svg>
            )
        case 'string_lights':
            return (
                <svg width={64 * scale} height={16 * scale} viewBox="0 0 64 16" className={className} shapeRendering="crispEdges">
                    {/* Wire - pixel art stepped curve */}
                    <rect x="2" y="8" width="8" height="1" fill="#2F2F2F" />
                    <rect x="10" y="7" width="6" height="1" fill="#2F2F2F" />
                    <rect x="16" y="6" width="8" height="1" fill="#2F2F2F" />
                    <rect x="24" y="7" width="8" height="1" fill="#2F2F2F" />
                    <rect x="32" y="8" width="8" height="1" fill="#2F2F2F" />
                    <rect x="40" y="7" width="6" height="1" fill="#2F2F2F" />
                    <rect x="46" y="6" width="8" height="1" fill="#2F2F2F" />
                    <rect x="54" y="7" width="8" height="1" fill="#2F2F2F" />
                    {/* Bulbs */}
                    <rect x="7" y="8" width="2" height="3" fill="#FFD700" />
                    <rect x="19" y="7" width="2" height="3" fill="#FF6347" />
                    <rect x="31" y="8" width="2" height="3" fill="#32CD32" />
                    <rect x="43" y="7" width="2" height="3" fill="#87CEEB" />
                    <rect x="55" y="7" width="2" height="3" fill="#DA70D6" />
                </svg>
            )
        case 'torch':
            return (
                <svg width={12 * scale} height={36 * scale} viewBox="0 0 12 36" className={className} shapeRendering="crispEdges">
                    <rect x="5" y="20" width="2" height="14" fill="#8B4513" />
                    <rect x="4" y="18" width="4" height="2" fill="#2F2F2F" />
                    <rect x="5" y="12" width="2" height="6" fill="#FF4500" />
                    <rect x="5" y="10" width="2" height="4" fill="#FF6347" />
                    <rect x="6" y="8" width="1" height="3" fill="#FFD700" />
                </svg>
            )
        case 'spotlight':
            return (
                <svg width={20 * scale} height={24 * scale} viewBox="0 0 20 24" className={className} shapeRendering="crispEdges">
                    <rect x="9" y="18" width="2" height="4" fill="#2F2F2F" />
                    <rect x="8" y="22" width="4" height="1" fill="#4A4A4A" />
                    <rect x="7" y="11" width="6" height="4" fill="#4A4A4A" />
                    <rect x="8" y="11" width="4" height="4" fill="#E6E6FA" />
                    <rect x="8" y="15" width="4" height="3" fill="#2F2F2F" />
                </svg>
            )
        default:
            return (
                <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
                    {/* Pixel art circle glow */}
                    <rect x="4" y="4" width="8" height="8" fill="#FFD700" />
                    <rect x="3" y="5" width="10" height="6" fill="#FFD700" />
                    <rect x="5" y="3" width="6" height="10" fill="#FFD700" />
                    {/* Simple lightbulb shape fallback */}
                    <rect x="6" y="4" width="4" height="5" fill="#FFF8DC" />
                    <rect x="7" y="9" width="2" height="2" fill="#A9A9A9" />
                    <rect x="7" y="3" width="2" height="2" fill="#FFFACD" />
                </svg>
            )
    }
}
