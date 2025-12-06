import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const PlantSVGs = ({ id, variant, scale, className }: AssetProps) => {
    // Color variants for roses
    const getRoseColors = (variant: string) => {
        switch (variant) {
            case 'red':
            default:
                return { primary: '#DC2626', secondary: '#EF4444', tertiary: '#B91C1C', center: '#7F1D1D' }
            case 'pink':
                return { primary: '#EC4899', secondary: '#F472B6', tertiary: '#DB2777', center: '#9D174D' }
            case 'white':
                return { primary: '#F9FAFB', secondary: '#FFFFFF', tertiary: '#F3F4F6', center: '#FCD34D' }
            case 'yellow':
                return { primary: '#FBBF24', secondary: '#FCD34D', tertiary: '#F59E0B', center: '#D97706' }
        }
    }

    // Color variants for daisies
    const getDaisyColors = (variant: string) => {
        switch (variant) {
            case 'white':
            default:
                return { petals: '#FFFFFF', center: '#FCD34D', petalsAlt: '#F9FAFB', centerAlt: '#F59E0B' }
            case 'yellow':
                return { petals: '#FEF3C7', center: '#F59E0B', petalsAlt: '#FCD34D', centerAlt: '#D97706' }
            case 'purple':
                return { petals: '#DDD6FE', center: '#FCD34D', petalsAlt: '#C4B5FD', centerAlt: '#F59E0B' }
        }
    }

    // Tree variants
    const getTreeColors = (variant: string) => {
        switch (variant) {
            case 'oak':
            default:
                return {
                    foliage: ['#22543D', '#2D5016', '#4A7C59', '#22C55E', '#34D399', '#6EE7B7'],
                    trunk: '#8B4513'
                }
            case 'maple':
                return {
                    foliage: ['#DC2626', '#EF4444', '#F97316', '#FBBF24', '#FCD34D', '#FEF3C7'],
                    trunk: '#8B4513'
                }
            case 'pine':
                return {
                    foliage: ['#1E3A8A', '#1E40AF', '#2563EB', '#059669', '#10B981', '#34D399'],
                    trunk: '#654321'
                }
            case 'cherry':
                return {
                    foliage: ['#EC4899', '#F472B6', '#FBBF24', '#22C55E', '#34D399', '#6EE7B7'],
                    trunk: '#8B4513'
                }
        }
    }

    switch (id) {
        case 'roses_red':
        case 'roses_pink':
        case 'roses_white':
        case 'roses_yellow':
            const roseVariant = id.split('_')[1] || 'red'
            const roseColors = getRoseColors(roseVariant)
            return (
                <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="18" width="16" height="4" fill="#4A5D23" />
                    <rect x="6" y="16" width="12" height="2" fill="#4A5D23" />
                    <rect x="8" y="22" width="8" height="1" fill="#4A5D23" />
                    <rect x="10" y="12" width="1" height="6" fill="#2D5016" />
                    <rect x="13" y="10" width="1" height="8" fill="#2D5016" />
                    <rect x="7" y="14" width="1" height="4" fill="#2D5016" />
                    <rect x="8" y="13" width="2" height="1" fill="#4A7C59" />
                    <rect x="9" y="14" width="1" height="1" fill="#4A7C59" />
                    <rect x="14" y="11" width="2" height="1" fill="#4A7C59" />
                    <rect x="14" y="12" width="1" height="1" fill="#4A7C59" />
                    <rect x="10" y="9" width="3" height="3" fill={roseColors.primary} />
                    <rect x="11" y="10" width="1" height="1" fill={roseColors.center} />
                    <rect x="10" y="8" width="3" height="1" fill={roseColors.secondary} />
                    <rect x="9" y="9" width="1" height="3" fill={roseColors.secondary} />
                    <rect x="13" y="9" width="1" height="3" fill={roseColors.secondary} />
                    <rect x="10" y="12" width="3" height="1" fill={roseColors.secondary} />
                    <rect x="13" y="7" width="2" height="2" fill={roseColors.primary} />
                    <rect x="13" y="6" width="2" height="1" fill={roseColors.secondary} />
                    <rect x="12" y="7" width="1" height="2" fill={roseColors.secondary} />
                    <rect x="15" y="7" width="1" height="2" fill={roseColors.secondary} />
                    <rect x="13" y="9" width="2" height="1" fill={roseColors.secondary} />
                    <rect x="7" y="11" width="2" height="2" fill={roseColors.tertiary} />
                    <rect x="7" y="10" width="2" height="1" fill={roseColors.secondary} />
                    <rect x="6" y="11" width="1" height="2" fill={roseColors.secondary} />
                    <rect x="9" y="11" width="1" height="2" fill={roseColors.secondary} />
                    <rect x="7" y="13" width="2" height="1" fill={roseColors.secondary} />
                </svg>
            )

        case 'daisies_white':
        case 'daisies_yellow':
        case 'daisies_purple':
            const daisyVariant = id.split('_')[1] || 'white'
            const daisyColors = getDaisyColors(daisyVariant)
            return (
                <svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="17" width="12" height="2" fill="#4A5D23" />
                    <rect x="6" y="16" width="8" height="1" fill="#4A5D23" />
                    <rect x="6" y="19" width="8" height="1" fill="#4A5D23" />
                    <rect x="7" y="10" width="1" height="7" fill="#2D5016" />
                    <rect x="11" y="8" width="1" height="9" fill="#2D5016" />
                    <rect x="13" y="12" width="1" height="5" fill="#2D5016" />
                    <rect x="10" y="7" width="3" height="3" fill={daisyColors.petals} />
                    <rect x="11" y="6" width="1" height="1" fill={daisyColors.petals} />
                    <rect x="11" y="10" width="1" height="1" fill={daisyColors.petals} />
                    <rect x="9" y="8" width="1" height="1" fill={daisyColors.petals} />
                    <rect x="13" y="8" width="1" height="1" fill={daisyColors.petals} />
                    <rect x="11" y="8" width="1" height="1" fill={daisyColors.center} />
                    <rect x="6" y="9" width="3" height="3" fill={daisyColors.petals} />
                    <rect x="7" y="8" width="1" height="1" fill={daisyColors.petals} />
                    <rect x="7" y="12" width="1" height="1" fill={daisyColors.petals} />
                    <rect x="5" y="10" width="1" height="1" fill={daisyColors.petals} />
                    <rect x="9" y="10" width="1" height="1" fill={daisyColors.petals} />
                    <rect x="7" y="10" width="1" height="1" fill={daisyColors.center} />
                    <rect x="12" y="11" width="3" height="3" fill={daisyColors.petalsAlt} />
                    <rect x="13" y="10" width="1" height="1" fill={daisyColors.petalsAlt} />
                    <rect x="13" y="14" width="1" height="1" fill={daisyColors.petalsAlt} />
                    <rect x="11" y="12" width="1" height="1" fill={daisyColors.petalsAlt} />
                    <rect x="15" y="12" width="1" height="1" fill={daisyColors.petalsAlt} />
                    <rect x="13" y="12" width="1" height="1" fill={daisyColors.centerAlt} />
                </svg>
            )

        case 'tree_oak':
            const treeOakColors = getTreeColors('oak')
            return (
                <svg width={32 * scale} height={40 * scale} viewBox="0 0 32 40" className={className} shapeRendering="crispEdges">
                    <rect x="14" y="28" width="4" height="12" fill={treeOakColors.trunk} />
                    <rect x="13" y="38" width="6" height="2" fill={treeOakColors.trunk} />
                    <rect x="8" y="16" width="16" height="14" fill={treeOakColors.foliage[0]} />
                    <rect x="6" y="18" width="20" height="10" fill={treeOakColors.foliage[0]} />
                    <rect x="10" y="14" width="12" height="18" fill={treeOakColors.foliage[0]} />
                    <rect x="10" y="16" width="12" height="10" fill={treeOakColors.foliage[1]} />
                    <rect x="8" y="18" width="16" height="6" fill={treeOakColors.foliage[1]} />
                    <rect x="12" y="14" width="8" height="8" fill={treeOakColors.foliage[2]} />
                    <rect x="14" y="12" width="4" height="4" fill={treeOakColors.foliage[3]} />
                    <rect x="9" y="20" width="2" height="2" fill={treeOakColors.foliage[4]} />
                    <rect x="22" y="19" width="2" height="2" fill={treeOakColors.foliage[5]} />
                    <rect x="18" y="24" width="2" height="2" fill={treeOakColors.foliage[4]} />
                </svg>
            )

        case 'tree_pine':
            const treePineColors = getTreeColors('pine')
            return (
                <svg width={20 * scale} height={44 * scale} viewBox="0 0 20 44" className={className} shapeRendering="crispEdges">
                    <rect x="9" y="32" width="2" height="12" fill={treePineColors.trunk} />
                    <rect x="8" y="42" width="4" height="2" fill={treePineColors.trunk} />
                    <rect x="4" y="26" width="12" height="6" fill={treePineColors.foliage[0]} />
                    <rect x="2" y="28" width="16" height="4" fill={treePineColors.foliage[0]} />
                    <rect x="5" y="18" width="10" height="8" fill={treePineColors.foliage[1]} />
                    <rect x="3" y="22" width="14" height="4" fill={treePineColors.foliage[1]} />
                    <rect x="6" y="10" width="8" height="8" fill={treePineColors.foliage[2]} />
                    <rect x="8" y="6" width="4" height="4" fill={treePineColors.foliage[3]} />
                    <rect x="9" y="4" width="2" height="2" fill={treePineColors.foliage[3]} />
                    <rect x="6" y="20" width="2" height="2" fill={treePineColors.foliage[4]} />
                    <rect x="12" y="24" width="2" height="2" fill={treePineColors.foliage[5]} />
                    <rect x="8" y="12" width="2" height="2" fill={treePineColors.foliage[5]} />
                </svg>
            )

        case 'small_tree':
            const treeColors = getTreeColors(variant)
            return (
                <svg width={32 * scale} height={40 * scale} viewBox="0 0 32 40" className={className} shapeRendering="crispEdges">
                    <rect x="14" y="28" width="4" height="12" fill={treeColors.trunk} />
                    <rect x="10" y="18" width="12" height="12" fill={treeColors.foliage[0]} />
                    <rect x="8" y="20" width="16" height="8" fill={treeColors.foliage[0]} />
                    <rect x="12" y="16" width="8" height="16" fill={treeColors.foliage[0]} />
                    <rect x="12" y="20" width="4" height="4" fill={treeColors.foliage[2]} />
                    <rect x="18" y="22" width="2" height="2" fill={treeColors.foliage[4]} />
                </svg>
            )

        case 'sunflowers':
            return (
                <svg width={28 * scale} height={36 * scale} viewBox="0 0 28 36" className={className} shapeRendering="crispEdges">
                    <rect x="6" y="32" width="16" height="3" fill="#4A5D23" />
                    <rect x="10" y="18" width="2" height="14" fill="#2D5016" />
                    <rect x="16" y="16" width="2" height="16" fill="#2D5016" />
                    <rect x="13" y="20" width="2" height="12" fill="#2D5016" />
                    <rect x="9" y="10" width="4" height="4" fill="#8B4513" />
                    <rect x="9" y="9" width="4" height="1" fill="#FCD34D" />
                    <rect x="9" y="14" width="4" height="1" fill="#FCD34D" />
                    <rect x="8" y="10" width="1" height="4" fill="#FCD34D" />
                    <rect x="13" y="10" width="1" height="4" fill="#FCD34D" />
                    <rect x="8" y="9" width="1" height="1" fill="#FCD34D" />
                    <rect x="13" y="9" width="1" height="1" fill="#FCD34D" />
                    <rect x="8" y="14" width="1" height="1" fill="#FCD34D" />
                    <rect x="13" y="14" width="1" height="1" fill="#FCD34D" />
                    <rect x="16" y="7" width="2" height="2" fill="#8B4513" />
                    <rect x="15" y="6" width="4" height="4" fill="#F59E0B" opacity="0.5" />
                    <rect x="16" y="6" width="2" height="1" fill="#F59E0B" />
                    <rect x="16" y="9" width="2" height="1" fill="#F59E0B" />
                    <rect x="15" y="7" width="1" height="2" fill="#F59E0B" />
                    <rect x="18" y="7" width="1" height="2" fill="#F59E0B" />
                    <rect x="13" y="13" width="2" height="2" fill="#8B4513" />
                    <rect x="12" y="12" width="4" height="4" fill="#FBBF24" opacity="0.5" />
                    <rect x="13" y="12" width="2" height="1" fill="#FBBF24" />
                    <rect x="13" y="15" width="2" height="1" fill="#FBBF24" />
                    <rect x="12" y="13" width="1" height="2" fill="#FBBF24" />
                    <rect x="15" y="13" width="1" height="2" fill="#FBBF24" />
                    <rect x="8" y="22" width="2" height="1" fill="#16A34A" />
                    <rect x="7" y="23" width="2" height="1" fill="#16A34A" />
                    <rect x="18" y="20" width="2" height="1" fill="#16A34A" />
                    <rect x="19" y="21" width="2" height="1" fill="#16A34A" />
                </svg>
            )

        case 'lavender':
            return (
                <svg width={24 * scale} height={32 * scale} viewBox="0 0 24 32" className={className} shapeRendering="crispEdges">
                    <rect x="6" y="28" width="12" height="3" fill="#4A5D23" />
                    <rect x="8" y="16" width="1" height="12" fill="#16A34A" />
                    <rect x="11" y="14" width="1" height="14" fill="#16A34A" />
                    <rect x="14" y="15" width="1" height="13" fill="#16A34A" />
                    <rect x="17" y="17" width="1" height="11" fill="#16A34A" />
                    <rect x="5" y="18" width="1" height="10" fill="#16A34A" />
                    <rect x="7" y="12" width="3" height="4" fill="#8B5CF6" />
                    <rect x="8" y="11" width="1" height="1" fill="#A855F7" />
                    <rect x="8" y="13" width="1" height="1" fill="#7C3AED" />
                    <rect x="10" y="10" width="3" height="5" fill="#8B5CF6" />
                    <rect x="11" y="9" width="1" height="1" fill="#A855F7" />
                    <rect x="11" y="11" width="1" height="1" fill="#7C3AED" />
                    <rect x="13" y="11" width="3" height="4" fill="#8B5CF6" />
                    <rect x="14" y="10" width="1" height="1" fill="#A855F7" />
                    <rect x="16" y="14" width="3" height="3" fill="#8B5CF6" />
                    <rect x="17" y="13" width="1" height="1" fill="#A855F7" />
                    <rect x="4" y="15" width="3" height="3" fill="#8B5CF6" />
                    <rect x="5" y="14" width="1" height="1" fill="#A855F7" />
                </svg>
            )

        case 'flower_pot':
            return (
                <svg width={18 * scale} height={22 * scale} viewBox="0 0 18 22" className={className} shapeRendering="crispEdges">
                    <rect x="4" y="20" width="10" height="2" fill="#4A5D23" />
                    <rect x="5" y="14" width="8" height="6" fill="#8B4513" />
                    <rect x="4" y="14" width="10" height="2" fill="#92400E" />
                    <rect x="6" y="16" width="6" height="1" fill="#A16207" />
                    <rect x="7" y="8" width="1" height="6" fill="#16A34A" />
                    <rect x="6" y="7" width="3" height="3" fill="#EF4444" />
                    <rect x="7" y="8" width="1" height="1" fill="#FCD34D" />
                    <rect x="10" y="6" width="1" height="8" fill="#16A34A" />
                    <rect x="9" y="5" width="3" height="3" fill="#8B5CF6" />
                    <rect x="10" y="6" width="1" height="1" fill="#FBBF24" />
                    <rect x="8" y="4" width="1" height="10" fill="#16A34A" />
                    <rect x="7" y="3" width="3" height="3" fill="#F97316" />
                    <rect x="8" y="4" width="1" height="1" fill="#FEF3C7" />
                </svg>
            )

        case 'hedge':
            return (
                <svg width={48 * scale} height={24 * scale} viewBox="0 0 48 24" className={className} shapeRendering="crispEdges">
                    {/* Base foliage mass */}
                    <rect x="2" y="8" width="44" height="14" fill="#166534" />
                    <rect x="4" y="6" width="40" height="16" fill="#15803D" />
                    <rect x="6" y="4" width="36" height="18" fill="#16A34A" />
                    {/* Top texture variation */}
                    <rect x="8" y="4" width="6" height="4" fill="#22C55E" />
                    <rect x="18" y="5" width="8" height="3" fill="#22C55E" />
                    <rect x="30" y="4" width="6" height="4" fill="#22C55E" />
                    {/* Leaf detail highlights */}
                    <rect x="10" y="8" width="2" height="2" fill="#4ADE80" />
                    <rect x="22" y="6" width="2" height="2" fill="#4ADE80" />
                    <rect x="34" y="8" width="2" height="2" fill="#4ADE80" />
                    {/* Darker shadow areas */}
                    <rect x="6" y="16" width="36" height="4" fill="#14532D" opacity="0.5" />
                    <rect x="14" y="10" width="4" height="6" fill="#166534" opacity="0.5" />
                    <rect x="28" y="12" width="4" height="4" fill="#166534" opacity="0.5" />
                    {/* Ground shadow */}
                    <rect x="4" y="22" width="40" height="2" fill="#000" opacity="0.2" />
                </svg>
            )

        case 'hedge_round':
            return (
                <svg width={32 * scale} height={32 * scale} viewBox="0 0 32 32" className={className} shapeRendering="crispEdges">
                    {/* Main round shape using rects for pixel art feel */}
                    <rect x="10" y="4" width="12" height="4" fill="#16A34A" />
                    <rect x="6" y="8" width="20" height="4" fill="#16A34A" />
                    <rect x="4" y="12" width="24" height="8" fill="#16A34A" />
                    <rect x="6" y="20" width="20" height="4" fill="#16A34A" />
                    <rect x="10" y="24" width="12" height="4" fill="#16A34A" />
                    {/* Inner lighter area */}
                    <rect x="12" y="6" width="8" height="2" fill="#22C55E" />
                    <rect x="8" y="10" width="16" height="2" fill="#22C55E" />
                    <rect x="6" y="14" width="20" height="4" fill="#22C55E" />
                    <rect x="8" y="18" width="16" height="2" fill="#22C55E" />
                    {/* Highlights */}
                    <rect x="10" y="8" width="4" height="2" fill="#4ADE80" />
                    <rect x="8" y="12" width="2" height="4" fill="#4ADE80" />
                    {/* Shadows */}
                    <rect x="18" y="18" width="6" height="4" fill="#15803D" />
                    <rect x="20" y="22" width="4" height="2" fill="#166534" />
                    {/* Ground shadow */}
                    <rect x="8" y="28" width="16" height="2" fill="#000" opacity="0.2" />
                </svg>
            )

        case 'potted_herbs':
            return (
                <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
                    {/* Terracotta pot */}
                    <rect x="3" y="10" width="10" height="5" fill="#C2410C" />
                    <rect x="2" y="10" width="12" height="2" fill="#EA580C" />
                    <rect x="4" y="12" width="8" height="1" fill="#9A3412" />
                    <rect x="5" y="14" width="6" height="1" fill="#9A3412" />
                    {/* Soil */}
                    <rect x="4" y="9" width="8" height="2" fill="#4A3728" />
                    {/* Basil - left herb */}
                    <rect x="4" y="6" width="3" height="3" fill="#22C55E" />
                    <rect x="5" y="5" width="1" height="1" fill="#22C55E" />
                    <rect x="3" y="7" width="1" height="1" fill="#16A34A" />
                    <rect x="5" y="7" width="1" height="1" fill="#4ADE80" />
                    {/* Rosemary - middle tall */}
                    <rect x="7" y="4" width="2" height="5" fill="#16A34A" />
                    <rect x="7" y="3" width="1" height="1" fill="#22C55E" />
                    <rect x="8" y="2" width="1" height="2" fill="#22C55E" />
                    <rect x="6" y="5" width="1" height="2" fill="#15803D" />
                    <rect x="9" y="4" width="1" height="2" fill="#15803D" />
                    {/* Mint - right herb */}
                    <rect x="9" y="6" width="3" height="3" fill="#4ADE80" />
                    <rect x="10" y="5" width="1" height="1" fill="#4ADE80" />
                    <rect x="12" y="7" width="1" height="1" fill="#22C55E" />
                    <rect x="10" y="7" width="1" height="1" fill="#86EFAC" />
                    {/* Pot highlight */}
                    <rect x="3" y="11" width="1" height="2" fill="#FB923C" opacity="0.5" />
                </svg>
            )

        default:
            return (
                <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
                    <rect x="2" y="2" width="12" height="12" fill="#22C55E" />
                    <rect x="6" y="6" width="4" height="4" fill="#FFFFFF" />
                </svg>
            )
    }
}
