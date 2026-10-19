import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import DecorationPalette from './DecorationPalette'
import { DecorationItem, TERRAIN_TILES } from '../../lib/pixel-homes/decoration-data'

// House color picker items - these are UI triggers for the color picker, not actual decorations
// Kept as constants since they don't need to be managed via admin
const HOUSE_COLOR_ITEMS: DecorationItem[] = [
  { id: 'wall_color', name: 'Wall Color', type: 'house_color', zone: 'house_facade', color: '#F5E9D4' },
  { id: 'roof_color', name: 'Roof Color', type: 'house_color', zone: 'house_facade', color: '#A18463' },
  { id: 'trim_color', name: 'Trim Color', type: 'house_color', zone: 'house_facade', color: '#2E4B3F' },
  { id: 'window_color', name: 'Window Color', type: 'house_color', zone: 'house_facade', color: '#8EC5E8' },
  { id: 'detail_color', name: 'Detail Color', type: 'house_color', zone: 'house_facade', color: '#4FAF6D' }
]
import { HouseCustomizations, HouseTemplate, ColorPalette, AtmosphereSettings } from './HouseSVG'
import { useEditorDoc } from '../../hooks/pixel-homes/useEditorDoc'
import useDecorationSnapping from '../../hooks/pixel-homes/useDecorationSnapping'
import { DEFAULT_DECORATION_GRID, getDecorationGridSize, pixelToGrid, isValidGridPosition } from '../../lib/pixel-homes/decoration-grid-utils'
import { getDecorationDimensions } from '../../lib/pixel-homes/decoration-dimensions'
import { PixelIcon } from '../ui/PixelIcon'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import useIsMobile, { useIsTouch } from '../../hooks/useIsMobile'
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard'
import { retroSFX } from '../../lib/audio/retro-sfx'
import { MAX_DECORATIONS } from '../../lib/pixel-homes/decoration-save-rules'
import { docFromProps, newPlacement, toSavePayload, type SavePayload } from '../../lib/pixel-homes/editor-doc'

/** Screen pixels the pointer must travel before pressing a decoration becomes a drag. */
const DRAG_THRESHOLD_PX = 4

interface DecorationModeProps {
  template: HouseTemplate
  palette: ColorPalette
  username: string
  /** Sends the save API's body; resolves true once saved, and the editor then calls onExit. */
  onSave: (payload: SavePayload) => Promise<boolean>
  /** Leave the editor (after Cancel, or after a save). */
  onExit: () => void
  initialDecorations?: DecorationItem[]
  initialHouseCustomizations?: HouseCustomizations
  initialAtmosphere?: AtmosphereSettings
  initialTerrain?: Record<string, string>
  isSaving?: boolean
}

