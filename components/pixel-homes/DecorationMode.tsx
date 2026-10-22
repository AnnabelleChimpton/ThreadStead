import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import EnhancedHouseCanvas, { type ScenePointerKind } from './EnhancedHouseCanvas'
import { pickPixelScale } from '../../lib/pixel-homes/pixel-scale'
import PlacementGhost, { type PlacementGhostHandle } from './PlacementGhost'
import DecorationInspector from './DecorationInspector'
import EditorSheet, { type SheetSnap } from './EditorSheet'
import { useViewportSize } from '../../hooks/pixel-homes/useViewportSize'
import DecorationPalette from './DecorationPalette'
import { DecorationItem, TERRAIN_TILES, isFlipped } from '../../lib/pixel-homes/decoration-data'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'

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
import { DEFAULT_DECORATION_GRID, pixelToGrid, isValidGridPosition } from '../../lib/pixel-homes/decoration-grid-utils'
import { centredOn, place, type Placement } from '../../lib/pixel-homes/placement'
import { OVERLAY_DEPTH, MAX_LAYER_BIAS, MIN_LAYER_BIAS, clampLayerBias } from '../../lib/pixel-homes/depth'
import { customArtUrl } from '../../lib/pixel-homes/custom-art'
import { getDecorationDimensions } from '../../lib/pixel-homes/decoration-dimensions'
import { PixelIcon } from '../ui/PixelIcon'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import useIsMobile from '../../hooks/useIsMobile'
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard'
import { retroSFX } from '../../lib/audio/retro-sfx'
import { MAX_DECORATIONS } from '../../lib/pixel-homes/decoration-save-rules'
import { catalogId, docFromProps, newPlacement, toSavePayload, type SavePayload } from '../../lib/pixel-homes/editor-doc'
import { canHaveNote } from '../../lib/pixel-homes/decoration-note'
import { HOUSE_OPTION_ITEMS } from '../../lib/pixel-homes/house-option-items'
import { clearDraft, draftTime, draftToOffer, writeDraft, type EditorDraft } from '../../lib/pixel-homes/editor-draft'
import {
  IDLE,
  interact,
  type Interaction,
  type InteractionEffect,
  type InteractionInput,
  type ScenePointer
} from '../../lib/pixel-homes/editor-interaction'

// Terrain stays in the front yard: rows from y = 96 (grid row 6) down
const TERRAIN_MIN_GRID_Y = 6
const GRID_COLUMNS = 32
const GRID_ROWS = 22

/** Autosave waits this long after the last edit. */
const DRAFT_DELAY_MS = 1000

