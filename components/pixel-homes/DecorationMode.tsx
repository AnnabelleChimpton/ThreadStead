import React, { useState, useEffect, useMemo, useRef } from 'react'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import DecorationIcon from './DecorationIcon'
import DecorationSVG from './DecorationSVG'
import ThemePicker from './ThemePicker'
import TouchDecorationPlacer from './TouchDecorationPlacer'
import DecorationPalette from './DecorationPalette'
import DecorationGridOverlay, { MagneticGridOverlay } from './DecorationGridOverlay'
import AnimatedDecoration, { DeletionAnimation, ActionFeedback } from './DecorationAnimations'
import useIsMobile, { useIsTouch, usePrefersReducedMotion } from '../../hooks/useIsMobile'
import useDecorationSnapping from '../../hooks/pixel-homes/useDecorationSnapping'
import { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import { DEFAULT_DECORATION_GRID, DecorationGridConfig } from '@/lib/pixel-homes/decoration-grid-utils'
import { PixelIcon } from '@/components/ui/PixelIcon'

// Import palette colors to convert themes to explicit colors
const PALETTE_COLORS = {
  thread_sage: {
    primary: '#A18463',    // sage
    secondary: '#2E4B3F',  // pine  
    accent: '#8EC5E8',     // sky
    base: '#F5E9D4',       // cream
    detail: '#4FAF6D'      // meadow
  },
  charcoal_nights: {
    primary: '#2F2F2F',    // charcoal
    secondary: '#B8B8B8',  // stone
    accent: '#E27D60',     // sunset
    base: '#FCFAF7',       // paper
    detail: '#A18463'      // sage
  },
  pixel_petals: {
    primary: '#E27D60',    // sunset
    secondary: '#4FAF6D',  // meadow
    accent: '#8EC5E8',     // sky
    base: '#F5E9D4',       // cream
    detail: '#2E4B3F'      // pine
  },
  crt_glow: {
    primary: '#8EC5E8',    // sky
    secondary: '#2F2F2F',  // charcoal
    accent: '#4FAF6D',     // meadow
    base: '#FCFAF7',       // paper
    detail: '#E27D60'      // sunset
  },
  classic_linen: {
    primary: '#A18463',    // sage
    secondary: '#2E4B3F',  // pine
    accent: '#E27D60',     // sunset
    base: '#FCFAF7',       // paper
    detail: '#8EC5E8'      // sky
  }
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

interface DecorationItem {
  id: string
  name: string
  type: 'plant' | 'path' | 'feature' | 'seasonal' | 'furniture' | 'lighting' | 'water' | 'structure' | 'house_custom' | 'house_color'
  zone?: 'front_yard' | 'house_facade' | 'background'
  position?: { x: number; y: number; layer?: number }
  variant?: string
  size?: 'small' | 'medium' | 'large'
  color?: string  // For house color items
  gridPosition?: { gridX: number; gridY: number; width: number; height: number }
  section?: string
  isDefault?: boolean
  [key: string]: any
}

// Type alias for decorations compatible with EnhancedHouseCanvas
type CanvasDecorationItem = {
  id: string
  type: 'plant' | 'path' | 'feature' | 'seasonal'
  zone: 'front_yard' | 'house_facade' | 'background'
  position: { x: number; y: number; layer?: number }
  variant?: string
  size?: 'small' | 'medium' | 'large'
}

interface AtmosphereSettings {
  sky: 'sunny' | 'cloudy' | 'sunset' | 'night'
  weather: 'clear' | 'light_rain' | 'light_snow'
  timeOfDay: 'morning' | 'midday' | 'evening' | 'night'
}

// Comprehensive decoration collection with all new items
const BETA_ITEMS = {
  plants: [
    { id: 'roses_red', name: 'Red Roses', type: 'plant', zone: 'front_yard' },
    { id: 'roses_pink', name: 'Pink Roses', type: 'plant', zone: 'front_yard' },
    { id: 'roses_white', name: 'White Roses', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_white', name: 'White Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_yellow', name: 'Yellow Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'small_tree', name: 'Small Tree', type: 'plant', zone: 'front_yard' },
    { id: 'tree_oak', name: 'Oak Tree', type: 'plant', zone: 'front_yard' },
    { id: 'tree_pine', name: 'Pine Tree', type: 'plant', zone: 'front_yard' },
    { id: 'sunflowers', name: 'Sunflowers', type: 'plant', zone: 'front_yard' },
    { id: 'lavender', name: 'Lavender', type: 'plant', zone: 'front_yard' },
    { id: 'flower_pot', name: 'Flower Pot', type: 'plant', zone: 'front_yard' },
    { id: 'planter_box', name: 'Planter Box', type: 'furniture', zone: 'front_yard' }
  ],
  paths: [
    { id: 'stone_path', name: 'Stone Path', type: 'path', zone: 'front_yard' },
    { id: 'brick_path', name: 'Brick Path', type: 'path', zone: 'front_yard' },
    { id: 'stepping_stones', name: 'Stepping Stones', type: 'path', zone: 'front_yard' },
    { id: 'gravel_path', name: 'Gravel Path', type: 'path', zone: 'front_yard' }
  ],
  features: [
    { id: 'bird_bath', name: 'Bird Bath', type: 'feature', zone: 'front_yard' },
    { id: 'garden_gnome', name: 'Garden Gnome', type: 'feature', zone: 'front_yard' },
    { id: 'decorative_fence', name: 'Decorative Fence', type: 'feature', zone: 'front_yard' },
    { id: 'wind_chimes', name: 'Wind Chimes', type: 'feature', zone: 'front_yard' }
  ],
  furniture: [
    { id: 'garden_bench', name: 'Garden Bench', type: 'furniture', zone: 'front_yard' },
    { id: 'outdoor_table', name: 'Outdoor Table', type: 'furniture', zone: 'front_yard' },
    { id: 'mailbox', name: 'Mailbox', type: 'furniture', zone: 'front_yard' },
    { id: 'planter_box', name: 'Planter Box', type: 'furniture', zone: 'front_yard' },
    { id: 'picnic_table', name: 'Picnic Table', type: 'furniture', zone: 'front_yard' }
  ],
  lighting: [
    { id: 'garden_lantern', name: 'Garden Lantern', type: 'lighting', zone: 'front_yard' },
    { id: 'string_lights', name: 'String Lights', type: 'lighting', zone: 'front_yard' },
    { id: 'torch', name: 'Garden Torch', type: 'lighting', zone: 'front_yard' },
    { id: 'spotlight', name: 'Spotlight', type: 'lighting', zone: 'front_yard' }
  ],
  water: [
    { id: 'fountain', name: 'Garden Fountain', type: 'water', zone: 'front_yard' },
    { id: 'pond', name: 'Small Pond', type: 'water', zone: 'front_yard' },
    { id: 'rain_barrel', name: 'Rain Barrel', type: 'water', zone: 'front_yard' }
  ],
  structures: [
    { id: 'gazebo', name: 'Garden Gazebo', type: 'structure', zone: 'front_yard' },
    { id: 'trellis', name: 'Garden Trellis', type: 'structure', zone: 'front_yard' },
    { id: 'garden_arch', name: 'Garden Arch', type: 'structure', zone: 'front_yard' }
  ],
  atmosphere: [
    { id: 'sunny_sky', name: 'Sunny Day', type: 'sky', zone: 'background' },
    { id: 'sunset_sky', name: 'Sunset', type: 'sky', zone: 'background' }
  ],
  house: [
    // Doors Section
    { id: 'default_door', name: 'Default Door', type: 'house_custom', zone: 'house_facade', section: 'doors', isDefault: true },
    { id: 'arched_door', name: 'Arched Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },
    { id: 'double_door', name: 'Double Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },
    { id: 'cottage_door', name: 'Cottage Door', type: 'house_custom', zone: 'house_facade', section: 'doors' },
    
    // Windows Section
    { id: 'default_windows', name: 'Default Windows', type: 'house_custom', zone: 'house_facade', section: 'windows', isDefault: true },
    { id: 'round_windows', name: 'Round Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },
    { id: 'arched_windows', name: 'Arched Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },
    { id: 'bay_windows', name: 'Bay Windows', type: 'house_custom', zone: 'house_facade', section: 'windows' },
    
    // Roof Trim Section
    { id: 'default_trim', name: 'Default Trim', type: 'house_custom', zone: 'house_facade', section: 'roof', isDefault: true },
    { id: 'ornate_trim', name: 'Ornate Roof Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' },
    { id: 'scalloped_trim', name: 'Scalloped Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' },
    { id: 'gabled_trim', name: 'Gabled Trim', type: 'house_custom', zone: 'house_facade', section: 'roof' }
  ],
  templates: [
    { id: 'cottage_v1', name: 'Cottage', type: 'house_template', zone: 'house_facade' },
    { id: 'townhouse_v1', name: 'Townhouse', type: 'house_template', zone: 'house_facade' },
    { id: 'loft_v1', name: 'Modern Loft', type: 'house_template', zone: 'house_facade' },
    { id: 'cabin_v1', name: 'Log Cabin', type: 'house_template', zone: 'house_facade' }
  ],
  colors: [
    { id: 'wall_color', name: 'Wall Color', type: 'house_color', zone: 'house_facade', color: '#F5E9D4' },
    { id: 'roof_color', name: 'Roof Color', type: 'house_color', zone: 'house_facade', color: '#A18463' },
    { id: 'trim_color', name: 'Trim Color', type: 'house_color', zone: 'house_facade', color: '#2E4B3F' },
    { id: 'window_color', name: 'Window Color', type: 'house_color', zone: 'house_facade', color: '#8EC5E8' },
    { id: 'detail_color', name: 'Detail Color', type: 'house_color', zone: 'house_facade', color: '#4FAF6D' }
  ]
} as const

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
  
  const [placedDecorations, setPlacedDecorations] = useState<DecorationItem[]>([])
  const [availableDecorations, setAvailableDecorations] = useState<Record<string, DecorationItem[]>>({})
  const [decorationsLoading, setDecorationsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('decorations')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<HouseTemplate>(initialTemplate)
  const [currentPalette, setCurrentPalette] = useState<ColorPalette>(initialPalette)
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
  const [previewPosition, setPreviewPosition] = useState<{x: number, y: number} | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<any>(null)
  const [selectedDecorations, setSelectedDecorations] = useState<Set<string>>(new Set())
  const [draggedDecoration, setDraggedDecoration] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  const [history, setHistory] = useState<{
    past: DecorationItem[][]
    present: DecorationItem[]
    future: DecorationItem[][]
  }>({ past: [], present: [], future: [] })
  const [showThemeConfirm, setShowThemeConfirm] = useState<{show: boolean, template: HouseTemplate, palette: ColorPalette}>({show: false, template: 'cottage_v1', palette: 'thread_sage'})

  // Grid system state
  const [gridConfig, setGridConfig] = useState<DecorationGridConfig>(DEFAULT_DECORATION_GRID)
  const [mousePosition, setMousePosition] = useState<{x: number, y: number} | undefined>()

  // Canvas dimensions (used for touch placement bounds)
  const CANVAS_WIDTH = 500
  const CANVAS_HEIGHT = 350

  // Ref to track latest decorations for drag operations (avoids stale closure)
  const placedDecorationsRef = React.useRef<DecorationItem[]>(placedDecorations)
  React.useEffect(() => {
    placedDecorationsRef.current = placedDecorations
  }, [placedDecorations])

  // Load available decorations from API
  useEffect(() => {
    const loadDecorations = async () => {
      try {
        const response = await fetch('/api/decorations/available')
        if (response.ok) {
          const data = await response.json()
          setAvailableDecorations(data.decorations)
        } else {
          // Fallback to BETA_ITEMS if API fails
          console.warn('Failed to load decorations from API, using fallback')
          setAvailableDecorations(BETA_ITEMS as unknown as Record<string, DecorationItem[]>)
        }
      } catch (error) {
        console.error('Error loading decorations:', error)
        // Fallback to BETA_ITEMS if API fails
        setAvailableDecorations(BETA_ITEMS as unknown as Record<string, DecorationItem[]>)
      } finally {
        setDecorationsLoading(false)
      }
    }

    loadDecorations()
  }, [])

  // Initialize snapping system - disabled by default for better performance
  const {
    snapDecoration,
    updatePreview,
    clearPreview,
    isSnapping,
    toggleSnapping,
    previewPosition: snapPreview
  } = useDecorationSnapping({
    gridConfig,
    decorations: placedDecorations.filter(d => !['house_custom', 'house_color'].includes(d.type)) as Array<{
      id: string
      type: 'plant' | 'path' | 'feature' | 'seasonal' | 'furniture' | 'lighting' | 'water' | 'structure'
      zone: 'front_yard' | 'house_facade' | 'background'
      position: { x: number; y: number; layer?: number }
      variant?: string
      size?: 'small' | 'medium' | 'large'
      gridPosition?: { gridX: number; gridY: number; width: number; height: number }
    }>,
    enableSnapping: false,  // Start disabled for better performance - users can enable via button
    enableSpacingSuggestions: false
  })

  // Grid toggle functionality
  const toggleGrid = () => {
    setGridConfig(prev => ({ ...prev, showGrid: !prev.showGrid }))
  }


  // Load initial decorations when component mounts
  useEffect(() => {
    if (initialDecorations && initialDecorations.length > 0) {
      setPlacedDecorations(initialDecorations)
      setHistory({ past: [], present: initialDecorations, future: [] })
    }
  }, [initialDecorations])
  
  // Update history when decorations change
  const updateHistory = (newDecorations: DecorationItem[]) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: newDecorations,
      future: [] // Clear future when making new changes
    }))
    setPlacedDecorations(newDecorations)
  }
  
  const undo = () => {
    if (history.past.length === 0) return
    
    const previous = history.past[history.past.length - 1]
    const newPast = history.past.slice(0, history.past.length - 1)
    
    setHistory({
      past: newPast,
      present: previous,
      future: [history.present, ...history.future]
    })
    setPlacedDecorations(previous)
  }
  
  const redo = () => {
    if (history.future.length === 0) return
    
    const next = history.future[0]
    const newFuture = history.future.slice(1)
    
    setHistory({
      past: [...history.past, history.present],
      present: next,
      future: newFuture
    })
    setPlacedDecorations(next)
  }

  const handleColorChange = (colorValue: string) => {
    if (!selectedItem || selectedItem.type !== 'house_color') return
    
    const colorUpdate: Partial<HouseCustomizations> = {}
    
    // Map color item IDs to customization properties
    switch (selectedItem.id) {
      case 'wall_color':
        colorUpdate.wallColor = colorValue
        break
      case 'roof_color':
        colorUpdate.roofColor = colorValue
        break
      case 'trim_color':
        colorUpdate.trimColor = colorValue
        break
      case 'window_color':
        colorUpdate.windowColor = colorValue
        break
      case 'detail_color':
        colorUpdate.detailColor = colorValue
        break
    }
    
    // Update house customizations immediately
    setHouseCustomizations(prev => ({ ...prev, ...colorUpdate }))
  }

  const handleItemSelect = (item: any) => {
    if (item.type === 'sky') {
      // Handle atmosphere changes directly
      const newSky = item.id === 'sunny_sky' ? 'sunny' : 
                    item.id === 'sunset_sky' ? 'sunset' : 'sunny'
      setAtmosphere(prev => ({ ...prev, sky: newSky }))
    } else if (item.type === 'house_template') {
      // Handle house template changes directly - switch the entire house type!
      setCurrentTemplate(item.id as HouseTemplate)
      
      // Reset house customizations when changing template to avoid conflicts
      setHouseCustomizations({
        windowStyle: 'default',
        doorStyle: 'default',
        roofTrim: 'default'
      })
      
      // Select the item for visual feedback but don't enter placement mode
      setSelectedItem(item)
      setIsPlacing(false)
    } else if (item.type === 'house_color') {
      // Handle house color changes directly - enter color picker mode!
      setSelectedItem(item)
      setIsPlacing(false) // Color picker, not placement mode
    } else if (item.type === 'house_custom') {
      // Handle house customizations directly - no placement needed!
      const customizationUpdate: Partial<HouseCustomizations> = {}
      
      // Map decoration IDs to customization properties
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
      
      // Update house customizations immediately
      setHouseCustomizations(prev => ({ ...prev, ...customizationUpdate }))
      
      // Select the item for visual feedback but don't enter placement mode
      setSelectedItem(item)
      setIsPlacing(false)
    } else {
      // Handle decoration placement - toggle if same item clicked
      if (selectedItem && selectedItem.id === item.id) {
        // Clicking same item - deselect
        setSelectedItem(null)
        setIsPlacing(false)
      } else {
        // Clicking new item - select it
        setSelectedItem(item)
        setIsPlacing(true)
      }
    }
  }

  const handleCanvasClick = (event: React.MouseEvent) => {
    // If clicking empty space (not placing or dragging), clear selection
    if ((!isPlacing || !selectedItem) && !draggedItem) {
      setSelectedItem(null)
      setIsPlacing(false)
      setSelectedDecorations(new Set())
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const itemToPlace = draggedItem || selectedItem
    if (!itemToPlace || itemToPlace.type === 'sky' || itemToPlace.type === 'house_custom' || itemToPlace.type === 'house_template' || itemToPlace.type === 'house_color') return

    // Use snapping system for positioning
    const snapResult = snapDecoration(
      x,
      y,
      itemToPlace.type,
      itemToPlace.id,
      itemToPlace.size || 'medium'
    )

    const newDecoration: DecorationItem = {
      id: `${itemToPlace.id}_${Date.now()}`,
      name: itemToPlace.name || itemToPlace.id,
      type: itemToPlace.type,
      zone: itemToPlace.zone,
      position: {
        x: snapResult.position.pixelX,
        y: snapResult.position.pixelY
      },
      variant: itemToPlace.variant || 'default',
      size: itemToPlace.size || 'medium'
    }

    const newDecorations = [...placedDecorations, newDecoration]
    updateHistory(newDecorations)

    // Clear preview and drag state
    clearPreview()
    if (draggedItem) {
      setDraggedItem(null)
      setIsDragging(false)
    }
  }
  
  // Touch placement handler for mobile
  const handleTouchPlace = (x: number, y: number) => {
    if (!selectedItem || selectedItem.type === 'sky' || selectedItem.type === 'house_custom' || selectedItem.type === 'house_template' || selectedItem.type === 'house_color') return

    // Constrain to canvas bounds
    const adjustedX = Math.max(0, Math.min(x - 12, 500 - 24))
    const adjustedY = Math.max(0, Math.min(y - 12, 350 - 24))

    const newDecoration: DecorationItem = {
      id: `${selectedItem.id}_${Date.now()}`,
      name: selectedItem.name || selectedItem.id,
      type: selectedItem.type,
      zone: selectedItem.zone,
      position: { x: adjustedX, y: adjustedY },
      variant: selectedItem.variant || 'default',
      size: selectedItem.size || 'medium'
    }

    const newDecorations = [...placedDecorations, newDecoration]
    updateHistory(newDecorations)

    // Clear selection after placement on mobile for easier workflow
    setSelectedItem(null)
    setIsPlacing(false)
  }

  const handleDecorationClick = (decorationId: string, event: React.MouseEvent) => {
    event.stopPropagation()

    if (isDeleting) {
      const newDecorations = placedDecorations.filter(item => item.id !== decorationId)
      updateHistory(newDecorations)
      return
    }
    
    // Toggle selection
    if (event.ctrlKey || event.metaKey) {
      setSelectedDecorations(prev => {
        const newSet = new Set(prev)
        if (newSet.has(decorationId)) {
          newSet.delete(decorationId)
        } else {
          newSet.add(decorationId)
        }
        return newSet
      })
    } else {
      setSelectedDecorations(new Set([decorationId]))
    }
  }
  
  const handleDecorationMouseDown = (decorationId: string, event: React.MouseEvent) => {
    if (isDeleting) return
    
    event.preventDefault()
    event.stopPropagation()
    
    // If decoration isn't selected, select it
    if (!selectedDecorations.has(decorationId)) {
      setSelectedDecorations(new Set([decorationId]))
    }
    
    // Start dragging
    const decoration = placedDecorations.find(d => d.id === decorationId)
    if (decoration && decoration.position) {
      const rect = event.currentTarget.getBoundingClientRect()
      const canvasRect = event.currentTarget.closest('.relative')?.getBoundingClientRect()
      if (canvasRect) {
        setDragOffset({
          x: event.clientX - canvasRect.left - decoration.position.x,
          y: event.clientY - canvasRect.top - decoration.position.y
        })
      }
      setDraggedDecoration(decorationId)
    }
  }
  
  const handleDecorationMouseMove = React.useCallback((event: MouseEvent) => {
    if (!draggedDecoration) return

    const canvasElement = document.querySelector('.decoration-canvas')
    if (!canvasElement) return

    const rect = canvasElement.getBoundingClientRect()
    const x = event.clientX - rect.left - dragOffset.x
    const y = event.clientY - rect.top - dragOffset.y

    // Constrain to canvas bounds
    const adjustedX = Math.max(0, Math.min(x, 500 - 24))
    const adjustedY = Math.max(0, Math.min(y, 350 - 24))

    // Use functional setState to avoid stale closure
    setPlacedDecorations(prev => prev.map(decoration => {
      if (selectedDecorations.has(decoration.id)) {
        return {
          ...decoration,
          position: { ...decoration.position, x: adjustedX, y: adjustedY }
        }
      }
      return decoration
    }))
  }, [draggedDecoration, dragOffset, selectedDecorations])
  
  const handleDecorationMouseUp = React.useCallback(() => {
    if (draggedDecoration) {
      // Save current state to history using the ref to get latest decorations
      updateHistory([...placedDecorationsRef.current])
    }
    setDraggedDecoration(null)
    setDragOffset({x: 0, y: 0})
  }, [draggedDecoration])
  
  // Add global mouse event listeners for decoration dragging
  useEffect(() => {
    if (draggedDecoration) {
      document.addEventListener('mousemove', handleDecorationMouseMove)
      document.addEventListener('mouseup', handleDecorationMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleDecorationMouseMove)
        document.removeEventListener('mouseup', handleDecorationMouseUp)
      }
    }
  }, [draggedDecoration, handleDecorationMouseMove, handleDecorationMouseUp])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere with input elements
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          setSelectedDecorations(new Set())
          setIsPlacing(false)
          setSelectedItem(null)
          setIsDeleting(false)
          break
          
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          handleDeleteSelected()
          break
          
        case 'a':
        case 'A':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleSelectAll()
          }
          break
          
        case 'z':
        case 'Z':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            if (event.shiftKey) {
              redo()
            } else {
              undo()
            }
          }
          break
          
        case 'y':
        case 'Y':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            redo()
          }
          break
          
        case 'd':
        case 'D':
          event.preventDefault()
          handleDeleteToggle()
          break
          
        case 'r':
        case 'R':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleReset()
          }
          break
          
        case 's':
        case 'S':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleSave()
          }
          break
          
        // Category shortcuts (1-9+)
        case '1': setSelectedCategory('plants'); break
        case '2': setSelectedCategory('paths'); break
        case '3': setSelectedCategory('features'); break
        case '4': setSelectedCategory('furniture'); break
        case '5': setSelectedCategory('lighting'); break
        case '6': setSelectedCategory('water'); break
        case '7': setSelectedCategory('structures'); break
        case '8': setSelectedCategory('atmosphere'); break
        case '9': setSelectedCategory('house'); break

        // Grid system shortcuts
        case 'g':
        case 'G':
          event.preventDefault()
          toggleGrid()
          break

        case 's':
        case 'S':
          // Only toggle snapping if not already used for save
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            toggleSnapping()
          }
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedDecorations, history, placedDecorations])

  const handleDeleteToggle = () => {
    setIsDeleting(!isDeleting)
    setIsPlacing(false)
    setSelectedItem(null)
    setPreviewPosition(null)
    setSelectedDecorations(new Set()) // Clear selections when entering delete mode
  }
  
  const handleDeleteSelected = () => {
    if (selectedDecorations.size === 0) return

    const newDecorations = placedDecorations.filter(item => !selectedDecorations.has(item.id))
    updateHistory(newDecorations)
    setSelectedDecorations(new Set())
  }
  
  const handleSelectAll = () => {
    setSelectedDecorations(new Set(placedDecorations.map(d => d.id)))
  }
  
  const handleDeselectAll = () => {
    setSelectedDecorations(new Set())
  }

  // Throttled mousemove handler for better performance (60fps = 16ms)
  const lastMouseMoveTime = React.useRef(0)
  const handleCanvasMouseMove = (event: React.MouseEvent) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastMouseMoveTime.current

    // Throttle to ~60fps (16ms) for better performance
    if (timeSinceLastUpdate < 16) return
    lastMouseMoveTime.current = now

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Only update mouse position if grid is visible (for magnetic grid visualization)
    if (gridConfig.showGrid) {
      setMousePosition({ x, y })
    }

    if ((!isPlacing || !selectedItem) && !isDragging) {
      clearPreview()
      return
    }

    const itemToPreview = draggedItem || selectedItem
    if (!itemToPreview || itemToPreview.type === 'sky' || itemToPreview.type === 'house_custom' || itemToPreview.type === 'house_template' || itemToPreview.type === 'house_color') {
      clearPreview()
      return
    }

    // Update snap preview
    updatePreview(
      x,
      y,
      itemToPreview.type,
      itemToPreview.id,
      itemToPreview.size || 'medium'
    )
  }

  const handleCanvasMouseLeave = () => {
    setMousePosition(undefined)
    clearPreview()
  }
  
  const handleDragStart = (item: any) => {
    if (item.type === 'sky' || item.type === 'house_custom' || item.type === 'house_template' || item.type === 'house_color') return
    setDraggedItem(item)
    setIsDragging(true)
  }
  
  const handleDragEnd = () => {
    setDraggedItem(null)
    setIsDragging(false)
    setPreviewPosition(null)
  }
  
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }
  
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    if (!draggedItem) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Adjust coordinates to be relative to the canvas container
    const adjustedX = Math.max(0, Math.min(x - 12, 500 - 24))
    const adjustedY = Math.max(0, Math.min(y - 12, 350 - 24))

    const newDecoration: DecorationItem = {
      id: `${draggedItem.id}_${Date.now()}`,
      name: draggedItem.name || draggedItem.id,
      type: draggedItem.type,
      zone: draggedItem.zone,
      position: { x: adjustedX, y: adjustedY },
      variant: draggedItem.variant || 'default',
      size: 'medium'
    }

    const newDecorations = [...placedDecorations, newDecoration]
    updateHistory(newDecorations)

    handleDragEnd()
  }

  const handleSave = async () => {
    try {
      // Transform decorations to the format expected by the API
      const decorationData = placedDecorations
        .filter(item => item.position) // Only include items with valid positions
        .map(item => ({
          decorationType: item.type,
          decorationId: item.id.split('_').slice(0, -1).join('_'), // Remove timestamp
          zone: item.zone,
          positionX: item.position!.x,
          positionY: item.position!.y,
          layer: item.position!.layer || 1,
          variant: item.variant || 'default',
          size: item.size || 'medium'
        }));

      const response = await fetch('/api/home/decorations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          decorations: decorationData,
          atmosphere: atmosphere,
          houseCustomizations: houseCustomizations,
          template: currentTemplate,
          palette: currentPalette
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save decorations');
      }

      // Call the original onSave callback
      onSave({
        decorations: placedDecorations,
        houseCustomizations: houseCustomizations,
        atmosphere: atmosphere,
        template: currentTemplate,
        palette: currentPalette
      });
    } catch (error) {
      console.error('Error saving decorations:', error);
      alert('Failed to save decorations. Please try again.');
    }
  }

  const handleReset = () => {
    updateHistory([])
  }

  const handleThemeSelection = (template: HouseTemplate, palette: ColorPalette) => {
    // Check if user has custom colors that would be lost when applying theme
    const hasImportantCustomColors = houseCustomizations.wallColor || houseCustomizations.roofColor || 
                                    houseCustomizations.trimColor || houseCustomizations.windowColor || 
                                    houseCustomizations.detailColor

    if (hasImportantCustomColors) {
      // User has custom colors - show confirmation modal
      setShowThemeConfirm({show: true, template, palette})
    } else {
      // No custom colors - apply theme immediately
      applyThemeDirectly(template, palette)
    }
  }

  const applyThemeDirectly = (template: HouseTemplate, palette: ColorPalette) => {
    setCurrentTemplate(template)
    setCurrentPalette(palette)
    
    // Convert theme palette to explicit custom colors so they get saved to database
    const paletteColors = PALETTE_COLORS[palette]
    setHouseCustomizations({
      windowStyle: 'default',
      doorStyle: 'default',
      roofTrim: 'default',
      wallColor: paletteColors.base,      // theme wall color
      roofColor: paletteColors.primary,   // theme roof color
      trimColor: paletteColors.secondary, // theme trim color
      windowColor: paletteColors.accent,  // theme window color
      detailColor: paletteColors.detail   // theme detail color
    })
  }

  const handleThemeConfirmApply = () => {
    // User wants to apply theme - convert theme palette to explicit custom colors
    const paletteColors = PALETTE_COLORS[showThemeConfirm.palette]
    
    setCurrentTemplate(showThemeConfirm.template)
    setCurrentPalette(showThemeConfirm.palette)
    
    // Set theme colors as explicit custom colors so they get saved to database
    setHouseCustomizations({
      windowStyle: 'default',
      doorStyle: 'default',
      roofTrim: 'default',
      wallColor: paletteColors.base,      // theme wall color
      roofColor: paletteColors.primary,   // theme roof color
      trimColor: paletteColors.secondary, // theme trim color
      windowColor: paletteColors.accent,  // theme window color
      detailColor: paletteColors.detail   // theme detail color
    })
    
    setShowThemeConfirm({show: false, template: 'cottage_v1', palette: 'thread_sage'})
  }

  const handleThemeConfirmKeep = () => {
    // User wants to keep custom colors - only update template/palette, custom colors remain
    setCurrentTemplate(showThemeConfirm.template)
    setCurrentPalette(showThemeConfirm.palette)
    setHouseCustomizations(prev => ({
      ...prev,
      windowStyle: 'default',
      doorStyle: 'default', 
      roofTrim: 'default'
      // Keep wallColor, roofColor, trimColor, windowColor, detailColor intact
      // HouseSVG will blend custom colors with new theme palette
    }))
    setShowThemeConfirm({show: false, template: 'cottage_v1', palette: 'thread_sage'})
  }

  // Generate all available items for mobile palette
  const allAvailableItems = useMemo(() => {
    const items: any[] = []
    
    // Add regular decoration items
    Object.entries(availableDecorations).forEach(([category, categoryItems]) => {
      categoryItems.forEach(item => {
        items.push({ ...item, category })
      })
    })
    
    // Add themes
    items.push(
      { id: 'cottage_v1_thread_sage', name: 'Thread Sage Cottage', type: 'theme', category: 'themes' },
      { id: 'cottage_v1_charcoal_nights', name: 'Charcoal Nights Cottage', type: 'theme', category: 'themes' },
      { id: 'cottage_v1_pixel_petals', name: 'Pixel Petals Cottage', type: 'theme', category: 'themes' }
    )
    
    // Add templates 
    items.push(
      { id: 'cottage_v1', name: 'Cozy Cottage', type: 'template', category: 'templates' },
      { id: 'modern_v1', name: 'Modern Home', type: 'template', category: 'templates' },
      { id: 'townhouse_v1', name: 'City Townhouse', type: 'template', category: 'templates' }
    )
    
    // Add colors
    items.push(
      { id: 'wall_color', name: 'Wall Color', type: 'color', category: 'colors' },
      { id: 'roof_color', name: 'Roof Color', type: 'color', category: 'colors' },
      { id: 'trim_color', name: 'Trim Color', type: 'color', category: 'colors' }
    )
    
    return items
  }, [availableDecorations])

  // Show loading state while decorations are being fetched
  if (decorationsLoading) {
    return (
      <div className="bg-gradient-to-b from-thread-paper to-thread-cream flex flex-col min-h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-thread-pine mx-auto mb-4"></div>
          <p className="text-thread-sage">Loading decorations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-thread-paper to-thread-cream flex flex-col min-h-full">
      {/* Top Toolbar - Mobile Responsive */}
      <div className={`flex items-center justify-between bg-white border-b border-gray-200 shadow-sm ${
        isMobile ? 'px-4 py-3' : 'px-6 py-4'
      }`}>
        <div className="flex items-center gap-2">
          <h2 className={`font-headline font-bold text-thread-pine flex items-center gap-2 ${
            isMobile ? 'text-lg' : 'text-xl'
          }`}>
            <PixelIcon name="paint-bucket" size={isMobile ? 20 : 24} /> {isMobile ? 'Decorate' : 'Decorate Your Home'}
          </h2>
          {!isMobile && (
            <span className="text-sm text-thread-sage bg-thread-cream px-3 py-1 rounded-full">
              @{username}&apos;s Pixel Home
            </span>
          )}
        </div>
        
        <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
          {/* Selection controls - desktop only (mobile uses floating action bar) */}
          {!isMobile && selectedDecorations.size > 0 && (
            <>
              <span className="h-9 flex items-center text-sm text-thread-sage bg-thread-cream rounded px-2 flex-shrink-0 whitespace-nowrap">
                {selectedDecorations.size} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                className="bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors font-medium flex items-center justify-center flex-shrink-0 h-9 w-9"
                title="Delete Selected (Del)"
              >
                🗑️
              </button>
              <button
                onClick={handleDeselectAll}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium flex items-center justify-center gap-1 flex-shrink-0 whitespace-nowrap h-9 px-3"
                title="Deselect All"
              >
                ✕ Deselect
              </button>
            </>
          )}
          
          {!isMobile && (
            <>
              <button
                onClick={undo}
                disabled={history.past.length === 0}
                className="h-9 px-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 flex-shrink-0 whitespace-nowrap"
                title="Undo (Ctrl+Z)"
              >
                ↶ Undo
              </button>

              <button
                onClick={redo}
                disabled={history.future.length === 0}
                className="h-9 px-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 flex-shrink-0 whitespace-nowrap"
                title="Redo (Ctrl+Shift+Z)"
              >
                ↷ Redo
              </button>

              <button
                onClick={handleSelectAll}
                disabled={placedDecorations.length === 0}
                className="h-9 px-3 border border-thread-sage text-thread-sage hover:bg-thread-cream rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 whitespace-nowrap"
                title="Select All (Ctrl+A)"
              >
                Select All
              </button>

              <button
                onClick={handleDeleteToggle}
                className={`h-9 w-9 rounded-lg font-medium transition-colors flex items-center justify-center flex-shrink-0 ${
                  isDeleting
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'border border-red-500 text-red-500 hover:bg-red-50'
                }`}
                title={isDeleting ? 'Exit Delete Mode (Esc)' : 'Delete Mode (D)'}
              >
                🗑️
              </button>

              <button
                onClick={handleReset}
                className="h-9 w-9 border border-thread-sage text-thread-sage hover:bg-thread-cream rounded-lg transition-colors font-medium flex items-center justify-center flex-shrink-0"
                title="Reset All (Ctrl+R)"
              >
                🔄
              </button>

              {/* Grid controls */}
              <div className="flex items-center gap-2 border-l border-gray-300 pl-2">
                <button
                  onClick={toggleGrid}
                  className={`h-9 w-9 rounded-lg font-medium transition-colors flex items-center justify-center flex-shrink-0 ${
                    gridConfig.showGrid
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'border border-blue-500 text-blue-500 hover:bg-blue-50'
                  }`}
                  title="Toggle Grid Overlay (G)"
                >
                  ⊞
                </button>
                <button
                  onClick={toggleSnapping}
                  className={`h-9 w-9 rounded-lg font-medium transition-colors flex items-center justify-center flex-shrink-0 ${
                    isSnapping
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'border border-green-500 text-green-500 hover:bg-green-50'
                  }`}
                  title="Toggle Magnetic Snapping (S)"
                >
                  🧲
                </button>
              </div>
            </>
          )}
          
          <button
            onClick={onCancel}
            className={`border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium flex-shrink-0 ${
              isMobile ? 'w-9 h-9 flex items-center justify-center text-sm' : 'h-9 w-9 flex items-center justify-center'
            }`}
            title="Return to Home Page"
          >
            <PixelIcon name="home" />
          </button>

          <button
            onClick={() => {
              const code = prompt('Enter claim code:')
              if (code) {
                window.location.href = `/claim/${code}`
              }
            }}
            className={`bg-purple-500 text-white hover:bg-purple-600 rounded-lg font-medium transition-colors flex-shrink-0 ${
              isMobile ? 'w-9 h-9 flex items-center justify-center text-sm' : 'h-9 w-9 flex items-center justify-center'
            }`}
            title="Claim Exclusive Items"
          >
            🎁
          </button>

          <button
            onClick={handleSave}
            className={`bg-thread-sage text-thread-paper hover:bg-thread-pine rounded-lg font-medium btn-save btn-hover-lift transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 whitespace-nowrap ${
              isMobile ? 'px-3 h-9 text-sm' : 'h-9 px-4'
            }`}
            title="Save Changes (Ctrl+S)"
          >
            <PixelIcon name="save" /> Save
          </button>
        </div>
      </div>

      {/* Main Canvas Area - Mobile Responsive */}
      <div className={`flex-1 flex items-center justify-center relative ${
        isMobile ? 'p-2' : 'p-8'
      }`}>
        <div
          className={`decoration-canvas relative house-canvas gpu-accelerated ${
            draggedDecoration ? 'cursor-grabbing' :
            isDragging ? 'cursor-grabbing' :
            isPlacing ? (isMobile ? 'cursor-pointer' : 'cursor-crosshair') :
            isDeleting ? 'cursor-pointer' :
            'cursor-default'
          }`}
          style={isMobile ? { width: '100%', maxWidth: CANVAS_WIDTH } : undefined}
          onClick={!isMobile ? handleCanvasClick : undefined}
          onMouseMove={!isMobile ? handleCanvasMouseMove : undefined}
          onMouseLeave={!isMobile ? handleCanvasMouseLeave : undefined}
          onDragOver={!isMobile ? handleDragOver : undefined}
          onDrop={!isMobile ? handleDrop : undefined}
        >
          <EnhancedHouseCanvas
            template={currentTemplate}
            palette={currentPalette}
            decorations={placedDecorations.filter(d => ['plant', 'path', 'feature', 'seasonal', 'furniture', 'lighting', 'water', 'structure'].includes(d.type)) as CanvasDecorationItem[]}
            houseCustomizations={houseCustomizations}
            atmosphere={atmosphere}
            isDecorationMode={true}
            onDecorationClick={handleDecorationClick}
            onDecorationMouseDown={!isMobile ? handleDecorationMouseDown : undefined}
            className="shadow-2xl"
            selectedDecorations={selectedDecorations}
          />

          {/* Grid overlay */}
          {!isMobile && (
            <MagneticGridOverlay
              config={gridConfig}
              visible={gridConfig.showGrid}
              mousePosition={mousePosition}
              className="absolute inset-0"
            />
          )}

          {/* Touch Decoration Placer for Mobile */}
          {isMobile && (
            <TouchDecorationPlacer
              onTouchPlace={handleTouchPlace}
              selectedDecoration={selectedItem}
              canvasWidth={500}
              canvasHeight={350}
              className="touch-decoration-overlay"
              onTouchSelect={(decorationIds) => {
                setSelectedDecorations(new Set(decorationIds))
              }}
              onTouchDelete={(decorationId) => {
                const newDecorations = placedDecorations.filter(item => item.id !== decorationId)
                updateHistory(newDecorations)
              }}
              onTouchMove={(decorationId, x, y) => {
                const newDecorations = placedDecorations.map(decoration => {
                  if (decoration.id === decorationId) {
                    return {
                      ...decoration,
                      position: { ...decoration.position, x, y }
                    }
                  }
                  return decoration
                })
                setPlacedDecorations(newDecorations)
              }}
              decorations={placedDecorations
                .filter(d => d.position)
                .map(d => ({
                  id: d.id,
                  position: d.position!
                }))}
              isDeleteMode={isDeleting}
            />
          )}
          
          {/* Simple selection indicators */}
          {placedDecorations.map(decoration => {
            if (!selectedDecorations.has(decoration.id) || !decoration.position) return null
            return (
              <div
                key={`selection-${decoration.id}`}
                className="absolute pointer-events-none"
                style={{
                  left: decoration.position.x - 6,
                  top: decoration.position.y - 6,
                  width: 36,
                  height: 36,
                  zIndex: 15
                }}
              >
                {/* Simple static border */}
                <div className="absolute inset-0 border-2 border-blue-500 rounded-full" />
              </div>
            )
          })}
          
          {/* Simple preview decoration */}
          {(snapPreview || previewPosition) && (selectedItem || draggedItem) && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: snapPreview?.position.pixelX || previewPosition?.x || 0,
                top: snapPreview?.position.pixelY || previewPosition?.y || 0,
                zIndex: 20,
                opacity: 0.7
              }}
            >
              {(() => {
                const previewItem = draggedItem || selectedItem
                if (!previewItem || previewItem.type === 'sky' || previewItem.type === 'house_custom' || previewItem.type === 'house_template' || previewItem.type === 'house_color') return null
                return (
                  <DecorationSVG
                    decorationType={previewItem.type}
                    decorationId={previewItem.id}
                    variant="default"
                    size={previewItem.size || "medium"}
                  />
                )
              })()
              }
            </div>
          )}
        </div>
        
        {/* Enhanced status overlay */}
        <div className={`absolute bg-white bg-opacity-95 rounded-xl shadow-lg border border-gray-200 backdrop-blur-sm ${
          isMobile ? 'top-2 left-2 px-3 py-2' : 'top-4 left-4 px-4 py-2'
        }`}>
          <div className={`text-gray-700 font-medium flex items-center gap-2 ${
            isMobile ? 'text-xs' : 'text-sm'
          }`}>
            <div className={`w-2 h-2 rounded-full ${placedDecorations.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            {placedDecorations.length} decoration{placedDecorations.length !== 1 ? 's' : ''} placed
          </div>
        </div>

        {/* Floating Cancel Button - appears when placing items */}
        {isPlacing && selectedItem && (
          <button
            onClick={() => {
              setSelectedItem(null)
              setIsPlacing(false)
            }}
            className={`absolute bg-red-500 text-white rounded-lg shadow-lg border-2 border-white hover:bg-red-600 active:scale-95 transition-all font-medium flex items-center gap-2 ${
              isMobile ? 'bottom-2 left-1/2 -translate-x-1/2 px-4 py-2 text-sm' : 'top-4 right-4 px-4 py-2'
            }`}
            style={{ zIndex: 30 }}
          >
            <span className="text-lg">✕</span>
            <span>{isMobile ? 'Cancel' : 'Cancel Placement'}</span>
          </button>
        )}

        {/* Delete Mode Indicator Banner - Always visible when in delete mode */}
        {isDeleting && (
          <div
            className={`absolute bg-red-500 text-white rounded-lg shadow-lg border-2 border-white backdrop-blur-sm flex items-center gap-2 font-medium ${
              isMobile ? 'top-2 left-2 px-3 py-2 text-sm' : 'bottom-4 left-1/2 -translate-x-1/2 px-4 py-2'
            }`}
            style={{ zIndex: 35 }}
          >
            <span className="text-lg">🗑️</span>
            <span>Delete Mode Active</span>
            <button
              onClick={() => setIsDeleting(false)}
              className={`${isMobile ? 'ml-1' : 'ml-2'} hover:bg-red-600 active:bg-red-700 rounded px-2 py-1 transition-colors flex items-center gap-1 text-xs border border-white border-opacity-50 touch-manipulation`}
            >
              <span>✕</span>
              <span>Exit</span>
            </button>
          </div>
        )}

        {/* Currently Placing Status Banner */}
        {isPlacing && selectedItem && (
          <div
            className={`absolute bg-blue-500 text-white rounded-lg shadow-lg border-2 border-white backdrop-blur-sm flex items-center gap-2 ${
              isMobile ? 'top-2 left-2 px-3 py-2' : 'bottom-4 left-1/2 -translate-x-1/2 px-4 py-2'
            }`}
            style={{ zIndex: 30 }}
          >
            {!isMobile && (
              <DecorationIcon
                type={selectedItem.type as "path" | "feature" | "plant" | "furniture" | "lighting" | "water" | "structure" | "sky" | "seasonal" | "house_custom" | "house_template" | "house_color"}
                id={selectedItem.id}
                size={24}
                className="drop-shadow-sm"
                color={selectedItem.color}
                iconSvg={selectedItem.iconSvg}
              />
            )}
            <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {isMobile ? selectedItem.name : (
                <>Placing: <span className="font-bold">{selectedItem.name}</span></>
              )}
            </span>
            {!isMobile && (
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setIsPlacing(false)
                }}
                className="ml-2 hover:bg-blue-600 rounded px-2 py-1 transition-colors flex items-center gap-1 text-sm border border-white border-opacity-50"
              >
                <span>✕</span>
                <span>Stop</span>
              </button>
            )}
          </div>
        )}

        {/* Color Picker Panel - Appears when house_color item is selected */}
        {selectedItem?.type === 'house_color' && (
          <div
            className={`absolute bg-white rounded-lg shadow-xl border-2 border-blue-300 backdrop-blur-sm ${
              isMobile ? 'bottom-[calc(20rem+0.5rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)]' : 'bottom-4 left-1/2 -translate-x-1/2 min-w-[400px]'
            }`}
            style={{ zIndex: 40 }}
          >
            <div className={`flex flex-col ${isMobile ? 'p-3' : 'p-4'} gap-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎨</span>
                  <span className={`font-semibold text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                    {selectedItem.name}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-gray-700 active:scale-95 transition-all p-1 touch-manipulation"
                  aria-label="Close color picker"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="color-input" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Pick Color:
                </label>
                <input
                  id="color-input"
                  type="color"
                  value={
                    selectedItem.id === 'wall_color' ? (houseCustomizations.wallColor || selectedItem.color) :
                    selectedItem.id === 'roof_color' ? (houseCustomizations.roofColor || selectedItem.color) :
                    selectedItem.id === 'trim_color' ? (houseCustomizations.trimColor || selectedItem.color) :
                    selectedItem.id === 'window_color' ? (houseCustomizations.windowColor || selectedItem.color) :
                    selectedItem.id === 'detail_color' ? (houseCustomizations.detailColor || selectedItem.color) :
                    selectedItem.color || '#A18463'
                  }
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-16 h-10 border-2 border-gray-300 rounded cursor-pointer touch-manipulation"
                  style={{ minWidth: '48px', minHeight: '48px' }}
                />
                <input
                  type="text"
                  value={
                    selectedItem.id === 'wall_color' ? (houseCustomizations.wallColor || selectedItem.color) :
                    selectedItem.id === 'roof_color' ? (houseCustomizations.roofColor || selectedItem.color) :
                    selectedItem.id === 'trim_color' ? (houseCustomizations.trimColor || selectedItem.color) :
                    selectedItem.id === 'window_color' ? (houseCustomizations.windowColor || selectedItem.color) :
                    selectedItem.id === 'detail_color' ? (houseCustomizations.detailColor || selectedItem.color) :
                    selectedItem.color || '#A18463'
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      handleColorChange(value)
                    }
                  }}
                  placeholder="#A18463"
                  maxLength={7}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                  style={{ minHeight: '48px' }}
                />
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Changes preview in real-time. Click &quot;Save&quot; at top to keep your changes.
              </p>
            </div>
          </div>
        )}

        {/* Mobile Quick Actions */}
        {isMobile && (
          <div className="absolute top-2 right-2 flex flex-col gap-3">
            <button
              onClick={undo}
              disabled={history.past.length === 0}
              className="w-12 h-12 bg-white bg-opacity-95 border border-gray-200 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg backdrop-blur-sm touch-manipulation active:scale-95 text-lg"
            >
              ↶
            </button>
            <button
              onClick={redo}
              disabled={history.future.length === 0}
              className="w-12 h-12 bg-white bg-opacity-95 border border-gray-200 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg backdrop-blur-sm touch-manipulation active:scale-95 text-lg"
            >
              ↷
            </button>
            <button
              onClick={handleReset}
              className="w-12 h-12 bg-white bg-opacity-95 border border-gray-200 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm touch-manipulation active:scale-95"
            >
              🔄
            </button>
          </div>
        )}
      </div>

      {/* Mobile Selection Action Bar - Floats above palette when items selected */}
      {isMobile && selectedDecorations.size > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between shadow-lg">
          <span className="text-sm font-medium text-thread-pine">
            {selectedDecorations.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              className="h-10 px-4 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 touch-manipulation active:scale-95"
            >
              🗑️ Delete
            </button>
            <button
              onClick={handleDeselectAll}
              className="h-10 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium flex items-center justify-center touch-manipulation active:scale-95"
            >
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      {/* Bottom Decoration Palette - Unified Component */}
      <div className={`bg-white border-t border-gray-200 shadow-lg ${
        isMobile ? 'h-96 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]' : 'h-96'
      }`}>
        {selectedCategory === 'themes' ? (
          <div className="h-full flex flex-col">
            {/* Category Navigation - Same as DecorationPalette */}
            <div className="px-4 pt-4 pb-2">
              <div className={`flex ${isMobile ? 'overflow-x-auto -mx-4 px-4 pb-1' : 'flex-wrap'} gap-2`}>
                {[
                  { key: 'decorations', label: 'Decor', icon: 'paint-bucket' as const },
                  { key: 'house', label: 'House', icon: 'home' as const },
                  { key: 'themes', label: 'Themes', icon: 'sliders' as const },
                  { key: 'atmosphere', label: 'Sky', icon: 'cloud' as const },
                  { key: 'text', label: 'Text', icon: 'file' as const }
                ].map(({key, label, icon}) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`flex items-center gap-2 rounded-lg text-sm font-medium transition-all touch-manipulation active:scale-95 ${
                      isMobile ? 'flex-col px-3 py-2 min-w-[72px] flex-shrink-0' : 'px-3 py-2 whitespace-nowrap'
                    } ${
                      selectedCategory === key
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                    style={isMobile ? { minHeight: '64px' } : {}}
                  >
                    <PixelIcon name={icon} size={isMobile ? 20 : 16} />
                    <span className={isMobile ? 'text-xs font-medium whitespace-nowrap' : ''}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <ThemePicker
                onSelection={handleThemeSelection}
                initialTemplate={currentTemplate}
                initialPalette={currentPalette}
                showExplanation={false}
                showPreview={false}
                immediateSelection={true}
                className="space-y-4"
              />
            </div>
          </div>
        ) : selectedCategory === 'text' ? (
          <div className="h-full flex flex-col">
            {/* Category Navigation - Same as DecorationPalette */}
            <div className="px-4 pt-4 pb-2">
              <div className={`flex ${isMobile ? 'overflow-x-auto -mx-4 px-4 pb-1' : 'flex-wrap'} gap-2`}>
                {[
                  { key: 'decorations', label: 'Decor', icon: 'paint-bucket' as const },
                  { key: 'house', label: 'House', icon: 'home' as const },
                  { key: 'themes', label: 'Themes', icon: 'sliders' as const },
                  { key: 'atmosphere', label: 'Sky', icon: 'cloud' as const },
                  { key: 'text', label: 'Text', icon: 'file' as const }
                ].map(({key, label, icon}) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`flex items-center gap-2 rounded-lg text-sm font-medium transition-all touch-manipulation active:scale-95 ${
                      isMobile ? 'flex-col px-3 py-2 min-w-[72px] flex-shrink-0' : 'px-3 py-2 whitespace-nowrap'
                    } ${
                      selectedCategory === key
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                    style={isMobile ? { minHeight: '64px' } : {}}
                  >
                    <PixelIcon name={icon} size={isMobile ? 20 : 16} />
                    <span className={isMobile ? 'text-xs font-medium whitespace-nowrap' : ''}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="bg-thread-paper border border-thread-sage rounded-lg p-6">
                <h3 className="text-lg font-headline font-semibold text-thread-pine mb-4 flex items-center gap-2">
                  📝 House Text Settings
                </h3>

              {/* House Text Settings */}
              <div className="space-y-4">
                {/* House Title */}
                <div>
                  <label className="block text-sm font-medium text-thread-pine mb-2">
                    🏷️ House Title
                    <span className="text-xs text-thread-sage ml-2">(Appears above your house description - max 50 characters)</span>
                  </label>
                  <input
                    type="text"
                    value={houseCustomizations.houseTitle || ''}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 50) // Limit to 50 chars
                      setHouseCustomizations(prev => ({
                        ...prev,
                        houseTitle: value
                      }))
                    }}
                    placeholder="A Cozy Corner of ThreadStead (e.g., 'My Creative Space', 'Welcome to My World')"
                    maxLength={50}
                    className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent text-gray-900 bg-white touch-manipulation"
                    style={{ minHeight: '48px' }}
                  />
                  <div className="text-xs text-gray-700 text-right mt-1">
                    {(houseCustomizations.houseTitle || '').length}/50 characters
                  </div>
                </div>

                {/* House Sign Text */}
                <div>
                  <label className="block text-sm font-medium text-thread-pine mb-2">
                    🪧 House Sign
                    <span className="text-xs text-thread-sage ml-2">(Short text for your front door sign - max 20 characters)</span>
                  </label>
                  <input
                    type="text"
                    value={houseCustomizations.houseBoardText || ''}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 20) // Limit to 20 chars for sign
                      setHouseCustomizations(prev => ({
                        ...prev,
                        houseBoardText: value
                      }))
                    }}
                    placeholder="@{username} (e.g., 'Welcome!' or '@yourname')"
                    maxLength={20}
                    className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent text-gray-900 bg-white touch-manipulation"
                    style={{ minHeight: '48px' }}
                  />
                  <div className="text-xs text-gray-700 text-right mt-1">
                    {(houseCustomizations.houseBoardText || '').length}/20 characters
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : (
          <DecorationPalette
            items={availableDecorations}
            selectedItem={selectedItem}
            onItemSelect={handleItemSelect}
            isMobile={isMobile}
            className="h-full"
            onCategoryChange={setSelectedCategory}
          />
        )}

      </div>

      {/* Theme Confirmation Modal */}
      {showThemeConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🎨 Apply New Theme Colors?
            </h3>
            <p className="text-sm text-gray-700 mb-6">
              You have custom house colors set. Would you like to apply the new theme colors and replace your custom colors, or keep your current custom colors?
            </p>
            <div className="flex gap-3 pb-[env(safe-area-inset-bottom,0px)]">
              <button
                onClick={handleThemeConfirmApply}
                className="flex-1 px-4 py-3 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors font-medium touch-manipulation active:scale-95"
                style={{ minHeight: '48px' }}
              >
                Apply Theme Colors
              </button>
              <button
                onClick={handleThemeConfirmKeep}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium touch-manipulation active:scale-95"
                style={{ minHeight: '48px' }}
              >
                Keep My Colors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
