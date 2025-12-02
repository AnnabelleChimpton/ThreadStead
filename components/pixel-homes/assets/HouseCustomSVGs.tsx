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
        default:
            return (
                <svg width={16 * scale} height={16 * scale} viewBox="0 0 16 16" className={className} shapeRendering="crispEdges">
                    <rect x="2" y="2" width="12" height="12" fill="#A18463" rx="2" />
                    <text x="8" y="11" textAnchor="middle" fontSize="6" fill="white">🏠</text>
                </svg>
            )
    }
}
