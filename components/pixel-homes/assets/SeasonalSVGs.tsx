import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const SeasonalSVGs = ({ id, variant, scale, className }: AssetProps) => {
    switch (id) {
        case 'pumpkin':
            return (
                <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className} shapeRendering="crispEdges">
                    <rect x="2" y="8" width="16" height="10" fill="#EA580C" />
                    <rect x="3" y="7" width="14" height="12" fill="#EA580C" />
                    <rect x="5" y="8" width="2" height="10" fill="#C2410C" opacity="0.5" />
                    <rect x="9" y="8" width="2" height="11" fill="#DC2626" opacity="0.5" />
                    <rect x="13" y="8" width="2" height="10" fill="#C2410C" opacity="0.5" />
                    <rect x="9" y="5" width="2" height="3" fill="#16A34A" />
                    <rect x="10" y="4" width="2" height="1" fill="#16A34A" />
                    <rect x="11" y="5" width="1" height="1" fill="#22C55E" />
                    <rect x="12" y="4" width="1" height="1" fill="#22C55E" />
                    <rect x="13" y="4" width="1" height="1" fill="#22C55E" />
                    <rect x="13" y="5" width="1" height="1" fill="#22C55E" />
                </svg>
            )
        default:
            return (
                <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="4" width="8" height="8" fill="#EA580C" />
                    <rect x="7" y="2" width="2" height="2" fill="#16A34A" />
                </svg>
            )
    }
}
