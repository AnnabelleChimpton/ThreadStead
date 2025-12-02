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
        default:
            return (
                <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="4" width="16" height="16" fill="#8B4513" rx="2" />
                    <text x="12" y="14" textAnchor="middle" fontSize="8" fill="white">🪑</text>
                </svg>
            )
    }
}
