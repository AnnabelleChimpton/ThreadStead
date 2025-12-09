/**
 * Export all pixel home SVG decorations and houses as PNG files
 *
 * Usage:
 *   npx tsx scripts/export-decoration-pngs.ts [options]
 *
 * Options:
 *   --output=DIR     Output directory (default: exports/decorations)
 *   --dry-run        Preview without creating files
 *   --category=NAME  Export only specific category (plants, features, etc.)
 *   --houses         Also export house templates (all 4 templates x 5 palettes = 20 variants)
 *   --debug          Show debug output
 *   --limit=N        Limit number of items to export
 *
 * Examples:
 *   npx tsx scripts/export-decoration-pngs.ts                    # Export all decorations
 *   npx tsx scripts/export-decoration-pngs.ts --houses           # Export decorations + houses
 *   npx tsx scripts/export-decoration-pngs.ts --category=houses --houses  # Export only houses
 */

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Resvg } from '@resvg/resvg-js'
import * as fs from 'fs'
import * as path from 'path'

// Import SVG components
import { PlantSVGs } from '../components/pixel-homes/assets/PlantSVGs'
import { FeatureSVGs } from '../components/pixel-homes/assets/FeatureSVGs'
import { FurnitureSVGs } from '../components/pixel-homes/assets/FurnitureSVGs'
import { LightingSVGs } from '../components/pixel-homes/assets/LightingSVGs'
import { WaterSVGs } from '../components/pixel-homes/assets/WaterSVGs'
import { StructureSVGs } from '../components/pixel-homes/assets/StructureSVGs'
import { SeasonalSVGs } from '../components/pixel-homes/assets/SeasonalSVGs'
import { HouseCustomSVGs } from '../components/pixel-homes/assets/HouseCustomSVGs'
import { PathSVGs } from '../components/pixel-homes/assets/PathSVGs'
import HouseSVG, { HouseTemplate, ColorPalette } from '../components/pixel-homes/HouseSVG'

// Import data
import { DECORATION_DIMENSIONS } from '../lib/pixel-homes/decoration-dimensions'

