# Pixel Art Dimension Guide for Threadstead Homes

**Last Updated:** 2025-11-22
**Purpose:** Guide for converting SVG pixel home assets to actual pixel art

---

## Overview

This document audits all SVG-based pixel home assets and provides recommended pixel art canvas dimensions for replacement. Assets are prioritized by importance: **homes/home pieces** (Priority 1) followed by **decorations** (Priority 2).

---

## Priority 1: Houses & Home Pieces

### Main House Templates

**File:** `components/pixel-homes/HouseSVG.tsx`
**Current SVG ViewBox:** `200 x 180`

| Template | Description | Recommended Canvas Size | Notes |
|----------|-------------|------------------------|-------|
| `cottage_v1` | Classic cottage with peaked roof | **64x64** or **96x96** | Base template, most important |
| `townhouse_v1` | Multi-story urban townhouse | **64x64** or **96x96** | Flat roof, taller structure |
| `loft_v1` | Modern loft with angular roof | **64x64** or **96x96** | Contemporary style |
| `cabin_v1` | Rustic log cabin with steep roof | **64x64** or **96x96** | Includes chimney smoke |

**Recommendation:** Use **96x96px** for primary houses to allow detail while maintaining pixel aesthetic. Can scale down to 64x64 for thumbnails.

---

### House Customization Elements

These are modular pieces that overlay the base house. Dimensions are relative to the 200x180 viewBox.

#### Windows

| Style | Current SVG Coordinates | Recommended Size | Canvas |
|-------|------------------------|------------------|---------|
| Default rectangular | 15w x 15h | **8x8px** or **12x12px** | Individual sprite |
| Round windows | 15w x 15h (diameter) | **8x8px** or **12x12px** | Individual sprite |
| Arched windows | 15w x 15h | **8x12px** | Individual sprite |
| Bay windows | 19w x 17h | **12x12px** | Individual sprite |

**Recommendation:** Create 12x12px sprites for each window style. Use transparency for rounded/arched shapes.

#### Doors

| Style | Current SVG Coordinates | Recommended Size | Canvas |
|-------|------------------------|------------------|---------|
| Default rectangular | 20w x 30h | **12x18px** | Individual sprite |
| Arched door | 20w x 30h | **12x18px** | Individual sprite |
| Double door | 20w x 30h | **16x18px** | Individual sprite |
| Cottage door | 20w x 35h | **12x20px** | Individual sprite |

**Recommendation:** Use **12x18px** or **16x18px** for door sprites. Doors are focal points and deserve detail.

#### Roof Elements

| Element | Current ViewBox | Recommended Size | Canvas |
|---------|----------------|------------------|---------|
| Basic roof | Full house width | **Integrated** | Part of main house sprite |
| Ornate trim | Decorative edge | **64x12px** | Separate trim sprite |
| Scalloped trim | Decorative edge | **64x12px** | Separate trim sprite |
| Gabled trim | Decorative edge | **64x12px** | Separate trim sprite |
| Chimney | 12w x 30h | **8x16px** | Individual sprite |

**Recommendation:** Integrate basic roofs into main house sprite. Create separate **64x12px** trim sprites for decorative elements.

#### Foundation & Walls

| Element | Current | Recommended Size | Canvas |
|---------|---------|------------------|---------|
| Stone foundation | 8h | **Full width x 4px** | Part of house sprite |
| Brick foundation | 8h | **Full width x 4px** | Part of house sprite |
| Raised foundation | 10h | **Full width x 6px** | Part of house sprite |
| Wall patterns | Full wall | **Pattern tile** | 8x8px or 16x16px tileable |

**Recommendation:** Integrate foundations into main sprite. Create **8x8px tileable patterns** for wall textures (shingles, boards, stone veneer).

---

### Interactive Elements

**File:** `components/pixel-homes/InteractiveHouseSVG.tsx`

| Element | Current Size | Recommended Size | Canvas |
|---------|-------------|------------------|---------|
| Mailbox | ~10w x 25h | **6x12px** | Individual sprite |
| Mailbox flag | 3w x 2h | **2x2px** | Part of mailbox sprite |
| Ring flag | ~10w x 8h | **6x6px** | Individual sprite |
| Threadbook | 8-12w x 3h | **8x4px** | Individual sprite |
| Door handle glow | 2r radius | **2x2px** | Effect/overlay |

**Recommendation:** Create small **6x12px** sprites for mailbox and other interactive elements. Use separate sprite sheets for hover states.

---

## Priority 2: Decorations

### Plants & Flora

**File:** `components/pixel-homes/DecorationSVG.tsx`

| Item | Current ViewBox | Recommended Size | Canvas | Notes |
|------|----------------|------------------|---------|-------|
| **Roses (red/pink/white)** | 24 x 24 | **16x16px** | Small decoration | 3 color variants |
| **Daisies (white/yellow)** | 20 x 20 | **16x16px** | Small decoration | 2 color variants |
| **Sunflowers** | 28 x 36 | **16x24px** | Medium decoration | Tall flowers |
| **Lavender** | 24 x 32 | **16x20px** | Medium decoration | Purple cluster |
| **Flower pot** | 18 x 22 | **12x16px** | Small decoration | Potted arrangement |
| **Oak tree** | 32 x 40 | **24x32px** | Large decoration | Full canopy |
| **Pine tree** | 20 x 44 | **16x32px** | Large decoration | Triangular shape |
| **Small tree (variants)** | 32 x 40 | **24x32px** | Large decoration | Oak/maple/pine/cherry |

