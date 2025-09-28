#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Extract real SVG icons from DecorationIcon.tsx component
function getIconSvg(itemId: string, type: string): string {
  const size = 24

  switch (type) {
    case 'plant':
      switch (itemId) {
        case 'roses_red':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" /><rect x="11" y="14" width="2" height="6" fill="#2D5016" /><circle cx="12" cy="12" r="3" fill="#DC2626" /><circle cx="12" cy="12" r="1" fill="#7F1D1D" /></svg>`
        case 'roses_pink':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" /><rect x="11" y="14" width="2" height="6" fill="#2D5016" /><circle cx="12" cy="12" r="3" fill="#EC4899" /><circle cx="12" cy="12" r="1" fill="#9D174D" /></svg>`
        case 'roses_white':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" /><rect x="11" y="14" width="2" height="6" fill="#2D5016" /><circle cx="12" cy="12" r="3" fill="#FFFFFF" /><circle cx="12" cy="12" r="1" fill="#FCD34D" /></svg>`
        case 'daisies_white':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="6" ry="2" fill="#4A5D23" /><rect x="11" y="12" width="2" height="8" fill="#2D5016" /><g>${[0, 90, 180, 270].map(angle => `<ellipse cx="12" cy="10" rx="2" ry="1" fill="#FFFFFF" transform="rotate(${angle} 12 10)" />`).join('')}<circle cx="12" cy="10" r="1.5" fill="#FCD34D" /></g></svg>`
        case 'daisies_yellow':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="6" ry="2" fill="#4A5D23" /><rect x="11" y="12" width="2" height="8" fill="#2D5016" /><g>${[0, 90, 180, 270].map(angle => `<ellipse cx="12" cy="10" rx="2" ry="1" fill="#FEF3C7" transform="rotate(${angle} 12 10)" />`).join('')}<circle cx="12" cy="10" r="1.5" fill="#F59E0B" /></g></svg>`
        case 'small_tree':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="11" y="16" width="2" height="6" fill="#8B4513" /><circle cx="12" cy="12" r="6" fill="#22543D" /><circle cx="12" cy="10" r="4" fill="#22C55E" opacity="0.8" /></svg>`
        case 'tree_oak':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="11" y="16" width="2" height="6" fill="#8B4513" /><circle cx="12" cy="12" r="6" fill="#16A34A" /><circle cx="12" cy="10" r="4" fill="#22C55E" opacity="0.8" /><circle cx="8" cy="12" r="2" fill="#059669" opacity="0.6" /><circle cx="16" cy="12" r="2" fill="#059669" opacity="0.6" /></svg>`
        case 'tree_pine':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="11" y="18" width="2" height="4" fill="#8B4513" /><path d="M12 4 L8 12 L16 12 Z" fill="#0F4C3A" /><path d="M12 7 L9 14 L15 14 Z" fill="#16A34A" /><path d="M12 10 L10 16 L14 16 Z" fill="#22C55E" /></svg>`
        case 'sunflowers':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="8" ry="3" fill="#4A5D23" /><rect x="11" y="14" width="2" height="6" fill="#16A34A" /><g>${[0, 45, 90, 135, 180, 225, 270, 315].map(angle => `<ellipse cx="12" cy="12" rx="4" ry="1.5" fill="#FCD34D" transform="rotate(${angle} 12 12)" />`).join('')}<circle cx="12" cy="12" r="3" fill="#92400E" /></g></svg>`
        case 'lavender':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="6" ry="2" fill="#4A5D23" /><rect x="11" y="12" width="2" height="8" fill="#16A34A" /><ellipse cx="12" cy="10" rx="2" ry="6" fill="#A855F7" /><ellipse cx="12" cy="8" rx="1.5" ry="4" fill="#9333EA" /><ellipse cx="12" cy="6" rx="1" ry="2" fill="#7C3AED" /></svg>`
        case 'flower_pot':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M8 16 L8 20 L16 20 L16 16 Z" fill="#8B4513" stroke="#654321" stroke-width="1" /><ellipse cx="12" cy="16" rx="4" ry="1.5" fill="#A3A3A3" stroke="#8B4513" stroke-width="0.5" /><rect x="11" y="8" width="2" height="8" fill="#16A34A" /><circle cx="10" cy="8" r="1.5" fill="#DC2626" /><circle cx="14" cy="8" r="1.5" fill="#2563EB" /><circle cx="12" cy="6" r="1.5" fill="#F59E0B" /></svg>`
        case 'planter_box':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="6" y="14" width="12" height="6" fill="#8B4513" stroke="#654321" stroke-width="1" /><rect x="7" y="12" width="2" height="8" fill="#16A34A" /><rect x="11" y="10" width="2" height="10" fill="#16A34A" /><rect x="15" y="12" width="2" height="8" fill="#16A34A" /><circle cx="8" cy="10" r="1" fill="#DC2626" /><circle cx="12" cy="8" r="1" fill="#F59E0B" /><circle cx="16" cy="10" r="1" fill="#2563EB" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#22C55E" /><text x="12" y="16" text-anchor="middle" font-size="10" fill="white">P</text></svg>`
      }

    case 'path':
      switch (itemId) {
        case 'stone_path':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="6" cy="12" rx="4" ry="2" fill="#9CA3AF" /><ellipse cx="18" cy="12" rx="4" ry="2" fill="#6B7280" /><ellipse cx="12" cy="10" rx="3" ry="1.5" fill="#F3F4F6" opacity="0.6" /></svg>`
        case 'brick_path':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2" y="10" width="6" height="4" fill="#DC2626" stroke="#B91C1C" stroke-width="0.5" /><rect x="8" y="10" width="6" height="4" fill="#EF4444" stroke="#DC2626" stroke-width="0.5" /><rect x="14" y="10" width="6" height="4" fill="#DC2626" stroke="#B91C1C" stroke-width="0.5" /></svg>`
        case 'stepping_stones':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="6" cy="10" rx="3" ry="2" fill="#9CA3AF" stroke="#6B7280" stroke-width="0.5" /><ellipse cx="12" cy="14" rx="3" ry="2" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="0.5" /><ellipse cx="18" cy="10" rx="3" ry="2" fill="#9CA3AF" stroke="#6B7280" stroke-width="0.5" /><ellipse cx="4" cy="16" rx="2" ry="1.5" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="0.5" /></svg>`
        case 'gravel_path':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2" y="10" width="20" height="4" fill="#A3A3A3" stroke="#737373" stroke-width="0.5" /><circle cx="4" cy="11" r="0.5" fill="#6B7280" /><circle cx="7" cy="12" r="0.5" fill="#9CA3AF" /><circle cx="10" cy="11.5" r="0.5" fill="#6B7280" /><circle cx="13" cy="12.5" r="0.5" fill="#D1D5DB" /><circle cx="16" cy="11" r="0.5" fill="#9CA3AF" /><circle cx="19" cy="12" r="0.5" fill="#6B7280" /><circle cx="6" cy="13" r="0.3" fill="#E5E7EB" /><circle cx="11" cy="13" r="0.3" fill="#F3F4F6" /><circle cx="15" cy="13.5" r="0.3" fill="#E5E7EB" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2" y="11" width="20" height="2" fill="#8B5CF6" rx="1" /></svg>`
      }

    case 'feature':
      switch (itemId) {
        case 'bird_bath':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="6" ry="2" fill="#6B7280" /><rect x="11" y="12" width="2" height="8" fill="#9CA3AF" /><ellipse cx="12" cy="12" rx="6" ry="3" fill="#D1D5DB" /><ellipse cx="12" cy="11" rx="4" ry="2" fill="#3B82F6" opacity="0.7" /></svg>`
        case 'garden_gnome':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="20" rx="4" ry="2" fill="#4A5D23" /><ellipse cx="12" cy="16" rx="3" ry="4" fill="#DC2626" /><circle cx="12" cy="10" r="2.5" fill="#FBBF24" /><path d="M 9 8 L 12 4 L 15 8 Z" fill="#DC2626" /><ellipse cx="12" cy="13" rx="1.5" ry="2" fill="#F3F4F6" /></svg>`
        case 'decorative_fence':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2" y="12" width="20" height="2" fill="#8B4513" /><rect x="4" y="8" width="1.5" height="8" fill="#D2691E" /><rect x="8" y="6" width="1.5" height="10" fill="#D2691E" /><rect x="12" y="8" width="1.5" height="8" fill="#D2691E" /><rect x="16" y="6" width="1.5" height="10" fill="#D2691E" /><rect x="20" y="8" width="1.5" height="8" fill="#D2691E" /><circle cx="4.75" cy="8" r="0.75" fill="#8B4513" /><circle cx="8.75" cy="6" r="0.75" fill="#8B4513" /><circle cx="12.75" cy="8" r="0.75" fill="#8B4513" /><circle cx="16.75" cy="6" r="0.75" fill="#8B4513" /><circle cx="20.75" cy="8" r="0.75" fill="#8B4513" /></svg>`
        case 'wind_chimes':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="4" ry="1" fill="#8B4513" /><line x1="8" y1="6" x2="8" y2="16" stroke="#C0C0C0" stroke-width="0.5" /><line x1="10" y1="6" x2="10" y2="18" stroke="#C0C0C0" stroke-width="0.5" /><line x1="12" y1="6" x2="12" y2="14" stroke="#C0C0C0" stroke-width="0.5" /><line x1="14" y1="6" x2="14" y2="17" stroke="#C0C0C0" stroke-width="0.5" /><line x1="16" y1="6" x2="16" y2="15" stroke="#C0C0C0" stroke-width="0.5" /><rect x="7" y="16" width="2" height="1" fill="#FFD700" rx="0.5" /><rect x="9" y="18" width="2" height="1" fill="#FFA500" rx="0.5" /><rect x="11" y="14" width="2" height="1" fill="#FFD700" rx="0.5" /><rect x="13" y="17" width="2" height="1" fill="#FFA500" rx="0.5" /><rect x="15" y="15" width="2" height="1" fill="#FFD700" rx="0.5" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#8B5CF6" /><text x="12" y="16" text-anchor="middle" font-size="10" fill="white">★</text></svg>`
      }

    case 'furniture':
      switch (itemId) {
        case 'garden_bench':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="4" y="14" width="16" height="3" fill="#8B4513" rx="1" /><rect x="4" y="10" width="2" height="7" fill="#8B4513" /><rect x="18" y="10" width="2" height="7" fill="#8B4513" /><rect x="4" y="10" width="16" height="2" fill="#8B4513" rx="1" /></svg>`
        case 'outdoor_table':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="4" fill="#8B4513" stroke="#654321" stroke-width="1" /><rect x="6" y="12" width="2" height="6" fill="#654321" /><rect x="10" y="12" width="2" height="6" fill="#654321" /><rect x="12" y="12" width="2" height="6" fill="#654321" /><rect x="16" y="12" width="2" height="6" fill="#654321" /></svg>`
        case 'mailbox':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="18" y="8" width="2" height="10" fill="#8B4513" /><rect x="4" y="8" width="12" height="6" fill="#6B7280" rx="2" /><rect x="5" y="10" width="8" height="3" fill="#FFFFFF" stroke="#6B7280" stroke-width="0.5" /><circle cx="13" cy="11" r="0.5" fill="#FFD700" /></svg>`
        case 'planter_box_furniture':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="6" y="14" width="12" height="6" fill="#8B4513" stroke="#654321" stroke-width="1" /><rect x="7" y="12" width="2" height="8" fill="#16A34A" /><rect x="11" y="10" width="2" height="10" fill="#16A34A" /><rect x="15" y="12" width="2" height="8" fill="#16A34A" /><circle cx="8" cy="10" r="1" fill="#DC2626" /><circle cx="12" cy="8" r="1" fill="#F59E0B" /><circle cx="16" cy="10" r="1" fill="#2563EB" /></svg>`
        case 'picnic_table':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2" y="11" width="20" height="2" fill="#8B4513" rx="1" /><rect x="4" y="15" width="16" height="1.5" fill="#8B4513" rx="0.5" /><rect x="6" y="13" width="2" height="5" fill="#654321" /><rect x="16" y="13" width="2" height="5" fill="#654321" /><rect x="11" y="8" width="2" height="10" fill="#654321" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#8B4513" rx="2" /><text x="12" y="16" text-anchor="middle" font-size="10" fill="white">🪑</text></svg>`
      }

    case 'lighting':
      switch (itemId) {
        case 'garden_lantern':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="11" y="16" width="2" height="4" fill="#8B4513" /><rect x="8" y="8" width="8" height="8" fill="#FFD700" stroke="#D97706" stroke-width="1" rx="2" /><rect x="9" y="9" width="6" height="6" fill="#FEF3C7" rx="1" /><circle cx="12" cy="12" r="2" fill="#FBBF24" opacity="0.8" /><rect x="10" y="6" width="4" height="2" fill="#8B4513" rx="1" /></svg>`
        case 'string_lights':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M2 8 Q12 12 22 8" stroke="#8B4513" stroke-width="1" fill="none" /><circle cx="6" cy="9" r="1.5" fill="#FCD34D" /><circle cx="12" cy="10" r="1.5" fill="#F87171" /><circle cx="18" cy="9" r="1.5" fill="#60A5FA" /><circle cx="9" cy="9.5" r="1" fill="#34D399" /><circle cx="15" cy="9.5" r="1" fill="#A78BFA" /></svg>`
        case 'torch':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="11" y="12" width="2" height="8" fill="#8B4513" /><ellipse cx="12" cy="8" rx="3" ry="4" fill="#F59E0B" /><ellipse cx="12" cy="6" rx="2" ry="3" fill="#FBBF24" /><ellipse cx="12" cy="4" rx="1" ry="2" fill="#FEF3C7" /></svg>`
        case 'spotlight':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="11" y="14" width="2" height="6" fill="#374151" /><circle cx="12" cy="10" r="4" fill="#6B7280" stroke="#374151" stroke-width="1" /><circle cx="12" cy="10" r="2" fill="#FEF3C7" /><path d="M12 6 L8 2 L16 2 Z" fill="#FBBF24" opacity="0.6" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#FCD34D" /><text x="12" y="16" text-anchor="middle" font-size="10" fill="white">💡</text></svg>`
      }

    case 'water':
      switch (itemId) {
        case 'fountain':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="18" rx="8" ry="3" fill="#3B82F6" opacity="0.6" /><rect x="10" y="12" width="4" height="6" fill="#9CA3AF" rx="1" /><circle cx="12" cy="8" r="3" fill="#60A5FA" opacity="0.8" /><circle cx="12" cy="6" r="1" fill="#DBEAFE" /><circle cx="10" cy="7" r="0.5" fill="#DBEAFE" /><circle cx="14" cy="7" r="0.5" fill="#DBEAFE" /></svg>`
        case 'pond':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="4" fill="#3B82F6" opacity="0.7" /><ellipse cx="12" cy="12" rx="6" ry="3" fill="#60A5FA" opacity="0.5" /><circle cx="8" cy="12" r="1" fill="#DBEAFE" opacity="0.8" /><circle cx="16" cy="13" r="0.5" fill="#DBEAFE" opacity="0.8" /><ellipse cx="12" cy="10" rx="2" ry="1" fill="#FFFFFF" opacity="0.6" /></svg>`
        case 'rain_barrel':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="8" y="8" width="8" height="12" fill="#8B4513" stroke="#654321" stroke-width="1" rx="1" /><ellipse cx="12" cy="8" rx="4" ry="1" fill="#6B7280" /><rect x="9" y="10" width="6" height="1" fill="#654321" /><rect x="9" y="13" width="6" height="1" fill="#654321" /><rect x="9" y="16" width="6" height="1" fill="#654321" /><circle cx="14" cy="12" r="1" fill="#3B82F6" opacity="0.7" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#3B82F6" /><text x="12" y="16" text-anchor="middle" font-size="10" fill="white">💧</text></svg>`
      }

    case 'structure':
      switch (itemId) {
        case 'gazebo':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M4 16 L12 8 L20 16 Z" fill="#8B4513" stroke="#654321" stroke-width="1" /><rect x="6" y="16" width="2" height="4" fill="#654321" /><rect x="10" y="16" width="2" height="4" fill="#654321" /><rect x="12" y="16" width="2" height="4" fill="#654321" /><rect x="16" y="16" width="2" height="4" fill="#654321" /><rect x="4" y="16" width="16" height="1" fill="#8B4513" /></svg>`
        case 'trellis':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="4" y="4" width="2" height="16" fill="#8B4513" /><rect x="18" y="4" width="2" height="16" fill="#8B4513" /><rect x="4" y="8" width="16" height="1" fill="#8B4513" /><rect x="4" y="12" width="16" height="1" fill="#8B4513" /><rect x="4" y="16" width="16" height="1" fill="#8B4513" /><circle cx="8" cy="10" r="1" fill="#16A34A" /><circle cx="12" cy="6" r="1" fill="#16A34A" /><circle cx="16" cy="10" r="1" fill="#16A34A" /></svg>`
        case 'garden_arch':
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="4" y="12" width="2" height="8" fill="#8B4513" /><rect x="18" y="12" width="2" height="8" fill="#8B4513" /><path d="M6 12 Q12 4 18 12" stroke="#8B4513" stroke-width="2" fill="none" /><circle cx="8" cy="10" r="0.5" fill="#16A34A" /><circle cx="12" cy="8" r="0.5" fill="#DC2626" /><circle cx="16" cy="10" r="0.5" fill="#16A34A" /><circle cx="10" cy="9" r="0.3" fill="#F59E0B" /><circle cx="14" cy="9" r="0.3" fill="#F59E0B" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#8B4513" rx="2" /><text x="12" y="16" text-anchor="middle" font-size="10" fill="white">🏗️</text></svg>`
      }

    default:
      const colors = {
        plant: '#4FAF6D',
        furniture: '#A18463',
        path: '#B8B8B8',
        feature: '#E27D60',
        lighting: '#FFE066',
        water: '#8EC5E8',
        structure: '#2E4B3F'
      }
      const color = colors[type as keyof typeof colors] || '#A18463'
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="${color}" opacity="0.8"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold">${type.charAt(0).toUpperCase()}</text></svg>`
  }
}

