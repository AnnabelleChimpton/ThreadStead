import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import DecorationPalette from './DecorationPalette'
import { DecorationItem, BETA_ITEMS, TERRAIN_TILES } from '../../lib/pixel-homes/decoration-data'
import { HouseCustomizations, HouseTemplate, ColorPalette, AtmosphereSettings } from './HouseSVG'
import { useDecorationState } from '../../hooks/useDecorationState'
import useDecorationSnapping from '../../hooks/pixel-homes/useDecorationSnapping'
import { DEFAULT_DECORATION_GRID, getDecorationGridSize, pixelToGrid, isValidGridPosition } from '../../lib/pixel-homes/decoration-grid-utils'
import { getDecorationDimensions } from '../../lib/pixel-homes/decoration-dimensions'
import { PixelIcon } from '../ui/PixelIcon'
import useIsMobile, { useIsTouch } from '../../hooks/useIsMobile'
import { retroSFX } from '../../lib/audio/retro-sfx'

// Maximum number of decorations allowed per home
const MAX_DECORATIONS = 100

interface DecorationModeProps {
  template: HouseTemplate
  palette: ColorPalette
  username: string
  onSave: (data: any) => void
  onCancel: () => void
  initialDecorations?: DecorationItem[]
  initialHouseCustomizations?: HouseCustomizations
  initialAtmosphere?: AtmosphereSettings
  initialTerrain?: Record<string, string>
}

