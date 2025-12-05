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

        case 'flamingo':
            return (
                <svg width={16 * scale} height={32 * scale} viewBox="0 0 16 32" className={className} shapeRendering="crispEdges">
                    {/* Legs */}
                    <rect x="6" y="18" width="1" height="12" fill="#1a1a1a" />
                    <rect x="9" y="20" width="1" height="10" fill="#1a1a1a" />
                    <rect x="5" y="29" width="3" height="2" fill="#1a1a1a" />
                    <rect x="8" y="29" width="3" height="2" fill="#1a1a1a" />
                    {/* Body */}
                    <ellipse cx="8" cy="14" rx="5" ry="4" fill="#FF69B4" />
                    <ellipse cx="8" cy="14" rx="4" ry="3" fill="#FFB6C1" />
                    {/* Neck curve */}
                    <rect x="10" y="10" width="2" height="5" fill="#FF69B4" />
                    <rect x="11" y="6" width="2" height="5" fill="#FF69B4" />
                    <rect x="10" y="3" width="2" height="4" fill="#FF69B4" />
                    {/* Head */}
                    <rect x="8" y="2" width="3" height="3" fill="#FF69B4" />
                    <rect x="7" y="3" width="2" height="2" fill="#FF69B4" />
                    {/* Beak */}
                    <rect x="5" y="3" width="3" height="1" fill="#1a1a1a" />
                    <rect x="4" y="4" width="2" height="1" fill="#1a1a1a" />
                    {/* Eye */}
                    <rect x="8" y="2" width="1" height="1" fill="#000" />
                </svg>
            )

        case 'garden_sphere':
            return (
                <svg width={20 * scale} height={24 * scale} viewBox="0 0 20 24" className={className} shapeRendering="crispEdges">
                    {/* Pedestal */}
                    <rect x="6" y="20" width="8" height="3" fill="#6B7280" />
                    <rect x="7" y="18" width="6" height="2" fill="#9CA3AF" />
                    <rect x="8" y="16" width="4" height="2" fill="#9CA3AF" />
                    {/* Gazing ball */}
                    <circle cx="10" cy="10" r="7" fill="#3B82F6" />
                    <circle cx="10" cy="10" r="6" fill="#60A5FA" />
                    {/* Reflections */}
                    <ellipse cx="7" cy="7" rx="2" ry="3" fill="#93C5FD" opacity="0.7" />
                    <rect x="6" y="5" width="1" height="2" fill="#FFF" opacity="0.5" />
                </svg>
            )

        case 'sundial':
            return (
                <svg width={24 * scale} height={20 * scale} viewBox="0 0 24 20" className={className} shapeRendering="crispEdges">
                    {/* Base */}
                    <rect x="4" y="16" width="16" height="3" fill="#6B7280" />
                    <rect x="6" y="14" width="12" height="2" fill="#9CA3AF" />
                    {/* Dial face */}
                    <ellipse cx="12" cy="10" rx="8" ry="5" fill="#D1D5DB" />
                    <ellipse cx="12" cy="10" rx="7" ry="4" fill="#E5E7EB" />
                    {/* Hour marks */}
                    <rect x="11" y="6" width="2" height="1" fill="#374151" />
                    <rect x="11" y="13" width="2" height="1" fill="#374151" />
                    <rect x="5" y="9" width="1" height="2" fill="#374151" />
                    <rect x="18" y="9" width="1" height="2" fill="#374151" />
                    {/* Gnomon (shadow caster) */}
                    <polygon points="12,6 14,10 10,10" fill="#78350F" />
                    {/* Shadow */}
                    <rect x="13" y="10" width="4" height="1" fill="#374151" opacity="0.5" />
                </svg>
            )

        case 'garden_gnome_fishing':
            return (
                <svg width={24 * scale} height={28 * scale} viewBox="0 0 24 28" className={className} shapeRendering="crispEdges">
                    {/* Base */}
                    <rect x="2" y="24" width="12" height="2" fill="#4A5D23" />
                    {/* Body */}
                    <rect x="4" y="18" width="8" height="6" fill="#2563EB" />
                    <rect x="5" y="19" width="6" height="4" fill="#1D4ED8" />
                    {/* Arms */}
                    <rect x="3" y="16" width="2" height="4" fill="#F3E8FF" />
                    <rect x="11" y="14" width="2" height="4" fill="#F3E8FF" />
                    {/* Fishing rod */}
                    <rect x="12" y="6" width="1" height="10" fill="#8B4513" />
                    <rect x="13" y="4" width="6" height="1" fill="#8B4513" />
                    <rect x="18" y="4" width="1" height="6" fill="#4B5563" opacity="0.5" />
                    {/* Head and hat */}
                    <rect x="5" y="10" width="6" height="6" fill="#FBBF24" />
                    <rect x="4" y="8" width="8" height="2" fill="#16A34A" />
                    <rect x="5" y="6" width="6" height="2" fill="#16A34A" />
                    <rect x="6" y="4" width="4" height="2" fill="#16A34A" />
                    <rect x="7" y="2" width="2" height="2" fill="#16A34A" />
                    {/* Beard */}
                    <rect x="5" y="13" width="6" height="4" fill="#F3F4F6" />
                    {/* Eyes */}
                    <rect x="6" y="11" width="1" height="1" fill="#000" />
                    <rect x="9" y="11" width="1" height="1" fill="#000" />
                    {/* Nose */}
                    <rect x="7" y="12" width="2" height="1" fill="#F97316" />
                </svg>
            )

        case 'garden_gnome_reading':
            return (
                <svg width={20 * scale} height={28 * scale} viewBox="0 0 20 28" className={className} shapeRendering="crispEdges">
                    {/* Base */}
                    <rect x="2" y="24" width="16" height="2" fill="#4A5D23" />
                    {/* Body */}
                    <rect x="6" y="18" width="8" height="6" fill="#7C3AED" />
                    <rect x="7" y="19" width="6" height="4" fill="#6D28D9" />
                    {/* Arms holding book */}
                    <rect x="4" y="16" width="3" height="4" fill="#F3E8FF" />
                    <rect x="13" y="16" width="3" height="4" fill="#F3E8FF" />
                    {/* Book */}
                    <rect x="5" y="16" width="10" height="6" fill="#92400E" />
                    <rect x="6" y="17" width="4" height="4" fill="#FEF3C7" />
                    <rect x="11" y="17" width="3" height="4" fill="#FEF3C7" />
                    <rect x="7" y="18" width="2" height="1" fill="#374151" opacity="0.3" />
                    <rect x="7" y="19" width="2" height="1" fill="#374151" opacity="0.3" />
                    {/* Head and hat */}
                    <rect x="7" y="10" width="6" height="6" fill="#FBBF24" />
                    <rect x="6" y="8" width="8" height="2" fill="#DC2626" />
                    <rect x="7" y="6" width="6" height="2" fill="#DC2626" />
                    <rect x="8" y="4" width="4" height="2" fill="#DC2626" />
                    <rect x="9" y="2" width="2" height="2" fill="#DC2626" />
                    {/* Beard */}
                    <rect x="7" y="13" width="6" height="4" fill="#F3F4F6" />
                    {/* Glasses */}
                    <rect x="7" y="11" width="2" height="2" fill="#1F2937" opacity="0.3" />
                    <rect x="10" y="11" width="2" height="2" fill="#1F2937" opacity="0.3" />
                    <rect x="9" y="11" width="1" height="1" fill="#1F2937" />
                    {/* Eyes behind glasses */}
                    <rect x="8" y="11" width="1" height="1" fill="#000" />
                    <rect x="10" y="11" width="1" height="1" fill="#000" />
                </svg>
            )

        case 'watering_can':
            return (
                <svg width={24 * scale} height={20 * scale} viewBox="0 0 24 20" className={className} shapeRendering="crispEdges">
                    {/* Body */}
                    <rect x="6" y="8" width="12" height="10" fill="#4ADE80" />
                    <rect x="7" y="9" width="10" height="8" fill="#22C55E" />
                    {/* Spout */}
                    <rect x="18" y="8" width="4" height="2" fill="#4ADE80" />
                    <rect x="21" y="6" width="2" height="4" fill="#4ADE80" />
                    {/* Spout holes */}
                    <rect x="22" y="6" width="1" height="1" fill="#166534" />
                    <rect x="22" y="8" width="1" height="1" fill="#166534" />
                    {/* Handle */}
                    <rect x="8" y="4" width="8" height="2" fill="#4ADE80" />
                    <rect x="8" y="4" width="2" height="4" fill="#4ADE80" />
                    <rect x="14" y="4" width="2" height="4" fill="#4ADE80" />
                    {/* Highlight */}
                    <rect x="8" y="10" width="1" height="4" fill="#86EFAC" opacity="0.6" />
                </svg>
            )

        case 'garden_tools':
            return (
                <svg width={20 * scale} height={28 * scale} viewBox="0 0 20 28" className={className} shapeRendering="crispEdges">
                    {/* Shovel handle */}
                    <rect x="4" y="4" width="2" height="20" fill="#8B4513" />
                    <rect x="3" y="24" width="4" height="3" fill="#6B7280" />
                    <rect x="2" y="25" width="6" height="2" fill="#9CA3AF" />
                    {/* Rake handle */}
                    <rect x="10" y="2" width="2" height="18" fill="#8B4513" />
                    {/* Rake head */}
                    <rect x="8" y="20" width="8" height="2" fill="#6B7280" />
                    <rect x="8" y="22" width="1" height="4" fill="#374151" />
                    <rect x="10" y="22" width="1" height="4" fill="#374151" />
                    <rect x="12" y="22" width="1" height="4" fill="#374151" />
                    <rect x="14" y="22" width="1" height="4" fill="#374151" />
                    {/* Trowel */}
                    <rect x="16" y="10" width="2" height="8" fill="#A16207" />
                    <rect x="15" y="18" width="4" height="6" fill="#9CA3AF" />
                    <rect x="16" y="19" width="2" height="4" fill="#D1D5DB" />
                </svg>
            )

        case 'wheelbarrow':
            return (
                <svg width={32 * scale} height={24 * scale} viewBox="0 0 32 24" className={className} shapeRendering="crispEdges">
                    {/* Wheel */}
                    <circle cx="6" cy="18" r="4" fill="#374151" />
                    <circle cx="6" cy="18" r="2" fill="#6B7280" />
                    {/* Body/tray */}
                    <polygon points="8,8 28,8 24,16 10,16" fill="#4ADE80" />
                    <polygon points="9,9 27,9 23,15 11,15" fill="#22C55E" />
                    {/* Legs */}
                    <rect x="22" y="16" width="2" height="6" fill="#8B4513" />
                    <rect x="26" y="16" width="2" height="6" fill="#8B4513" />
                    {/* Handles */}
                    <rect x="26" y="6" width="4" height="2" fill="#8B4513" />
                    <rect x="28" y="6" width="2" height="8" fill="#8B4513" />
                    {/* Dirt/flowers in wheelbarrow */}
                    <rect x="12" y="8" width="10" height="4" fill="#8B4513" />
                    <circle cx="14" cy="6" r="2" fill="#FF69B4" />
                    <circle cx="18" cy="5" r="2" fill="#FBBF24" />
                    <circle cx="20" cy="7" r="2" fill="#F87171" />
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