// Note: BETA_ITEMS has been migrated to the database.
// This script uses a local definition for standalone operation.
// For new decorations, manage via /admin/decorations
const DECORATION_ITEMS: Record<string, { id: string; name: string; type: string }[]> = {
  plants: [
    { id: 'roses_red', name: 'Red Roses', type: 'plant' },
    { id: 'roses_pink', name: 'Pink Roses', type: 'plant' },
    { id: 'roses_white', name: 'White Roses', type: 'plant' },
    { id: 'daisies_white', name: 'White Daisies', type: 'plant' },
    { id: 'daisies_yellow', name: 'Yellow Daisies', type: 'plant' },
    { id: 'small_tree', name: 'Small Tree', type: 'plant' },
    { id: 'tree_oak', name: 'Oak Tree', type: 'plant' },
    { id: 'tree_pine', name: 'Pine Tree', type: 'plant' },
    { id: 'sunflowers', name: 'Sunflowers', type: 'plant' },
    { id: 'lavender', name: 'Lavender', type: 'plant' },
    { id: 'flower_pot', name: 'Flower Pot', type: 'plant' },
    { id: 'potted_herbs', name: 'Potted Herbs', type: 'plant' },
    { id: 'hedge', name: 'Garden Hedge', type: 'plant' },
    { id: 'hedge_round', name: 'Round Hedge', type: 'plant' }
  ],
  features: [
    { id: 'bird_bath', name: 'Bird Bath', type: 'feature' },
    { id: 'garden_gnome', name: 'Garden Gnome', type: 'feature' },
    { id: 'decorative_fence', name: 'Decorative Fence', type: 'feature' },
    { id: 'wind_chimes', name: 'Wind Chimes', type: 'feature' },
    { id: 'flamingo', name: 'Pink Flamingo', type: 'feature' },
    { id: 'garden_sphere', name: 'Gazing Ball', type: 'feature' },
    { id: 'sundial', name: 'Sundial', type: 'feature' },
    { id: 'garden_gnome_fishing', name: 'Fishing Gnome', type: 'feature' },
    { id: 'garden_gnome_reading', name: 'Reading Gnome', type: 'feature' },
    { id: 'watering_can', name: 'Watering Can', type: 'feature' },
    { id: 'garden_tools', name: 'Garden Tools', type: 'feature' },
    { id: 'wheelbarrow', name: 'Wheelbarrow', type: 'feature' },
    { id: 'sleeping_cat', name: 'Sleeping Cat', type: 'feature' },
    { id: 'sleeping_dog', name: 'Sleeping Dog', type: 'feature' },
    { id: 'bird_feeder', name: 'Bird Feeder', type: 'feature' },
    { id: 'firewood_stack', name: 'Firewood Stack', type: 'feature' },
    { id: 'clothesline', name: 'Clothesline', type: 'feature' },
    { id: 'welcome_sign', name: 'Welcome Sign', type: 'feature' }
  ],
  furniture: [
    { id: 'garden_bench', name: 'Garden Bench', type: 'furniture' },
    { id: 'outdoor_table', name: 'Outdoor Table', type: 'furniture' },
    { id: 'mailbox', name: 'Mailbox', type: 'furniture' },
    { id: 'planter_box', name: 'Planter Box', type: 'furniture' },
    { id: 'picnic_table', name: 'Picnic Table', type: 'furniture' },
    { id: 'raised_bed', name: 'Raised Garden Bed', type: 'furniture' },
    { id: 'compost_bin', name: 'Compost Bin', type: 'furniture' },
    { id: 'garden_cart', name: 'Garden Cart', type: 'furniture' },
    { id: 'rocking_chair', name: 'Rocking Chair', type: 'furniture' },
    { id: 'garden_swing', name: 'Garden Swing', type: 'furniture' },
    { id: 'cozy_blanket', name: 'Cozy Blanket', type: 'furniture' }
  ],
  lighting: [
    { id: 'garden_lantern', name: 'Garden Lantern', type: 'lighting' },
    { id: 'string_lights', name: 'String Lights', type: 'lighting' },
    { id: 'torch', name: 'Garden Torch', type: 'lighting' },
    { id: 'spotlight', name: 'Spotlight', type: 'lighting' }
  ],
  water: [
    { id: 'fountain', name: 'Garden Fountain', type: 'water' },
    { id: 'pond', name: 'Small Pond', type: 'water' },
    { id: 'rain_barrel', name: 'Rain Barrel', type: 'water' }
  ],
  structures: [
    { id: 'gazebo', name: 'Garden Gazebo', type: 'structure' },
    { id: 'trellis', name: 'Garden Trellis', type: 'structure' },
    { id: 'garden_arch', name: 'Garden Arch', type: 'structure' },
    { id: 'sign_post', name: 'Sign Post', type: 'structure' },
    { id: 'wishing_well', name: 'Wishing Well', type: 'structure' },
    { id: 'picket_fence_white', name: 'White Picket Fence', type: 'structure' },
    { id: 'picket_fence_natural', name: 'Natural Picket Fence', type: 'structure' },
    { id: 'rustic_fence', name: 'Rustic Fence', type: 'structure' },
    { id: 'stone_wall', name: 'Low Stone Wall', type: 'structure' }
  ],
  house: [
    { id: 'arched_door', name: 'Arched Door', type: 'house_custom' },
    { id: 'double_door', name: 'Double Door', type: 'house_custom' },
    { id: 'cottage_door', name: 'Cottage Door', type: 'house_custom' },
    { id: 'round_windows', name: 'Round Windows', type: 'house_custom' },
    { id: 'arched_windows', name: 'Arched Windows', type: 'house_custom' },
    { id: 'bay_windows', name: 'Bay Windows', type: 'house_custom' },
    { id: 'shutters', name: 'Shutters', type: 'house_custom' },
    { id: 'flower_boxes', name: 'Flower Boxes', type: 'house_custom' },
    { id: 'awnings', name: 'Awnings', type: 'house_custom' },
    { id: 'ornate_trim', name: 'Ornate Roof Trim', type: 'house_custom' },
    { id: 'scalloped_trim', name: 'Scalloped Trim', type: 'house_custom' },
    { id: 'gabled_trim', name: 'Gabled Trim', type: 'house_custom' },
    { id: 'brick_chimney', name: 'Brick Chimney', type: 'house_custom' },
    { id: 'stone_chimney', name: 'Stone Chimney', type: 'house_custom' }
  ],
  paths: [
    { id: 'stone_path', name: 'Stone Path', type: 'path' },
    { id: 'brick_path', name: 'Brick Path', type: 'path' },
    { id: 'stepping_stones', name: 'Stepping Stones', type: 'path' },
    { id: 'gravel_path', name: 'Gravel Path', type: 'path' }
  ]
}

// House templates to export
const HOUSE_TEMPLATES: { id: HouseTemplate; name: string }[] = [
  { id: 'cottage_v1', name: 'Cottage' },
  { id: 'townhouse_v1', name: 'Townhouse' },
  { id: 'loft_v1', name: 'Modern Loft' },
  { id: 'cabin_v1', name: 'Log Cabin' },
]

// Color palettes for house exports
const COLOR_PALETTES: ColorPalette[] = [
  'thread_sage',
  'charcoal_nights',
  'pixel_petals',
  'crt_glow',
  'classic_linen',
]

interface AssetProps {
  id: string
  variant: string
  scale: number
  className?: string
}

// Map decoration types to their SVG components
const SVG_COMPONENT_MAP: Record<string, React.FC<AssetProps>> = {
  plant: PlantSVGs,
  feature: FeatureSVGs,
  furniture: FurnitureSVGs,
  lighting: LightingSVGs,
  water: WaterSVGs,
  structure: StructureSVGs,
  seasonal: SeasonalSVGs,
  house_custom: HouseCustomSVGs,
  path: PathSVGs,
}

// Default dimensions by type if not found in lookup table
const DEFAULT_TYPE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  plant: { width: 24, height: 24 },
  feature: { width: 24, height: 24 },
  furniture: { width: 32, height: 24 },
  lighting: { width: 16, height: 32 },
  water: { width: 32, height: 32 },
  structure: { width: 48, height: 32 },
  seasonal: { width: 24, height: 24 },
  house_custom: { width: 40, height: 30 },
  path: { width: 48, height: 16 },
}

interface DecorationInfo {
  id: string
  name: string
  type: string
  category: string
  variant: string
}

// Extract variant from decoration ID (e.g., roses_red -> red)
function extractVariant(id: string): string {
  const colorVariants = ['red', 'pink', 'white', 'yellow', 'purple', 'natural']
  const parts = id.split('_')
  const lastPart = parts[parts.length - 1]

  if (colorVariants.includes(lastPart)) {
    return lastPart
  }
  return 'default'
}

// Get all decorations from local definition
function getAllDecorations(): DecorationInfo[] {
  const decorations: DecorationInfo[] = []

  for (const [category, items] of Object.entries(DECORATION_ITEMS)) {
    for (const item of items) {
      // Skip items that don't have SVG components
      if (!SVG_COMPONENT_MAP[item.type]) {
        continue
      }

      // Skip default/no items (they don't render anything)
      if (item.id.startsWith('default_') ||
          item.id.startsWith('no_')) {
        continue
      }

      const variant = extractVariant(item.id)

      decorations.push({
        id: item.id,
        name: item.name,
        type: item.type,
        category,
        variant,
      })
    }
  }

  return decorations
}

