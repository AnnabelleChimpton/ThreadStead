import React, { useState, useEffect, useMemo } from 'react'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import DecorationPalette from './DecorationPalette'
import { DecorationItem, BETA_ITEMS } from '../../lib/pixel-homes/decoration-data'
import { HouseCustomizations, HouseTemplate, ColorPalette, AtmosphereSettings } from './HouseSVG'
import { useDecorationState } from '../../hooks/useDecorationState'
import useDecorationSnapping from '../../hooks/pixel-homes/useDecorationSnapping'
import { DEFAULT_DECORATION_GRID, getDecorationGridSize, pixelToGrid, isValidGridPosition } from '../../lib/pixel-homes/decoration-grid-utils'
import { PixelIcon } from '../ui/PixelIcon'
import useIsMobile, { useIsTouch } from '../../hooks/useIsMobile'

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
  const [paintBrush, setPaintBrush] = useState<string | null>(null)
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
            colors: BETA_ITEMS.colors
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

  // Handlers
  const handleItemSelect = (item: DecorationItem | null) => {
    if (item) {
      setPaintBrush(null)
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
      if (item.id.includes('windows') || item.id === 'default_windows') {
        if (item.id === 'round_windows') customizationUpdate.windowStyle = 'round'
        else if (item.id === 'arched_windows') customizationUpdate.windowStyle = 'arched'
        else if (item.id === 'bay_windows') customizationUpdate.windowStyle = 'bay'
        else if (item.id === 'default_windows') customizationUpdate.windowStyle = 'default'
      } else if (item.id.includes('door') || item.id === 'default_door') {
        if (item.id === 'arched_door') customizationUpdate.doorStyle = 'arched'
        else if (item.id === 'double_door') customizationUpdate.doorStyle = 'double'
        else if (item.id === 'cottage_door') customizationUpdate.doorStyle = 'cottage'
        else if (item.id === 'default_door') customizationUpdate.doorStyle = 'default'
      } else if (item.id.includes('trim') || item.id === 'default_trim') {
        if (item.id === 'ornate_trim') customizationUpdate.roofTrim = 'ornate'
        else if (item.id === 'scalloped_trim') customizationUpdate.roofTrim = 'scalloped'
        else if (item.id === 'gabled_trim') customizationUpdate.roofTrim = 'gabled'
        else if (item.id === 'default_trim') customizationUpdate.roofTrim = 'default'
      }
      setHouseCustomizations(prev => ({ ...prev, ...customizationUpdate }))
      setSelectedItem(item)
      setIsPlacing(false)
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
    if (terrainId) {
      setSelectedItem(null)
      setIsPlacing(false)
      clearSelection()
    }
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
    // Paths: 1000+ (Bottom)
    // Water: 2000+ (Middle)
    // Objects: 3000+ (Top)
    let baseLayer = 3000
    if (itemToPlace.type === 'path') baseLayer = 1000
    else if (itemToPlace.type === 'water') baseLayer = 2000

    // Calculate item height in pixels to sort by "feet" (bottom Y)
    const size = getDecorationGridSize(itemToPlace.type, itemToPlace.id, itemToPlace.size || 'medium')
    const pixelHeight = size.height * gridConfig.cellSize

    // Add bottom Y position to base layer for Y-sorting (items lower on screen appear in front)
    const layer = baseLayer + Math.round(snapResult.position.pixelY + pixelHeight)

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
    } else {
      addDecoration(newDecoration)
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
    if (paintBrush) {
      setIsPainting(true)
      const gridPos = pixelToGrid(x, y, DEFAULT_DECORATION_GRID)
      if (isValidGridPosition(gridPos.gridX, gridPos.gridY, { width: 1, height: 1 })) {
        const key = `${gridPos.gridX},${gridPos.gridY}`
        setTerrain(prev => ({ ...prev, [key]: paintBrush }))
      }
      return
    }
  }

  const handleMouseMove = (x: number, y: number, event: React.MouseEvent) => {
    setMousePosition({ x, y })

    // Painting Logic
    if (isPainting && paintBrush) {
      const gridPos = pixelToGrid(x, y, DEFAULT_DECORATION_GRID)
      if (isValidGridPosition(gridPos.gridX, gridPos.gridY, { width: 1, height: 1 })) {
        const key = `${gridPos.gridX},${gridPos.gridY}`
        if (terrain[key] !== paintBrush) {
          setTerrain(prev => ({ ...prev, [key]: paintBrush }))
        }
      }
      return // Skip other logic if painting
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
    // Map decorations to include data field if text exists
    const decorationsToSave = placedDecorations.map(d => ({
      ...d,
      data: d.text ? { text: d.text } : d.data
    }))

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
      <div className="h-14 border-b flex items-center justify-between px-4 bg-white shrink-0">
        <div className="font-bold text-lg">Decorate Home</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (canUndo) undo()
            }}
            disabled={!canUndo}
            className={`p-2 rounded hover:bg-gray-100 ${!canUndo ? 'opacity-30' : ''}`}
          >
            <PixelIcon name="arrow-left" className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (canRedo) redo()
            }}
            disabled={!canRedo}
            className={`p-2 rounded hover:bg-gray-100 ${!canRedo ? 'opacity-30' : ''}`}
          >
            <PixelIcon name="arrow-right" className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 overflow-hidden flex flex-col relative">
          {/* Toolbar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
              {/* Tools like Grid Toggle could go here */}
              <button
                className={`p-2 rounded bg-white shadow-sm border ${isDeleting ? 'bg-red-50 border-red-200 text-red-600' : 'hover:bg-gray-50'}`}
                onClick={() => {
                  setIsDeleting(!isDeleting)
                  setIsPlacing(false)
                  setSelectedItem(null)
                }}
              >
                <PixelIcon name="trash" className="w-5 h-5" />
              </button>
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
                } else {
                  selectDecoration(id)
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
        <div className="w-[500px] border-l bg-white flex flex-col shrink-0">
          <DecorationPalette
            items={availableDecorations}
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
          />
        </div>
      </div>
    </div>
  )
}
