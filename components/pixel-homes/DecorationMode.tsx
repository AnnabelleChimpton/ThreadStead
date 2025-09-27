import React, { useState, useEffect, useMemo } from 'react'
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
  // Mobile detection and accessibility
  const isMobile = useIsMobile(768)
  const isTouch = useIsTouch()
  const prefersReducedMotion = usePrefersReducedMotion()
  
  const [placedDecorations, setPlacedDecorations] = useState<DecorationItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof BETA_ITEMS | 'themes' | 'text'>('plants')
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

  // Animation and feedback state
  const [animatedDecorations, setAnimatedDecorations] = useState<Map<string, 'place' | 'remove' | 'select' | 'hover'>>(new Map())
  const [deletionAnimations, setDeletionAnimations] = useState<Array<{id: string, position: {x: number, y: number}}>>([])
  const [actionFeedback, setActionFeedback] = useState<Array<{
    id: string,
    type: 'success' | 'error' | 'info' | 'warning',
    position: {x: number, y: number},
    message: string
  }>>([])
  const [recentlyPlaced, setRecentlyPlaced] = useState<Set<string>>(new Set())

  // Initialize snapping system
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
    enableSnapping: true,
    enableSpacingSuggestions: true
  })

  // Grid toggle functionality
  const toggleGrid = () => {
    setGridConfig(prev => ({ ...prev, showGrid: !prev.showGrid }))
  }

  // Animation and feedback helpers
  const addActionFeedback = (type: 'success' | 'error' | 'info' | 'warning', position: {x: number, y: number}, message: string) => {
    if (prefersReducedMotion) return // Skip animations for reduced motion preference

    const feedbackId = `feedback_${Date.now()}_${Math.random()}`
    const newFeedback = { id: feedbackId, type, position, message }

    setActionFeedback(prev => [...prev, newFeedback])

    // Auto-remove after animation duration
    setTimeout(() => {
      setActionFeedback(prev => prev.filter(f => f.id !== feedbackId))
    }, 2000)
  }

  const addDeletionAnimation = (position: {x: number, y: number}) => {
    if (prefersReducedMotion) return // Skip animations for reduced motion preference

    const animationId = `deletion_${Date.now()}_${Math.random()}`
    const newAnimation = { id: animationId, position }

    setDeletionAnimations(prev => [...prev, newAnimation])

    // Auto-remove after animation duration
    setTimeout(() => {
      setDeletionAnimations(prev => prev.filter(a => a.id !== animationId))
    }, 600)
  }

  const setDecorationAnimation = (decorationId: string, animationType: 'place' | 'remove' | 'select' | 'hover') => {
    if (prefersReducedMotion) return // Skip animations for reduced motion preference

    setAnimatedDecorations(prev => new Map(prev.set(decorationId, animationType)))

    // Auto-remove animation state after duration
    if (animationType === 'place') {
      setTimeout(() => {
        setAnimatedDecorations(prev => {
          const newMap = new Map(prev)
          newMap.delete(decorationId)
          return newMap
        })
        setRecentlyPlaced(prev => {
          const newSet = new Set(prev)
          newSet.delete(decorationId)
          return newSet
        })
      }, 800)
    }
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
      // Handle decoration placement
      setSelectedItem(item)
      setIsPlacing(true)
    }
  }

  const handleCanvasClick = (event: React.MouseEvent) => {
    if ((!isPlacing || !selectedItem) && !draggedItem) return

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

    // Add placement animation and feedback
    setDecorationAnimation(newDecoration.id, 'place')
    setRecentlyPlaced(prev => new Set(prev.add(newDecoration.id)))
    addActionFeedback('success', { x: snapResult.position.pixelX + 12, y: snapResult.position.pixelY - 20 }, 'Placed!')

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

    // Add placement animation and feedback for mobile
    setDecorationAnimation(newDecoration.id, 'place')
    setRecentlyPlaced(prev => new Set(prev.add(newDecoration.id)))
    addActionFeedback('success', { x: adjustedX + 12, y: adjustedY - 20 }, 'Placed!')

    // Clear selection after placement on mobile for easier workflow
    setSelectedItem(null)
    setIsPlacing(false)
  }

  const handleDecorationClick = (decorationId: string, event: React.MouseEvent) => {
    event.stopPropagation()

    if (isDeleting) {
      const decorationToDelete = placedDecorations.find(item => item.id === decorationId)
      if (decorationToDelete && decorationToDelete.position) {
        // Add deletion animation and feedback
        addDeletionAnimation(decorationToDelete.position)
        addActionFeedback('info', {
          x: decorationToDelete.position.x + 12,
          y: decorationToDelete.position.y - 20
        }, 'Deleted!')
      }

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
          setDecorationAnimation(decorationId, 'select')
        }
        return newSet
      })
    } else {
      setSelectedDecorations(new Set([decorationId]))
      setDecorationAnimation(decorationId, 'select')
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
  
  const handleDecorationMouseMove = (event: MouseEvent) => {
    if (!draggedDecoration) return
    
    const canvasElement = document.querySelector('.decoration-canvas')
    if (!canvasElement) return
    
    const rect = canvasElement.getBoundingClientRect()
    const x = event.clientX - rect.left - dragOffset.x
    const y = event.clientY - rect.top - dragOffset.y
    
    // Constrain to canvas bounds
    const adjustedX = Math.max(0, Math.min(x, 500 - 24))
    const adjustedY = Math.max(0, Math.min(y, 350 - 24))
    
    const newDecorations = placedDecorations.map(decoration => {
      if (selectedDecorations.has(decoration.id)) {
        return {
          ...decoration,
          position: { ...decoration.position, x: adjustedX, y: adjustedY }
        }
      }
      return decoration
    })
    setPlacedDecorations(newDecorations)
  }
  
  const handleDecorationMouseUp = () => {
    if (draggedDecoration) {
      // Save to history when drag ends
      updateHistory([...placedDecorations])
    }
    setDraggedDecoration(null)
    setDragOffset({x: 0, y: 0})
  }
  
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
  }, [draggedDecoration, dragOffset, selectedDecorations])
  
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

    // Add deletion animations for all selected decorations
    placedDecorations.forEach(decoration => {
      if (selectedDecorations.has(decoration.id) && decoration.position) {
        addDeletionAnimation(decoration.position)
      }
    })

    // Add feedback for bulk deletion
    if (selectedDecorations.size > 1) {
      const firstSelected = placedDecorations.find(d => selectedDecorations.has(d.id))
      if (firstSelected && firstSelected.position) {
        addActionFeedback('info', {
          x: firstSelected.position.x + 12,
          y: firstSelected.position.y - 40
        }, `Deleted ${selectedDecorations.size} items!`)
      }
    }

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

  const handleCanvasMouseMove = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Update mouse position for magnetic grid visualization
    setMousePosition({ x, y })

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

    // Add placement animation and feedback for drag and drop
    setDecorationAnimation(newDecoration.id, 'place')
    setRecentlyPlaced(prev => new Set(prev.add(newDecoration.id)))
    addActionFeedback('success', { x: adjustedX + 12, y: adjustedY - 20 }, 'Dropped!')

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
    Object.entries(BETA_ITEMS).forEach(([category, categoryItems]) => {
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
  }, [])

  return (
    <div className="bg-gradient-to-b from-thread-paper to-thread-cream flex flex-col min-h-full">
      {/* Top Toolbar - Mobile Responsive */}
      <div className={`flex items-center justify-between bg-white border-b border-gray-200 shadow-sm ${
        isMobile ? 'px-4 py-3' : 'px-6 py-4'
      }`}>
        <div className="flex items-center gap-2">
          <h2 className={`font-headline font-bold text-thread-pine ${
            isMobile ? 'text-lg' : 'text-xl'
          }`}>
            🎨 {isMobile ? 'Decorate' : 'Decorate Your Home'}
          </h2>
          {!isMobile && (
            <span className="text-sm text-thread-sage bg-thread-cream px-3 py-1 rounded-full">
              @{username}&apos;s Pixel Home
            </span>
          )}
        </div>
        
        <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
          {selectedDecorations.size > 0 && (
            <>
              <span className={`text-sm text-thread-sage bg-thread-cream rounded ${
                isMobile ? 'px-2 py-1' : 'px-2 py-1'
              }`}>
                {selectedDecorations.size} selected
              </span>
              {!isMobile && <span className="text-xs text-gray-500">Del to delete</span>}
              <button
                onClick={handleDeleteSelected}
                className={`bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors font-medium ${
                  isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'
                }`}
              >
                🗑️ {isMobile ? '' : 'Delete Selected'}
              </button>
              <button
                onClick={handleDeselectAll}
                className={`border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium ${
                  isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2'
                }`}
              >
                {isMobile ? '✕' : 'Deselect All'}
              </button>
            </>
          )}
          
          {!isMobile && (
            <>
              <button
                onClick={undo}
                disabled={history.past.length === 0}
                className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ↶ Undo
              </button>
              
              <button
                onClick={redo}
                disabled={history.future.length === 0}
                className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ↷ Redo
              </button>
              
              <button
                onClick={handleSelectAll}
                disabled={placedDecorations.length === 0}
                className="px-3 py-2 border border-thread-sage text-thread-sage hover:bg-thread-cream rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select All
              </button>
              
              <button
                onClick={handleDeleteToggle}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDeleting 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'border border-red-500 text-red-500 hover:bg-red-50'
                }`}
              >
                🗑️ {isDeleting ? 'Exit Delete' : 'Delete Mode'}
              </button>
              
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-thread-sage text-thread-sage hover:bg-thread-cream rounded-lg transition-colors font-medium"
              >
                🔄 Reset
              </button>

              {/* Grid controls */}
              <div className="flex items-center gap-2 border-l border-gray-300 pl-2">
                <button
                  onClick={toggleGrid}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    gridConfig.showGrid
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'border border-blue-500 text-blue-500 hover:bg-blue-50'
                  }`}
                  title="Toggle grid overlay"
                >
                  ⊞ Grid
                </button>
                <button
                  onClick={toggleSnapping}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    isSnapping
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'border border-green-500 text-green-500 hover:bg-green-50'
                  }`}
                  title="Toggle magnetic snapping"
                >
                  🧲 Snap
                </button>
              </div>
            </>
          )}
          
          <button
            onClick={onCancel}
            className={`border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium ${
              isMobile ? 'px-2 py-2 text-sm' : 'px-4 py-2'
            }`}
          >
            {isMobile ? '🏠' : '🏠 Return to Home Page'}
          </button>
          
          <button
            onClick={handleSave}
            className={`bg-thread-sage text-thread-paper hover:bg-thread-pine rounded-lg font-medium btn-save btn-hover-lift ${
              isMobile ? 'px-3 py-2 text-sm' : 'px-6 py-2'
            } ${prefersReducedMotion ? 'reduce-motion' : ''}`}
          >
            {isMobile ? '💾' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Main Canvas Area - Mobile Responsive */}
      <div className={`flex-1 flex items-center justify-center relative ${
        isMobile ? 'p-4' : 'p-8'
      }`}>
        <div 
          className={`decoration-canvas relative house-canvas gpu-accelerated ${
            draggedDecoration ? 'cursor-grabbing' :
            isDragging ? 'cursor-grabbing' : 
            isPlacing ? (isMobile ? 'cursor-pointer' : 'cursor-crosshair') : 
            isDeleting ? 'cursor-pointer' : 
            'cursor-default'
          } ${
            isMobile ? 'scale-75 sm:scale-90 md:scale-100' : ''
          }`}
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
            animatedDecorations={animatedDecorations}
            recentlyPlaced={recentlyPlaced}
            selectedDecorations={selectedDecorations}
            onAnimationComplete={(decorationId) => {
              setAnimatedDecorations(prev => {
                const newMap = new Map(prev)
                newMap.delete(decorationId)
                return newMap
              })
              setRecentlyPlaced(prev => {
                const newSet = new Set(prev)
                newSet.delete(decorationId)
                return newSet
              })
            }}
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


          {/* Deletion animations */}
          {deletionAnimations.map((animation) => (
            <DeletionAnimation
              key={animation.id}
              position={animation.position}
              onComplete={() => {
                setDeletionAnimations(prev => prev.filter(a => a.id !== animation.id))
              }}
            />
          ))}

          {/* Action feedback */}
          {actionFeedback.map((feedback) => (
            <ActionFeedback
              key={feedback.id}
              type={feedback.type}
              position={feedback.position}
              message={feedback.message}
              onComplete={() => {
                setActionFeedback(prev => prev.filter(f => f.id !== feedback.id))
              }}
            />
          ))}

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
                // Add selection animation for first decoration
                if (decorationIds.length > 0) {
                  setDecorationAnimation(decorationIds[0], 'select')
                }
              }}
              onTouchDelete={(decorationId) => {
                const decorationToDelete = placedDecorations.find(item => item.id === decorationId)
                if (decorationToDelete && decorationToDelete.position) {
                  addDeletionAnimation(decorationToDelete.position)
                  addActionFeedback('info', {
                    x: decorationToDelete.position.x + 12,
                    y: decorationToDelete.position.y - 20
                  }, 'Deleted!')
                }
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
          
          {/* Enhanced selection indicators with animation */}
          {placedDecorations.map(decoration => {
            if (!selectedDecorations.has(decoration.id) || !decoration.position) return null
            return (
              <div
                key={`selection-${decoration.id}`}
                className={`absolute pointer-events-none decoration-item selected ${prefersReducedMotion ? 'reduce-motion' : ''}`}
                style={{
                  left: decoration.position.x - 6,
                  top: decoration.position.y - 6,
                  width: 36,
                  height: 36,
                  zIndex: 15
                }}
              >
                {/* Selection ring with enhanced animation */}
                <div className="absolute inset-0 border-2 border-blue-500 rounded-full" 
                     style={{ animation: prefersReducedMotion ? 'none' : 'selectionPulse 2s infinite' }} />
                <div className="absolute inset-1 border border-blue-300 border-dashed rounded-full" 
                     style={{ animation: prefersReducedMotion ? 'none' : 'spin 3s linear infinite' }} />
                {/* Selection handles */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              </div>
            )
          })}
          
          {/* Enhanced preview decoration with snap feedback */}
          {(snapPreview || previewPosition) && (selectedItem || draggedItem) && (
            <div
              className={`absolute pointer-events-none decoration-item ${isDragging ? 'placing' : ''} ${prefersReducedMotion ? 'reduce-motion' : ''}`}
              style={{
                left: snapPreview?.position.pixelX || previewPosition?.x || 0,
                top: snapPreview?.position.pixelY || previewPosition?.y || 0,
                zIndex: 20,
                opacity: isDragging ? 0.9 : (snapPreview?.valid === false ? 0.4 : 0.7),
                transform: `scale(${isDragging ? 1.1 : (snapPreview?.snapType !== 'none' ? 1.05 : 1)})`,
                transition: prefersReducedMotion ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {(() => {
                const previewItem = draggedItem || selectedItem
                if (!previewItem || previewItem.type === 'sky' || previewItem.type === 'house_custom' || previewItem.type === 'house_template' || previewItem.type === 'house_color') return null
                return (
                  <>
                    <DecorationSVG
                      decorationType={previewItem.type}
                      decorationId={previewItem.id}
                      variant="default"
                      size={previewItem.size || "medium"}
                      className={`drop-shadow-lg ${snapPreview?.valid === false ? 'filter grayscale' : 'filter brightness-110'}`}
                    />
                    {/* Snap indicator */}
                    {snapPreview?.snapType !== 'none' && (
                      <div className={`absolute inset-0 border-2 rounded-full opacity-70 ${
                        snapPreview?.snapType === 'grid' ? 'border-blue-400' :
                        snapPreview?.snapType === 'spacing' ? 'border-green-400' :
                        'border-purple-400'
                      }`}>
                        {snapPreview?.snapType === 'grid' && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">⊞</span>
                          </div>
                        )}
                        {snapPreview?.snapType === 'spacing' && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">↔</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Invalid placement indicator */}
                    {snapPreview?.valid === false && (
                      <div className="absolute inset-0 border-2 border-red-400 border-dashed rounded-full opacity-70">
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✕</span>
                        </div>
                      </div>
                    )}
                    {/* Fallback placement hint for non-snapped items */}
                    {snapPreview?.snapType === 'none' && snapPreview?.valid !== false && (
                      <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-full opacity-50 animate-spin" style={{ animationDuration: '3s' }} />
                    )}
                  </>
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
        
        {/* Mobile Quick Actions */}
        {isMobile && (
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <button
              onClick={undo}
              disabled={history.past.length === 0}
              className="w-10 h-10 bg-white bg-opacity-95 border border-gray-200 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg backdrop-blur-sm touch-manipulation active:scale-95"
            >
              ↶
            </button>
            <button
              onClick={redo}
              disabled={history.future.length === 0}
              className="w-10 h-10 bg-white bg-opacity-95 border border-gray-200 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg backdrop-blur-sm touch-manipulation active:scale-95"
            >
              ↷
            </button>
            <button
              onClick={handleReset}
              className="w-10 h-10 bg-white bg-opacity-95 border border-gray-200 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm touch-manipulation active:scale-95"
            >
              🔄
            </button>
          </div>
        )}
      </div>

      {/* Bottom Decoration Palette - Unified Component */}
      <div className={`bg-white border-t border-gray-200 shadow-lg ${
        isMobile ? 'h-80' : 'h-96'
      }`}>
        {selectedCategory === 'themes' ? (
          <div className="h-full p-4 overflow-y-auto">
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
        ) : selectedCategory === 'text' ? (
          <div className="h-full p-4 overflow-y-auto">
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
                    className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent"
                  />
                  <div className="text-xs text-thread-sage text-right mt-1">
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
                    className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent"
                  />
                  <div className="text-xs text-thread-sage text-right mt-1">
                    {(houseCustomizations.houseBoardText || '').length}/20 characters
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DecorationPalette
            items={BETA_ITEMS as unknown as Record<string, DecorationItem[]>}
            selectedItem={selectedItem}
            onItemSelect={handleItemSelect}
            isMobile={isMobile}
            className="h-full"
          />
        )}

      </div>

      {/* Theme Confirmation Modal */}
      {showThemeConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-thread-pine mb-4">
              🎨 Apply New Theme Colors?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              You have custom house colors set. Would you like to apply the new theme colors and replace your custom colors, or keep your current custom colors?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleThemeConfirmApply}
                className="flex-1 px-4 py-2 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors font-medium">
                Apply Theme Colors
              </button>
              <button
                onClick={handleThemeConfirmKeep}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium">
                Keep My Colors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
