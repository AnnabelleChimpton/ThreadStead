import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const PathSVGs = ({ id, variant, scale, className }: AssetProps) => {
    switch (id) {
        case 'stone_path':
            return (
                <svg width={48 * scale} height={16 * scale} viewBox="0 0 48 16" className={className} shapeRendering="crispEdges">
                    <rect x="2" y="5" width="12" height="6" fill="#9CA3AF" />
                    <rect x="3" y="6" width="10" height="4" fill="#D1D5DB" opacity="0.5" />
                    <rect x="16" y="4" width="10" height="5" fill="#6B7280" />
                    <rect x="17" y="5" width="8" height="3" fill="#9CA3AF" opacity="0.5" />
                    <rect x="28" y="6" width="12" height="7" fill="#9CA3AF" />
                    <rect x="29" y="7" width="10" height="5" fill="#D1D5DB" opacity="0.5" />
                    <rect x="41" y="5" width="6" height="4" fill="#6B7280" />
                </svg>
            )

        case 'brick_path':
            return (
                <svg width={48 * scale} height={12 * scale} viewBox="0 0 48 12" className={className} shapeRendering="crispEdges">
                    <rect x="0" y="0" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
                    <rect x="12" y="0" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
                    <rect x="24" y="0" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
                    <rect x="36" y="0" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
                    <rect x="-6" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
                    <rect x="6" y="6" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
                    <rect x="18" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
                    <rect x="30" y="6" width="12" height="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
                    <rect x="42" y="6" width="12" height="6" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
                </svg>
            )

        case 'stepping_stones':
            return (
                <svg width={36 * scale} height={24 * scale} viewBox="0 0 36 24" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="8" width="8" height="6" fill="#8B7355" />
                    <rect x="5" y="9" width="6" height="4" fill="#A3A3A3" />
                    <rect x="16" y="5" width="7" height="5" fill="#78716C" />
                    <rect x="17" y="6" width="5" height="3" fill="#9CA3AF" />
                    <rect x="24" y="12" width="9" height="7" fill="#8B7355" />
                    <rect x="25" y="13" width="7" height="5" fill="#A3A3A3" />
                    <rect x="6" y="10" width="1" height="1" fill="#16A34A" opacity="0.6" />
                    <rect x="20" y="6" width="1" height="1" fill="#16A34A" opacity="0.5" />
                    <rect x="28" y="14" width="1" height="1" fill="#16A34A" opacity="0.7" />
                </svg>
            )

        case 'gravel_path':
            return (
                <svg width={40 * scale} height={16 * scale} viewBox="0 0 40 16" className={className} shapeRendering="crispEdges">
                    <rect x="0" y="4" width="40" height="8" fill="#A8A29E" />
                    <rect x="0" y="5" width="40" height="6" fill="#D6D3D1" />
                    <rect x="3" y="7" width="1" height="1" fill="#78716C" />
                    <rect x="6" y="9" width="1" height="1" fill="#8B7355" />
                    <rect x="9" y="6" width="1" height="1" fill="#A3A3A3" />
                    <rect x="12" y="8" width="1" height="1" fill="#78716C" />
                    <rect x="15" y="7" width="1" height="1" fill="#8B7355" />
                    <rect x="18" y="6" width="1" height="1" fill="#A3A3A3" />
                    <rect x="21" y="9" width="1" height="1" fill="#78716C" />
                    <rect x="24" y="7" width="1" height="1" fill="#8B7355" />
                    <rect x="27" y="8" width="1" height="1" fill="#A3A3A3" />
                    <rect x="30" y="6" width="1" height="1" fill="#78716C" />
                    <rect x="33" y="8" width="1" height="1" fill="#8B7355" />
                    <rect x="36" y="7" width="1" height="1" fill="#A3A3A3" />
                    <rect x="4" y="8" width="1" height="1" fill="#57534E" />
                    <rect x="7" y="6" width="1" height="1" fill="#57534E" />
                    <rect x="10" y="9" width="1" height="1" fill="#57534E" />
                    <rect x="13" y="6" width="1" height="1" fill="#57534E" />
                    <rect x="16" y="8" width="1" height="1" fill="#57534E" />
                    <rect x="19" y="7" width="1" height="1" fill="#57534E" />
                    <rect x="22" y="6" width="1" height="1" fill="#57534E" />
                    <rect x="25" y="9" width="1" height="1" fill="#57534E" />
                    <rect x="28" y="6" width="1" height="1" fill="#57534E" />
                    <rect x="31" y="8" width="1" height="1" fill="#57534E" />
                    <rect x="34" y="7" width="1" height="1" fill="#57534E" />
                    <rect x="37" y="6" width="1" height="1" fill="#57534E" />
                </svg>
            )

        default:
            return (
                <svg width={32 * scale} height={8 * scale} viewBox="0 0 32 8" className={className} shapeRendering="crispEdges">
                    <rect x="0" y="2" width="32" height="4" fill="#8B5CF6" />
                </svg>
            )
    }
}
