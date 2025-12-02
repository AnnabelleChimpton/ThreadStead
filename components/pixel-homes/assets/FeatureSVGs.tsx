import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const FeatureSVGs = ({ id, variant, scale, className }: AssetProps) => {
    switch (id) {
        case 'bird_bath':
            return (
                <svg width={24 * scale} height={32 * scale} viewBox="0 0 24 32" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="28" width="16" height="3" fill="#6B7280" />
                    <rect x="6" y="27" width="12" height="1" fill="#6B7280" />
                    <rect x="10" y="18" width="4" height="10" fill="#9CA3AF" />
                    <rect x="9" y="26" width="6" height="1" fill="#9CA3AF" />
                    <rect x="9" y="19" width="6" height="1" fill="#9CA3AF" />
                    <rect x="2" y="16" width="20" height="4" fill="#D1D5DB" />
                    <rect x="3" y="19" width="18" height="2" fill="#9CA3AF" />
                    <rect x="4" y="16" width="16" height="2" fill="#3B82F6" opacity="0.7" />
                    <rect x="6" y="16" width="4" height="1" fill="#60A5FA" opacity="0.5" />
                    <rect x="14" y="17" width="3" height="1" fill="#93C5FD" opacity="0.6" />
                    <rect x="8" y="14" width="3" height="2" fill="#8B5A2B" />
                    <rect x="7" y="13" width="2" height="2" fill="#A0522D" />
                    <rect x="7" y="14" width="1" height="1" fill="#000" />
                    <rect x="6" y="14" width="1" height="1" fill="#F59E0B" />
                </svg>
            )

        case 'garden_gnome':
            return (
                <svg width={16 * scale} height={24 * scale} viewBox="0 0 16 24" className={className} shapeRendering="crispEdges">
                    <rect x="2" y="22" width="12" height="2" fill="#4A5D23" />
                    <rect x="4" y="16" width="8" height="6" fill="#DC2626" />
                    <rect x="5" y="17" width="6" height="4" fill="#B91C1C" />
                    <rect x="3" y="16" width="2" height="4" fill="#F3E8FF" />
                    <rect x="11" y="16" width="2" height="4" fill="#F3E8FF" />
                    <rect x="5" y="10" width="6" height="6" fill="#FBBF24" />
                    <rect x="4" y="8" width="8" height="2" fill="#DC2626" />
                    <rect x="5" y="6" width="6" height="2" fill="#DC2626" />
                    <rect x="6" y="4" width="4" height="2" fill="#DC2626" />
                    <rect x="7" y="2" width="2" height="2" fill="#DC2626" />
                    <rect x="5" y="13" width="6" height="4" fill="#F3F4F6" />
                    <rect x="6" y="16" width="4" height="2" fill="#F3F4F6" />
                    <rect x="6" y="11" width="1" height="1" fill="#000" />
                    <rect x="9" y="11" width="1" height="1" fill="#000" />
                    <rect x="7" y="12" width="2" height="1" fill="#F97316" />
                </svg>
            )

        case 'decorative_fence':
            return (
                <svg width={48 * scale} height={20 * scale} viewBox="0 0 48 20" className={className} shapeRendering="crispEdges">
                    <rect x="2" y="8" width="3" height="10" fill="#8B4513" />
                    <rect x="14" y="8" width="3" height="10" fill="#8B4513" />
                    <rect x="26" y="8" width="3" height="10" fill="#8B4513" />
                    <rect x="38" y="8" width="3" height="10" fill="#8B4513" />
                    <rect x="2" y="6" width="3" height="2" fill="#A16207" />
                    <rect x="3" y="5" width="1" height="1" fill="#A16207" />
                    <rect x="14" y="6" width="3" height="2" fill="#A16207" />
                    <rect x="15" y="5" width="1" height="1" fill="#A16207" />
                    <rect x="26" y="6" width="3" height="2" fill="#A16207" />
                    <rect x="27" y="5" width="1" height="1" fill="#A16207" />
                    <rect x="38" y="6" width="3" height="2" fill="#A16207" />
                    <rect x="39" y="5" width="1" height="1" fill="#A16207" />
                    <rect x="0" y="11" width="48" height="2" fill="#92400E" />
                    <rect x="0" y="15" width="48" height="2" fill="#92400E" />
                    <rect x="8" y="12" width="1" height="1" fill="#451A03" />
                    <rect x="20" y="12" width="1" height="1" fill="#451A03" />
                    <rect x="32" y="12" width="1" height="1" fill="#451A03" />
                    <rect x="44" y="12" width="1" height="1" fill="#451A03" />
                    <rect x="8" y="16" width="1" height="1" fill="#451A03" />
                    <rect x="20" y="16" width="1" height="1" fill="#451A03" />
                    <rect x="32" y="16" width="1" height="1" fill="#451A03" />
                    <rect x="44" y="16" width="1" height="1" fill="#451A03" />
                </svg>
            )

        case 'wind_chimes':
            return (
                <svg width={16 * scale} height={28 * scale} viewBox="0 0 16 28" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="26" width="8" height="2" fill="#4A5D23" />
                    <rect x="7" y="4" width="2" height="6" fill="#8B4513" />
                    <rect x="7" y="3" width="2" height="1" fill="#A16207" />
                    <rect x="4" y="10" width="8" height="1" fill="#F3E8FF" />
                    <rect x="6" y="11" width="1" height="9" fill="#D1D5DB" />
                    <rect x="8" y="11" width="1" height="11" fill="#D1D5DB" />
                    <rect x="10" y="11" width="1" height="8" fill="#D1D5DB" />
                    <rect x="4" y="11" width="1" height="7" fill="#D1D5DB" />
                    <rect x="12" y="11" width="1" height="10" fill="#D1D5DB" />
                    <rect x="5" y="20" width="2" height="4" fill="#E5E7EB" />
                    <rect x="7" y="22" width="2" height="3" fill="#E5E7EB" />
                    <rect x="9" y="19" width="2" height="4" fill="#E5E7EB" />
                    <rect x="3" y="18" width="2" height="3" fill="#E5E7EB" />
                    <rect x="11" y="21" width="2" height="4" fill="#E5E7EB" />
                    <rect x="6" y="20" width="1" height="4" fill="#F9FAFB" opacity="0.5" />
                    <rect x="8" y="22" width="1" height="3" fill="#F9FAFB" opacity="0.5" />
                    <rect x="10" y="19" width="1" height="4" fill="#F9FAFB" opacity="0.5" />
                    <rect x="4" y="18" width="1" height="3" fill="#F9FAFB" opacity="0.5" />
                    <rect x="12" y="21" width="1" height="4" fill="#F9FAFB" opacity="0.5" />
                    <rect x="7" y="15" width="2" height="2" fill="#92400E" />
                </svg>
            )

        default:
            return (
                <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className} shapeRendering="crispEdges">
                    <rect x="2" y="2" width="16" height="16" fill="#8B5CF6" />
                    <text x="10" y="14" textAnchor="middle" fontSize="10" fill="white">★</text>
                </svg>
            )
    }
}
