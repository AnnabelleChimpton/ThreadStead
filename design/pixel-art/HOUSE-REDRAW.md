# Redrawing the houses

How to turn the four code-drawn houses into hand-drawn pixel art that the site
can recolour for every palette. Pairs with this folder's README (palette,
outline, light, ground line) and the files it names.

## What a house is

A house is a short stack of PNGs on a **200×180** canvas, drawn at 1×:

1. **`base`**: the walls, foundation and the ground line, with no roof.
2. **`roof`**: the roof plane, with no chimney.
3. **Option sprites**, each the size of a **socket** box, dropped on top:
   door, window-left, window-right and chimney. The default chimney is its
   own sprite (`chimney-default`) so "no chimney" can leave it out. The
   sign, number, lights and mat are still drawn by the code, at their
   sockets.

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
| chimney | default, brick, stone (`none` hides it) | `house_cabin_chimney-default.png` … |

An option that looks the same as the default (the townhouse's own door is
the double door) can be left out: list it in the set's `sameAsDefault`.

**Not yet sprite options:** roof trim and window treatments. Homes using
either keep their old drawing for now, and so do homes with their own
colours (`spriteDrawable` in `lib/pixel-homes/house-layers.ts`).

**Where the files live:** `public/pixel-homes/house-layers/<template>/`,
e.g. `public/pixel-homes/house-layers/cabin_v1/house_cabin_base.png`. The
drafts and the scripts that drew them are in `HomePageAgain/design/house-drafts`.

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

- **Wire the files in.** Done for all four (`HOUSE_LAYER_SETS`,
  `lib/pixel-homes/house-layers.ts`). A template switches on when it's named
  in `NEXT_PUBLIC_HOUSE_SPRITES` (`cabin_v1,cottage_v1,townhouse_v1,loft_v1`).
  The yard, the share picture and the street picture all follow the flag.
- **Fall back for undrawn options.** Done: a home that picked something the
  art doesn't draw keeps the old drawing (`spriteDrawable`).
- **Custom colours.** 11 homes set their own roof or wall hex, and the sprite
  renderer skips those (they keep the old drawing). Decide whether custom
  colours snap to the palette ramps so these homes get the new art too.
- **Redraw the pictures.** After switching on, redraw the share and street
  images (the flag is part of each picture's hash, so no `--force` needed):
  `npx tsx scripts/backfill-home-snapshots.ts --apply`
  (dry run first, without `--apply`). Redrawn art at the same file names
  does need `--force`.
- **Look at the contact sheet** (admin) with all houses × palettes before
  announcing it.
