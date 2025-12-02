import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const WaterSVGs = ({ id, variant, scale, className }: AssetProps) => {
    switch (id) {
        case 'fountain':
            return (
                <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="24" width="24" height="6" fill="#4682B4" />
                    <rect x="6" y="22" width="20" height="4" fill="#87CEEB" />
                    <rect x="8" y="22" width="16" height="3" fill="#B0E0E6" opacity="0.8" />
                    <rect x="14" y="14" width="4" height="8" fill="#A9A9A9" />
                    <rect x="15" y="12" width="2" height="4" fill="#87CEEB" />
                    <rect x="15" y="8" width="2" height="3" fill="#B0E0E6" />
                    <rect x="15" y="5" width="2" height="2" fill="#E0F6FF" />
                </svg>
            )
        case 'pond':
            return (
                <svg width={40 * scale} height={24 * scale} viewBox="0 0 40 24" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="16" width="32" height="6" fill="#4682B4" />
                    <rect x="6" y="14" width="28" height="4" fill="#87CEEB" />
                    <rect x="8" y="14" width="24" height="3" fill="#B0E0E6" opacity="0.8" />
                    <rect x="12" y="13" width="4" height="2" fill="#228B22" />
                    <rect x="28" y="15" width="3" height="2" fill="#32CD32" />
                </svg>
            )
        case 'rain_barrel':
            return (
                <svg width={20 * scale} height={32 * scale} viewBox="0 0 20 32" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="8" width="12" height="24" fill="#8B4513" />
                    <rect x="4" y="10" width="12" height="2" fill="#A0522D" />
                    <rect x="4" y="20" width="12" height="2" fill="#A0522D" />
                    <rect x="4" y="30" width="12" height="2" fill="#A0522D" />
                    <rect x="2" y="6" width="16" height="2" fill="#654321" />
                    <rect x="14" y="28" width="4" height="4" fill="#A9A9A9" />
                </svg>
            )
        default:
            return (
                <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="12" width="16" height="8" fill="#4682B4" rx="4" />
                    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">💧</text>
                </svg>
            )
    }
}
