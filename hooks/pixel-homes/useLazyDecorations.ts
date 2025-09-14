/**
 * Lazy Loading Hook for Decoration Components
 * Optimizes performance by loading decorations only when needed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { decorationSpriteManager, DecorationItem, DecorationCategory } from '@/lib/pixel-homes/decorationSprites';

interface LazyDecorationConfig {
  threshold?: number;
  rootMargin?: string;
  enableSpriteBatching?: boolean;
  preloadDistance?: number;
}

interface LazyDecorationState {
  visibleDecorations: Set<string>;
  loadedCategories: Set<DecorationCategory>;
  isLoading: boolean;
  preloadedItems: Set<string>;
}

export function useLazyDecorations(
  decorations: DecorationItem[],
  config: LazyDecorationConfig = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enableSpriteBatching = true,
    preloadDistance = 100
  } = config;

  const [state, setState] = useState<LazyDecorationState>({
    visibleDecorations: new Set(),
    loadedCategories: new Set(),
    isLoading: false,
    preloadedItems: new Set(),
  });

  const observerRef = useRef<IntersectionObserver | undefined>(undefined);
  const elementRefsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Initialize intersection observer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisibleDecorations = new Set(state.visibleDecorations);
        let hasChanges = false;

        entries.forEach((entry) => {
          const decorationId = entry.target.getAttribute('data-decoration-id');
          const category = entry.target.getAttribute('data-category') as DecorationCategory;
          
          if (!decorationId) return;

          if (entry.isIntersecting) {
            if (!newVisibleDecorations.has(decorationId)) {
              newVisibleDecorations.add(decorationId);
              hasChanges = true;

              // Trigger sprite loading for category if enabled
              if (enableSpriteBatching && category && !state.loadedCategories.has(category)) {
                decorationSpriteManager.preloadCategory(category);
                setState(prev => ({
                  ...prev,
                  loadedCategories: new Set([...prev.loadedCategories, category])
                }));
              }
            }
          } else {
            if (newVisibleDecorations.has(decorationId)) {
              newVisibleDecorations.delete(decorationId);
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          setState(prev => ({
            ...prev,
            visibleDecorations: newVisibleDecorations
          }));
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, enableSpriteBatching, state.visibleDecorations, state.loadedCategories]);

  // Register element for observation
  const registerElement = useCallback((
    element: HTMLElement | null,
    decorationId: string,
    category: DecorationCategory
  ) => {
    if (!element || !observerRef.current) return;

    element.setAttribute('data-decoration-id', decorationId);
    element.setAttribute('data-category', category);

    elementRefsRef.current.set(decorationId, element);
    observerRef.current.observe(element);

    return () => {
      observerRef.current?.unobserve(element);
      elementRefsRef.current.delete(decorationId);
    };
  }, []);

  // Preload decorations near visible area
  const preloadNearbyDecorations = useCallback(async (
    currentDecorations: DecorationItem[]
  ) => {
    if (state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Group decorations by category for efficient loading
      const categoryGroups = currentDecorations.reduce((groups, decoration) => {
        if (!groups[decoration.category]) {
          groups[decoration.category] = [];
        }
        groups[decoration.category].push(decoration);
        return groups;
      }, {} as Record<DecorationCategory, DecorationItem[]>);

      // Preload high-priority categories first
      const priorityOrder: DecorationCategory[] = [
        'furniture', 'plants', 'decorations', 'lighting'
      ];

      for (const category of priorityOrder) {
        if (categoryGroups[category] && !state.loadedCategories.has(category)) {
          await decorationSpriteManager.preloadCategory(category);
          setState(prev => ({
            ...prev,
            loadedCategories: new Set([...prev.loadedCategories, category])
          }));
        }
      }

      // Mark items as preloaded
      const newPreloadedItems = new Set(state.preloadedItems);
      currentDecorations.forEach(decoration => {
        newPreloadedItems.add(`${decoration.type}-${decoration.id}`);
      });

      setState(prev => ({
        ...prev,
        preloadedItems: newPreloadedItems
      }));

    } catch (error) {
      console.warn('Failed to preload decorations:', error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.loadedCategories, state.preloadedItems]);

  // Check if decoration should be rendered
  const shouldRenderDecoration = useCallback((decorationId: string): boolean => {
    return state.visibleDecorations.has(decorationId) || 
           state.preloadedItems.has(decorationId);
  }, [state.visibleDecorations, state.preloadedItems]);

  // Get loading state for specific decoration
  const getDecorationLoadingState = useCallback((
    decorationId: string,
    category: DecorationCategory
  ) => {
    return {
      isVisible: state.visibleDecorations.has(decorationId),
      isCategoryLoaded: state.loadedCategories.has(category),
      isPreloaded: state.preloadedItems.has(decorationId),
      shouldRender: shouldRenderDecoration(decorationId)
    };
  }, [state, shouldRenderDecoration]);

  // Initialize high-priority preloading
  useEffect(() => {
    if (decorations.length > 0) {
      // Preload immediately visible decorations
      const visibleDecorations = decorations.slice(0, 20); // First 20 items
      preloadNearbyDecorations(visibleDecorations);
    }
  }, [decorations, preloadNearbyDecorations]);

  return {
    registerElement,
    shouldRenderDecoration,
    getDecorationLoadingState,
    preloadNearbyDecorations,
    visibleDecorations: state.visibleDecorations,
    loadedCategories: state.loadedCategories,
    isLoading: state.isLoading,
    stats: {
      totalDecorations: decorations.length,
      visibleCount: state.visibleDecorations.size,
      loadedCategoriesCount: state.loadedCategories.size,
      preloadedCount: state.preloadedItems.size,
    }
  };
}

export type UseLazyDecorationsReturn = ReturnType<typeof useLazyDecorations>;