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
import HouseSVG, { HouseTemplate, ColorPalette } from '../components/pixel-homes/HouseSVG'

// Import data
import { BETA_ITEMS } from '../lib/pixel-homes/decoration-data'
import { DECORATION_DIMENSIONS } from '../lib/pixel-homes/decoration-dimensions'

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

// Get all decorations from BETA_ITEMS
function getAllDecorations(): DecorationInfo[] {
  const decorations: DecorationInfo[] = []

  // Categories to skip (not actual SVG decorations)
  const skipCategories = ['atmosphere', 'templates', 'colors']

  for (const [category, items] of Object.entries(BETA_ITEMS)) {
    if (skipCategories.includes(category)) continue
    if (!Array.isArray(items)) continue

    for (const item of items) {
      // Skip items that don't have SVG components
      const itemType = (item as any).type as string
      if (!SVG_COMPONENT_MAP[itemType]) {
        continue
      }

      // Skip default/no items (they don't render anything)
      if ((item as any).id.startsWith('default_') ||
          (item as any).id.startsWith('no_') ||
          (item as any).isDefault) {
        continue
      }

      const variant = extractVariant((item as any).id)

      decorations.push({
        id: (item as any).id,
        name: (item as any).name,
        type: itemType,
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