**Recommendation:** Use **16x16px** for small plants, **24x32px** for trees. Create variant color palettes as separate sprites or use palette swapping.

---

### Paths & Ground Elements

| Item | Current ViewBox | Recommended Size | Canvas | Notes |
|------|----------------|------------------|---------|-------|
| **Stone path** | 48 x 16 | **32x8px** or **48x12px** | Tileable | Horizontal path segment |
| **Brick path** | 48 x 12 | **32x8px** or **48x12px** | Tileable | Brick pattern |
| **Stepping stones** | 36 x 24 | **24x16px** | Individual | 3 stones per sprite |
| **Gravel path** | 40 x 16 | **32x8px** | Tileable | Textured path |

**Recommendation:** Create **32x8px tileable** sprites for paths. Should seamlessly repeat horizontally.

---

### Garden Features

| Item | Current ViewBox | Recommended Size | Canvas | Notes |
|------|----------------|------------------|---------|-------|
| **Bird bath** | 24 x 32 | **16x24px** | Medium decoration | With bird detail |
| **Garden gnome** | 16 x 24 | **12x16px** | Small decoration | Character sprite |
| **Decorative fence** | 48 x 20 | **32x16px** | Tileable | Horizontal fence segment |
| **Wind chimes** | 16 x 28 | **12x20px** | Small decoration | Hanging element |

**Recommendation:** Use sizes proportional to importance. Fences should be **32x16px tileable**.

---

### Furniture

| Item | Current ViewBox | Recommended Size | Canvas | Notes |
|------|----------------|------------------|---------|-------|
| **Garden bench** | 32 x 24 | **20x16px** | Medium furniture | Wooden bench |
| **Outdoor table** | 32 x 24 | **20x16px** | Medium furniture | Round table |
| **Picnic table** | 40 x 28 | **24x20px** | Large furniture | With benches |
| **Mailbox** | 20 x 32 | **12x20px** | Medium decoration | Standalone |
| **Planter box** | 32 x 20 | **20x16px** | Medium decoration | Rectangular planter |

**Recommendation:** Use **16x16px** to **24x20px** range for outdoor furniture. Should feel substantial but not overwhelming.

---

### Lighting

| Item | Current ViewBox | Recommended Size | Canvas | Notes |
|------|----------------|------------------|---------|-------|
| **Garden lantern** | 16 x 32 | **12x24px** | Tall decoration | Post + lantern |
| **String lights** | 64 x 16 | **48x12px** | Wide decoration | Horizontal string |
| **Torch** | 12 x 36 | **8x24px** | Tall decoration | With flame animation |
| **Spotlight** | 20 x 24 | **16x16px** | Medium decoration | Light beam effect |

**Recommendation:** Create **base sprite + glow layer**. Glow can be additive blend overlay. Consider animation frames for flickering flames.

---

### Water Features

| Item | Current ViewBox | Recommended Size | Canvas | Notes |
|------|----------------|------------------|---------|-------|
| **Fountain** | 32 x 40 | **24x32px** | Large decoration | Multi-tier |
| **Pond** | 40 x 24 | **32x16px** | Ground decoration | Oval water surface |
| **Rain barrel** | 20 x 28 | **16x20px** | Medium decoration | Cylindrical |

**Recommendation:** Use **24x32px** for fountains (vertical), **32x16px** for ponds (horizontal). Consider water animation frames.

---

### Structures

| Item | Current ViewBox | Recommended Size | Canvas | Notes |
|------|----------------|------------------|---------|-------|
| **Gazebo** | 48 x 40 | **32x32px** | Large structure | Open pavilion |
| **Trellis** | 24 x 36 | **16x24px** | Tall decoration | Vertical lattice |
| **Garden arch** | 32 x 40 | **24x32px** | Large decoration | Archway |

**Recommendation:** Use **24x32px** to **32x32px** for structures. These are significant background elements.

---

## Technical Recommendations

### General Guidelines

1. **Base Resolution:** Design at 1x pixel scale. Avoid anti-aliasing on edges.
2. **Color Palette:** Use limited color palettes (16-32 colors per sprite) for authentic pixel art feel.
3. **Transparency:** Use full transparency for irregular shapes (trees, rounded elements).
4. **Consistent Scale:** Maintain visual consistency - if a door is 12px tall, trees should be proportionally larger (~32px).

### Canvas Size Strategy

| Asset Type | Recommended Canvas | Rationale |
|------------|-------------------|-----------|
| Main houses | **96x96px** | High detail, primary focus, allows customization layers |
| Small decorations | **16x16px** | Standard sprite size, good for flowers, small objects |
| Medium decorations | **24x24px** or **16x32px** | Taller objects like lanterns, potted plants |
| Large decorations | **32x32px** or **24x48px** | Trees, structures, gazebos |
| Tileable paths | **32x8px** | Seamless horizontal repeat |
| UI elements | **8x8px** to **12x12px** | Mailbox flags, handles, small icons |