// Fixed heights, so the phone sheet's snap points can be worked out
const HEADER_HEIGHT = 44
const BAR_HEIGHT = 48
const SCENE_PADDING = 8
/** The draft notice on a phone (two lines). */
const DRAFT_NOTICE_HEIGHT = 76
/** The phone sheet at its smallest: the handle, the tabs and a row of tiles. */
const SHEET_PEEK = 168

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
  // What the pointer is doing: idle, armed, pressed, dragging, painting or erasing
  const [interaction, setInteraction] = useState<Interaction>(IDLE)
  const interactionRef = useRef(interaction)
  const isPlacing = interaction.kind === 'armed'
  const isDeleting = interaction.kind === 'erasing'
  // undefined = not painting, null = the terrain eraser, a string = a terrain brush
  const paintBrush = interaction.kind === 'painting' ? interaction.brush : undefined
  const ghostRef = useRef<PlacementGhostHandle>(null)
  const gridConfig = DEFAULT_DECORATION_GRID
  // The keyboard's cursor cell, shown while the scene has keyboard focus
  const [cursor, setCursor] = useState({ gx: 15, gy: 15 })
  const [keyboardCursor, setKeyboardCursor] = useState(false)
  // Read out by screen readers after a keyboard action
  const [announcement, setAnnouncement] = useState('')
  // A draft of unsaved work from an earlier visit, waiting for Restore or
  // Discard. Until they choose, autosave leaves the stored draft alone.
  const [offeredDraft, setOfferedDraft] = useState<EditorDraft | null>(null)
  const [draftAnswered, setDraftAnswered] = useState(false)
  useEffect(() => {
    const draft = draftToOffer(username, initialDoc)
    if (draft) setOfferedDraft(draft)
    else setDraftAnswered(true)
    // Read once, against the home as it opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave: a second after the last edit, keep the unsaved document here
  useEffect(() => {
    if (!draftAnswered) return
    const timer = setTimeout(() => {
      if (isDirty) writeDraft(username, doc)
      else clearDraft(username)
    }, DRAFT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [doc, isDirty, draftAnswered, username])

  // "See it as a visitor": the scene with no editing chrome, and no palette
  const [previewing, setPreviewing] = useState(false)
  const [modKeyLabel, setModKeyLabel] = useState('Ctrl+')
  useEffect(() => {
    if (navigator.platform.toUpperCase().includes('MAC')) setModKeyLabel('⌘')
  }, [])

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
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd+S - Save, from anywhere in the editor (typing included)
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveRef.current()
        return
      }

      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const selectedOne = selectedDecorations.size === 1
        ? decorationsRef.current.find(d => selectedDecorations.has(d.id))
        : undefined

      // Ctrl/Cmd+D - Duplicate the selected decoration
      if (modKey && e.key.toLowerCase() === 'd' && selectedOne) {
        e.preventDefault()
        itemActionsRef.current.duplicate(selectedOne)
        return
      }

      // F - Flip the selected decoration
      if (!modKey && !e.altKey && e.key.toLowerCase() === 'f' && selectedOne) {
        e.preventDefault()
        itemActionsRef.current.flip(selectedOne)
        return
      }

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

      // [ and ] - Send back / bring forward the selected decoration
      if ((e.key === '[' || e.key === ']') && !modKey && selectedDecorations.size === 1) {
        const selected = decorationsRef.current.find(d => selectedDecorations.has(d.id))
        if (selected) {
          e.preventDefault()
          shiftLayerRef.current(selected, e.key === ']' ? 1 : -1)
        }
        return
      }

      // Escape - Exit current mode / clear selection (or leave the preview)
      if (e.key === 'Escape') {
        e.preventDefault()
        setPreviewing(false)
        runRef.current({ type: 'escape' })
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, undo, redo, selectedDecorations, removeDecorations])

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

  // Custom asset upload handler - uploads to a specific slot
  const handleCustomSlotUpload = async (slot: number, file: File) => {
    // Validate file type
    if (!['image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      appToast.showWarning('Use a PNG or WebP image (a GIF keeps only its first frame).')
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
      const response = await csrfFetch('/api/home/custom-asset', {
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
      const response = await csrfFetch('/api/home/custom-asset', {
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

  // Placed copies of a resident's own art show whatever is in their slot now,
  // so replacing a slot's image updates every copy. The same object comes back
  // while its slot's URL is unchanged, so memoized sprites don't redraw.
  const customCopies = useRef(new WeakMap<DecorationItem, { url: string | undefined, shown: DecorationItem }>())
  const sceneDecorations = useMemo(() => {
    const urls = customAssetSlots.map(slot => slot.url)
    return placedDecorations.map(d => {
      if (d.type !== 'custom') return d
      const url = customArtUrl(catalogId(d), urls) ?? undefined
      const cached = customCopies.current.get(d)
      if (cached && cached.url === url) return cached.shown
      const shown = { ...d, customAssetUrl: url }
      customCopies.current.set(d, { url, shown })
      return shown
    })
  }, [placedDecorations, customAssetSlots])
  const sceneDecorationsRef = useRef(sceneDecorations)
  sceneDecorationsRef.current = sceneDecorations

  // Catalog names by item id, for the status line (placed copies loaded with the page have none)
  const catalogNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const list of Object.values(availableDecorations)) for (const item of list) names.set(item.id, item.name)
    return names
  }, [availableDecorations])

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
    if (!item) {
      setSelectedItem(null)
      runInteraction({ type: 'reset' })
      return
    }

    // Special handling for non-placeable items
    if (item.type === 'sky') {
      const newSky = item.id === 'sunny_sky' ? 'sunny' :
        item.id === 'cloudy_sky' ? 'cloudy' :
          item.id === 'sunset_sky' ? 'sunset' :
            item.id === 'night_sky' ? 'night' : 'sunny'
      dispatch({ type: 'setAtmosphere', changes: { sky: newSky as AtmosphereSettings['sky'] } })
      runInteraction({ type: 'reset' })
      return
    }

    if (item.type === 'house_color') {
      runInteraction({ type: 'reset' })
      setSelectedItem(item)
      return
    }

    if (item.type === 'house_custom') {
      const customizationUpdate: Partial<HouseCustomizations> = {}

      // Doors, windows, window decor, roof trim, chimney
      if (HOUSE_OPTION_ITEMS[item.id]) Object.assign(customizationUpdate, HOUSE_OPTION_ITEMS[item.id].set)
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
      runInteraction({ type: 'reset' })
      setSelectedItem(item)
      retroSFX.playModeChange()
      return
    }

    // Placeable items: picking the armed one again puts it down
    const wasArmed = interactionRef.current.kind === 'armed' && interactionRef.current.item.id === item.id
    runInteraction({ type: 'arm', item })
    setSelectedItem(wasArmed ? null : item)
  }

  const handleTerrainSelect = (terrainId: string | null) => {
    runInteraction({ type: 'brush', brush: terrainId })
    setSelectedItem(null)
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

  // Alt held on the last pointer event: place at the exact pixel, off the grid
  const freeRef = useRef(false)

  // Where an item lands for a given top-left: on the grid (or free with Alt), inside the yard
  const placementFor = (item: DecorationItem, x: number, y: number): Placement =>
    place(item, x, y, { free: freeRef.current })

  // A placement as the ghost shows it
  const ghostAt = (placement: Placement) => placement.position

  // Applies what the interaction asks for (lib/pixel-homes/editor-interaction.ts)
  const applyEffect = (effect: InteractionEffect) => {
    switch (effect.type) {
      case 'place': {
        const { item } = effect
        if (placedDecorations.length >= MAX_DECORATIONS) {
          appToast.showWarning(`Decoration limit reached (${MAX_DECORATIONS} max)`)
          retroSFX.playError()
          return
        }
        // Centred on the pointer
        const corner = centredOn(item, effect.at)
        dispatch({ type: 'place', decoration: newPlacement(item, placementFor(item, corner.x, corner.y)) })
        retroSFX.playPlaceItem()
        return
      }
      case 'select': {
        selectDecoration(effect.id)
        retroSFX.playSelectItem()
        // Also shown in the palette (sign text)
        setSelectedItem(placedDecorations.find(d => d.id === effect.id) ?? null)
        return
      }
      case 'deselect':
        clearSelection()
        setSelectedItem(null)
        return
      case 'move': {
        const decoration = placedDecorations.find(d => d.id === effect.id)
        if (!decoration) return
        dispatch({ type: 'move', id: effect.id, placement: placementFor(decoration, effect.topLeft.x, effect.topLeft.y) })
        retroSFX.playPlaceItem()
        return
      }
      case 'remove':
        removeDecorations(new Set([effect.id]))
        retroSFX.playRemoveItem()
        return
      case 'beginStroke':
        dispatch({ type: 'beginStroke' })
        retroSFX.playTerrainPaint()
        return
      case 'paint': {
        const { gridX, gridY } = pixelToGrid(effect.at.x, effect.at.y, DEFAULT_DECORATION_GRID)
        if (isValidGridPosition(gridX, gridY, { width: 1, height: 1 }) && gridY >= TERRAIN_MIN_GRID_Y) {
          dispatch({ type: 'paintCell', key: `${gridX},${gridY}`, tile: effect.brush })
        }
        return
      }
      case 'endStroke':
        dispatch({ type: 'endStroke' }) // a whole stroke is one undo step
        return
      case 'ghostItem': {
        const { item } = effect
        const corner = centredOn(item, effect.at)
        ghostRef.current?.show(item, ghostAt(placementFor(item, corner.x, corner.y)))
        return
      }
      case 'ghostDrag': {
        const decoration = sceneDecorationsRef.current.find(d => d.id === effect.id)
        if (!decoration) return
        ghostRef.current?.show(decoration, ghostAt(placementFor(decoration, effect.topLeft.x, effect.topLeft.y)))
        return
      }
      case 'hideGhost':
        ghostRef.current?.hide()
        return
    }
  }

  // Every pointer and mode change goes through here. The state only changes
  // (and the editor only re-renders) when the mode does, not on every move.
  const runInteraction = (input: InteractionInput) => {
    const [next, effects] = interact(interactionRef.current, input)
    if (next !== interactionRef.current) {
      interactionRef.current = next
      setInteraction(next)
    }
    effects.forEach(applyEffect)
  }
  // The latest runInteraction, for handlers that must keep one identity
  const runRef = useRef(runInteraction)
  runRef.current = runInteraction
  const decorationsRef = useRef(placedDecorations)
  decorationsRef.current = placedDecorations

  // Handed to the canvas once; it never changes, so the scene doesn't redraw for it
  const handleScenePointer = useCallback((kind: ScenePointerKind, pointer: ScenePointer, event?: React.PointerEvent) => {
    freeRef.current = !!event?.altKey
    const run = runRef.current
    if (kind === 'down') {
      const pressed = pointer.decorationId ? decorationsRef.current.find(d => d.id === pointer.decorationId) : undefined
      run({ type: 'down', pointer, decorationPosition: pressed?.position })
    } else if (kind === 'cancel' || kind === 'leave') {
      run({ type: kind })
    } else {
      run({ type: kind, pointer })
    }
  }, [])

  // Set once shiftLayer and the item actions exist, further down
  const shiftLayerRef = useRef<(decoration: DecorationItem, by: -1 | 1) => void>(() => {})
  const itemActionsRef = useRef<Record<'flip' | 'duplicate' | 'remove', (d: DecorationItem) => void>>({
    flip: () => {},
    duplicate: () => {},
    remove: () => {}
  })

  // A release the scene never saw (pointer capture unavailable) still ends a press, drag or stroke
  useEffect(() => {
    const onPointerUp = () => runRef.current({ type: 'cancel' })
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [])

  const handleSave = async (): Promise<boolean> => {
    if (isSaving) return false
    retroSFX.playSave()

    const docBeingSaved = doc
    if (!(await onSave(toSavePayload(docBeingSaved)))) return false
    // You stay in the editor; edits made while it was saving stay unsaved
    dispatch({ type: 'saved', doc: docBeingSaved })
    if (presentKeyRef.current === presentKey) clearDraft(username)
    return true
  }
  const saveRef = useRef(handleSave)
  saveRef.current = handleSave

  // Send back / bring forward: a whole depth level, past everything at its level
  const shiftLayer = (decoration: DecorationItem, by: -1 | 1) => {
    const bias = clampLayerBias(decoration.layerBias)
    const next = clampLayerBias(bias + by)
    if (next === bias) return
    dispatch({ type: 'updateDecoration', id: decoration.id, changes: { layerBias: next } })
    setAnnouncement(`${itemName(decoration)} ${by > 0 ? 'brought forward' : 'sent back'}`)
  }
  shiftLayerRef.current = shiftLayer

  // The selected decoration's tools (the inspector, and their keys)
  const itemActions = {
    flip: (d: DecorationItem) => {
      const data = { ...(d.data && typeof d.data === 'object' ? d.data : {}) }
      if (isFlipped(d)) delete data.flip
      else data.flip = true
      dispatch({ type: 'updateDecoration', id: d.id, changes: { data } })
      setAnnouncement(`${itemName(d)} flipped`)
    },
    duplicate: (d: DecorationItem) => {
      if (placedDecorations.length >= MAX_DECORATIONS) {
        appToast.showWarning(`Decoration limit reached (${MAX_DECORATIONS} max)`)
        return
      }
      // One cell to the right, or to the left at the yard's edge
      const x = d.position?.x ?? 0
      const y = d.position?.y ?? 0
      let target = place(d, x + gridConfig.cellSize, y)
      if (target.position.x === x) target = place(d, x - gridConfig.cellSize, y)
      const copy = newPlacement(d, target)
      dispatch({ type: 'place', decoration: copy })
      selectDecoration(copy.id)
      setSelectedItem(copy)
      retroSFX.playPlaceItem()
      setAnnouncement(`${itemName(d)} copied`)
    },
    remove: (d: DecorationItem) => {
      removeDecorations(new Set([d.id]))
      setSelectedItem(null)
      retroSFX.playRemoveItem()
      setAnnouncement(`${itemName(d)} removed`)
    }
  }
  itemActionsRef.current = itemActions

  // ---------------------------------------------------------- keyboard --
  // The scene takes focus. Arrows move a dotted cursor cell (or nudge the
  // selected decoration), Enter plants, paints or selects at the cursor.

  const itemName = (d: DecorationItem) =>
    catalogNames.get(catalogId(d)) || (d.name && d.name !== 'Decoration' ? d.name : humanize(catalogId(d)))

  /** The front-most decoration covering the middle of a cursor cell. */
  const decorationAt = (cell: { gx: number, gy: number }) => {
    const px = cell.gx * gridConfig.cellSize + gridConfig.cellSize / 2
    const py = cell.gy * gridConfig.cellSize + gridConfig.cellSize / 2
    let best: DecorationItem | undefined
    for (const d of placedDecorations) {
      const { width, height } = getDecorationDimensions(catalogId(d), d.type, d.size || 'medium', d)
      const x = d.position?.x ?? 0
      const y = d.position?.y ?? 0
      if (px >= x && px < x + width && py >= y && py < y + height) {
        if (!best || (d.position?.layer ?? 0) >= (best.position?.layer ?? 0)) best = d
      }
    }
    return best
  }

  const cellLabel = (cell: { gx: number, gy: number }) => `row ${cell.gy + 1}, column ${cell.gx + 1}`
  const cellCentre = (cell: { gx: number, gy: number }) => ({
    x: cell.gx * gridConfig.cellSize + gridConfig.cellSize / 2,
    y: cell.gy * gridConfig.cellSize + gridConfig.cellSize / 2
  })

  const showCursorGhost = (cell: { gx: number, gy: number }) => {
    const state = interactionRef.current
    if (state.kind === 'armed') applyEffect({ type: 'ghostItem', item: state.item, at: cellCentre(cell) })
  }

  const handleSceneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
    }
    const state = interactionRef.current
    if (e.key in arrows) {
      e.preventDefault()
      const step = e.shiftKey ? 4 : 1
      const [dx, dy] = arrows[e.key]
      const selected = selectedDecorations.size === 1 && state.kind === 'idle'
        ? placedDecorations.find(d => selectedDecorations.has(d.id))
        : undefined
      if (selected) {
        // Nudge by whole cells
        const x = (selected.position?.x ?? 0) + dx * step * gridConfig.cellSize
        const y = (selected.position?.y ?? 0) + dy * step * gridConfig.cellSize
        dispatch({ type: 'move', id: selected.id, placement: place(selected, x, y) })
        setAnnouncement(`${itemName(selected)} moved`)
      }
      const next = {
        gx: Math.min(GRID_COLUMNS - 1, Math.max(0, cursor.gx + dx * step)),
        gy: Math.min(GRID_ROWS - 1, Math.max(0, cursor.gy + dy * step))
      }
      setCursor(next)
      showCursorGhost(next)
      if (!selected) setAnnouncement(cellLabel(next))
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const at = cellCentre(cursor)
      if (state.kind === 'armed') {
        const before = placedDecorations.length
        applyEffect({ type: 'place', item: state.item, at })
        if (before < MAX_DECORATIONS) setAnnouncement(`${itemName(state.item)} planted, ${cellLabel(cursor)}`)
      } else if (state.kind === 'painting') {
        applyEffect({ type: 'beginStroke' })
        applyEffect({ type: 'paint', brush: state.brush, at })
        applyEffect({ type: 'endStroke' })
      } else if (state.kind === 'erasing') {
        const hit = decorationAt(cursor)
        if (hit) {
          applyEffect({ type: 'remove', id: hit.id })
          setAnnouncement(`${itemName(hit)} removed`)
        }
      } else {
        const hit = decorationAt(cursor)
        if (hit) {
          applyEffect({ type: 'select', id: hit.id })
          setAnnouncement(`${itemName(hit)} selected. Arrow keys move it, Delete removes it.`)
        } else {
          applyEffect({ type: 'deselect' })
        }
      }
    }
  }

  // ------------------------------------------------------------ layout --
  // Desktop: the scene and its bar on the left, the palette docked right.
  // Below lg: scene, bar, then the palette as a sheet that trades height
  // with the scene (the scene steps down a size, it is never covered).

  const isNarrow = useIsMobile(1024)
  const viewport = useViewportSize()
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('fit')
  const sheetHeights = useMemo(() => {
    const { width, height, devicePixelRatio } = viewport
    // The draft notice, while it's up, comes out of the palette's share, not the scene's
    const roomForScene = height - HEADER_HEIGHT - BAR_HEIGHT - (offeredDraft ? DRAFT_NOTICE_HEIGHT : 0)
    const sceneHeight = (k: number) => Math.ceil(352 * k) + 2 * SCENE_PADDING
    const widthFit = pickPixelScale(width - 2 * SCENE_PADDING, devicePixelRatio, Infinity, { allowBelowOne: true })
    const smallest = pickPixelScale(width - 2 * SCENE_PADDING, devicePixelRatio, 0, { allowBelowOne: true })
    const full = Math.max(SHEET_PEEK, roomForScene - sceneHeight(smallest))
    const fit = Math.min(full, Math.max(SHEET_PEEK, roomForScene - sceneHeight(widthFit)))
    return { peek: SHEET_PEEK, fit, full }
  }, [viewport, offeredDraft])

  const muteButton = (
    <button
      type="button"
      onClick={() => setSfxMuted(!sfxMuted)}
      className="ts-bare ts-icon-button ts-touch p-2 rounded hover:bg-thread-cream text-thread-pine"
      title={sfxMuted ? 'Sounds off' : 'Sounds on'}
      aria-label="Sounds"
      aria-pressed={!sfxMuted}
    >
      <PixelIcon name={sfxMuted ? 'volume-x' : 'volume'} size={18} />
    </button>
  )

  const iconButton = (label: string, icon: React.ComponentProps<typeof PixelIcon>['name'], onClick: () => void, disabled = false, pressed?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={`ts-bare ts-icon-button ts-touch p-2 rounded text-thread-pine ${pressed ? 'bg-thread-sunset/15' : 'hover:bg-thread-cream'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <PixelIcon name={icon} size={18} />
    </button>
  )

  const brushName = paintBrush ? (TERRAIN_TILES.find(t => t.id === paintBrush)?.name ?? 'terrain') : null
  const selectedOne = selectedDecorations.size === 1 ? placedDecorations.find(d => selectedDecorations.has(d.id)) : undefined
  const status =
    interaction.kind === 'armed' ? `Planting ${itemName(interaction.item)}`
      : interaction.kind === 'painting' ? (brushName ? `Painting ${brushName} on the lawn` : 'Erasing terrain')
        : interaction.kind === 'erasing' ? 'Pick things to remove'
          : selectedOne ? `${itemName(selectedOne)} selected`
            : ''
  const inMode = interaction.kind === 'armed' || interaction.kind === 'painting' || interaction.kind === 'erasing'

  const actionBar = (
    <div
      className="flex items-center gap-1 px-2 border-t border-thread-sage/30 bg-thread-paper shrink-0"
      style={{ height: BAR_HEIGHT }}
    >
      {iconButton('Undo', 'undo', () => { undo(); retroSFX.playUndo() }, !canUndo)}
      {iconButton('Redo', 'redo', () => { redo(); retroSFX.playRedo() }, !canRedo)}
      {iconButton('Delete items', 'trash', () => {
        runInteraction({ type: 'toggleErase' })
        setSelectedItem(null)
        retroSFX.playModeChange()
      }, false, isDeleting)}
      <div className="min-w-0 flex-1 flex items-center gap-2 px-1 text-sm text-thread-charcoal">
        <span className="truncate">{status}</span>
        {inMode && (
          <button
            type="button"
            onClick={() => {
              runInteraction({ type: 'reset' })
              setSelectedItem(null)
            }}
            className="ts-bare ts-text-button ts-touch shrink-0 text-sm"
          >
            Done
          </button>
        )}
      </div>
      <span
        className={`text-xs tabular-nums shrink-0 ${placedDecorations.length >= MAX_DECORATIONS ? 'text-thread-sunset font-bold' : 'text-thread-sage'}`}
        title={`${placedDecorations.length} of ${MAX_DECORATIONS} decorations`}
      >
        {placedDecorations.length}/{MAX_DECORATIONS}
      </span>
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className={`btn btn--primary shrink-0 ml-1 px-4 py-1.5 text-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )

  const palette = (
    <DecorationPalette
      items={decorationsWithCustom}
      itemsLoading={decorationsLoading}
      onItemSelect={handleItemSelect}
      selectedItem={selectedItem}
      isMobile={isNarrow}
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
  )

  const inspector = selectedOne && interaction.kind === 'idle' ? (
    <DecorationInspector
      item={sceneDecorations.find(d => d.id === selectedOne.id) ?? selectedOne}
      name={itemName(selectedOne)}
      where={(() => {
        const cell = { gx: Math.round((selectedOne.position?.x ?? 0) / gridConfig.cellSize), gy: Math.round((selectedOne.position?.y ?? 0) / gridConfig.cellSize) }
        const label = cellLabel(cell)
        return label.charAt(0).toUpperCase() + label.slice(1)
      })()}
      modKeyLabel={modKeyLabel}
      canSendBack={clampLayerBias(selectedOne.layerBias) > MIN_LAYER_BIAS}
      canBringForward={clampLayerBias(selectedOne.layerBias) < MAX_LAYER_BIAS}
      onFlip={() => itemActions.flip(selectedOne)}
      onSendBack={() => shiftLayer(selectedOne, -1)}
      onBringForward={() => shiftLayer(selectedOne, 1)}
      onDuplicate={() => itemActions.duplicate(selectedOne)}
      onDelete={() => itemActions.remove(selectedOne)}
      onTextChange={catalogId(selectedOne).startsWith('sign_post')
        ? (text) => handleDecorationUpdate(selectedOne.id, { text })
        : undefined}
      onNoteChange={canHaveNote(catalogId(selectedOne))
        ? (note) => handleDecorationUpdate(selectedOne.id, { note })
        : undefined}
      onDone={() => {
        clearSelection()
        setSelectedItem(null)
      }}
    />
  ) : null

  // The side or bottom panel: the selected item's tools, or the palette
  const panel = inspector ?? palette

  const draftNotice = offeredDraft ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 border-b border-thread-sage/30 bg-thread-cream text-sm text-thread-charcoal shrink-0" role="status">
      <span>You have unsaved changes from {draftTime(offeredDraft.at)}.</span>
      <span className="flex gap-3">
        <button
          type="button"
          className="ts-bare ts-text-button font-semibold"
          onClick={() => {
            dispatch({ type: 'replace', doc: offeredDraft.doc })
            setOfferedDraft(null)
            setDraftAnswered(true)
          }}
        >
          Restore
        </button>
        <button
          type="button"
          className="ts-bare ts-text-button"
          onClick={() => {
            clearDraft(username)
            setOfferedDraft(null)
            setDraftAnswered(true)
          }}
        >
          Discard
        </button>
      </span>
    </div>
  ) : null

  const previewBar = (
    <div
      className="flex items-center gap-2 px-3 border-t border-thread-sage/30 bg-thread-paper shrink-0 text-sm"
      style={{ height: BAR_HEIGHT }}
    >
      <span className="min-w-0 flex-1 truncate text-thread-charcoal">
        {isDirty ? 'This is how it will look once you save.' : 'This is how neighbors see your yard.'}
      </span>
      <button type="button" onClick={() => setPreviewing(false)} className="btn btn--secondary shrink-0 px-3 py-1.5 text-sm">
        Back to editing
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-thread-paper" style={{ height: '100dvh' }}>
      {/* A slim header instead of the site's: no stray nav clicks while editing */}
      <header
        className="flex items-center gap-2 px-2 border-b border-thread-sage/30 bg-thread-paper shrink-0"
        style={{ height: HEADER_HEIGHT }}
      >
        <button
          type="button"
          onClick={async () => {
            if (!(await confirmLeave())) return
            // They chose to drop the changes, so don't offer them back next time
            if (isDirty) clearDraft(username)
            allowLeave()
            onExit()
          }}
          className="ts-bare ts-text-button ts-touch flex items-center gap-1 text-sm font-medium"
        >
          <PixelIcon name="arrow-left" size={16} />
          Back to my house
        </button>
        <span className="hidden sm:inline lg:ml-4 text-base font-headline font-bold text-thread-pine">Decorating</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (!previewing) {
                runInteraction({ type: 'reset' })
                clearSelection()
                setSelectedItem(null)
              }
              setPreviewing(!previewing)
            }}
            aria-pressed={previewing}
            aria-label="See it as a visitor"
            className="ts-bare ts-text-button ts-touch flex items-center gap-1 text-sm"
          >
            <PixelIcon name="eye" size={16} />
            <span className="hidden sm:inline">See it as a visitor</span>
            <span className="sm:hidden">Preview</span>
          </button>
          {muteButton}
        </div>
      </header>

      {draftNotice}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <section className="flex-1 min-h-0 flex flex-col bg-thread-cream/50" aria-label="Your yard">
          <div className="flex-1 min-h-0" style={{ padding: SCENE_PADDING }}>
            <EnhancedHouseCanvas
              template={currentTemplate}
              palette={currentPalette}
              decorations={sceneDecorations}
              houseCustomizations={houseCustomizations}
              atmosphere={atmosphere}
              terrain={terrain}
              isDecorationMode={!previewing}
              isDeleting={isDeleting}
              pixelPerfect
              fitBox
              className="h-full w-full"
              onScenePointer={previewing ? undefined : handleScenePointer}
              selectedDecorations={previewing ? undefined : selectedDecorations}
              sceneProps={previewing ? undefined : {
                tabIndex: 0,
                role: 'application',
                'aria-label': 'Your yard. Arrow keys move the cursor, Enter plants or picks.',
                'aria-describedby': 'decorate-status',
                onKeyDown: handleSceneKeyDown,
                onFocus: (e) => {
                  if (e.currentTarget.matches(':focus-visible')) {
                    setKeyboardCursor(true)
                    showCursorGhost(cursor)
                  }
                },
                onBlur: () => setKeyboardCursor(false),
                onPointerDownCapture: () => setKeyboardCursor(false)
              }}
              overlay={previewing ? undefined : (
                <>
                  <PlacementGhost ref={ghostRef} />
                  {keyboardCursor && (
                    <div
                      aria-hidden="true"
                      className="absolute pointer-events-none"
                      style={{
                        left: cursor.gx * gridConfig.cellSize,
                        top: cursor.gy * gridConfig.cellSize,
                        width: gridConfig.cellSize,
                        height: gridConfig.cellSize,
                        outline: '1px dotted #4a403d',
                        zIndex: OVERLAY_DEPTH
                      }}
                    />
                  )}
                </>
              )}
            />
          </div>
          {previewing ? previewBar : actionBar}
          <p id="decorate-status" className="sr-only" aria-live="polite">{announcement}</p>
        </section>

        {previewing ? null : isNarrow ? (
          <EditorSheet heights={sheetHeights} snap={sheetSnap} onSnapChange={setSheetSnap}>
            {panel}
          </EditorSheet>
        ) : (
          <aside
            className="w-[360px] xl:w-[400px] shrink-0 border-l border-thread-sage/30 bg-thread-paper flex flex-col min-h-0"
            aria-label={inspector ? 'Selected decoration' : 'Palette'}
          >
            {panel}
          </aside>
        )}
      </div>
    </div>
  )
}

function humanize(id: string): string {
  const words = id.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
