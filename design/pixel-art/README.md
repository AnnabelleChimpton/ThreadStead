# Pixel art notes

These are my rules for drawing pixel home art, so everything in a yard looks like it came from the same place. The longer reasoning is in the pixel homes art-direction audit, §3. This page is the short version I keep open while drawing.

## What's in here

| File | What it's for |
|---|---|
| `threadstead-44.gpl` | The palette. Load it in Aseprite, GIMP or Pixaki. |
| `threadstead-44.png` | The same 44 colours as a 44×1 strip, for apps that load a palette from an image. |
| `threadstead-44-ramps.png` | The ramps, one row each, for looking at. |
| `_guide-decoration.png` | A guide layer for decorations: 16 px grid, ground line, door-height ruler. |
| `_yard-preview.png` | A 512×352 yard at 1× with the cabin on it. Paste a sprite in to see if it sits right. |
| `_guide-house.png` | A 200×180 guide for house layers, with the socket boxes. |
| `_template-house.sockets.json` | The socket boxes as numbers. The house renderer reads the same ones. |
| `remap-preview/` | My existing sprites moved onto the palette, for me to check before anything gets uploaded. |

## Grid and scale

- I draw everything at 1×: one pixel in the file is one pixel in the yard. No scaling on export.
- The yard is 512×352, on a 16 px placement grid. The sky takes the top 96 rows.
- The site only ever shows art at whole-number scales (1×, 2×, 3×). So anything I draw is what people see, just bigger.
- Footprints are multiples of 8 px where I can manage it. Decorations max out at 96×96. House layers are 200×180.
- The door is 32 px tall, and everything else is measured against it:

| Size | Height | Things like |
|---|---|---|
| Ground cover | 6–16 px | flowers, gnome, cat, herbs |
| Waist high | 16–24 px | bench, mailbox, bird bath, planter |
| Head high | 28–36 px | lantern, sunflowers, flamingo |
| Trees | 56–96 px | wider than a window bay |
| Structures | up to 64 px | gazebo, arch |

The ruler on `_guide-decoration.png` has these as coloured marks, with a dotted door beside it.

## Palette

44 colours in 11 ramps, dark to light. A sprite uses 16 colours at most, and usually far fewer.

| Ramp | Colours |
|---|---|
| Ink | `#2b2523` `#4a403d` `#7a6c64` `#a8998e` `#d8cbbd` `#fffaf5` |
| Slate | `#3e4b4d` `#5c6e70` `#8fa0a0` `#c5d0cd` |
| Sky | `#3f5f7a` `#6f97b3` `#9dbfd3` `#d4e6ef` |
| Wood | `#3d2314` `#5c301b` `#834a27` `#b05e2b` `#e1b489` |
| Terracotta | `#a8634a` `#cd9d70` `#f2c6a0` `#ffe7cf` |
| Foliage | `#1b350a` `#2d5016` `#49722e` `#608d43` `#a3c27a` |
| Pine | `#1d3029` `#2e4b3f` `#4a957a` |
| Red | `#7f1d1d` `#c4473a` `#e27d60` `#f2a58e` |
| Rose | `#8c4a5b` `#d9a9b5` `#f4d6dc` |
| Butter | `#b07d1a` `#e8b730` `#f6e27f` |
| Lavender | `#5a4fb3` `#8b7fe0` `#c0b7f9` |

The browns and greens are the ones I was already using. The rest come from the site's own colours, so the yard matches the page around it. Shadows lean cool and highlights lean warm. Nothing is pure black or pure white, except a pixel for an eye.

## Outline and shading