export default function DecorationMode({
  template: initialTemplate,
  palette: initialPalette,
  username,
  onSave,
  onExit,
  initialDecorations = [],
  initialHouseCustomizations,
  initialAtmosphere,
  initialTerrain = {},
  isSaving = false
}: DecorationModeProps) {
  const appToast = useToast()
  const confirm = useConfirm()

  // Mobile detection
  const isMobile = useIsMobile(768)
  const isTouch = useIsTouch()

  // The home being edited: one document with full undo (lib/pixel-homes/editor-doc.ts)
  const [initialDoc] = useState(() => docFromProps({
    template: initialTemplate,
    palette: initialPalette,
    decorations: initialDecorations,
    house: initialHouseCustomizations,
    atmosphere: initialAtmosphere,
    terrain: initialTerrain
  }))
  const { doc, dispatch, canUndo, canRedo, isDirty, presentKey } = useEditorDoc(initialDoc)
  const {
    decorations: placedDecorations,
    house: houseCustomizations,
    atmosphere,
    terrain,
    template: currentTemplate,
    palette: currentPalette
  } = doc
  const presentKeyRef = useRef(presentKey)
  presentKeyRef.current = presentKey
  const { confirmLeave, allowLeave } = useUnsavedChangesGuard(isDirty)

  const undo = useCallback(() => dispatch({ type: 'undo' }), [dispatch])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [dispatch])

  // Selection is not part of the document; ids that undo removed drop out
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const selectedDecorations = useMemo(() => {
    const present = new Set(placedDecorations.map(d => d.id))
    const kept = [...selectedIds].filter(id => present.has(id))
    return kept.length === selectedIds.size ? selectedIds : new Set(kept)
  }, [selectedIds, placedDecorations])
  const selectDecoration = (id: string) => setSelectedIds(new Set([id]))
  const clearSelection = useCallback(() => setSelectedIds(prev => (prev.size === 0 ? prev : new Set())), [])
  const removeDecorations = useCallback((ids: Set<string>) => {
    dispatch({ type: 'remove', ids })
    clearSelection()
  }, [dispatch, clearSelection])

  // UI State
  const [availableDecorations, setAvailableDecorations] = useState<Record<string, DecorationItem[]>>({})
  const [decorationsLoading, setDecorationsLoading] = useState(true)
  const [selectedItemState, setSelectedItem] = useState<DecorationItem | null>(null)
  // A placed decoration shown in the palette (sign text) follows the document, undo included
  const selectedItem = useMemo(
    () => (selectedItemState && placedDecorations.find(d => d.id === selectedItemState.id)) || selectedItemState,
    [selectedItemState, placedDecorations]
  )
  const [isPlacing, setIsPlacing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // paintBrush: undefined = not in terrain mode, null = eraser mode, string = painting terrain
  const [paintBrush, setPaintBrush] = useState<string | null | undefined>(undefined)
  const [isPainting, setIsPainting] = useState(false)

  // Dragging State
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<DecorationItem | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  // A press on a placed decoration. It only becomes a drag once the pointer
  // moves past DRAG_THRESHOLD_PX; a press and release in place just selects.
  const pressRef = useRef<{ id: string, start?: { x: number, y: number } } | null>(null)
  // Last pointer position over the canvas, in canvas units; null once it leaves
  const pointerRef = useRef<{ x: number, y: number } | null>(null)
  // The click that follows a drop must not also place or deselect
  const suppressClickRef = useRef(false)

  // Grid system state
  const gridConfig = DEFAULT_DECORATION_GRID
  const [canvasScale, setCanvasScale] = useState(1)

  // Canvas dimensions (used for touch placement bounds) - grid-aligned
  const CANVAS_WIDTH = 512
  const CANVAS_HEIGHT = 352

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd+Z - Undo
      if (modKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        if (canUndo) {
          undo()
          retroSFX.playUndo()
        }
        return
      }

      // Ctrl/Cmd+Shift+Z - Redo
      if (modKey && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        if (canRedo) {
          redo()
          retroSFX.playRedo()
        }
        return
      }

      // Delete/Backspace - Remove selected decoration(s)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDecorations.size > 0) {
        e.preventDefault()
        removeDecorations(selectedDecorations)
        retroSFX.playRemoveItem()
        return
      }

      // Escape - Exit current mode / clear selection
      if (e.key === 'Escape') {
        e.preventDefault()
        pressRef.current = null
        if (isDragging) {
          // The ghost hides with draggedItem; the next move refreshes the preview
          setDraggedItem(null)
          setIsDragging(false)
        }
        if (selectedDecorations.size > 0) {
          clearSelection()
        }
        if (isPlacing) {
          setIsPlacing(false)
          setSelectedItem(null)
        }
        if (isDeleting) {
          setIsDeleting(false)
        }
        if (paintBrush !== undefined) {
          setPaintBrush(undefined)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, undo, redo, selectedDecorations, removeDecorations, clearSelection, isPlacing, isDeleting, paintBrush, isDragging])

  // Load custom asset slots
  useEffect(() => {
    let cancelled = false
    const loadCustomAssets = async () => {
      try {
        const response = await fetch('/api/home/custom-asset')
        if (response.ok) {
          const data = await response.json()
          if (data.slots && !cancelled) {
            setCustomAssetSlots(data.slots)
          }
        }
      } catch (error) {
        if (!cancelled) console.error('Error loading custom assets:', error)
      }
    }
    loadCustomAssets()
    return () => {
      cancelled = true
    }
  }, [])

  // Load available decorations from database
  useEffect(() => {
    const loadDecorations = async () => {
      try {
        const response = await fetch('/api/decorations/available')
        if (response.ok) {
          const data = await response.json()
          // Use API data directly - database is the source of truth
          // Only add colors since they're UI triggers for the color picker
          setAvailableDecorations({
            ...data.decorations,
            colors: HOUSE_COLOR_ITEMS
          })
        } else {
          console.warn('Failed to load decorations from API')
          // Fallback to just colors - decorations require the database
          setAvailableDecorations({
            colors: HOUSE_COLOR_ITEMS
          })
        }
      } catch (error) {
        console.error('Error loading decorations:', error)
        // Fallback to just colors on error
        setAvailableDecorations({
          colors: HOUSE_COLOR_ITEMS
        })
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
      appToast.showWarning('Please upload a PNG, GIF, or WebP image')
      return
    }

    // Validate file size (100KB max)
    if (file.size > 100 * 1024) {
      appToast.showWarning('Image too large. Maximum size is 100KB')
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
      appToast.showError(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploadingSlot(null)
    }
  }

  // Delete custom asset from a specific slot
  const handleCustomSlotDelete = async (slot: number) => {
    if (!(await confirm({ title: 'Remove this custom pixel art?', confirmText: 'Remove', variant: 'danger' }))) return

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
      dispatch({ type: 'setAtmosphere', changes: { sky: newSky as AtmosphereSettings['sky'] } })
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

      dispatch({ type: 'setHouse', changes: customizationUpdate })
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

  // Typing in a decoration's field (sign text) is one undo step
  const handleDecorationUpdate = (id: string, updates: Partial<DecorationItem>) => {
    dispatch({ type: 'updateDecoration', id, changes: updates, mergeKey: `decoration:${id}:${Object.keys(updates).sort().join()}` })
  }

  // Typing a house's text or dragging a colour is one undo step; a reset or a style pick is its own
  const handleHouseChange = (updates: Partial<HouseCustomizations>) => {
    const values = Object.values(updates)
    const mergeKey = values.length > 0 && values.every(v => typeof v === 'string')
      ? `house:${Object.keys(updates).sort().join()}`
      : undefined
    dispatch({ type: 'setHouse', changes: updates, mergeKey })
  }

  // Where an item lands for a given top-left: snapped, with its depth layer
  const placementFor = (item: DecorationItem, x: number, y: number) => {
    const snapResult = snapDecoration(x, y, item.type as any, item.id, item.size || 'medium')

    // Determine z-index layer based on type and Y position for depth sorting
    // Base layers separate categories:
    // Paths: 100000+ (Bottom)
    // Water: 200000+ (Middle)
    // Objects: 300000+ (Top)
    let baseLayer = 300000
    if (item.type === 'path') baseLayer = 100000
    else if (item.type === 'water') baseLayer = 200000

    // Calculate actual item height in pixels to sort by "feet" (bottom Y)
    const dimensions = getDecorationDimensions(item.id, item.type, item.size || 'medium')

    // Add bottom Y position to base layer for Y-sorting (items lower on screen appear in front)
    // Multiply Y by 1000 to ensure it's the primary sort factor
    // Add X position as tie-breaker for decorations at same Y position
    const bottomY = Math.round(snapResult.position.pixelY + dimensions.height)
    const layer = baseLayer + (bottomY * 1000) + Math.round(snapResult.position.pixelX)

    return { x: snapResult.position.pixelX, y: snapResult.position.pixelY, layer }
  }

  const handleCanvasClick = (x: number, y: number, event: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    if (!isPlacing || !selectedItem) {
      setSelectedItem(null)
      setIsPlacing(false)
      clearSelection()
      return
    }

    if (['sky', 'house_custom', 'house_template', 'house_color'].includes(selectedItem.type)) return

    // Check decoration limit before adding
    if (placedDecorations.length >= MAX_DECORATIONS) {
      appToast.showWarning(`Decoration limit reached (${MAX_DECORATIONS} max)`)
      retroSFX.playError()
      return
    }

    // Center the new item on the cursor
    const size = getDecorationGridSize(selectedItem.type, selectedItem.id, selectedItem.size || 'medium')
    const position = placementFor(
      selectedItem,
      x - (size.width * gridConfig.cellSize) / 2,
      y - (size.height * gridConfig.cellSize) / 2
    )

    dispatch({ type: 'place', decoration: newPlacement(selectedItem, position) })
    retroSFX.playPlaceItem()
    // Don't clear selection or placement mode to allow rapid placement
  }

  // Pressing a placed decoration only notes the press. Selecting happens on
  // click; a drag starts in handleMouseMove once the pointer has moved.
  const handleDecorationMouseDown = (decorationId: string, event: React.MouseEvent) => {
    if (isPlacing || isDeleting || paintBrush !== undefined || event.button !== 0) return
    // No native image drag or text selection while moving a sprite. The event
    // still bubbles to the canvas, whose handler records where the press was.
    event.preventDefault()
    pressRef.current = { id: decorationId }
  }

  const endDrag = () => {
    setDraggedItem(null)
    setIsDragging(false)
    clearPreview()
  }

  // Window mouseup: ends painting and any press or drag, wherever the pointer is
  const handleGlobalMouseUp = () => {
    setIsPainting(false)
    dispatch({ type: 'endStroke' }) // a whole stroke is one undo step
    pressRef.current = null
    if (!isDragging || !draggedItem) return

    const pointer = pointerRef.current
    if (pointer) {
      dispatch({
        type: 'move',
        id: draggedItem.id,
        position: placementFor(draggedItem, pointer.x - dragOffset.x, pointer.y - dragOffset.y)
      })
      retroSFX.playPlaceItem()
    }
    // Released outside the canvas: the decoration stays where it was
    endDrag()
    suppressClickRef.current = true
    // The click (if any) is dispatched straight after this mouseup
    setTimeout(() => { suppressClickRef.current = false }, 0)
  }
  const globalMouseUpRef = useRef(handleGlobalMouseUp)
  globalMouseUpRef.current = handleGlobalMouseUp

  // Minimum grid Y for terrain painting (front yard starts at y=96, so gridY >= 6)
  const TERRAIN_MIN_GRID_Y = 6

  const handleCanvasMouseDown = (x: number, y: number, event: React.MouseEvent) => {
    // Bubbled up from handleDecorationMouseDown: note the grab point
    const press = pressRef.current
    if (press && !press.start) {
      const decoration = placedDecorations.find(d => d.id === press.id)
      press.start = { x, y }
      setDragOffset({
        x: x - (decoration?.position?.x ?? x),
        y: y - (decoration?.position?.y ?? y)
      })
      return
    }

    // Check if we're in terrain mode (painting OR erasing)
    // paintBrush is a string when painting, null when erasing, undefined when not in terrain mode
    if (paintBrush !== undefined) {
      setIsPainting(true)
      dispatch({ type: 'beginStroke' })
      const gridPos = pixelToGrid(x, y, DEFAULT_DECORATION_GRID)
      // Only allow terrain in front yard zone (gridY >= 6, i.e. y >= 96px)
      if (isValidGridPosition(gridPos.gridX, gridPos.gridY, { width: 1, height: 1 }) && gridPos.gridY >= TERRAIN_MIN_GRID_Y) {
        // paintBrush null is the eraser
        dispatch({ type: 'paintCell', key: `${gridPos.gridX},${gridPos.gridY}`, tile: paintBrush })
        retroSFX.playTerrainPaint()
      }
      return
    }
  }

  const handleMouseMove = (x: number, y: number, event: React.MouseEvent) => {
    pointerRef.current = { x, y }

    // A press turns into a drag once the pointer has really moved
    const press = pressRef.current
    if (press?.start && !isDragging) {
      const moved = Math.hypot(x - press.start.x, y - press.start.y) * canvasScale
      if (moved < DRAG_THRESHOLD_PX) return
      const decoration = placedDecorations.find(d => d.id === press.id)
      if (!decoration) {
        pressRef.current = null
        return
      }
      setDraggedItem(decoration)
      setIsDragging(true)
      clearSelection() // Don't highlight while dragging; the ghost shows intent
      updatePreview(x - dragOffset.x, y - dragOffset.y, decoration.type as any, decoration.id, decoration.size || 'medium')
      return
    }

    // Painting/Erasing Logic - paintBrush is string (paint), null (erase), or undefined (not in terrain mode)
    if (isPainting && paintBrush !== undefined) {
      const gridPos = pixelToGrid(x, y, DEFAULT_DECORATION_GRID)
      // Only allow terrain in front yard zone (gridY >= 6, i.e. y >= 96px)
      if (isValidGridPosition(gridPos.gridX, gridPos.gridY, { width: 1, height: 1 }) && gridPos.gridY >= TERRAIN_MIN_GRID_Y) {
        dispatch({ type: 'paintCell', key: `${gridPos.gridX},${gridPos.gridY}`, tile: paintBrush })
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



  const handleSave = async () => {
    if (isSaving) return
    retroSFX.playSave()

    const docBeingSaved = doc
    const keyBeingSaved = presentKey
    if (!(await onSave(toSavePayload(docBeingSaved)))) return
    dispatch({ type: 'saved', doc: docBeingSaved })
    // Stay if something changed while the save was in flight
    if (presentKeyRef.current === keyBeingSaved) {
      allowLeave()
      onExit()
    }
  }

  useEffect(() => {
    const onMouseUp = () => globalMouseUpRef.current()
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

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
            className={`p-2 rounded hover:bg-thread-cream ${!canUndo ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Undo (Ctrl+Z)"
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
            className={`p-2 rounded hover:bg-thread-cream ${!canRedo ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Redo (Ctrl+Shift+Z)"
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
            onClick={async () => {
              if (!(await confirmLeave())) return
              allowLeave()
              onExit()
            }}
            className="px-4 py-1.5 text-sm font-medium text-thread-sage hover:bg-thread-cream rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-1.5 text-sm font-medium bg-thread-pine text-white rounded shadow-cozy flex items-center gap-2 ${
              isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-thread-pine/90'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
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
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100 border-2 border-red-400 rounded-lg shadow-lg animate-pulse">
                  <PixelIcon name="trash" size={20} className="text-red-600" />
                  <span className="text-sm font-bold text-red-700">Click items to delete</span>
                  <button
                    onClick={() => setIsDeleting(false)}
                    className="ml-2 p-1 hover:bg-red-200 rounded transition-colors"
                    title="Exit delete mode (Esc)"
                  >
                    <PixelIcon name="close" size={16} className="text-red-500" />
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
              onMouseLeave={() => {
                pointerRef.current = null
                if (isDragging) clearPreview()
              }}
              onDecorationClick={(id, e) => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false
                  e.stopPropagation()
                  return
                }
                if (isPlacing || paintBrush !== undefined) return
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
            itemsLoading={decorationsLoading}
            onItemSelect={handleItemSelect}
            selectedItem={selectedItem}
            houseCustomizations={houseCustomizations}
            onHouseCustomizationChange={handleHouseChange}
            onThemeChange={(template, palette) => dispatch({ type: 'setTheme', template, palette })}
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
