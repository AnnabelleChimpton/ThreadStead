import React from 'react'

interface AssetProps {
    id: string
    variant: string
    scale: number
    className?: string
}

export const HouseCustomSVGs = ({ id, variant, scale, className }: AssetProps) => {
    switch (id) {
        case 'round_windows':
            return (
                <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className} shapeRendering="crispEdges">
                    <rect x="8" y="8" width="14" height="14" fill="#A8E6CF" />
                    <rect x="9" y="9" width="12" height="12" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="28" y="8" width="14" height="14" fill="#A8E6CF" />
                    <rect x="29" y="9" width="12" height="12" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="14" y="8" width="2" height="14" fill="#2E4B3F" />
                    <rect x="8" y="14" width="14" height="2" fill="#2E4B3F" />
                    <rect x="34" y="8" width="2" height="14" fill="#2E4B3F" />
                    <rect x="28" y="14" width="14" height="2" fill="#2E4B3F" />
                </svg>
            )
        case 'arched_windows':
            return (
                <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className} shapeRendering="crispEdges">
                    <rect x="8" y="12" width="14" height="10" fill="#A8E6CF" />
                    <rect x="9" y="10" width="12" height="2" fill="#A8E6CF" />
                    <rect x="11" y="8" width="8" height="2" fill="#A8E6CF" />
                    <rect x="28" y="12" width="14" height="10" fill="#A8E6CF" />
                    <rect x="29" y="10" width="12" height="2" fill="#A8E6CF" />
                    <rect x="31" y="8" width="8" height="2" fill="#A8E6CF" />
                    <rect x="14" y="8" width="2" height="14" fill="#2E4B3F" />
                    <rect x="34" y="8" width="2" height="14" fill="#2E4B3F" />
                </svg>
            )
        case 'bay_windows':
            return (
                <svg width={60 * scale} height={35 * scale} viewBox="0 0 60 35" className={className} shapeRendering="crispEdges">
                    <rect x="10" y="12" width="10" height="8" fill="#F5E9D4" stroke="#A18463" strokeWidth="1" />
                    <rect x="40" y="12" width="10" height="8" fill="#F5E9D4" stroke="#A18463" strokeWidth="1" />
                    <rect x="12" y="13" width="6" height="6" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="42" y="13" width="6" height="6" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="14" y="13" width="2" height="6" fill="#2E4B3F" />
                    <rect x="44" y="13" width="2" height="6" fill="#2E4B3F" />
                </svg>
            )
        case 'arched_door':
            return (
                <svg width={25 * scale} height={35 * scale} viewBox="0 0 25 35" className={className} shapeRendering="crispEdges">
                    <rect x="5" y="10" width="15" height="25" fill="#8B4513" />
                    <rect x="6" y="8" width="13" height="2" fill="#8B4513" />
                    <rect x="8" y="6" width="9" height="2" fill="#8B4513" />
                    <rect x="7" y="12" width="11" height="8" fill="none" stroke="#654321" strokeWidth="1" />
                    <rect x="7" y="22" width="11" height="8" fill="none" stroke="#654321" strokeWidth="1" />
                    <rect x="16" y="20" width="2" height="2" fill="#FFD700" />
                </svg>
            )
        case 'double_door':
            return (
                <svg width={35 * scale} height={35 * scale} viewBox="0 0 35 35" className={className} shapeRendering="crispEdges">
                    <rect x="5" y="10" width="12" height="25" fill="#8B4513" stroke="#654321" strokeWidth="1" />
                    <rect x="18" y="10" width="12" height="25" fill="#8B4513" stroke="#654321" strokeWidth="1" />
                    <rect x="7" y="15" width="8" height="6" fill="none" stroke="#654321" strokeWidth="1" />
                    <rect x="7" y="24" width="8" height="6" fill="none" stroke="#654321" strokeWidth="1" />
                    <rect x="20" y="15" width="8" height="6" fill="none" stroke="#654321" strokeWidth="1" />
                    <rect x="20" y="24" width="8" height="6" fill="none" stroke="#654321" strokeWidth="1" />
                    <rect x="14" y="22" width="2" height="2" fill="#FFD700" />
                    <rect x="19" y="22" width="2" height="2" fill="#FFD700" />
                </svg>
            )
        case 'cottage_door':
            return (
                <svg width={25 * scale} height={35 * scale} viewBox="0 0 25 35" className={className} shapeRendering="crispEdges">
                    <rect x="5" y="10" width="15" height="25" fill="#D2691E" stroke="#8B4513" strokeWidth="1" />
                    <rect x="6" y="11" width="13" height="2" fill="#8B4513" />
                    <rect x="6" y="32" width="13" height="2" fill="#8B4513" />
                    <rect x="6" y="11" width="2" height="23" fill="#8B4513" />
                    <rect x="17" y="11" width="2" height="23" fill="#8B4513" />
                    <rect x="6" y="21" width="13" height="2" fill="#8B4513" />
                    <rect x="17" y="22" width="2" height="2" fill="#2F2F2F" />
                </svg>
            )
        case 'ornate_trim':
            return (
                <svg width={60 * scale} height={25 * scale} viewBox="0 0 60 25" className={className} shapeRendering="crispEdges">
                    <rect x="5" y="15" width="50" height="2" fill="#A18463" />
                    <rect x="15" y="12" width="4" height="4" fill="none" stroke="#A18463" strokeWidth="1" />
                    <rect x="30" y="12" width="4" height="4" fill="none" stroke="#A18463" strokeWidth="1" />
                    <rect x="45" y="12" width="4" height="4" fill="none" stroke="#A18463" strokeWidth="1" />
                    <rect x="5" y="18" width="50" height="3" fill="#A18463" />
                </svg>
            )
        case 'scalloped_trim':
            return (
                <svg width={60 * scale} height={20 * scale} viewBox="0 0 60 20" className={className} shapeRendering="crispEdges">
                    <rect x="5" y="15" width="50" height="3" fill="#A18463" />
                    <rect x="10" y="18" width="4" height="2" fill="#A18463" />
                    <rect x="20" y="18" width="4" height="2" fill="#A18463" />
                    <rect x="30" y="18" width="4" height="2" fill="#A18463" />
                    <rect x="40" y="18" width="4" height="2" fill="#A18463" />
                    <rect x="50" y="18" width="4" height="2" fill="#A18463" />
                </svg>
            )
        case 'gabled_trim':
            return (
                <svg width={50 * scale} height={30 * scale} viewBox="0 0 50 30" className={className} shapeRendering="crispEdges">
                    <rect x="5" y="23" width="40" height="4" fill="#A18463" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="24" y="5" width="2" height="18" fill="#A18463" />
                    <rect x="22" y="10" width="6" height="2" fill="#A18463" />
                </svg>
            )

        // === WINDOW TREATMENTS ===
        case 'shutters':
            return (
                <svg width={40 * scale} height={32 * scale} viewBox="0 0 40 32" className={className} shapeRendering="crispEdges">
                    {/* Window */}
                    <rect x="12" y="4" width="16" height="24" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="19" y="4" width="2" height="24" fill="#2E4B3F" />
                    <rect x="12" y="15" width="16" height="2" fill="#2E4B3F" />
                    {/* Left shutter */}
                    <rect x="2" y="4" width="8" height="24" fill="#4A6741" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="4" y="6" width="4" height="4" fill="#3D5535" />
                    <rect x="4" y="12" width="4" height="4" fill="#3D5535" />
                    <rect x="4" y="18" width="4" height="4" fill="#3D5535" />
                    <rect x="4" y="24" width="4" height="2" fill="#3D5535" />
                    {/* Right shutter */}
                    <rect x="30" y="4" width="8" height="24" fill="#4A6741" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="32" y="6" width="4" height="4" fill="#3D5535" />
                    <rect x="32" y="12" width="4" height="4" fill="#3D5535" />
                    <rect x="32" y="18" width="4" height="4" fill="#3D5535" />
                    <rect x="32" y="24" width="4" height="2" fill="#3D5535" />
                </svg>
            )
        case 'flower_boxes':
            return (
                <svg width={40 * scale} height={36 * scale} viewBox="0 0 40 36" className={className} shapeRendering="crispEdges">
                    {/* Window */}
                    <rect x="8" y="2" width="24" height="20" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="19" y="2" width="2" height="20" fill="#2E4B3F" />
                    <rect x="8" y="11" width="24" height="2" fill="#2E4B3F" />
                    {/* Flower box */}
                    <rect x="6" y="24" width="28" height="6" fill="#8B4513" stroke="#654321" strokeWidth="1" />
                    <rect x="8" y="22" width="4" height="4" fill="#2E4B3F" />
                    {/* Flowers */}
                    <rect x="10" y="18" width="4" height="6" fill="#228B22" />
                    <rect x="11" y="16" width="2" height="2" fill="#FF69B4" />
                    <rect x="18" y="17" width="4" height="7" fill="#228B22" />
                    <rect x="19" y="15" width="2" height="2" fill="#FFD700" />
                    <rect x="26" y="18" width="4" height="6" fill="#228B22" />
                    <rect x="27" y="16" width="2" height="2" fill="#FF6B6B" />
                </svg>
            )
        case 'awnings':
            return (
                <svg width={44 * scale} height={32 * scale} viewBox="0 0 44 32" className={className} shapeRendering="crispEdges">
                    {/* Window */}
                    <rect x="10" y="14" width="24" height="16" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="21" y="14" width="2" height="16" fill="#2E4B3F" />
                    {/* Awning - striped */}
                    <rect x="6" y="2" width="32" height="12" fill="#E74C3C" />
                    <rect x="6" y="2" width="4" height="12" fill="#FFFFFF" />
                    <rect x="14" y="2" width="4" height="12" fill="#FFFFFF" />
                    <rect x="22" y="2" width="4" height="12" fill="#FFFFFF" />
                    <rect x="30" y="2" width="4" height="12" fill="#FFFFFF" />
                    {/* Awning border */}
                    <rect x="6" y="12" width="32" height="2" fill="#B03A2E" />
                    <rect x="4" y="14" width="2" height="2" fill="#B03A2E" />
                    <rect x="38" y="14" width="2" height="2" fill="#B03A2E" />
                </svg>
            )
        case 'default_treatments':
            return (
                <svg width={32 * scale} height={28 * scale} viewBox="0 0 32 28" className={className} shapeRendering="crispEdges">
                    {/* Simple window */}
                    <rect x="4" y="4" width="24" height="20" fill="#A8E6CF" stroke="#2E4B3F" strokeWidth="1" />
                    <rect x="15" y="4" width="2" height="20" fill="#2E4B3F" />
                    <rect x="4" y="13" width="24" height="2" fill="#2E4B3F" />
                    {/* Window sill */}
                    <rect x="2" y="24" width="28" height="2" fill="#A18463" />
                </svg>
            )

        // === CHIMNEY ===
        case 'brick_chimney':
            return (
                <svg width={24 * scale} height={40 * scale} viewBox="0 0 24 40" className={className} shapeRendering="crispEdges">
                    {/* Chimney body - brick pattern */}
                    <rect x="4" y="4" width="16" height="32" fill="#B22222" stroke="#8B0000" strokeWidth="1" />
                    {/* Brick lines - horizontal */}
                    <rect x="4" y="8" width="16" height="1" fill="#8B0000" />
                    <rect x="4" y="13" width="16" height="1" fill="#8B0000" />
                    <rect x="4" y="18" width="16" height="1" fill="#8B0000" />
                    <rect x="4" y="23" width="16" height="1" fill="#8B0000" />
                    <rect x="4" y="28" width="16" height="1" fill="#8B0000" />
                    <rect x="4" y="33" width="16" height="1" fill="#8B0000" />
                    {/* Brick lines - vertical (offset) */}
                    <rect x="12" y="4" width="1" height="4" fill="#8B0000" />
                    <rect x="8" y="8" width="1" height="5" fill="#8B0000" />
                    <rect x="16" y="8" width="1" height="5" fill="#8B0000" />
                    <rect x="12" y="13" width="1" height="5" fill="#8B0000" />
                    <rect x="8" y="18" width="1" height="5" fill="#8B0000" />
                    <rect x="16" y="18" width="1" height="5" fill="#8B0000" />
                    <rect x="12" y="23" width="1" height="5" fill="#8B0000" />
                    <rect x="8" y="28" width="1" height="5" fill="#8B0000" />
                    <rect x="16" y="28" width="1" height="5" fill="#8B0000" />
                    {/* Cap */}
                    <rect x="2" y="2" width="20" height="2" fill="#654321" />
                    <rect x="2" y="36" width="20" height="2" fill="#654321" />
                </svg>
            )
        case 'stone_chimney':
            return (
                <svg width={24 * scale} height={40 * scale} viewBox="0 0 24 40" className={className} shapeRendering="crispEdges">
                    {/* Chimney body - stone */}
                    <rect x="4" y="4" width="16" height="32" fill="#808080" stroke="#696969" strokeWidth="1" />
                    {/* Stone pattern - irregular */}
                    <rect x="5" y="5" width="6" height="5" fill="#A9A9A9" stroke="#696969" strokeWidth="0.5" />
                    <rect x="12" y="5" width="7" height="4" fill="#909090" stroke="#696969" strokeWidth="0.5" />
                    <rect x="5" y="11" width="8" height="5" fill="#909090" stroke="#696969" strokeWidth="0.5" />
                    <rect x="14" y="10" width="5" height="6" fill="#A9A9A9" stroke="#696969" strokeWidth="0.5" />
                    <rect x="5" y="17" width="5" height="6" fill="#A9A9A9" stroke="#696969" strokeWidth="0.5" />
                    <rect x="11" y="16" width="8" height="5" fill="#808080" stroke="#696969" strokeWidth="0.5" />
                    <rect x="5" y="24" width="7" height="5" fill="#909090" stroke="#696969" strokeWidth="0.5" />
                    <rect x="13" y="22" width="6" height="6" fill="#A9A9A9" stroke="#696969" strokeWidth="0.5" />
                    <rect x="5" y="30" width="6" height="5" fill="#A9A9A9" stroke="#696969" strokeWidth="0.5" />
                    <rect x="12" y="29" width="7" height="6" fill="#909090" stroke="#696969" strokeWidth="0.5" />
                    {/* Cap */}
                    <rect x="2" y="2" width="20" height="2" fill="#505050" />
                    <rect x="2" y="36" width="20" height="2" fill="#505050" />
                </svg>
            )
        case 'no_chimney':
            return (
                <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
                    {/* Roof outline only */}
                    <rect x="4" y="16" width="16" height="6" fill="#8B4513" stroke="#654321" strokeWidth="1" />
                    {/* X mark */}
                    <rect x="8" y="4" width="2" height="10" fill="#FF0000" transform="rotate(45 12 9)" />
                    <rect x="8" y="4" width="2" height="10" fill="#FF0000" transform="rotate(-45 12 9)" />
                </svg>
            )
        case 'default_chimney':
            return (
                <svg width={20 * scale} height={36 * scale} viewBox="0 0 20 36" className={className} shapeRendering="crispEdges">
                    {/* Simple chimney */}
                    <rect x="4" y="4" width="12" height="28" fill="#A18463" stroke="#8B7355" strokeWidth="1" />
                    {/* Cap */}
                    <rect x="2" y="2" width="16" height="2" fill="#654321" />
                    <rect x="2" y="32" width="16" height="2" fill="#654321" />
                    {/* Inner shadow */}
                    <rect x="6" y="4" width="2" height="28" fill="#8B7355" opacity="0.5" />
                </svg>
            )

        // === WELCOME MATS ===
        case 'no_mat':
            return (
                <svg width={32 * scale} height={20 * scale} viewBox="0 0 32 20" className={className} shapeRendering="crispEdges">
                    {/* Doorstep outline */}
                    <rect x="4" y="6" width="24" height="10" fill="none" stroke="#CCCCCC" strokeWidth="1" strokeDasharray="2,2" />
                    {/* X mark */}
                    <rect x="12" y="4" width="2" height="14" fill="#CCCCCC" transform="rotate(45 16 10)" />
                    <rect x="12" y="4" width="2" height="14" fill="#CCCCCC" transform="rotate(-45 16 10)" />
                </svg>
            )
        case 'plain_mat':
            return (
                <svg width={36 * scale} height={20 * scale} viewBox="0 0 36 20" className={className} shapeRendering="crispEdges">
                    {/* Mat body */}
                    <rect x="2" y="4" width="32" height="12" fill="#8B4513" stroke="#654321" strokeWidth="1" />
                    {/* Border pattern */}
                    <rect x="4" y="6" width="28" height="8" fill="none" stroke="#A0522D" strokeWidth="1" />
                    {/* Texture lines */}
                    <rect x="6" y="8" width="24" height="1" fill="#654321" opacity="0.3" />
                    <rect x="6" y="11" width="24" height="1" fill="#654321" opacity="0.3" />
                </svg>
            )
        case 'floral_mat':
            return (
                <svg width={36 * scale} height={20 * scale} viewBox="0 0 36 20" className={className} shapeRendering="crispEdges">
                    {/* Mat body - brown like actual render */}
                    <rect x="2" y="4" width="32" height="12" fill="#8B4513" stroke="#654321" strokeWidth="1" />
                    {/* Border pattern */}
                    <rect x="4" y="6" width="28" height="8" fill="none" stroke="#A0522D" strokeWidth="1" />
                    {/* Corner flowers - pink like actual */}
                    <circle cx="8" cy="10" r="2" fill="#FF69B4" opacity="0.8" />
                    <circle cx="28" cy="10" r="2" fill="#FF69B4" opacity="0.8" />
                    {/* Leaf accents - green like actual */}
                    <ellipse cx="12" cy="10" rx="2" ry="1" fill="#4FAF6D" opacity="0.7" />
                    <ellipse cx="24" cy="10" rx="2" ry="1" fill="#4FAF6D" opacity="0.7" />
                </svg>
            )
        case 'welcome_text_mat':
            return (
                <svg width={36 * scale} height={20 * scale} viewBox="0 0 36 20" className={className} shapeRendering="crispEdges">
                    {/* Mat body - brown like actual render */}
                    <rect x="2" y="4" width="32" height="12" fill="#8B4513" stroke="#654321" strokeWidth="1" />
                    {/* Border pattern */}
                    <rect x="4" y="6" width="28" height="8" fill="none" stroke="#A0522D" strokeWidth="1" />
                    {/* WELCOME text - simplified */}
                    <text x="18" y="12" textAnchor="middle" fontSize="5" fill="#C4A574" fontFamily="monospace" fontWeight="bold">WELCOME</text>
                </svg>
            )
        case 'custom_text_mat':
            return (
                <svg width={36 * scale} height={20 * scale} viewBox="0 0 36 20" className={className} shapeRendering="crispEdges">
                    {/* Mat body - brown like actual render */}
                    <rect x="2" y="4" width="32" height="12" fill="#8B4513" stroke="#654321" strokeWidth="1" />
                    {/* Border pattern */}
                    <rect x="4" y="6" width="28" height="8" fill="none" stroke="#A0522D" strokeWidth="1" />
                    {/* Custom text indicator - ABC... */}
                    <text x="18" y="12" textAnchor="middle" fontSize="5" fill="#C4A574" fontFamily="monospace" fontWeight="bold">ABC...</text>
                </svg>
            )

        // === HOUSE NUMBERS ===
        case 'no_house_number':
            return (
                <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
                    {/* Empty plate */}
                    <rect x="4" y="6" width="16" height="12" fill="none" stroke="#CCCCCC" strokeWidth="1" strokeDasharray="2,2" />
                    {/* X mark */}
                    <rect x="8" y="6" width="2" height="14" fill="#CCCCCC" transform="rotate(45 12 12)" />
                    <rect x="8" y="6" width="2" height="14" fill="#CCCCCC" transform="rotate(-45 12 12)" />
                </svg>
            )
        case 'classic_house_number':
            return (
                <svg width={28 * scale} height={24 * scale} viewBox="0 0 28 24" className={className} shapeRendering="crispEdges">
                    {/* Classic white plate with dark border */}
                    <rect x="2" y="6" width="24" height="12" fill="#FAFAFA" stroke="#2C3E50" strokeWidth="1" rx="1" />
                    {/* Number 42 in dark text */}
                    <rect x="7" y="8" width="1" height="8" fill="#2C3E50" />
                    <rect x="7" y="8" width="4" height="1" fill="#2C3E50" />
                    <rect x="10" y="8" width="1" height="4" fill="#2C3E50" />
                    <rect x="7" y="11" width="4" height="1" fill="#2C3E50" />
                    {/* 2 */}
                    <rect x="14" y="8" width="4" height="1" fill="#2C3E50" />
                    <rect x="17" y="8" width="1" height="4" fill="#2C3E50" />
                    <rect x="14" y="11" width="4" height="1" fill="#2C3E50" />
                    <rect x="14" y="11" width="1" height="4" fill="#2C3E50" />
                    <rect x="14" y="15" width="4" height="1" fill="#2C3E50" />
                </svg>
            )
        case 'modern_house_number':
            return (
                <svg width={32 * scale} height={20 * scale} viewBox="0 0 32 20" className={className} shapeRendering="crispEdges">
                    {/* Modern dark backing */}
                    <rect x="2" y="4" width="28" height="12" fill="#333333" rx="1" />
                    {/* White numbers - 42 */}
                    <rect x="8" y="6" width="1" height="8" fill="#FFFFFF" />
                    <rect x="8" y="6" width="4" height="1" fill="#FFFFFF" />
                    <rect x="11" y="6" width="1" height="4" fill="#FFFFFF" />
                    <rect x="8" y="9" width="4" height="1" fill="#FFFFFF" />
                    {/* 2 */}
                    <rect x="15" y="6" width="4" height="1" fill="#FFFFFF" />
                    <rect x="18" y="6" width="1" height="4" fill="#FFFFFF" />
                    <rect x="15" y="9" width="4" height="1" fill="#FFFFFF" />
                    <rect x="15" y="9" width="1" height="4" fill="#FFFFFF" />
                    <rect x="15" y="13" width="4" height="1" fill="#FFFFFF" />
                </svg>
            )
        case 'rustic_house_number':
            return (
                <svg width={30 * scale} height={26 * scale} viewBox="0 0 30 26" className={className} shapeRendering="crispEdges">
                    {/* Brown wooden plaque */}
                    <rect x="2" y="6" width="26" height="14" fill="#5C4033" rx="1" />
                    <rect x="3" y="7" width="24" height="12" fill="none" stroke="#8B4513" strokeWidth="1" rx="1" />
                    {/* Cream numbers - 42 */}
                    <rect x="7" y="9" width="1" height="8" fill="#F5E9D4" />
                    <rect x="7" y="9" width="4" height="1" fill="#F5E9D4" />
                    <rect x="10" y="9" width="1" height="4" fill="#F5E9D4" />
                    <rect x="7" y="12" width="4" height="1" fill="#F5E9D4" />
                    {/* 2 */}
                    <rect x="14" y="9" width="4" height="1" fill="#F5E9D4" />
                    <rect x="17" y="9" width="1" height="4" fill="#F5E9D4" />
                    <rect x="14" y="12" width="4" height="1" fill="#F5E9D4" />
                    <rect x="14" y="12" width="1" height="4" fill="#F5E9D4" />
                    <rect x="14" y="16" width="4" height="1" fill="#F5E9D4" />
                </svg>
            )

        // === EXTERIOR LIGHTS ===
        case 'no_exterior_lights':
            return (
                <svg width={24 * scale} height={24 * scale} viewBox="0 0 24 24" className={className} shapeRendering="crispEdges">
                    {/* Lightbulb outline */}
                    <rect x="8" y="4" width="8" height="10" fill="none" stroke="#CCCCCC" strokeWidth="1" />
                    <rect x="9" y="14" width="6" height="4" fill="none" stroke="#CCCCCC" strokeWidth="1" />
                    {/* X mark */}
                    <rect x="8" y="4" width="2" height="16" fill="#CCCCCC" transform="rotate(45 12 12)" />
                    <rect x="8" y="4" width="2" height="16" fill="#CCCCCC" transform="rotate(-45 12 12)" />
                </svg>
            )
        case 'lantern_lights':
            return (
                <svg width={20 * scale} height={32 * scale} viewBox="0 0 20 32" className={className} shapeRendering="crispEdges">
                    {/* Mounting bracket */}
                    <rect x="8" y="2" width="4" height="4" fill="#2F2F2F" />
                    <rect x="6" y="4" width="8" height="2" fill="#2F2F2F" />
                    {/* Lantern top */}
                    <rect x="4" y="6" width="12" height="2" fill="#2F2F2F" />
                    {/* Glass housing */}
                    <rect x="5" y="8" width="10" height="14" fill="#FFEFD5" stroke="#2F2F2F" strokeWidth="1" />
                    {/* Flame/light */}
                    <rect x="8" y="12" width="4" height="6" fill="#FFD700" />
                    <rect x="9" y="10" width="2" height="2" fill="#FFA500" />
                    <rect x="9" y="16" width="2" height="2" fill="#FF6600" />
                    {/* Lantern bottom */}
                    <rect x="4" y="22" width="12" height="2" fill="#2F2F2F" />
                    <rect x="6" y="24" width="8" height="2" fill="#2F2F2F" />
                    {/* Glow effect */}
                    <rect x="3" y="10" width="1" height="10" fill="#FFD700" opacity="0.3" />
                    <rect x="16" y="10" width="1" height="10" fill="#FFD700" opacity="0.3" />
                </svg>
            )
        case 'modern_lights':
            return (
                <svg width={16 * scale} height={28 * scale} viewBox="0 0 16 28" className={className} shapeRendering="crispEdges">
                    {/* Wall mount */}
                    <rect x="6" y="2" width="4" height="3" fill="#333333" />
                    {/* Light fixture - sleek rectangle */}
                    <rect x="3" y="5" width="10" height="18" fill="#404040" stroke="#333333" strokeWidth="1" />
                    {/* LED strip */}
                    <rect x="5" y="7" width="6" height="14" fill="#E8E8E8" />
                    {/* LED glow */}
                    <rect x="6" y="8" width="4" height="12" fill="#FFFFFF" />
                    {/* Light rays */}
                    <rect x="1" y="10" width="2" height="1" fill="#FFFFFF" opacity="0.5" />
                    <rect x="13" y="10" width="2" height="1" fill="#FFFFFF" opacity="0.5" />
                    <rect x="1" y="16" width="2" height="1" fill="#FFFFFF" opacity="0.5" />
                    <rect x="13" y="16" width="2" height="1" fill="#FFFFFF" opacity="0.5" />
                </svg>
            )
        case 'string_exterior_lights':
            return (
                <svg width={48 * scale} height={24 * scale} viewBox="0 0 48 24" className={className} shapeRendering="crispEdges">
                    {/* String wire */}
                    <rect x="2" y="6" width="44" height="1" fill="#2F2F2F" />
                    <rect x="4" y="7" width="2" height="1" fill="#2F2F2F" />
                    <rect x="10" y="8" width="2" height="1" fill="#2F2F2F" />
                    <rect x="18" y="7" width="2" height="1" fill="#2F2F2F" />
                    <rect x="26" y="8" width="2" height="1" fill="#2F2F2F" />
                    <rect x="34" y="7" width="2" height="1" fill="#2F2F2F" />
                    <rect x="42" y="7" width="2" height="1" fill="#2F2F2F" />
                    {/* Bulbs */}
                    <rect x="3" y="8" width="4" height="6" fill="#FFFF00" stroke="#E6E600" strokeWidth="1" />
                    <rect x="4" y="10" width="2" height="2" fill="#FFFFFF" />
                    <rect x="11" y="9" width="4" height="6" fill="#FF6B6B" stroke="#E65C5C" strokeWidth="1" />
                    <rect x="12" y="11" width="2" height="2" fill="#FFB6B6" />
                    <rect x="19" y="8" width="4" height="6" fill="#4ECDC4" stroke="#45B7AF" strokeWidth="1" />
                    <rect x="20" y="10" width="2" height="2" fill="#FFFFFF" />
                    <rect x="27" y="9" width="4" height="6" fill="#FFD93D" stroke="#E6C235" strokeWidth="1" />
                    <rect x="28" y="11" width="2" height="2" fill="#FFFFFF" />
                    <rect x="35" y="8" width="4" height="6" fill="#95E1D3" stroke="#85C9BC" strokeWidth="1" />
                    <rect x="36" y="10" width="2" height="2" fill="#FFFFFF" />
                    <rect x="43" y="8" width="4" height="6" fill="#DDA0DD" stroke="#C890C8" strokeWidth="1" />
                    <rect x="44" y="10" width="2" height="2" fill="#FFFFFF" />
                </svg>
            )

        default:
            return (
                <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
                    <rect x="2" y="2" width="12" height="12" fill="#A18463" rx="2" />
                    {/* Simple house shape fallback */}
                    <rect x="5" y="8" width="6" height="5" fill="#DEB887" />
                    <rect x="6" y="4" width="4" height="4" fill="#8B4513" />
                    <rect x="4" y="5" width="2" height="3" fill="#8B4513" />
                    <rect x="10" y="5" width="2" height="3" fill="#8B4513" />
                    <rect x="7" y="10" width="2" height="3" fill="#654321" />
                </svg>
            )
    }
}