- Outline the silhouette in the darkest colour of that thing's own ramp, never black. Full outline on the bottom and right; lighter or none on the top-left edges that face the light.
- Lines inside a sprite only where one shape overlaps another.
- 3 or 4 tones per material.
- Shade in clumps of 3–6 pixels. A single pixel on its own is a deliberate highlight, not texture. (My tree canopies are mostly single-pixel noise. It's fine at 2× and fuzzy at 1×, so new trees get clumps.)
- Hard edges only: every pixel is fully opaque or fully clear. The upload turns away half-transparent pixels.
- Dithering is for sky and ground only, in checker bands 2 px tall at most.

## Light

Light comes from the top left. Highlights go on top-left edges, shadows on bottom-right. The house's window shadows already do this.

## Ground line

- The bottom row of the file is where the thing touches the ground. No empty rows under it.
- A contact shadow is optional: 1–2 rows at the bottom in a solid palette colour (a dark grass or ink step), never see-through. The site doesn't add blurred shadows anymore.
- Objects face front, with 1–3 px of their top showing (like the raised bed and planter). Paths, ponds and terrain are drawn from straight above.

## Animation

- A horizontal strip of frames, all the same size, with the frame count in the filename.
- 2–4 frames per loop. 6 for something special.
- 150–250 ms per frame. No easing, no fading, no squashing.
- At most 3 animated things on one home. On the street, one per house, and they pause off-screen.
- With reduced motion turned on, everything holds its first frame.
- Good candidates, in order: chimney smoke (3 frames), a window light flickering at night (2), water shimmer (3), a flag or wind chime (2), leaves rustling on hover (2).

## File names

The filename is the item, so uploading is drag and drop:

| File | Means |
|---|---|
| `plant_roses_red.png` | item `roses_red`, a plant |
| `water_fountain@4f.png` | item `fountain`, water, a 4-frame strip |
| `seasonal_pumpkin_2026.png` | a seasonal item; the year keeps old drops apart |
| `house_cabin_base.png` | the cabin's base layer |
| `house_cabin_roof.png` | the cabin's roof layer |
| `house_cabin_door-arched.png` | an option sprite for the cabin's door socket |

The first word is the type: `plant`, `path`, `feature`, `furniture`, `lighting`, `water`, `structure` or `seasonal`. Lowercase, underscores between words, a hyphen only inside a house option name.

## Uploading

Admin → Decorations → **New from PNG**. I drop the files in, and for each one it shows the checks (size, frames, hard edges, ground line, palette), boxes any colour that isn't in the palette, and stands the sprite in a real yard at 1× and 2× next to the house, with a height ruler. Empty rows under the art get trimmed for me.

A new item starts out visible only to me, so I can put it in my own yard and live with it for a bit. Then from the same card I release it to everyone, for a date range, or with a claim code, and give it a collection name if it's part of a seasonal set.

Every upload is a new version (`roses_red.v3.png`), and the old files stay, so if a new drawing looks wrong in people's yards I just pick an older version from the list.

For a batch, I put the PNGs in `design/pixel-art/export/` and run `npx tsx scripts/upload-decorations-to-r2.ts`. It checks everything and says what it would do; `--apply` actually uploads, and `--as <my handle>` lets new items show up in my editor straight away.

**Contact sheet** (next to New from PNG) shows every sprite at 1× on one strip of grass, plus all the houses, so I can spot one that's drifted off.

## Houses

A house is a stack of layers on a 200×180 canvas: `base` (walls, foundation, ground line), `roof` (no chimney), then option sprites that drop into sockets: door, window-left, window-right, chimney (the default chimney is its own sprite), trim and treatment-left/right. The sign, number, lights and mat are drawn by the code at their sockets. The boxes are in `_guide-house.png` and `_template-house.sockets.json`.

I draw them in key colours: one reserved ramp each for wall, roof, trim and glass. The site swaps those for the palette someone picks, so one drawing covers every palette. The key colours are loud on purpose, so I never mistake one for a real colour:

| Key | Dark → light |
|---|---|
| Wall | `#500050` `#900090` `#d000d0` `#ff60ff` |
| Roof | `#005050` `#009090` `#00d0d0` `#60ffff` |
| Trim | `#505000` `#909000` `#d0d000` `#ffff60` |
| Glass | `#000050` `#000090` `#0000d0` `#6060ff` |

The door goes in the trim key. Everything else on a house layer (the stones, the chimney, the knob) is drawn in normal palette colours and stays as drawn.