### Sprite Sheet Organization

**Recommended sprite sheet layout:**

```
houses_96x96.png          → 4 house templates (384x96 sheet)
house_parts_sheet.png     → Windows, doors, trims (256x256 sheet)
decorations_small.png     → 16x16 decorations (256x256 sheet, 16x16 grid)
decorations_medium.png    → 24x24 decorations (384x384 sheet, 16x16 grid)
decorations_large.png     → 32x32 decorations (512x512 sheet, 16x16 grid)
paths_tileable.png        → Path segments (256x64 sheet)
lighting_effects.png      → Lights + glow layers (256x256 sheet)
```

### Export Settings

- **Format:** PNG-24 with alpha transparency
- **No anti-aliasing** on pixel edges
- **No interpolation** when scaling
- **Indexed color mode** optional for smaller file sizes
- **Premultiplied alpha:** Disable to avoid edge artifacts

---

## Implementation Priority

### Phase 1: Critical Assets (Week 1)
1. 4 main house templates (cottage, townhouse, loft, cabin) - 96x96px
2. Basic windows and doors - 12x12px and 12x18px
3. Mailbox and interactive elements - 6x12px

### Phase 2: Common Decorations (Week 2)
1. Trees (oak, pine, small variants) - 24x32px
2. Flowers (roses, daisies, sunflowers) - 16x16px
3. Paths (stone, brick, stepping stones) - 32x8px tileable

### Phase 3: Enhancement Assets (Week 3)
1. Garden features (bird bath, gnome, fence) - 16x24px
2. Furniture (bench, table, planters) - 20x16px
3. Lighting (lanterns, string lights) - various sizes

### Phase 4: Advanced Features (Week 4)
1. Water features (fountain, pond) - 24x32px
2. Structures (gazebo, trellis, arch) - 32x32px
3. Seasonal decorations - 16x16px

---

## Color Palette Reference

Based on existing SVG color schemes:

### Thread Sage Palette
- Sage: `#A18463`
- Pine: `#2E4B3F`
- Sky: `#8EC5E8`
- Cream: `#F5E9D4`
- Meadow: `#4FAF6D`

### Charcoal Nights Palette
- Charcoal: `#2F2F2F`
- Stone: `#B8B8B8`
- Sunset: `#E27D60`
- Paper: `#FCFAF7`
- Sage: `#A18463`

### Universal Colors
- Wood/Brown: `#8B4513`, `#A0522D`, `#654321`
- Grass: `#4A5D23`, `#2D5016`, `#16A34A`
- Stone/Gray: `#9CA3AF`, `#6B7280`, `#F3F4F6`

**Recommendation:** Create a master palette file with all colors indexed for easy reference and consistency.

---

## Testing Checklist

Before finalizing pixel art assets:

- [ ] Assets render correctly at 1x, 2x, 3x scale (no blur/interpolation)
- [ ] Transparent edges have no color fringe
- [ ] Colors match existing theme palettes
- [ ] Sprites align properly on grid (no half-pixel offsets)
- [ ] Tileable assets seamlessly repeat
- [ ] File sizes are optimized (indexed PNG where possible)
- [ ] All variants are included (color variations, animation frames)
- [ ] Sprite sheets have consistent padding/spacing

---

## Tools Recommended

- **Aseprite** - Industry standard for pixel art, excellent animation support
- **Pixaki** (iPad) - Mobile pixel art creation
- **Photoshop** - Disable interpolation, use Pencil tool
- **GIMP** - Free alternative, disable anti-aliasing
- **Piskel** - Free web-based pixel art editor

---

## Questions for Clarification

1. **Animation:** Should any decorations be animated (waving flags, flickering lights, flowing water)?
2. **Variants:** How many color variants per decoration type?
3. **Seasons:** Should assets have seasonal variants (autumn trees, snow on roofs)?
4. **Scale:** Will assets ever be displayed larger than 3x scale?
5. **Performance:** Target sprite sheet file size limits?

---

## Summary

**Total Priority 1 Assets (Houses):**
- 4 house templates @ 96x96px
- ~8 window styles @ 12x12px
- ~4 door styles @ 12x18px
- ~5 interactive elements @ 6x12px
- **Estimated:** ~25 unique sprites

**Total Priority 2 Assets (Decorations):**
- ~40 plant/flora decorations (16x16 to 24x32)
- ~10 path tiles (32x8 tileable)
- ~15 garden features (12x16 to 24x32)
- ~8 furniture items (16x16 to 24x20)
- ~6 lighting elements (12x24 to 48x12)
- ~5 water features (16x20 to 32x16)
- ~5 structures (24x32 to 32x32)
- **Estimated:** ~90 unique decoration sprites

**Grand Total:** ~115 unique pixel art assets to replace SVGs

---

**Next Steps:**
1. Review and approve dimension recommendations
2. Create master color palette file
3. Set up sprite sheet templates
4. Begin Phase 1 (house templates)
5. Test integration with existing rendering system