// Render a decoration to PNG
function renderDecorationToPNG(
  decoration: DecorationInfo,
  outputDir: string,
  debug: boolean = false
): { success: boolean; error?: string } {
  try {
    const SvgComponent = SVG_COMPONENT_MAP[decoration.type]
    if (!SvgComponent) {
      return { success: false, error: `No component for type: ${decoration.type}` }
    }

    // Get dimensions
    const dimensions = DECORATION_DIMENSIONS[decoration.id]
      || DEFAULT_TYPE_DIMENSIONS[decoration.type]
      || { width: 24, height: 24 }

    // Render React component to SVG string
    const svgElement = React.createElement(SvgComponent, {
      id: decoration.id,
      variant: decoration.variant,
      scale: 1,
      className: '',
    })

    const svgString = renderToStaticMarkup(svgElement)

    if (debug) {
      console.log(`[DEBUG] ${decoration.id}: svgString length=${svgString?.length}`)
    }

    // Check if SVG was actually rendered
    if (!svgString || svgString === '' || svgString === 'null') {
      return { success: false, error: 'Empty SVG output' }
    }

    // Add xmlns if not present (required by resvg)
    let processedSvg = svgString
    if (!svgString.includes('xmlns=')) {
      processedSvg = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    }
    // Remove empty class attribute that can cause issues
    processedSvg = processedSvg.replace(' class=""', '')

    // Convert SVG to PNG using resvg
    const resvg = new Resvg(processedSvg, {
      fitTo: {
        mode: 'original',
      },
    })

    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    // Write to file
    const outputPath = path.join(outputDir, `${decoration.id}.png`)
    fs.writeFileSync(outputPath, pngBuffer)

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Render a house template to PNG
function renderHouseToPNG(
  template: HouseTemplate,
  palette: ColorPalette,
  outputDir: string,
  debug: boolean = false
): { success: boolean; error?: string } {
  try {
    // Render React component to SVG string
    const svgElement = React.createElement(HouseSVG, {
      template,
      palette,
      variant: 'detailed',
    })

    const svgString = renderToStaticMarkup(svgElement)

    if (debug) {
      console.log(`[DEBUG] ${template}_${palette}: svgString length=${svgString?.length}`)
    }

    if (!svgString || svgString === '' || svgString === 'null') {
      return { success: false, error: 'Empty SVG output' }
    }

    // Process the SVG for resvg compatibility
    let processedSvg = svgString
    // Remove class attributes
    processedSvg = processedSvg.replace(/ class="[^"]*"/g, '')
    // Add xmlns to ALL svg tags that don't have it (there's a nested structure)
    processedSvg = processedSvg.replace(/<svg(?![^>]*xmlns)/g, '<svg xmlns="http://www.w3.org/2000/svg"')

    // Convert SVG to PNG using resvg
    // Houses have viewBox 200x180
    const resvg = new Resvg(processedSvg, {
      fitTo: {
        mode: 'width',
        value: 200,
      },
    })

    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    // Write to file
    const filename = `${template}_${palette}.png`
    const outputPath = path.join(outputDir, filename)
    fs.writeFileSync(outputPath, pngBuffer)

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

interface ExportOptions {
  outputDir: string
  dryRun: boolean
  category?: string
  debug: boolean
  limit?: number
  includeHouses: boolean
}

function parseArgs(argv: string[]): ExportOptions {
  const outputArg = argv.find(a => a.startsWith('--output='))
  const categoryArg = argv.find(a => a.startsWith('--category='))
  const limitArg = argv.find(a => a.startsWith('--limit='))
  const dryRun = argv.includes('--dry-run')
  const debug = argv.includes('--debug')
  const includeHouses = argv.includes('--houses')

  return {
    outputDir: outputArg?.split('=')[1] || 'exports/decorations',
    category: categoryArg?.split('=')[1],
    limit: limitArg ? parseInt(limitArg.split('=')[1]) : undefined,
    dryRun,
    debug,
    includeHouses,
  }
}

async function main() {
  console.log('=== Pixel Home Decoration PNG Exporter ===\n')

  const options = parseArgs(process.argv.slice(2))

  console.log('Options:')
  console.log(`  Output directory: ${options.outputDir}`)
  console.log(`  Category filter: ${options.category || 'all'}`)
  console.log(`  Include houses: ${options.includeHouses}`)
  console.log(`  Dry run: ${options.dryRun}`)
  console.log(`  Debug: ${options.debug}`)
  if (options.limit) console.log(`  Limit: ${options.limit}`)
  console.log('')

  // Ensure output directory exists
  if (!options.dryRun) {
    fs.mkdirSync(options.outputDir, { recursive: true })
  }

  let exported = 0
  let failed = 0
  const failures: { id: string; error: string }[] = []

  // Export decorations (unless --houses is used with a specific category)
  if (!options.includeHouses || options.category !== 'houses') {
    // Get all decorations
    let decorations = getAllDecorations()

    // Filter by category if specified (and not 'houses')
    if (options.category && options.category !== 'houses') {
      decorations = decorations.filter(d => d.category === options.category)
    }

    // Apply limit if specified
    if (options.limit) {
      decorations = decorations.slice(0, options.limit)
    }

    if (decorations.length > 0) {
      console.log(`Found ${decorations.length} decorations to export.\n`)

      for (const decoration of decorations) {
        const dims = DECORATION_DIMENSIONS[decoration.id] || { width: '?', height: '?' }

        if (options.dryRun) {
          console.log(`[DRY RUN] Would export: ${decoration.id}.png (${dims.width}x${dims.height})`)
          exported++
        } else {
          const result = renderDecorationToPNG(decoration, options.outputDir, options.debug)
          if (result.success) {
            console.log(`Exported: ${decoration.id}.png (${dims.width}x${dims.height})`)
            exported++
          } else {
            console.log(`FAILED: ${decoration.id} - ${result.error}`)
            failures.push({ id: decoration.id, error: result.error || 'Unknown error' })
            failed++
          }
        }
      }
    } else if (!options.includeHouses) {
      console.log('No decorations found. Available categories:')
      const categories = [...new Set(getAllDecorations().map(d => d.category))]
      categories.forEach(c => console.log(`  - ${c}`))
      console.log(`  - houses (use --houses flag)`)
      return
    }
  }

  // Export houses if requested
  if (options.includeHouses) {
    // Create houses subdirectory
    const housesDir = path.join(options.outputDir, 'houses')
    if (!options.dryRun) {
      fs.mkdirSync(housesDir, { recursive: true })
    }

    const totalHouses = HOUSE_TEMPLATES.length * COLOR_PALETTES.length
    console.log(`\nExporting ${totalHouses} house variants (${HOUSE_TEMPLATES.length} templates x ${COLOR_PALETTES.length} palettes)...\n`)

    for (const template of HOUSE_TEMPLATES) {
      for (const palette of COLOR_PALETTES) {
        const filename = `${template.id}_${palette}.png`

        if (options.dryRun) {
          console.log(`[DRY RUN] Would export: houses/${filename} (200x180)`)
          exported++
        } else {
          const result = renderHouseToPNG(template.id, palette, housesDir, options.debug)
          if (result.success) {
            console.log(`Exported: houses/${filename} (200x180)`)
            exported++
          } else {
            console.log(`FAILED: ${filename} - ${result.error}`)
            failures.push({ id: filename, error: result.error || 'Unknown error' })
            failed++
          }
        }
      }
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Exported: ${exported}`)
  console.log(`Failed: ${failed}`)

  if (failures.length > 0) {
    console.log(`\nFailed items:`)
    failures.forEach(f => console.log(`  - ${f.id}: ${f.error}`))
  }

  if (!options.dryRun && exported > 0) {
    console.log(`\nFiles saved to: ${path.resolve(options.outputDir)}`)
  }
}

main().catch(console.error)