export default function DecorationMode({
  template: initialTemplate,
  palette: initialPalette,
  username,
  onSave,
  onCancel,
  initialDecorations = [],
  initialHouseCustomizations,
  initialAtmosphere,
  initialTerrain = {}
}: DecorationModeProps) {
  // Mobile detection
  const isMobile = useIsMobile(768)
  const isTouch = useIsTouch()

  // Normalize initial decorations to ensure text is available for editing
  const normalizedInitialDecorations = useMemo(() => {
    return initialDecorations.map(d => ({
      ...d,
      text: d.text || d.data?.text
    }))
  }, [initialDecorations])

  // Core State (using custom hook)
  const {
    decorations: placedDecorations,
    setDecorations: setPlacedDecorations,
    selectedDecorations,
    addDecoration,
    removeDecorations,
    updateDecoration,
    selectDecoration,
    clearSelection,
    undo,
    redo,
    canUndo,
    canRedo
  } = useDecorationState(normalizedInitialDecorations)

  // UI State
  const [availableDecorations, setAvailableDecorations] = useState<Record<string, DecorationItem[]>>({})
  const [decorationsLoading, setDecorationsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<DecorationItem | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<HouseTemplate>(initialTemplate)
  const [currentPalette, setCurrentPalette] = useState<ColorPalette>(initialPalette)

  // House & Atmosphere State
  const [atmosphere, setAtmosphere] = useState<AtmosphereSettings>(
    initialAtmosphere || {
      sky: 'sunny',
      weather: 'clear',
      timeOfDay: 'midday'
    }
  )
  const [houseCustomizations, setHouseCustomizations] = useState<HouseCustomizations>(
    initialHouseCustomizations || {
      windowStyle: 'default',
      doorStyle: 'default',
      roofTrim: 'default'
    }
  )

  // Terrain State
  const [terrain, setTerrain] = useState<Record<string, string>>(initialTerrain)
  // paintBrush: undefined = not in terrain mode, null = eraser mode, string = painting terrain
  const [paintBrush, setPaintBrush] = useState<string | null | undefined>(undefined)
  const [isPainting, setIsPainting] = useState(false)

  // Dragging State
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<DecorationItem | null>(null)
  const [draggedDecorationId, setDraggedDecorationId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 })

  // Grid system state
  const gridConfig = DEFAULT_DECORATION_GRID
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | undefined>()
  const [canvasScale, setCanvasScale] = useState(1)

  // Canvas dimensions (used for touch placement bounds)
  const CANVAS_WIDTH = 500
  const CANVAS_HEIGHT = 350

  // SFX State - persisted to localStorage
  const [sfxMuted, setSfxMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pixelHomeSfxMuted') === 'true'
    }
    return false
  })

  // Custom Asset State - 5 slots for user-uploaded pixel art
  interface CustomAssetSlot {
    slot: number
    url: string | null
  }
  const [customAssetSlots, setCustomAssetSlots] = useState<CustomAssetSlot[]>([
    { slot: 0, url: null },
    { slot: 1, url: null },
    { slot: 2, url: null },
    { slot: 3, url: null },
    { slot: 4, url: null }
  ])
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)

  // Sync SFX enabled state
  useEffect(() => {
    retroSFX.setEnabled(!sfxMuted)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pixelHomeSfxMuted', String(sfxMuted))
    }
  }, [sfxMuted])

  // Load custom asset slots
  useEffect(() => {
    const loadCustomAssets = async () => {
      try {
        const response = await fetch('/api/home/custom-asset')
        if (response.ok) {
          const data = await response.json()
          if (data.slots) {
            setCustomAssetSlots(data.slots)
          }
        }
      } catch (error) {
        console.error('Error loading custom assets:', error)
      }
    }
    loadCustomAssets()
  }, [])

  // Load available decorations
  useEffect(() => {
    const loadDecorations = async () => {
      try {
        const response = await fetch('/api/decorations/available')
        if (response.ok) {
          const data = await response.json()
          // Merge API data with local BETA_ITEMS to ensure new dev items appear
          const mergedDecorations = { ...data.decorations }

          // Helper to merge categories
          Object.keys(BETA_ITEMS).forEach(category => {
            if (category === 'house' || category === 'atmosphere') return // Skip these as they are handled differently

            const betaList = (BETA_ITEMS as any)[category] || []
            const apiList = mergedDecorations[category] || []

            // Add beta items that aren't in API data (deduplicate by ID)
            const uniqueBetaItems = betaList.filter((betaItem: DecorationItem) =>
              !apiList.some((apiItem: DecorationItem) => apiItem.id === betaItem.id)
            )

            mergedDecorations[category] = [...apiList, ...uniqueBetaItems]
          })

          setAvailableDecorations({
            ...mergedDecorations,
            colors: BETA_ITEMS.colors,
            house: BETA_ITEMS.house,
            atmosphere: BETA_ITEMS.atmosphere
          })
        } else {
          console.warn('Failed to load decorations from API, using fallback')
          setAvailableDecorations(BETA_ITEMS as unknown as Record<string, DecorationItem[]>)
        }
      } catch (error) {
        console.error('Error loading decorations:', error)
        setAvailableDecorations(BETA_ITEMS as unknown as Record<string, DecorationItem[]>)
      } finally {
        setDecorationsLoading(false)
      }
    }
    loadDecorations()
  }, [])

  // Snapping logic
  const {
    snapDecoration,
    updatePreview,
    clearPreview,
    isSnapping,
    toggleSnapping,
    previewPosition: snapPreview
  } = useDecorationSnapping({
    gridConfig,
    decorations: placedDecorations.filter(d => !['house_custom', 'house_color'].includes(d.type)) as any[],
    enableSnapping: true,
    enableSpacingSuggestions: false
  })

  // Custom asset upload handler - uploads to a specific slot
  const handleCustomSlotUpload = async (slot: number, file: File) => {
    // Validate file type
    if (!['image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Please upload a PNG, GIF, or WebP image')
      return
    }

    // Validate file size (100KB max)
    if (file.size > 100 * 1024) {
      alert('Image too large. Maximum size is 100KB')
      return
    }

    setUploadingSlot(slot)

    try {
      // Read file as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Validate dimensions using an Image element
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          if (img.width > 64 || img.height > 64) {
            reject(new Error('Image too large. Maximum dimensions are 64x64 pixels'))
          } else {
            resolve()
          }
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = dataUrl
      })

      // Upload to server with slot number
      const response = await fetch('/api/home/custom-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, imageDataUrl: dataUrl })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()
      if (data.slots) {
        setCustomAssetSlots(data.slots)
      }
      retroSFX.playSave()

    } catch (error) {
      console.error('Error uploading custom asset:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploadingSlot(null)
    }
  }

  // Delete custom asset from a specific slot
  const handleCustomSlotDelete = async (slot: number) => {
    if (!confirm('Remove this custom pixel art?')) return

    try {
      const response = await fetch('/api/home/custom-asset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.slots) {
          setCustomAssetSlots(data.slots)
        }
        // Also remove any placed custom decorations from this slot
        const customDecorationIds = placedDecorations
          .filter(d => d.type === 'custom' && d.slot === slot)
          .map(d => d.id)
        if (customDecorationIds.length > 0) {
          removeDecorations(new Set(customDecorationIds))
        }
      }
    } catch (error) {
      console.error('Error deleting custom asset:', error)
    }
  }

  // Merge custom asset slots into available decorations
  const decorationsWithCustom = useMemo(() => {
    // Create 5 custom decoration items (one per slot)
    const customDecorations: DecorationItem[] = customAssetSlots.map(slot => ({
      id: `custom_asset_${slot.slot}`,
      name: slot.url ? `My Art ${slot.slot + 1}` : `Slot ${slot.slot + 1}`,
      type: 'custom' as const,
      zone: 'front_yard' as const,
      customAssetUrl: slot.url || undefined,
      slot: slot.slot,
      isEmpty: !slot.url
    }))

    return {
      ...availableDecorations,
      custom: customDecorations
    }
  }, [availableDecorations, customAssetSlots])

  // Handlers
  const handleItemSelect = (item: DecorationItem | null) => {
    if (item) {
      // Exit terrain and delete modes when selecting a decoration item
      setPaintBrush(undefined)
      setIsDeleting(false)
    }

    if (!item) {
      setSelectedItem(null)
      setIsPlacing(false)
      return
    }

    // Special handling for non-placeable items
    if (item.type === 'sky') {
      const newSky = item.id === 'sunny_sky' ? 'sunny' :
        item.id === 'cloudy_sky' ? 'cloudy' :
          item.id === 'sunset_sky' ? 'sunset' :
            item.id === 'night_sky' ? 'night' : 'sunny'
      setAtmosphere((prev: AtmosphereSettings) => ({ ...prev, sky: newSky as AtmosphereSettings['sky'] }))
      return
    }

    if (item.type === 'house_template') {
      setCurrentTemplate(item.id as HouseTemplate)
      setHouseCustomizations({
        windowStyle: 'default',
        doorStyle: 'default',
        roofTrim: 'default'
      })
      setSelectedItem(item)
      setIsPlacing(false)
      return
    }

    if (item.type === 'house_color') {
      setSelectedItem(item)
      setIsPlacing(false)
      return
    }

    if (item.type === 'house_custom') {
      const customizationUpdate: Partial<HouseCustomizations> = {}

      // Windows
      if (item.id.includes('windows') || item.id === 'default_windows') {
        if (item.id === 'round_windows') customizationUpdate.windowStyle = 'round'
        else if (item.id === 'arched_windows') customizationUpdate.windowStyle = 'arched'
        else if (item.id === 'bay_windows') customizationUpdate.windowStyle = 'bay'
        else if (item.id === 'default_windows') customizationUpdate.windowStyle = 'default'
      }
      // Doors
      else if (item.id.includes('door') || item.id === 'default_door') {
        if (item.id === 'arched_door') customizationUpdate.doorStyle = 'arched'
        else if (item.id === 'double_door') customizationUpdate.doorStyle = 'double'
        else if (item.id === 'cottage_door') customizationUpdate.doorStyle = 'cottage'
        else if (item.id === 'default_door') customizationUpdate.doorStyle = 'default'
      }
      // Roof Trim
      else if (item.id.includes('trim') || item.id === 'default_trim') {
        if (item.id === 'ornate_trim') customizationUpdate.roofTrim = 'ornate'
        else if (item.id === 'scalloped_trim') customizationUpdate.roofTrim = 'scalloped'
        else if (item.id === 'gabled_trim') customizationUpdate.roofTrim = 'gabled'
        else if (item.id === 'default_trim') customizationUpdate.roofTrim = 'default'
      }
      // Window Treatments
      else if (item.id === 'shutters') customizationUpdate.windowTreatments = 'shutters'
      else if (item.id === 'flower_boxes') customizationUpdate.windowTreatments = 'flower_boxes'
      else if (item.id === 'awnings') customizationUpdate.windowTreatments = 'awnings'
      else if (item.id === 'default_treatments') customizationUpdate.windowTreatments = 'default'
      // Chimney
      else if (item.id === 'brick_chimney') customizationUpdate.chimneyStyle = 'brick'
      else if (item.id === 'stone_chimney') customizationUpdate.chimneyStyle = 'stone'
      else if (item.id === 'no_chimney') customizationUpdate.chimneyStyle = 'none'
      else if (item.id === 'default_chimney') customizationUpdate.chimneyStyle = 'default'
      // Welcome Mat
      else if (item.id === 'plain_mat') customizationUpdate.welcomeMat = 'plain'
      else if (item.id === 'floral_mat') customizationUpdate.welcomeMat = 'floral'
      else if (item.id === 'welcome_text_mat') customizationUpdate.welcomeMat = 'welcome_text'
      else if (item.id === 'custom_text_mat') customizationUpdate.welcomeMat = 'custom_text'
      else if (item.id === 'no_mat') customizationUpdate.welcomeMat = 'none'
      // House Number
      else if (item.id === 'classic_house_number') {
        customizationUpdate.houseNumberStyle = 'classic'
        if (!houseCustomizations.houseNumber) customizationUpdate.houseNumber = '42'
      }
      else if (item.id === 'modern_house_number') {
        customizationUpdate.houseNumberStyle = 'modern'
        if (!houseCustomizations.houseNumber) customizationUpdate.houseNumber = '42'
      }
      else if (item.id === 'rustic_house_number') {
        customizationUpdate.houseNumberStyle = 'rustic'
        if (!houseCustomizations.houseNumber) customizationUpdate.houseNumber = '42'
      }
      else if (item.id === 'no_house_number') {
        customizationUpdate.houseNumber = undefined
        customizationUpdate.houseNumberStyle = undefined
      }
      // Exterior Lights
      else if (item.id === 'lantern_lights') customizationUpdate.exteriorLights = 'lantern'
      else if (item.id === 'modern_lights') customizationUpdate.exteriorLights = 'modern'
      else if (item.id === 'string_exterior_lights') customizationUpdate.exteriorLights = 'string_lights'
      else if (item.id === 'no_exterior_lights') customizationUpdate.exteriorLights = 'none'

      setHouseCustomizations(prev => ({ ...prev, ...customizationUpdate }))
      setSelectedItem(item)
      setIsPlacing(false)
      retroSFX.playModeChange()
      return
    }

    // Standard placeable items
    if (selectedItem && selectedItem.id === item.id) {
      setSelectedItem(null)
      setIsPlacing(false)
    } else {
      setSelectedItem(item)
      setIsPlacing(true)
      setIsDeleting(false)
      clearSelection()
    }
  }

  const handleTerrainSelect = (terrainId: string | null) => {
    setPaintBrush(terrainId)
    // Clear other modes when entering terrain mode (painting or erasing)
    setSelectedItem(null)
    setIsPlacing(false)
    setIsDeleting(false)
    clearSelection()
  }

  const handleDecorationUpdate = (id: string, updates: Partial<DecorationItem>) => {
    updateDecoration(id, updates)
    // Also update selected item if it's the one being updated
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  const handleCanvasClick = (x: number, y: number, event: React.MouseEvent) => {
    if ((!isPlacing || !selectedItem) && !draggedItem) {
      setSelectedItem(null)
      setIsPlacing(false)
      clearSelection()
      return
    }

    const itemToPlace = draggedItem || selectedItem
    if (!itemToPlace || ['sky', 'house_custom', 'house_template', 'house_color'].includes(itemToPlace.type)) return

    // Calculate position with offset
    // If placing new item, center it (offset is half size)
    // If dragging, use the calculated dragOffset
    let finalX = x
    let finalY = y

    if (isPlacing && selectedItem) {
      // Center the item
      const size = getDecorationGridSize(selectedItem.type, selectedItem.id, selectedItem.size || 'medium')
      const pixelWidth = size.width * gridConfig.cellSize
      const pixelHeight = size.height * gridConfig.cellSize
      finalX = x - (pixelWidth / 2)
      finalY = y - (pixelHeight / 2)
    } else if (draggedItem) {
      finalX = x - dragOffset.x
      finalY = y - dragOffset.y
    }

    const snapResult = snapDecoration(
      finalX,
      finalY,
      itemToPlace.type as any,
      itemToPlace.id,
      itemToPlace.size || 'medium'
    )

    // Determine z-index layer based on type and Y position for depth sorting
    // Base layers separate categories:
    // Paths: 100000+ (Bottom)
    // Water: 200000+ (Middle)
    // Objects: 300000+ (Top)
    let baseLayer = 300000
    if (itemToPlace.type === 'path') baseLayer = 100000
    else if (itemToPlace.type === 'water') baseLayer = 200000

    // Calculate actual item height in pixels to sort by "feet" (bottom Y)
    const dimensions = getDecorationDimensions(itemToPlace.id, itemToPlace.type, itemToPlace.size || 'medium')
    const pixelHeight = dimensions.height

    // Add bottom Y position to base layer for Y-sorting (items lower on screen appear in front)
    // Multiply Y by 1000 to ensure it's the primary sort factor
    // Add X position as tie-breaker for decorations at same Y position
    const bottomY = Math.round(snapResult.position.pixelY + pixelHeight)
    const layer = baseLayer + (bottomY * 1000) + Math.round(snapResult.position.pixelX)

    const newDecoration: DecorationItem = {
      ...itemToPlace,
      id: draggedItem ? itemToPlace.id : `${itemToPlace.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: snapResult.position.pixelX,
        y: snapResult.position.pixelY,
        layer
      },
      variant: itemToPlace.variant || 'default',
      size: itemToPlace.size || 'medium'
    }

    if (draggedItem) {
      handleDecorationUpdate(draggedItem.id, { position: newDecoration.position })
      setDraggedItem(null)
      setIsDragging(false)
      retroSFX.playPlaceItem()
    } else {
      // Check decoration limit before adding
      if (placedDecorations.length >= MAX_DECORATIONS) {
        retroSFX.playError?.() // Play error sound if available
        return
      }
      addDecoration(newDecoration)
      retroSFX.playPlaceItem()
      // Don't clear selection or placement mode to allow rapid placement
      // But we do need to update the preview to the new mouse position immediately
      // which happens in onMouseMove
    }
  }

  const handleDecorationMouseDown = (decorationId: string, event: React.MouseEvent) => {
    if (isPlacing || isDeleting) return

    event.stopPropagation()
    const decoration = placedDecorations.find(d => d.id === decorationId)
    if (decoration) {
      setDraggedItem(decoration)
      setDraggedDecorationId(decorationId)
      setIsDragging(true)
      selectDecoration(decorationId)

      // Calculate offset from mouse to decoration top-left
      // We need to use the scaled coordinates from the canvas
      // Since we don't have the exact canvas scale here easily without ref,
      // we'll rely on the fact that handleMouseMove gives us normalized coordinates.
      // But for the initial grab, we need to know where the mouse is relative to the item *in grid space*.

      // We can't easily get normalized X/Y here without the canvas logic.
      // However, we can calculate it if we assume the mouse is at the position passed to onMouseMove.
      // A better approach: The canvas calls this handler. 
      // We should probably update EnhancedHouseCanvas to pass normalized X/Y to onDecorationMouseDown too.

      // For now, let's approximate or rely on the first mouse move to set it? 
      // No, that causes a jump.

      // Let's assume the click was valid and we can just use the current mouse position from state if available?
      // Or better: update EnhancedHouseCanvas to pass x,y to onDecorationMouseDown.

      // WORKAROUND: We'll calculate the offset in the first mouse move if we don't have it.
      // OR: We can just snap to the center of the item when dragging starts? No, that jumps.

      // Let's use the mousePosition state if it's fresh?
      if (mousePosition && decoration.position) {
        setDragOffset({
          x: mousePosition.x - decoration.position.x,
          y: mousePosition.y - decoration.position.y
        })
      } else {
        setDragOffset({ x: 0, y: 0 })
      }
    }
  }

  const handleCanvasMouseDown = (x: number, y: number, event: React.MouseEvent) => {
    // Check if we're in terrain mode (painting OR erasing)
    // paintBrush is a string when painting, null when erasing, undefined when not in terrain mode
    if (paintBrush !== undefined) {
      setIsPainting(true)
      const gridPos = pixelToGrid(x, y, DEFAULT_DECORATION_GRID)
      if (isValidGridPosition(gridPos.gridX, gridPos.gridY, { width: 1, height: 1 })) {
        const key = `${gridPos.gridX},${gridPos.gridY}`
        if (paintBrush === null) {
          // Eraser mode - remove the terrain tile
          setTerrain(prev => {
            const next = { ...prev }
            delete next[key]
            return next
          })
          retroSFX.playTerrainPaint()
        } else {
          // Paint mode - set the terrain tile
          setTerrain(prev => ({ ...prev, [key]: paintBrush }))
          retroSFX.playTerrainPaint()
        }
      }
      return
    }
  }

  const handleMouseMove = (x: number, y: number, event: React.MouseEvent) => {
    setMousePosition({ x, y })

    // Painting/Erasing Logic - paintBrush is string (paint), null (erase), or undefined (not in terrain mode)
    if (isPainting && paintBrush !== undefined) {
      const gridPos = pixelToGrid(x, y, DEFAULT_DECORATION_GRID)
      if (isValidGridPosition(gridPos.gridX, gridPos.gridY, { width: 1, height: 1 })) {
        const key = `${gridPos.gridX},${gridPos.gridY}`
        if (paintBrush === null) {
          // Eraser mode - remove the terrain tile if it exists
          if (terrain[key]) {
            setTerrain(prev => {
              const next = { ...prev }
              delete next[key]
              return next
            })
          }
        } else if (terrain[key] !== paintBrush) {
          // Paint mode - set the terrain tile
          setTerrain(prev => ({ ...prev, [key]: paintBrush }))
        }
      }
      return // Skip other logic if painting/erasing
    }

    let targetX = x
    let targetY = y

    if (isPlacing && selectedItem) {
      // Center the item
      const size = getDecorationGridSize(selectedItem.type, selectedItem.id, selectedItem.size || 'medium')
      const pixelWidth = size.width * gridConfig.cellSize
      const pixelHeight = size.height * gridConfig.cellSize
      targetX = x - (pixelWidth / 2)
      targetY = y - (pixelHeight / 2)

      updatePreview(targetX, targetY, selectedItem.type as any, selectedItem.id, selectedItem.size || 'medium')
    }

    if (isDragging && draggedItem) {
      // Apply drag offset
      targetX = x - dragOffset.x
      targetY = y - dragOffset.y

      updatePreview(targetX, targetY, draggedItem.type as any, draggedItem.id, draggedItem.size || 'medium')
    }
  }



  const handleSave = () => {
    retroSFX.playSave()

    // Map decorations to include data field with appropriate content
    const decorationsToSave = placedDecorations.map(d => {
      // For custom type decorations, include customAssetUrl and slot in data
      if (d.type === 'custom') {
        return {
          ...d,
          data: { customAssetUrl: d.customAssetUrl, slot: d.slot }
        }
      }
      // For text-based decorations, include text in data
      return {
        ...d,
        data: d.text ? { text: d.text } : d.data
      }
    })

    const payload = {
      decorations: decorationsToSave,
      houseCustomizations,
      atmosphere,
      template: currentTemplate,
      palette: currentPalette,
      terrain
    }

    onSave(payload)
  }

  // Global mouse up to stop painting/dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPainting(false)
      if (isDragging) {
        // ... existing drag end logic if needed, but drag end is usually handled by click/drop
        // Actually, drag end is handled by handleCanvasClick for placement, but if we drag off canvas?
        // For now just stop painting.
      }
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging])

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 bg-white flex flex-col"
      style={{ top: 'var(--nav-height, 64px)' }}
    >
      {/* Header */}
      <div className="h-14 border-b border-thread-sage/30 flex items-center justify-between px-4 bg-thread-paper shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-headline font-bold text-lg text-thread-pine">Decorate Home</span>
          <span className={`text-sm px-2 py-0.5 rounded ${
            placedDecorations.length >= MAX_DECORATIONS
              ? 'bg-thread-sunset/20 text-thread-sunset'
              : 'bg-thread-sage/20 text-thread-sage'
          }`}>
            {placedDecorations.length}/{MAX_DECORATIONS}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (canUndo) {
                undo()
                retroSFX.playUndo()
              }
            }}
            disabled={!canUndo}
            className={`p-2 rounded hover:bg-thread-cream ${!canUndo ? 'opacity-30' : ''}`}
          >
            <PixelIcon name="arrow-left" className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (canRedo) {
                redo()
                retroSFX.playRedo()
              }
            }}
            disabled={!canRedo}
            className={`p-2 rounded hover:bg-thread-cream ${!canRedo ? 'opacity-30' : ''}`}
          >
            <PixelIcon name="arrow-right" className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSfxMuted(!sfxMuted)}
            className={`p-2 rounded hover:bg-thread-cream flex items-center gap-1 ${sfxMuted ? 'text-thread-sage/50' : 'text-thread-pine'}`}
            title={sfxMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            <PixelIcon name="speaker" className="w-5 h-5" />
            {sfxMuted && <span className="text-xs line-through">SFX</span>}
          </button>
          <div className="w-px h-6 bg-thread-sage/40 mx-1" />
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm font-medium text-thread-sage hover:bg-thread-cream rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm font-medium bg-thread-pine text-white hover:bg-thread-pine/90 rounded shadow-cozy"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 bg-thread-cream/50 overflow-hidden flex flex-col relative">
          {/* Toolbar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
              {/* Tools like Grid Toggle could go here */}
              <button
                className={`p-2 rounded shadow-sm border ${isDeleting ? 'bg-thread-sunset/10 border-thread-sunset/50 text-thread-sunset' : 'bg-thread-paper border-thread-sage/50 hover:bg-thread-cream'}`}
                onClick={() => {
                  setIsDeleting(!isDeleting)
                  setIsPlacing(false)
                  setSelectedItem(null)
                  retroSFX.playModeChange()
                }}
              >
                <PixelIcon name="trash" className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Indicators */}
            <div className="flex gap-2 pointer-events-auto">
              {/* Delete Mode Indicator */}
              {isDeleting && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-2 border-red-300 rounded-lg shadow-sm">
                  <PixelIcon name="trash" size={18} className="text-red-500" />
                  <span className="text-sm font-medium text-red-700">Delete Mode</span>
                  <button
                    onClick={() => setIsDeleting(false)}
                    className="ml-1 p-0.5 hover:bg-red-100 rounded"
                    title="Exit delete mode"
                  >
                    <PixelIcon name="close" size={14} className="text-red-400" />
                  </button>
                </div>
              )}

              {/* Terrain Mode Indicator */}
              {paintBrush !== undefined && (
                <>
                  {paintBrush === null ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                      <PixelIcon name="trash" size={18} className="text-orange-500" />
                      <span className="text-sm font-medium text-orange-700">Terrain Eraser</span>
                      <button
                        onClick={() => setPaintBrush(undefined)}
                        className="ml-1 p-0.5 hover:bg-orange-100 rounded"
                        title="Exit terrain mode"
                      >
                        <PixelIcon name="close" size={14} className="text-orange-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-thread-sky/20 border-2 border-thread-sky rounded-lg shadow-sm">
                      <div
                        className="w-5 h-5 rounded border-2 border-thread-sky shadow-inner"
                        style={{ backgroundColor: TERRAIN_TILES.find(t => t.id === paintBrush)?.color || '#ccc' }}
                      />
                      <span className="text-sm font-medium text-thread-pine">
                        {TERRAIN_TILES.find(t => t.id === paintBrush)?.name || 'Terrain'}
                      </span>
                      <button
                        onClick={() => setPaintBrush(undefined)}
                        className="ml-1 p-0.5 hover:bg-thread-sky/30 rounded"
                        title="Exit terrain mode"
                      >
                        <PixelIcon name="close" size={14} className="text-thread-sky" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center p-4 overflow-auto">
            <EnhancedHouseCanvas
              template={currentTemplate}
              palette={currentPalette}
              decorations={placedDecorations}
              houseCustomizations={houseCustomizations}
              atmosphere={atmosphere}
              terrain={terrain}
              isDecorationMode={true}
              isPlacing={isPlacing}
              isDeleting={isDeleting}
              previewPosition={snapPreview ? { x: snapPreview.position.pixelX, y: snapPreview.position.pixelY } : null}
              previewItem={selectedItem || draggedItem}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onDecorationClick={(id, e) => {
                if (isPlacing) return
                e.stopPropagation()
                if (isDeleting) {
                  removeDecorations(new Set([id]))
                  retroSFX.playRemoveItem()
                } else {
                  selectDecoration(id)
                  retroSFX.playSelectItem()
                  // Also set as selected item for palette editing (e.g. sign text)
                  const clickedDecoration = placedDecorations.find(d => d.id === id)
                  if (clickedDecoration) {
                    setSelectedItem(clickedDecoration)
                  }
                }
              }}
              onDecorationMouseDown={handleDecorationMouseDown}
              selectedDecorations={selectedDecorations}
              onScaleChange={setCanvasScale}
            />


          </div>
        </div>

        {/* Sidebar / Palette */}
        <div className="w-[500px] border-l border-thread-sage/30 bg-thread-paper flex flex-col shrink-0">
          <DecorationPalette
            items={decorationsWithCustom}
            onItemSelect={handleItemSelect}
            selectedItem={selectedItem}
            houseCustomizations={houseCustomizations}
            onHouseCustomizationChange={(updates) => setHouseCustomizations(prev => ({ ...prev, ...updates }))}
            onThemeChange={(template, palette) => {
              setCurrentTemplate(template)
              setCurrentPalette(palette)
            }}
            currentTemplate={currentTemplate}
            currentPalette={currentPalette}
            onDecorationUpdate={handleDecorationUpdate}
            onTerrainSelect={handleTerrainSelect}
            selectedTerrainId={paintBrush}
            onCustomSlotUpload={handleCustomSlotUpload}
            onCustomSlotDelete={handleCustomSlotDelete}
            uploadingSlot={uploadingSlot}
          />
        </div>
      </div>
    </div>
  )
}