function getRenderSvg(itemId: string, type: string): string {
  const size = 40

  switch (type) {
    case 'plant':
      switch (itemId) {
        case 'roses_red':
          return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><ellipse cx="20" cy="34" rx="14" ry="5" fill="#4A5D23" /><rect x="18" y="22" width="4" height="12" fill="#2D5016" /><circle cx="20" cy="18" r="6" fill="#DC2626" /><circle cx="20" cy="18" r="2" fill="#7F1D1D" /></svg>`
        case 'roses_pink':
          return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><ellipse cx="20" cy="34" rx="14" ry="5" fill="#4A5D23" /><rect x="18" y="22" width="4" height="12" fill="#2D5016" /><circle cx="20" cy="18" r="6" fill="#EC4899" /><circle cx="20" cy="18" r="2" fill="#9D174D" /></svg>`
        case 'roses_white':
          return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><ellipse cx="20" cy="34" rx="14" ry="5" fill="#4A5D23" /><rect x="18" y="22" width="4" height="12" fill="#2D5016" /><circle cx="20" cy="18" r="6" fill="#FFFFFF" /><circle cx="20" cy="18" r="2" fill="#FCD34D" /></svg>`
        case 'small_tree':
          return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><rect x="18" y="26" width="4" height="12" fill="#8B4513" /><circle cx="20" cy="18" r="10" fill="#22543D" /><circle cx="20" cy="15" r="7" fill="#22C55E" opacity="0.8" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#22C55E" opacity="0.9"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${itemId.split('_')[0].charAt(0).toUpperCase()}</text></svg>`
      }

    case 'path':
      switch (itemId) {
        case 'stone_path':
          return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><ellipse cx="10" cy="20" rx="8" ry="4" fill="#9CA3AF" /><ellipse cx="30" cy="20" rx="8" ry="4" fill="#6B7280" /><ellipse cx="20" cy="16" rx="6" ry="3" fill="#F3F4F6" opacity="0.6" /></svg>`
        case 'brick_path':
          return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><rect x="2" y="16" width="12" height="8" fill="#DC2626" stroke="#B91C1C" stroke-width="1" /><rect x="14" y="16" width="12" height="8" fill="#EF4444" stroke="#DC2626" stroke-width="1" /><rect x="26" y="16" width="12" height="8" fill="#DC2626" stroke="#B91C1C" stroke-width="1" /></svg>`
        default:
          return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><rect x="4" y="18" width="32" height="4" fill="#8B5CF6" rx="2" /></svg>`
      }

    default:
      const colors = {
        plant: '#4FAF6D',
        furniture: '#A18463',
        path: '#B8B8B8',
        feature: '#E27D60',
        lighting: '#FFE066',
        water: '#8EC5E8',
        structure: '#2E4B3F'
      }
      const color = colors[type as keyof typeof colors] || '#A18463'
      return `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="${color}" opacity="0.9"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${itemId.split('_')[0].charAt(0).toUpperCase()}</text></svg>`
  }
}

async function updateDecorationIcons() {
  console.log('🎨 Updating decoration icons with real SVGs...\\n')

  try {
    // Get all decorations
    const decorations = await prisma.decorationItem.findMany({
      select: {
        itemId: true,
        type: true
      }
    })

    console.log(`📦 Found ${decorations.length} decorations to update`)

    let updated = 0
    for (const decoration of decorations) {
      const iconSvg = getIconSvg(decoration.itemId, decoration.type)
      const renderSvg = getRenderSvg(decoration.itemId, decoration.type)

      await prisma.decorationItem.update({
        where: { itemId: decoration.itemId },
        data: {
          iconSvg,
          renderSvg
        }
      })

      console.log(`✅ Updated ${decoration.itemId} icons`)
      updated++
    }

    console.log(`\\n🎉 Updated ${updated} decorations with real icons!`)

  } catch (error) {
    console.error('❌ Failed to update icons:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateDecorationIcons()