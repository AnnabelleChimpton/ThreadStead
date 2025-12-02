import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const StructureSVGs = ({ id, variant, scale, className }: AssetProps) => {
    switch (id) {
        case 'gazebo':
            return (
                <svg width={48 * scale} height={48 * scale} viewBox="0 0 48 48" className={className} shapeRendering="crispEdges">
                    <rect x="8" y="24" width="4" height="20" fill="#8B4513" />
                    <rect x="36" y="24" width="4" height="20" fill="#8B4513" />
                    <rect x="4" y="24" width="40" height="2" fill="#A0522D" />
                    <rect x="4" y="42" width="40" height="2" fill="#A0522D" />
                    <rect x="6" y="24" width="36" height="18" fill="#FFFFFF" opacity="0.3" />
                    <path d="M4 24 L24 4 L44 24" fill="#8B4513" />
                    <path d="M8 24 L24 8 L40 24" fill="#A0522D" />
                </svg>
            )
        case 'trellis':
            return (
                <svg width={32 * scale} height={48 * scale} viewBox="0 0 32 48" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="8" width="2" height="40" fill="#8B4513" />
                    <rect x="26" y="8" width="2" height="40" fill="#8B4513" />
                    <rect x="4" y="8" width="24" height="2" fill="#8B4513" />
                    <rect x="4" y="16" width="24" height="1" fill="#A0522D" />
                    <rect x="4" y="24" width="24" height="1" fill="#A0522D" />
                    <rect x="4" y="32" width="24" height="1" fill="#A0522D" />
                    <rect x="4" y="40" width="24" height="1" fill="#A0522D" />
                    <rect x="10" y="8" width="1" height="40" fill="#A0522D" />
                    <rect x="16" y="8" width="1" height="40" fill="#A0522D" />
                    <rect x="22" y="8" width="1" height="40" fill="#A0522D" />
                    <rect x="2" y="44" width="28" height="4" fill="#228B22" opacity="0.8" />
                    <rect x="4" y="36" width="6" height="6" fill="#228B22" opacity="0.8" />
                    <rect x="22" y="20" width="6" height="6" fill="#228B22" opacity="0.8" />
                </svg>
            )
        case 'garden_arch':
            return (
                <svg width={40 * scale} height={48 * scale} viewBox="0 0 40 48" className={className} shapeRendering="crispEdges">
                    <rect x="6" y="16" width="4" height="32" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                    <rect x="30" y="16" width="4" height="32" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1" />
                    <path d="M6 16 Q20 0 34 16" fill="none" stroke="#FFFFFF" strokeWidth="4" />
                    <path d="M8 16 Q20 4 32 16" fill="none" stroke="#D1D5DB" strokeWidth="2" />
                    <rect x="4" y="20" width="8" height="2" fill="#D1D5DB" />
                    <rect x="28" y="20" width="8" height="2" fill="#D1D5DB" />
                    <rect x="4" y="30" width="8" height="2" fill="#D1D5DB" />
                    <rect x="28" y="30" width="8" height="2" fill="#D1D5DB" />
                    <rect x="4" y="40" width="8" height="2" fill="#D1D5DB" />
                    <rect x="28" y="40" width="8" height="2" fill="#D1D5DB" />
                    <rect x="4" y="14" width="6" height="6" fill="#FF69B4" opacity="0.8" />
                    <rect x="30" y="14" width="6" height="6" fill="#FF69B4" opacity="0.8" />
                    <rect x="17" y="6" width="6" height="6" fill="#FF69B4" opacity="0.8" />
                </svg>
            )
        default:
            return (
                <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="16" width="24" height="16" fill="#8B4513" />
                    <path d="M4 16 L16 4 L28 16" fill="#A0522D" />
                </svg>
            )
    }
}
