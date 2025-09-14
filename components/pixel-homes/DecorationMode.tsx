import React, { useState, useEffect, useMemo } from 'react'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import DecorationIcon from './DecorationIcon'
import DecorationSVG from './DecorationSVG'
import ThemePicker from './ThemePicker'
import TouchDecorationPlacer from './TouchDecorationPlacer'
import MobileItemPalette from './MobileItemPalette'
import useIsMobile, { useIsTouch, usePrefersReducedMotion } from '../../hooks/useIsMobile'
import { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'

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
  type: 'plant' | 'path' | 'feature' | 'seasonal' | 'house_custom' | 'house_color'
  zone: 'front_yard' | 'house_facade' | 'background'
  position: { x: number; y: number; layer?: number }
  variant?: string
  size?: 'small' | 'medium' | 'large'
  color?: string  // For house color items
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

// Beta item collection - simple starter items
const BETA_ITEMS = {
  plants: [
    { id: 'roses_red', name: 'Red Roses', type: 'plant', zone: 'front_yard' },
    { id: 'daisies_white', name: 'White Daisies', type: 'plant', zone: 'front_yard' },
    { id: 'small_tree', name: 'Small Tree', type: 'plant', zone: 'front_yard' },
    { id: 'sunflowers', name: 'Sunflowers', type: 'plant', zone: 'front_yard' },
    { id: 'lavender', name: 'Lavender', type: 'plant', zone: 'front_yard' },
    { id: 'flower_pot', name: 'Flower Pot', type: 'plant', zone: 'front_yard' }
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
    
    // Adjust coordinates to be relative to the canvas container
    const adjustedX = Math.max(0, Math.min(x - 12, 500 - 24)) // Account for decoration size
    const adjustedY = Math.max(0, Math.min(y - 12, 350 - 24))
    
    const itemToPlace = draggedItem || selectedItem
    if (!itemToPlace || itemToPlace.type === 'sky' || itemToPlace.type === 'house_custom' || itemToPlace.type === 'house_template' || itemToPlace.type === 'house_color') return
    
    const newDecoration: DecorationItem = {
      id: `${itemToPlace.id}_${Date.now()}`,
      type: itemToPlace.type,
      zone: itemToPlace.zone,
      position: { x: adjustedX, y: adjustedY },
      variant: itemToPlace.variant || 'default',
      size: 'medium'
    }
    
    const newDecorations = [...placedDecorations, newDecoration]
    updateHistory(newDecorations)
    
    // Clear drag state
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
    if (decoration) {
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
          
        // Category shortcuts (1-7)
        case '1': setSelectedCategory('plants'); break
        case '2': setSelectedCategory('paths'); break
        case '3': setSelectedCategory('features'); break
        case '4': setSelectedCategory('atmosphere'); break
        case '5': setSelectedCategory('house'); break
        case '6': setSelectedCategory('templates'); break
        case '7': setSelectedCategory('colors'); break
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

  const handleCanvasMouseMove = (event: React.MouseEvent) => {
    if ((!isPlacing || !selectedItem) && !isDragging) {
      setPreviewPosition(null)
      return
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Adjust coordinates to be relative to the canvas container
    const adjustedX = Math.max(0, Math.min(x - 12, 500 - 24))
    const adjustedY = Math.max(0, Math.min(y - 12, 350 - 24))
    
    setPreviewPosition({ x: adjustedX, y: adjustedY })
  }

  const handleCanvasMouseLeave = () => {
    setPreviewPosition(null)
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
      const decorationData = placedDecorations.map(item => ({
        decorationType: item.type,
        decorationId: item.id.split('_').slice(0, -1).join('_'), // Remove timestamp
        zone: item.zone,
        positionX: item.position.x,
        positionY: item.position.y,
        layer: item.position.layer || 1,
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
            decorations={placedDecorations.filter(d => ['plant', 'path', 'feature', 'seasonal'].includes(d.type)) as CanvasDecorationItem[]}
            houseCustomizations={houseCustomizations}
            atmosphere={atmosphere}
            isDecorationMode={true}
            onDecorationClick={handleDecorationClick}
            onDecorationMouseDown={!isMobile ? handleDecorationMouseDown : undefined}
            className="shadow-2xl"
          />
          
          {/* Touch Decoration Placer for Mobile */}
          {isMobile && (
            <TouchDecorationPlacer
              onTouchPlace={handleTouchPlace}
              selectedDecoration={selectedItem}
              canvasWidth={500}
              canvasHeight={350}
              className="touch-decoration-overlay"
            />
          )}
          
          {/* Enhanced selection indicators with animation */}
          {placedDecorations.map(decoration => {
            if (!selectedDecorations.has(decoration.id)) return null
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
          
          {/* Preview decoration with enhanced animation */}
          {previewPosition && (selectedItem || draggedItem) && (
            <div
              className={`absolute pointer-events-none decoration-item ${isDragging ? 'placing' : ''} ${prefersReducedMotion ? 'reduce-motion' : ''}`}
              style={{
                left: previewPosition.x,
                top: previewPosition.y,
                zIndex: 20,
                opacity: isDragging ? 0.9 : 0.7,
                transform: `scale(${isDragging ? 1.1 : 1})`,
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
                      size="medium"
                      className="drop-shadow-lg filter brightness-110"
                    />
                    {/* Placement hint circle */}
                    <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-full opacity-50 animate-spin" style={{ animationDuration: '3s' }} />
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

      {/* Bottom Decoration Palette - Mobile Responsive */}
      <div className={`bg-white border-t border-gray-200 shadow-lg ${
        isMobile ? 'h-80' : 'max-h-96 min-h-0 overflow-y-auto'
      }`}>
        {isMobile ? (
          /* Mobile Item Palette */
          <MobileItemPalette
            items={allAvailableItems}
            selectedItem={selectedItem}
            onItemSelect={handleItemSelect}
            className="h-full"
          />
        ) : (
          /* Desktop Category Tabs and Items */
          <>
            {/* Category Tabs */}
            <div className="flex border-b border-gray-200 px-4">
          <button
            onClick={() => setSelectedCategory('themes')}
            className={`py-3 px-6 text-sm font-medium capitalize whitespace-nowrap transition-all ${
              selectedCategory === 'themes'
                ? 'border-b-2 border-thread-sage text-thread-pine bg-thread-cream'
                : 'text-thread-sage hover:text-thread-pine hover:bg-thread-paper'
            }`}
          >
            🎨 Themes
          </button>
          <button
            onClick={() => setSelectedCategory('text')}
            className={`py-3 px-6 text-sm font-medium capitalize whitespace-nowrap transition-all ${
              selectedCategory === 'text'
                ? 'border-b-2 border-thread-sage text-thread-pine bg-thread-cream'
                : 'text-thread-sage hover:text-thread-pine hover:bg-thread-paper'
            }`}
          >
            📝 Text
          </button>
          {Object.keys(BETA_ITEMS).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as keyof typeof BETA_ITEMS)}
              className={`py-3 px-6 text-sm font-medium capitalize whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'border-b-2 border-thread-sage text-thread-pine bg-thread-cream'
                  : 'text-thread-sage hover:text-thread-pine hover:bg-thread-paper'
              }`}
            >
              {category === 'house' ? '🏠 House' : 
               category === 'plants' ? '🌱 Plants' :
               category === 'paths' ? '🛤️ Paths' :
               category === 'features' ? '✨ Features' :
               category === 'atmosphere' ? '🌤️ Sky' : 
               category === 'templates' ? '🏘️ Templates' :
               category === 'colors' ? '🎨 Colors' : category}
            </button>
          ))}
        </div>

        {/* Decoration Grid - Larger previews */}
        <div className="p-4">
          {selectedCategory === 'themes' ? (
            <div className="max-w-4xl mx-auto">
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
            <div className="max-w-4xl mx-auto space-y-6">
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
                  
                  {/* House Description */}
                  <div>
                    <label className="block text-sm font-medium text-thread-pine mb-2">
                      🏠 House Description
                      <span className="text-xs text-thread-sage ml-2">(Appears below your house - max 200 characters)</span>
                    </label>
                    <textarea
                      value={houseCustomizations.houseDescription || ''}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 200) // Limit to 200 chars
                        setHouseCustomizations(prev => ({
                          ...prev,
                          houseDescription: value
                        }))
                      }}
                      placeholder="Describe your cozy home... (e.g., 'A welcoming place where stories are shared and friendships bloom.')"
                      rows={3}
                      maxLength={200}
                      className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent resize-none"
                    />
                    <div className="text-xs text-thread-sage text-right mt-1">
                      {(houseCustomizations.houseDescription || '').length}/200 characters
                    </div>
                  </div>
                  
                  {/* House Board Text */}
                  <div>
                    <label className="block text-sm font-medium text-thread-pine mb-2">
                      🪧 House Sign Text
                      <span className="text-xs text-thread-sage ml-2">(Appears on your house sign/board - max 30 characters)</span>
                    </label>
                    <input
                      type="text"
                      value={houseCustomizations.houseBoardText || ''}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 30) // Limit to 30 chars
                        setHouseCustomizations(prev => ({
                          ...prev,
                          houseBoardText: value
                        }))
                      }}
                      placeholder="Welcome! (e.g., 'Welcome Friends', 'Casa de Code', 'Home Sweet Home')"
                      maxLength={30}
                      className="w-full px-4 py-3 border border-thread-sage rounded-lg focus:outline-none focus:ring-2 focus:ring-thread-sage focus:border-transparent"
                    />
                    <div className="text-xs text-thread-sage text-right mt-1">
                      {(houseCustomizations.houseBoardText || '').length}/30 characters
                    </div>
                  </div>
                  
                  {/* Preview Section */}
                  <div className="mt-6 p-4 bg-thread-cream bg-opacity-30 rounded-lg border border-thread-sage border-opacity-30">
                    <h4 className="text-sm font-semibold text-thread-pine mb-3">📋 Text Preview</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-thread-pine">House Title:</span>
                        <div className="mt-1 p-3 bg-white border border-gray-200 rounded text-center text-xl font-headline font-semibold text-thread-pine">
                          {houseCustomizations.houseTitle || 'A Cozy Corner of ThreadStead'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-thread-pine">House Description:</span>
                        <div className="mt-1 p-3 bg-white border border-gray-200 rounded text-thread-sage leading-relaxed">
                          {houseCustomizations.houseDescription || 'Your house description will appear here below the house display...'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-thread-pine">House Sign:</span>
                        <div className="mt-1 p-2 bg-white border border-gray-200 rounded text-center font-medium text-thread-pine italic">
                          {houseCustomizations.houseBoardText || 'Your house sign text will appear here...'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tips */}
                  <div className="mt-4 p-3 bg-thread-sky bg-opacity-10 rounded-lg border border-thread-sky border-opacity-30">
                    <h5 className="text-sm font-semibold text-thread-pine mb-2">💡 Tips</h5>
                    <ul className="text-xs text-thread-sage space-y-1">
                      <li>• Keep your house sign short and memorable</li>
                      <li>• Use your description to share what makes your home special</li>
                      <li>• Both texts help visitors understand your personality</li>
                      <li>• Changes are saved automatically when you save your decorations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedCategory === 'house' ? (
            // House tab with organized sections
            <div className="space-y-4">
                {/* Group items by section */}
                {['doors', 'windows', 'roof'].map((section) => {
                  const sectionItems = BETA_ITEMS[selectedCategory].filter(item => 
                    'section' in item && item.section === section
                  )
                  
                  if (sectionItems.length === 0) return null
                  
                  const sectionTitles = {
                    doors: 'Doors',
                    windows: 'Windows', 
                    roof: 'Roof Trim'
                  }
                  
                  return (
                    <div key={section} className="bg-white rounded-lg p-3 border border-gray-100">
                      <h4 className="text-sm font-semibold text-thread-pine mb-3 px-1 flex items-center">
                        <span className="w-2 h-2 bg-thread-sage rounded-full mr-2"></span>
                        {sectionTitles[section as keyof typeof sectionTitles]}
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        {sectionItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleItemSelect(item)}
                            className={`p-3 rounded-lg border-2 text-center transition-all duration-200 flex-shrink-0 group ${
                              selectedItem?.id === item.id
                                ? 'border-thread-sage bg-thread-cream text-thread-pine shadow-md ring-1 ring-thread-sage ring-opacity-30'
                                : 'border-gray-200 hover:border-thread-sage hover:bg-thread-paper hover:shadow-sm'
                            } cursor-pointer ${
                              'isDefault' in item && item.isDefault 
                                ? 'border-thread-sky border-opacity-50 bg-thread-sky bg-opacity-5' 
                                : ''
                            }`}
                            style={{ minWidth: '90px', width: 'auto', height: '90px', maxWidth: '120px' }}
                          >
                            <div className="flex items-center justify-center mb-1 h-12 relative">
                              <DecorationIcon 
                                type={item.type} 
                                id={item.id} 
                                size={36}
                                className={`drop-shadow-sm pointer-events-none transition-transform duration-200 group-hover:scale-110 ${
                                  selectedItem?.id === item.id ? 'filter brightness-110' : ''
                                }`}
                                color={'color' in item ? item.color as string : undefined}
                              />
                              {/* Default indicator */}
                              {'isDefault' in item && item.isDefault && (
                                <div className="absolute -top-1 -right-1 bg-thread-sky text-white text-xs px-1 py-0.5 rounded-full text-[8px] font-medium">
                                  DEFAULT
                                </div>
                              )}
                              {/* Sparkle effect for selected items */}
                              {selectedItem?.id === item.id && (
                                <div className="absolute inset-0 animate-pulse">
                                  <div className="absolute top-0 right-0 text-yellow-400 text-xs">✨</div>
                                  <div className="absolute bottom-0 left-0 text-yellow-400 text-xs">✨</div>
                                </div>
                              )}
                            </div>
                            <div className="text-xs font-medium leading-tight text-center px-2 pointer-events-none break-words">
                              {item.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            // Other categories (decorations, templates, sky) with original layout
            <div className="flex gap-3 min-w-max">
              {BETA_ITEMS[selectedCategory].map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemSelect(item)}
                draggable={item.type !== 'sky' && item.type !== 'house_template' && item.type !== 'house_color'}
                onDragStart={() => handleDragStart(item)}
                onDragEnd={handleDragEnd}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1 flex-shrink-0 group ${
                  selectedItem?.id === item.id
                    ? 'border-thread-sage bg-thread-cream text-thread-pine shadow-lg transform scale-105 -translate-y-1 ring-2 ring-thread-sage ring-opacity-50'
                    : 'border-gray-200 hover:border-thread-sage hover:bg-thread-paper hover:shadow-md'
                } ${
                  item.type !== 'sky' && item.type !== 'house_template' && item.type !== 'house_color'
                    ? 'cursor-grab active:cursor-grabbing hover:cursor-grab' 
                    : 'cursor-pointer'
                }`}
                style={{ width: '120px', height: '120px' }}
              >
                <div className="flex items-center justify-center mb-2 h-16 relative">
                  <DecorationIcon 
                    type={item.type} 
                    id={item.id} 
                    size={48}
                    className={`drop-shadow-sm pointer-events-none transition-transform duration-200 group-hover:scale-110 ${
                      selectedItem?.id === item.id ? 'filter brightness-110' : ''
                    }`}
                    color={'color' in item ? item.color as string : undefined}
                  />
                  {/* Sparkle effect for selected items */}
                  {selectedItem?.id === item.id && (
                    <div className="absolute inset-0 animate-pulse">
                      <div className="absolute top-0 right-0 text-yellow-400 text-xs">✨</div>
                      <div className="absolute bottom-0 left-0 text-yellow-400 text-xs">✨</div>
                    </div>
                  )}
                </div>
                <div className="text-xs font-medium leading-tight text-center px-1 pointer-events-none">
                  {item.name}
                </div>
              </button>
            ))}
            </div>
          )}
        </div>

        {/* Instructions Bar */}
        <div className="px-4 py-3 bg-thread-cream border-t border-gray-200">
          <div className="text-sm text-thread-sage max-w-4xl">
            {draggedDecoration ? (
              <div className="flex items-center text-blue-600">
                <span className="animate-pulse mr-2">✋</span>
                Dragging decoration - release to place it in new position
              </div>
            ) : selectedDecorations.size > 0 ? (
              <div className="flex items-center text-blue-600">
                <span className="mr-2">✅</span>
                {selectedDecorations.size} decoration{selectedDecorations.size !== 1 ? 's' : ''} selected. 
                Click and drag to move, Ctrl+click to multi-select, or use toolbar buttons.
              </div>
            ) : isPlacing ? (
              <div className="flex items-center text-thread-pine">
                <span className="animate-pulse mr-2">🎯</span>
                Click on the canvas to place your {selectedItem?.name}
              </div>
            ) : isDeleting ? (
              <div className="flex items-center text-red-600">
                <span className="animate-pulse mr-2">🗑️</span>
                Click on decorations to delete them
              </div>
            ) : selectedItem?.type === 'house_template' ? (
              <div className="flex items-center text-thread-pine">
                <span className="mr-2">🏡</span>
                Switched to {selectedItem?.name} style! Your house customizations have been reset.
              </div>
            ) : selectedItem?.type === 'house_color' ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center text-thread-pine">
                  <span className="mr-2">🎨</span>
                  Choose a color for {selectedItem?.name?.toLowerCase()}:
                </div>
                <input
                  type="color"
                  value={selectedItem?.color || '#A18463'}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <span className="text-xs text-thread-sage">
                  Click to pick a custom color
                </span>
              </div>
            ) : selectedItem?.type === 'house_custom' ? (
              <div className="flex items-center text-thread-pine">
                <span className="mr-2">🏠</span>
                {selectedItem?.name} applied to your house! Try another style or add decorations.
              </div>
            ) : selectedItem?.type === 'sky' ? (
              <div className="flex items-center text-thread-pine">
                <span className="mr-2">🌤️</span>
                {selectedItem?.name} applied! Your house atmosphere has been updated.
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span>
                  Select a decoration above to place it, customize your house, or click decorations to select and move them. 
                  <strong>Drag and drop</strong> decorations from the palette onto the canvas for quick placement!
                </span>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded hidden sm:block">
                  <strong>Shortcuts:</strong> Esc (deselect) • Del (delete) • Ctrl+A (select all) • Ctrl+Z/Y (undo/redo) • 1-7 (categories)
                </div>
              </div>
            )}
          </div>
        </div>
            </>
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
                className="flex-1 px-4 py-2 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors font-medium"
              >
                Apply Theme Colors
              </button>
              <button
                onClick={handleThemeConfirmKeep}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Keep Custom Colors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}