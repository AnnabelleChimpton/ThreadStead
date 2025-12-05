import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
    text?: string
}

export const StructureSVGs = ({ id, variant, scale, className, text }: AssetProps) => {
    // Normalize ID to handle instance IDs (e.g. sign_post_123 -> sign_post)
    let normalizedId = id
    if (id.startsWith('sign_post')) normalizedId = 'sign_post'
    else if (id.startsWith('gazebo')) normalizedId = 'gazebo'
    else if (id.startsWith('trellis')) normalizedId = 'trellis'
    else if (id.startsWith('garden_arch')) normalizedId = 'garden_arch'
    else if (id.startsWith('picket_fence_white')) normalizedId = 'picket_fence_white'
    else if (id.startsWith('picket_fence_natural')) normalizedId = 'picket_fence_natural'
    else if (id.startsWith('rustic_fence')) normalizedId = 'rustic_fence'
    else if (id.startsWith('stone_wall')) normalizedId = 'stone_wall'

    switch (normalizedId) {
        case 'sign_post':
            return (
                <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
                    {/* Post */}
                    <rect x="14" y="12" width="4" height="20" fill="#8B4513" />

                    {/* Sign Board */}
                    <rect x="2" y="4" width="28" height="12" fill="#DEB887" stroke="#8B4513" strokeWidth="1" />
                    <rect x="4" y="6" width="24" height="8" fill="none" stroke="#8B4513" strokeWidth="0.5" opacity="0.5" />

                    {/* Text */}
                    {text && (
                        <text
                            x="16"
                            y="13"
                            textAnchor="middle"
                            fontSize="6"
                            fill="#5C4033"
                            fontFamily="monospace"
                            fontWeight="bold"
                            style={{ userSelect: 'none' }}
                        >
                            {text.slice(0, 8)}
                        </text>
                    )}
                </svg>
            )
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

        case 'picket_fence_white':
            return (
                <svg width={48 * scale} height={24 * scale} viewBox="0 0 48 24" className={className} shapeRendering="crispEdges">
                    {/* Horizontal rails */}
                    <rect x="0" y="8" width="48" height="3" fill="#E5E7EB" />
                    <rect x="0" y="16" width="48" height="3" fill="#E5E7EB" />
                    {/* Pickets */}
                    <rect x="2" y="4" width="4" height="18" fill="#F9FAFB" />
                    <rect x="2" y="2" width="4" height="3" fill="#F9FAFB" />
                    <polygon points="2,2 4,0 6,2" fill="#F9FAFB" />

                    <rect x="10" y="4" width="4" height="18" fill="#F9FAFB" />
                    <rect x="10" y="2" width="4" height="3" fill="#F9FAFB" />
                    <polygon points="10,2 12,0 14,2" fill="#F9FAFB" />

                    <rect x="18" y="4" width="4" height="18" fill="#F9FAFB" />
                    <rect x="18" y="2" width="4" height="3" fill="#F9FAFB" />
                    <polygon points="18,2 20,0 22,2" fill="#F9FAFB" />

                    <rect x="26" y="4" width="4" height="18" fill="#F9FAFB" />
                    <rect x="26" y="2" width="4" height="3" fill="#F9FAFB" />
                    <polygon points="26,2 28,0 30,2" fill="#F9FAFB" />

                    <rect x="34" y="4" width="4" height="18" fill="#F9FAFB" />
                    <rect x="34" y="2" width="4" height="3" fill="#F9FAFB" />
                    <polygon points="34,2 36,0 38,2" fill="#F9FAFB" />

                    <rect x="42" y="4" width="4" height="18" fill="#F9FAFB" />
                    <rect x="42" y="2" width="4" height="3" fill="#F9FAFB" />
                    <polygon points="42,2 44,0 46,2" fill="#F9FAFB" />

                    {/* Shadow lines */}
                    <rect x="3" y="5" width="1" height="16" fill="#D1D5DB" opacity="0.5" />
                    <rect x="11" y="5" width="1" height="16" fill="#D1D5DB" opacity="0.5" />
                    <rect x="19" y="5" width="1" height="16" fill="#D1D5DB" opacity="0.5" />
                    <rect x="27" y="5" width="1" height="16" fill="#D1D5DB" opacity="0.5" />
                    <rect x="35" y="5" width="1" height="16" fill="#D1D5DB" opacity="0.5" />
                    <rect x="43" y="5" width="1" height="16" fill="#D1D5DB" opacity="0.5" />
                </svg>
            )

        case 'picket_fence_natural':
            return (
                <svg width={48 * scale} height={24 * scale} viewBox="0 0 48 24" className={className} shapeRendering="crispEdges">
                    {/* Horizontal rails */}
                    <rect x="0" y="8" width="48" height="3" fill="#92400E" />
                    <rect x="0" y="16" width="48" height="3" fill="#92400E" />
                    {/* Pickets */}
                    <rect x="2" y="4" width="4" height="18" fill="#D2B48C" />
                    <polygon points="2,4 4,1 6,4" fill="#D2B48C" />

                    <rect x="10" y="4" width="4" height="18" fill="#DEB887" />
                    <polygon points="10,4 12,1 14,4" fill="#DEB887" />

                    <rect x="18" y="4" width="4" height="18" fill="#D2B48C" />
                    <polygon points="18,4 20,1 22,4" fill="#D2B48C" />

                    <rect x="26" y="4" width="4" height="18" fill="#DEB887" />
                    <polygon points="26,4 28,1 30,4" fill="#DEB887" />

                    <rect x="34" y="4" width="4" height="18" fill="#D2B48C" />
                    <polygon points="34,4 36,1 38,4" fill="#D2B48C" />

                    <rect x="42" y="4" width="4" height="18" fill="#DEB887" />
                    <polygon points="42,4 44,1 46,4" fill="#DEB887" />

                    {/* Wood grain */}
                    <rect x="3" y="6" width="1" height="14" fill="#8B4513" opacity="0.3" />
                    <rect x="11" y="6" width="1" height="14" fill="#8B4513" opacity="0.3" />
                    <rect x="19" y="6" width="1" height="14" fill="#8B4513" opacity="0.3" />
                    <rect x="27" y="6" width="1" height="14" fill="#8B4513" opacity="0.3" />
                    <rect x="35" y="6" width="1" height="14" fill="#8B4513" opacity="0.3" />
                    <rect x="43" y="6" width="1" height="14" fill="#8B4513" opacity="0.3" />
                </svg>
            )

        case 'rustic_fence':
            return (
                <svg width={48 * scale} height={24 * scale} viewBox="0 0 48 24" className={className} shapeRendering="crispEdges">
                    {/* Posts */}
                    <rect x="2" y="4" width="5" height="18" fill="#6B4423" />
                    <rect x="20" y="4" width="5" height="18" fill="#5D3A1A" />
                    <rect x="40" y="4" width="5" height="18" fill="#6B4423" />
                    {/* Horizontal logs */}
                    <rect x="0" y="8" width="48" height="4" fill="#8B4513" rx="2" />
                    <rect x="0" y="15" width="48" height="4" fill="#A0522D" rx="2" />
                    {/* Wood texture/knots */}
                    <circle cx="10" cy="10" r="1" fill="#5D3A1A" />
                    <circle cx="30" cy="17" r="1" fill="#654321" />
                    <circle cx="42" cy="9" r="1" fill="#5D3A1A" />
                    {/* Grain lines */}
                    <rect x="5" y="9" width="8" height="1" fill="#654321" opacity="0.4" />
                    <rect x="25" y="16" width="10" height="1" fill="#654321" opacity="0.4" />
                </svg>
            )

        case 'stone_wall':
            return (
                <svg width={48 * scale} height={20 * scale} viewBox="0 0 48 20" className={className} shapeRendering="crispEdges">
                    {/* Base layer of stones */}
                    <rect x="0" y="12" width="10" height="8" fill="#6B7280" rx="1" />
                    <rect x="11" y="10" width="8" height="10" fill="#9CA3AF" rx="1" />
                    <rect x="20" y="12" width="12" height="8" fill="#6B7280" rx="1" />
                    <rect x="33" y="10" width="7" height="10" fill="#9CA3AF" rx="1" />
                    <rect x="41" y="12" width="7" height="8" fill="#6B7280" rx="1" />
                    {/* Top layer */}
                    <rect x="2" y="4" width="8" height="9" fill="#9CA3AF" rx="1" />
                    <rect x="11" y="2" width="10" height="9" fill="#6B7280" rx="1" />
                    <rect x="22" y="4" width="7" height="9" fill="#9CA3AF" rx="1" />
                    <rect x="30" y="2" width="9" height="9" fill="#6B7280" rx="1" />
                    <rect x="40" y="4" width="8" height="9" fill="#9CA3AF" rx="1" />
                    {/* Highlights */}
                    <rect x="3" y="5" width="4" height="1" fill="#D1D5DB" opacity="0.5" />
                    <rect x="13" y="3" width="5" height="1" fill="#D1D5DB" opacity="0.5" />
                    <rect x="32" y="3" width="4" height="1" fill="#D1D5DB" opacity="0.5" />
                    {/* Shadows */}
                    <rect x="1" y="18" width="46" height="2" fill="#374151" opacity="0.3" />
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
