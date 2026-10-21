# Redrawing the houses

How to turn the four code-drawn houses into hand-drawn pixel art that the site
can recolour for every palette. Pairs with this folder's README (palette,
outline, light, ground line) and the files it names.

## What a house is

A house is a short stack of PNGs on a **200×180** canvas, drawn at 1×:

1. **`base`**: the walls, foundation and the ground line, with no roof.
2. **`roof`**: the roof plane and the chimney's default spot.
3. **Option sprites**, each the size of a **socket** box, dropped on top:
   door, window-left, window-right, chimney, sign, number, lights, mat.

The socket boxes live in `_template-house.sockets.json`, and `_guide-house.png`
shows them over the canvas. The renderer reads that same file, so if a door
needs a bigger box, change the numbers there and the code follows.

Two lines matter on every house:

| Line | y | What it does |
|---|---|---|
| **Ground line** | 170 | The bottom row of the foundation, where the house touches the grass. Nothing below it except an optional 1–2 px shadow row. |
| **Sort line** | 150 | Decorations whose feet are above it draw *behind* the house, and below it draw in front. Keep the front wall's bottom edge here. |

## Colour: draw once, wear every palette

Paint the parts residents can recolour in the **key colours**: four loud
ramps, dark to light. The site swaps each key ramp for the matching ramp of
the palette someone picked.

| Key | Use it for | Dark → light |
|---|---|---|
| Wall | siding, plaster, boards | `#500050` `#900090` `#d000d0` `#ff60ff` |
| Roof | shingles, tiles, thatch | `#005050` `#009090` `#00d0d0` `#60ffff` |
| Trim | frames, eaves, porch posts, door | `#505000` `#909000` `#d0d000` `#ffff60` |
| Glass | window panes | `#000050` `#000090` `#0000d0` `#6060ff` |

Everything else (stone foundation, chimney brick, door knob, flower boxes) is
drawn in normal colours from `threadstead-44.gpl` and stays as drawn.

Four tones per ramp is the budget: shadow, base, light, highlight. Light
comes from the top left. Outlines are selective, in the darkest step of the
ramp they sit on, never pure black.

How the five palettes map key ramps to the master palette
(`HOUSE_PALETTE_RAMPS` in `lib/pixel-homes/palette.ts`). Every palette owns
its walls, so switching palettes repaints most of the house:

| Palette | Wall | Roof | Trim | Glass |
|---|---|---|---|---|
| thread_sage | sage green (foliage) | wood | pine | sky |
| charcoal_nights | charcoal (ink) | slate | linen (light ink) | butter, lit windows |
| pixel_petals | rose | red | dark red | sky |
| crt_glow | lavender | ink | lavender | foliage, a green screen |
| classic_linen | linen (light ink) | dark wood | white | sky |

Step 3 of each ramp is the colour the code-drawn houses paint with, so paint
most of a surface in the key's step 3. Once a house is drawn, look at it in
all five and adjust the table if a step reads wrong (it's data, not art).

## The order

By how many homes use each (prod, Oct 2026) and how hard the shape is:

1. **Cabin**: 18 homes. The simplest silhouette, and the sockets file is
   already measured from it. Do this one first and ship it alone.
2. **Cottage**: 16 homes. First decide the roof: keep the quirky arch in
   pixel form, or redraw it as a steep gable or thatch hip.
3. **Townhouse**: 13 homes. Give it character: brick, a stepped parapet.
4. **Loft**: 13 homes. Today it's a blank cream box that ignores most of its
   palette. A water tank, brick and a fire escape would help.

Each template needs its own sockets entry once its shape differs from the
cabin's.

## Per house: the files

Required, or the site keeps the old house:

- `house_<template>_base.png`
- `house_<template>_roof.png`

Options people can already pick, so draw these before switching a template
on (the default look is part of base and roof):

| Socket | Choices to draw | File names |
|---|---|---|
| door | arched, double, cottage | `house_cabin_door-arched.png` … |
| window-left, window-right | round, arched, bay | `house_cabin_window-round.png` … (one sprite fills both sockets) |
| chimney | brick, stone (`none` hides it) | `house_cabin_chimney-brick.png` … |

**Not yet sprite options:** roof trim, foundation, window treatments, roof
material, lights, mat, house number and sign. Houses using any of these keep
their old drawing for now (see "Before switching a template on" below).

## How I'd draw one

1. Open `_guide-house.png` as a reference layer. Lock it.
2. **Silhouette first**, in one flat key tone per part: walls, roof, door,
   windows. Check it at 1× next to the yard preview (`_yard-preview.png`) and
   against the door-height ruler. The house should read at 1× before any
   detail goes in.
3. **Block the tones**: 3–4 per ramp, light from the top left, shading in
   clumps of 3–6 px rather than single-pixel noise.
4. **Outlines**: selective, full strength on the bottom and right, lighter or
   absent on edges facing the light.
5. **Split into layers**: base (no roof), roof, and the option sprites cut to
   their socket boxes. Hard alpha only.
6. **Check the ground line**: the lowest opaque row is y = 170.
7. **Export** PNG-32 with no colour profile and no scaling, named as above.

## Before switching a template on

These are the code steps, for me or a session:

- **Wire the files in.** Put them in `HOUSE_LAYER_SETS`
  (`lib/pixel-homes/house-layers.ts`) or in the upload flow, preview the
  template in all five palettes, then set `NEXT_PUBLIC_HOUSE_SPRITES=cabin_v1`.
- **Fall back for undrawn options.** The sprite renderer currently draws the
  base when someone picked an option with no sprite. It should fall back to
  the old drawing for that home until the option is drawn, so nobody's house
  loses something they chose.
- **Custom colours.** 11 homes set their own roof or wall hex, and the sprite
  renderer skips those (they keep the old drawing). Decide whether custom
  colours snap to the palette ramps so these homes get the new art too.
- **Redraw the pictures.** After switching on, redraw the share and street
  images:
  `npx tsx scripts/backfill-home-snapshots.ts --apply --force`
  (dry run first, without `--apply`).
- **Look at the contact sheet** (admin) with all houses × palettes before
  announcing it.
