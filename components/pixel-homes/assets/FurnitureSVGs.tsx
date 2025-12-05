import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const FurnitureSVGs = ({ id, variant, scale, className }: AssetProps) => {
    // Color variants for garden bench
    const getBenchColors = (variant: string) => {
        switch (variant) {
            case 'wood':
            default:
                return { primary: '#A0522D', secondary: '#8B4513', grain: '#654321' }
            case 'painted_white':
                return { primary: '#F9FAFB', secondary: '#E5E7EB', grain: '#D1D5DB' }
            case 'painted_green':
                return { primary: '#22C55E', secondary: '#16A34A', grain: '#15803D' }
            case 'weathered':
                return { primary: '#9CA3AF', secondary: '#6B7280', grain: '#4B5563' }
        }
    }

    // Color variants for mailbox
    const getMailboxColors = (variant: string) => {
        switch (variant) {
            case 'red':
            default:
                return { primary: '#FF6347', secondary: '#FF4500', accent: '#B22222' }
            case 'blue':
                return { primary: '#3B82F6', secondary: '#2563EB', accent: '#1D4ED8' }
            case 'black':
                return { primary: '#374151', secondary: '#1F2937', accent: '#111827' }
            case 'green':
                return { primary: '#22C55E', secondary: '#16A34A', accent: '#15803D' }
        }
    }

    switch (id) {
        case 'garden_bench':
            const benchColors = getBenchColors(variant)
            return (
                <svg width={48 * scale} height={24 * scale} viewBox="0 0 48 24" className={className} shapeRendering="crispEdges">
                    <rect x="6" y="12" width="3" height="8" fill={benchColors.secondary} />
                    <rect x="39" y="12" width="3" height="8" fill={benchColors.secondary} />
                    <rect x="4" y="10" width="40" height="6" fill={benchColors.primary} />
                    <rect x="4" y="6" width="40" height="4" fill={benchColors.primary} />
                    <rect x="4" y="8" width="4" height="2" fill={benchColors.secondary} />
                    <rect x="40" y="8" width="4" height="2" fill={benchColors.secondary} />
                    <rect x="8" y="11" width="32" height="1" fill={benchColors.grain} />
                    <rect x="8" y="13" width="32" height="1" fill={benchColors.grain} />
                    <rect x="8" y="7" width="32" height="1" fill={benchColors.grain} />
                </svg>
            )
        case 'outdoor_table':
            return (
                <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
                    <rect x="6" y="18" width="2" height="10" fill="#8B4513" />
                    <rect x="24" y="18" width="2" height="10" fill="#8B4513" />
                    <rect x="6" y="24" width="2" height="4" fill="#8B4513" />
                    <rect x="24" y="24" width="2" height="4" fill="#8B4513" />
                    <rect x="4" y="14" width="24" height="4" fill="#D2B48C" />
                    <rect x="5" y="13" width="22" height="6" fill="#DEB887" />
                    <rect x="12" y="12" width="2" height="2" fill="#FFE4E1" />
                    <rect x="18" y="11" width="4" height="6" fill="#8FBC8F" />
                </svg>
            )
        case 'mailbox':
            const mailboxColors = getMailboxColors(variant)
            return (
                <svg width={20 * scale} height={32 * scale} viewBox="0 0 20 32" className={className} shapeRendering="crispEdges">
                    <rect x="8" y="16" width="4" height="14" fill="#8B4513" />
                    <rect x="4" y="8" width="12" height="10" fill={mailboxColors.primary} />
                    <rect x="5" y="10" width="8" height="6" fill={mailboxColors.secondary} />
                    <rect x="12" y="13" width="2" height="2" fill="#FFD700" />
                    <rect x="16" y="10" width="3" height="2" fill="#FFD700" />
                    <rect x="9" y="15" width="3" height="1" fill="white" />
                </svg>
            )
        case 'planter_box':
        case 'planter_box_furniture':
            return (
                <svg width={32 * scale} height={20 * scale} viewBox="0 0 32 20" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="12" width="24" height="6" fill="#8B4513" />
                    <rect x="2" y="14" width="28" height="4" fill="#A0522D" />
                    <rect x="3" y="13" width="26" height="3" fill="#654321" />
                    <rect x="8" y="8" width="3" height="4" fill="#228B22" />
                    <rect x="16" y="6" width="4" height="5" fill="#32CD32" />
                    <rect x="24" y="8" width="3" height="4" fill="#228B22" />
                    <rect x="12" y="8" width="2" height="2" fill="#FF69B4" />
                    <rect x="20" y="7" width="2" height="2" fill="#FF1493" />
                </svg>
            )
        case 'picnic_table':
            return (
                <svg width={40 * scale} height={28 * scale} viewBox="0 0 40 28" className={className} shapeRendering="crispEdges">
                    <rect x="8" y="12" width="4" height="12" fill="#8B4513" />
                    <rect x="28" y="12" width="4" height="12" fill="#8B4513" />
                    <rect x="4" y="10" width="32" height="4" fill="#D2B48C" />
                    <rect x="2" y="18" width="2" height="6" fill="#8B4513" />
                    <rect x="36" y="18" width="2" height="6" fill="#8B4513" />
                    <rect x="0" y="16" width="16" height="3" fill="#D2B48C" />
                    <rect x="24" y="16" width="16" height="3" fill="#D2B48C" />
                </svg>
            )

        case 'raised_bed':
            return (
                <svg width={40 * scale} height={24 * scale} viewBox="0 0 40 24" className={className} shapeRendering="crispEdges">
                    {/* Wooden frame */}
                    <rect x="2" y="12" width="36" height="10" fill="#8B4513" />
                    <rect x="3" y="13" width="34" height="8" fill="#A0522D" />
                    {/* Wood grain details */}
                    <rect x="4" y="15" width="32" height="1" fill="#654321" opacity="0.5" />
                    <rect x="4" y="18" width="32" height="1" fill="#654321" opacity="0.5" />
                    {/* Corner posts */}
                    <rect x="2" y="10" width="3" height="12" fill="#654321" />
                    <rect x="35" y="10" width="3" height="12" fill="#654321" />
                    {/* Soil */}
                    <rect x="5" y="10" width="30" height="4" fill="#3D2314" />
                    {/* Plants growing */}
                    <rect x="8" y="6" width="2" height="5" fill="#228B22" />
                    <rect x="7" y="4" width="4" height="3" fill="#32CD32" />
                    <rect x="14" y="7" width="2" height="4" fill="#228B22" />
                    <rect x="13" y="5" width="4" height="3" fill="#2E8B57" />
                    <rect x="20" y="5" width="2" height="6" fill="#228B22" />
                    <rect x="19" y="3" width="4" height="3" fill="#32CD32" />
                    <rect x="26" y="6" width="2" height="5" fill="#228B22" />
                    <rect x="25" y="4" width="4" height="3" fill="#2E8B57" />
                    <rect x="32" y="7" width="2" height="4" fill="#228B22" />
                    <rect x="31" y="5" width="4" height="3" fill="#32CD32" />
                    {/* Tomatoes/vegetables */}
                    <circle cx="21" cy="4" r="2" fill="#DC2626" />
                    <circle cx="9" cy="5" r="1.5" fill="#EF4444" />
                </svg>
            )

        case 'compost_bin':
            return (
                <svg width={24 * scale} height={28 * scale} viewBox="0 0 24 28" className={className} shapeRendering="crispEdges">
                    {/* Main bin body */}
                    <rect x="4" y="8" width="16" height="18" fill="#374151" />
                    <rect x="5" y="9" width="14" height="16" fill="#4B5563" />
                    {/* Slats/vents */}
                    <rect x="6" y="11" width="12" height="2" fill="#1F2937" />
                    <rect x="6" y="15" width="12" height="2" fill="#1F2937" />
                    <rect x="6" y="19" width="12" height="2" fill="#1F2937" />
                    {/* Lid */}
                    <rect x="2" y="4" width="20" height="5" fill="#374151" />
                    <rect x="3" y="5" width="18" height="3" fill="#4B5563" />
                    {/* Lid handle */}
                    <rect x="10" y="2" width="4" height="3" fill="#6B7280" />
                    <rect x="11" y="3" width="2" height="1" fill="#9CA3AF" />
                    {/* Compost visible through slats */}
                    <rect x="7" y="12" width="10" height="1" fill="#92400E" opacity="0.6" />
                    <rect x="7" y="16" width="10" height="1" fill="#78350F" opacity="0.6" />
                    {/* Ground shadow */}
                    <rect x="3" y="26" width="18" height="1" fill="#000" opacity="0.2" />
                </svg>
            )

        case 'garden_cart':
            return (
                <svg width={36 * scale} height={24 * scale} viewBox="0 0 36 24" className={className} shapeRendering="crispEdges">
                    {/* Wheels */}
                    <circle cx="8" cy="18" r="4" fill="#374151" />
                    <circle cx="8" cy="18" r="2" fill="#6B7280" />
                    <circle cx="28" cy="18" r="4" fill="#374151" />
                    <circle cx="28" cy="18" r="2" fill="#6B7280" />
                    {/* Cart body */}
                    <rect x="4" y="6" width="28" height="10" fill="#22C55E" />
                    <rect x="5" y="7" width="26" height="8" fill="#16A34A" />
                    {/* Cart edges/frame */}
                    <rect x="4" y="6" width="28" height="2" fill="#15803D" />
                    <rect x="4" y="6" width="2" height="10" fill="#15803D" />
                    <rect x="30" y="6" width="2" height="10" fill="#15803D" />
                    {/* Handle */}
                    <rect x="32" y="8" width="3" height="2" fill="#8B4513" />
                    <rect x="34" y="6" width="2" height="6" fill="#8B4513" />
                    {/* Axle */}
                    <rect x="6" y="16" width="24" height="2" fill="#4B5563" />
                    {/* Contents - soil and plants */}
                    <rect x="6" y="5" width="24" height="3" fill="#5D4037" />
                    <rect x="10" y="2" width="3" height="4" fill="#228B22" />
                    <rect x="18" y="3" width="4" height="3" fill="#32CD32" />
                    <rect x="26" y="2" width="3" height="4" fill="#2E8B57" />
                    <circle cx="12" cy="3" r="2" fill="#F472B6" />
                    <circle cx="20" cy="2" r="2" fill="#FBBF24" />
                </svg>
            )

        default:
            return (
                <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="4" width="16" height="16" fill="#8B4513" rx="2" />
                    {/* Simple chair shape fallback */}
                    <rect x="8" y="8" width="8" height="2" fill="white" />
                    <rect x="8" y="10" width="2" height="6" fill="white" />
                    <rect x="14" y="10" width="2" height="6" fill="white" />
                    <rect x="8" y="14" width="8" height="2" fill="white" />
                </svg>
            )
    }
}
