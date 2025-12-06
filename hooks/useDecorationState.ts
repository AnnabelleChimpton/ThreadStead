import { useState, useCallback, useRef, useEffect } from 'react'
import { DecorationItem } from '../lib/pixel-homes/decoration-data'

interface HistoryState {
    past: DecorationItem[][]
    present: DecorationItem[]
    future: DecorationItem[][]
}

export function useDecorationState(initialDecorations: DecorationItem[] = []) {
    const [decorations, setDecorations] = useState<DecorationItem[]>(initialDecorations)
    const [selectedDecorations, setSelectedDecorations] = useState<Set<string>>(new Set())
    const [history, setHistory] = useState<HistoryState>({
        past: [],
        present: initialDecorations,
        future: []
    })

    // Initialize history when initialDecorations change (e.g. loaded from API)
    useEffect(() => {
        if (initialDecorations.length > 0 && history.present.length === 0) {
            setDecorations(initialDecorations)
            setHistory({
                past: [],
                present: initialDecorations,
                future: []
            })
        }
    }, [initialDecorations])

    const addToHistory = useCallback((newDecorations: DecorationItem[]) => {
        setHistory(curr => {
            const newPast = [...curr.past, curr.present]
            if (newPast.length > 50) newPast.shift() // Limit history size

            return {
                past: newPast,
                present: newDecorations,
                future: []
            }
        })
        setDecorations(newDecorations)
    }, [])

    const undo = useCallback(() => {
        setHistory(curr => {
            if (curr.past.length === 0) return curr

            const previous = curr.past[curr.past.length - 1]
            const newPast = curr.past.slice(0, -1)

            setDecorations(previous)
            return {
                past: newPast,
                present: previous,
                future: [curr.present, ...curr.future]
            }
        })
    }, [])

    const redo = useCallback(() => {
        setHistory(curr => {
            if (curr.future.length === 0) return curr

            const next = curr.future[0]
            const newFuture = curr.future.slice(1)

            setDecorations(next)
            return {
                past: [...curr.past, curr.present],
                present: next,
                future: newFuture
            }
        })
    }, [])

    const addDecoration = useCallback((item: DecorationItem) => {
        console.log('useDecorationState: Adding decoration', item)
        const newDecorations = [...decorations, item]
        addToHistory(newDecorations)
    }, [decorations, addToHistory])

    const removeDecorations = useCallback((idsToRemove: Set<string>) => {
        const newDecorations = decorations.filter(d => !idsToRemove.has(d.id))
        addToHistory(newDecorations)
        setSelectedDecorations(new Set()) // Clear selection
    }, [decorations, addToHistory])

    const updateDecoration = useCallback((id: string, updates: Partial<DecorationItem>) => {
        const newDecorations = decorations.map(d =>
            d.id === id ? { ...d, ...updates } : d
        )
        addToHistory(newDecorations)
    }, [decorations, addToHistory])

    const selectDecoration = useCallback((id: string, multiSelect: boolean = false) => {
        setSelectedDecorations(prev => {
            const newSet = new Set(multiSelect ? prev : [])
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedDecorations(new Set())
    }, [])

    return {
        decorations,
        setDecorations, // Exposed for direct manipulation if needed (e.g. initial load)
        selectedDecorations,
        history,
        addDecoration,
        removeDecorations,
        updateDecoration,
        selectDecoration,
        clearSelection,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0
    }
}
