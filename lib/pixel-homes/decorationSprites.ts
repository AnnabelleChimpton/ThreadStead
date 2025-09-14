/**
 * Decoration Sprite System for Performance Optimization
 * Handles sprite batching, lazy loading, and efficient rendering
 */

// Define types locally since they don't exist in the current codebase
export type DecorationCategory = 'furniture' | 'plants' | 'decorations' | 'lighting' | 'textiles' | 'art' | 'storage' | 'tech';

export interface DecorationItem {
  id: string;
  type: string;
  category: DecorationCategory;
  name?: string;
  description?: string;
}

export interface SpriteSheet {
  image: HTMLImageElement;
  spriteMap: Map<string, SpritePosition>;
  loaded: boolean;
}

export interface SpritePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteBatch {
  category: DecorationCategory;
  items: DecorationItem[];
  spriteSheet?: SpriteSheet;
  priority: number;
}

class DecorationSpriteManager {
  private spriteSheets = new Map<DecorationCategory, SpriteSheet>();
  private loadingPromises = new Map<DecorationCategory, Promise<SpriteSheet>>();
  private visibilityObserver?: IntersectionObserver;
  private loadedCategories = new Set<DecorationCategory>();
  
  constructor() {
    this.initVisibilityObserver();
  }

  private initVisibilityObserver() {
    if (typeof window === 'undefined') return;

    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const category = entry.target.getAttribute('data-category') as DecorationCategory;
            if (category && !this.loadedCategories.has(category)) {
              this.preloadCategory(category);
            }
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );
  }

  /**
   * Creates sprite batches based on decoration categories and usage patterns
   */
  public createSpriteBatches(decorations: DecorationItem[]): SpriteBatch[] {
    const categoryMap = new Map<DecorationCategory, DecorationItem[]>();
    
    decorations.forEach((decoration) => {
      const category = decoration.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(decoration);
    });

    const batches: SpriteBatch[] = [];
    const priorityMap: Record<DecorationCategory, number> = {
      'furniture': 1,
      'plants': 2,
      'decorations': 3,
      'lighting': 4,
      'textiles': 5,
      'art': 6,
      'storage': 7,
      'tech': 8,
    };

    categoryMap.forEach((items, category) => {
      batches.push({
        category,
        items,
        priority: priorityMap[category] || 9,
      });
    });

    return batches.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Preloads a specific decoration category
   */
  public async preloadCategory(category: DecorationCategory): Promise<SpriteSheet | null> {
    if (this.loadedCategories.has(category)) {
      return this.spriteSheets.get(category) || null;
    }

    if (this.loadingPromises.has(category)) {
      return this.loadingPromises.get(category)!;
    }

    const loadingPromise = this.loadSpriteSheet(category);
    this.loadingPromises.set(category, loadingPromise);

    try {
      const spriteSheet = await loadingPromise;
      this.spriteSheets.set(category, spriteSheet);
      this.loadedCategories.add(category);
      return spriteSheet;
    } catch (error) {
      console.warn(`Failed to load sprite sheet for category ${category}:`, error);
      this.loadingPromises.delete(category);
      return null;
    }
  }

  /**
   * Loads sprite sheet for a decoration category
   */
  private async loadSpriteSheet(category: DecorationCategory): Promise<SpriteSheet> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const spriteSheet: SpriteSheet = {
          image,
          spriteMap: this.generateSpriteMap(category),
          loaded: true,
        };
        resolve(spriteSheet);
      };
      image.onerror = () => {
        reject(new Error(`Failed to load sprite sheet for ${category}`));
      };
      
      // For now, use placeholder sprite sheets
      // In production, these would be actual sprite sheet images
      image.src = `/images/pixel-homes/sprites/${category}-sprite.png`;
    });
  }

  /**
   * Generates sprite map for efficient rendering
   */
  private generateSpriteMap(category: DecorationCategory): Map<string, SpritePosition> {
    const spriteMap = new Map<string, SpritePosition>();
    
    // Example sprite positions - in production, this would be generated
    // from actual sprite sheet metadata
    const itemsPerRow = 8;
    const spriteSize = 64;
    
    // Get decoration items for this category from a mock data source
    const categoryItems = this.getMockCategoryItems(category);
    
    categoryItems.forEach((item, index) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      
      spriteMap.set(item.id, {
        x: col * spriteSize,
        y: row * spriteSize,
        width: spriteSize,
        height: spriteSize,
      });
    });

    return spriteMap;
  }

  /**
   * Mock data for sprite positioning - replace with actual data source
   */
  private getMockCategoryItems(category: DecorationCategory): Array<{ id: string }> {
    const mockItems: Record<DecorationCategory, Array<{ id: string }>> = {
      'furniture': [
        { id: 'chair-basic' },
        { id: 'table-round' },
        { id: 'sofa-modern' },
        { id: 'bookshelf' },
      ],
      'plants': [
        { id: 'plant-cactus' },
        { id: 'plant-fern' },
        { id: 'plant-flower' },
      ],
      'decorations': [
        { id: 'vase-blue' },
        { id: 'clock-wall' },
        { id: 'mirror-round' },
      ],
      'lighting': [
        { id: 'lamp-desk' },
        { id: 'light-ceiling' },
      ],
      'textiles': [
        { id: 'rug-persian' },
        { id: 'curtain-blue' },
      ],
      'art': [
        { id: 'painting-abstract' },
        { id: 'sculpture-modern' },
      ],
      'storage': [
        { id: 'chest-wooden' },
        { id: 'basket-wicker' },
      ],
      'tech': [
        { id: 'computer-desktop' },
        { id: 'tv-flatscreen' },
      ],
    };

    return mockItems[category] || [];
  }

  /**
   * Draws a decoration using sprite batching
   */
  public drawDecoration(
    ctx: CanvasRenderingContext2D,
    decorationType: string,
    decorationId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    category: DecorationCategory
  ): boolean {
    const spriteSheet = this.spriteSheets.get(category);
    
    if (!spriteSheet || !spriteSheet.loaded) {
      // Fallback to individual decoration rendering
      return false;
    }

    const spriteKey = `${decorationType}-${decorationId}`;
    const spritePosition = spriteSheet.spriteMap.get(spriteKey);
    
    if (!spritePosition) {
      return false;
    }

    try {
      ctx.drawImage(
        spriteSheet.image,
        spritePosition.x,
        spritePosition.y,
        spritePosition.width,
        spritePosition.height,
        x,
        y,
        width,
        height
      );
      return true;
    } catch (error) {
      console.warn('Failed to draw sprite:', error);
      return false;
    }
  }

  /**
   * Observes element for lazy loading
   */
  public observeForLazyLoading(element: HTMLElement, category: DecorationCategory) {
    if (!this.visibilityObserver) return;
    
    element.setAttribute('data-category', category);
    this.visibilityObserver.observe(element);
  }

  /**
   * Stops observing element
   */
  public unobserve(element: HTMLElement) {
    if (!this.visibilityObserver) return;
    this.visibilityObserver.unobserve(element);
  }

  /**
   * Preloads high-priority decoration categories
   */
  public async preloadHighPriorityCategories(): Promise<void> {
    const highPriorityCategories: DecorationCategory[] = ['furniture', 'plants', 'decorations'];
    
    await Promise.allSettled(
      highPriorityCategories.map(category => this.preloadCategory(category))
    );
  }

  /**
   * Cleans up resources
   */
  public dispose() {
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
    }
    this.spriteSheets.clear();
    this.loadingPromises.clear();
    this.loadedCategories.clear();
  }
}

// Singleton instance for global use
export const decorationSpriteManager = new DecorationSpriteManager();

// Export utility functions
export const createSpriteBatches = (decorations: DecorationItem[]) => 
  decorationSpriteManager.createSpriteBatches(decorations);

export const preloadDecorationSprites = (category: DecorationCategory) =>
  decorationSpriteManager.preloadCategory(category);

export const drawSpriteDecoration = (
  ctx: CanvasRenderingContext2D,
  decorationType: string,
  decorationId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  category: DecorationCategory
) => decorationSpriteManager.drawDecoration(
  ctx, decorationType, decorationId, x, y, width, height, category
);