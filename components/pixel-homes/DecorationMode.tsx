import React, { useState, useEffect, useMemo, useRef } from 'react'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import DecorationSVG from './DecorationSVG'

import DecorationPalette from './DecorationPalette'
import DecorationGridOverlay, { MagneticGridOverlay } from './DecorationGridOverlay'
import AnimatedDecoration, { DeletionAnimation, ActionFeedback } from './DecorationAnimations'
import useIsMobile, { useIsTouch } from '../../hooks/useIsMobile'
import useDecorationSnapping from '../../hooks/pixel-homes/useDecorationSnapping'
import { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import { DEFAULT_DECORATION_GRID, DecorationGridConfig } from '@/lib/pixel-homes/decoration-grid-utils'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { DecorationItem, BETA_ITEMS, PALETTE_COLORS } from '@/lib/pixel-homes/decoration-data'
import { useDecorationState } from '@/hooks/useDecorationState'

interface AtmosphereSettings {
  sky: 'sunny' | 'cloudy' | 'sunset' | 'night'
  weather: 'clear' | 'light_rain' | 'light_snow'
  timeOfDay: 'morning' | 'midday' | 'evening' | 'night'
}

interface DecorationModeProps {
  template: HouseTemplate
  palette: ColorPalette
  username: string
  onSave: (decorations: any) => void
  onCancel: () => void
  initialDecorations?: DecorationItem[]
  initialHouseCustomizations?: HouseCustomizations
  initialAtmosphere?: AtmosphereSettings
}

export default function DecorationMode({
  template: initialTemplate,
  palette: initialPalette,
  username,
  onSave,
  onCancel,
  initialDecorations = [],
  initialHouseCustomizations,
  initialAtmosphere
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

  // Dragging State
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<DecorationItem | null>(null)
  const [draggedDecorationId, setDraggedDecorationId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 })

  // Grid system state
  const [gridConfig, setGridConfig] = useState<DecorationGridConfig>(DEFAULT_DECORATION_GRID)
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
    enableSnapping: false,
    enableSpacingSuggestions: false
  })

  // Handlers
  const handleItemSelect = (item: DecorationItem | null) => {
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
      setAtmosphere(prev => ({ ...prev, sky: newSky }))
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

    // Coordinates are now passed in normalized form from EnhancedHouseCanvas

    const itemToPlace = draggedItem || selectedItem
    if (!itemToPlace || ['sky', 'house_custom', 'house_template', 'house_color'].includes(itemToPlace.type)) return

    const snapResult = snapDecoration(
      x,
      y,
      itemToPlace.type as any,
      itemToPlace.id,
      itemToPlace.size || 'medium'
    )

    const newDecoration: DecorationItem = {
      ...itemToPlace,
      id: `${itemToPlace.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: snapResult.position.pixelX,
        y: snapResult.position.pixelY
      },
      variant: itemToPlace.variant || 'default',
      size: itemToPlace.size || 'medium'
    }

    addDecoration(newDecoration)
    clearPreview()

    // Auto-select sign post for immediate editing
    if (itemToPlace.id === 'sign_post') {
      setSelectedItem(newDecoration)
      setIsPlacing(false)
    }

    if (draggedItem) {
      setDraggedItem(null)
      setIsDragging(false)
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
      // We need to use the scaled coordinates
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      // This logic needs to be consistent with EnhancedHouseCanvas scaling
      // But since we receive normalized coordinates in onMouseMove, we should probably rely on that
      // For now, let's just set a simple offset or improve this later
      setDragOffset({ x: 0, y: 0 })
    }
  }

  const handleMouseMove = (x: number, y: number, event: React.MouseEvent) => {
    setMousePosition({ x, y })

    if (isPlacing && selectedItem) {
      updatePreview(x, y, selectedItem.type as any, selectedItem.id, selectedItem.size || 'medium')
    }

    if (isDragging && draggedItem) {
      // Move logic would go here
      // For now, we just update the preview to show where it would drop
      updatePreview(x, y, draggedItem.type as any, draggedItem.id, draggedItem.size || 'medium')
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
      palette: currentPalette
    }

    onSave(payload)
  }

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
              isDecorationMode={true}
              isPlacing={isPlacing}
              previewPosition={snapPreview ? { x: snapPreview.position.pixelX, y: snapPreview.position.pixelY } : null}
              previewItem={selectedItem || draggedItem}
              onClick={handleCanvasClick}
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
          />
        </div>
      </div>
    </div>
  )
}
