# Widget design

What is specific to the official GlassHome widgets. Rules for every widget (the loop, the parts, sizes, words, controls, sheets, groups, motion) live in widget-sdk `guide/widgets.md`: read it first, and put a rule there when it applies to any widget. Values live in code: the anatomy and its scale in widget-sdk (`framework/components/anatomy.tsx`, `framework/theming/tokens.css`), colour tokens in `@glasshome/ui` `theme.css`.

## Principle

Every widget is the same anatomy filled differently, so a dashboard reads as one product. Each widget answers one question a homeowner asks ("is the living room lit?", "how did today go?", "is now a good time to run the dishwasher?").

## Anatomy

The parts are in the guide. Placement: the Hero's value with its unit sits bottom-left on every tile, art bottom-right behind it; the Controls row sits beside the value from 520px wide, under it below that, with the art lifted above. Controls keep ui's own radii, so their corners match at every size.

## Size

A "2x2" is 156px tall and 150 to 370px wide depending on the screen, so layout follows the measured box (container queries in the SDK's `tokens.css`):

| Box | Change |
|---|---|
| under 230px tall | controls row hides; tap and drag still work |
| under 170px tall or 260px wide | head chips hide |
| under 240px wide | a choice row keeps only the selected segment |
| under 180px wide | art hides; head stacks icon over name; photo tiles drop the icon |
| under 130px tall or 140px wide | compact: name on top, value at the bottom, faint glyph in the corner; eyebrow and small line hide |
| under 130px tall, 260px wide or more | one row: name left, value right |

The icon uses the SDK's `--widget-icon-box`; head text scales from it.

One scale: `--widget-unit` is 1% of the tile's short side and every size token (`--widget-text-*`, `--widget-control-h`, spacing, icon box) is fitted to the designed 2×2 and 4×4 sizes and keeps growing to 8×8. Every official tile widget goes to 8×8. A big tile with no art of its own (no hero art, backdrop or layer) shows its icon large and faint in the corner.

A widget opens at its first example's size, and that size shows its whole face: a device tile with art opens at 2×2, the media player at 3×3 so its transport shows, the camera at 3×2.

## Words

- The name heads the tile. Weather alone drops it unless one is set, since a forecast has no device to name.
- Small lines: "Now 21.8°C", "69% low-carbon".
- The degree sign sits raised; other units small at the baseline.

## Controls

- Continuous values with a full-tile slider: brightness, setpoint, volume, speed, position.
- A selected segment wears the widget's colour.
- Corners are concentric: shapes flush to the tile edge use `TILE_INNER_RADIUS`, inset shapes the theme corner.

## Sheet

The sheet opens beside the tile (from the bottom on a phone), sized to its content. Edit mode opens the settings alone, and Debug shows only in Developer Mode. The SDK gives it a small title; the widget fills it with `PanelSection`s.

- What the official widgets put there: a group's members (`PanelEntityRow`: tap switches one, a drag across sets its level), a light's colour (a row of presets, the whites and this screen's recent colours, one tap each; a `TemperatureBar` over the Kelvin span the lamps reach; a `ColorDisc` for the colour lamps, free to drag anywhere; the sheet says when colour reaches only some lamps), modes, presets, sources, the days ahead, history, readings (`PanelFacts`). A row that only reads takes `fill` and is not a button.
- Rows are button glass with the tile's slider fill and icon box, so nothing changes look between a tile and its sheet.

## Groups

One rule for every tile that holds several entities (`common/group.ts`):

- The value is the state that needs attention when any member is in it ("Unlocked", "Open", "On"), else the resting one ("Locked", "Closed", "Off"). A number that only one member has (speed, position) shows for a single entity only; brightness averages the lights that are on.
- The small line counts it: "All locked" when every member agrees, "1 of 2 unlocked" otherwise.
- The tile's colour follows the value.
- The one-tap state goes towards rest while any member is active (lock, close, off), otherwise on or open. Once all locks are locked, the tap opens the dialog, which unlocks door by door.
- A cover without a device class never joins a bulk action either, since it may be a door (`coverJoinsBulk`). A cover group holding one taps into the dialog and has no bulk buttons or slide.
- A widget that controls one device (climate, media player) picks one entity.

## Art

Two roles, one per widget:

- **Backdrop**: a full-bleed photo under a scrim, text on top (area, energy balance, weather, camera placeholder).
- **Object**: a cut-out in the bottom-right corner, behind the words (lamps, fan, window, door, thermostat, pylon, house). The words never shrink or move to make room for it; instead wide art narrows until it clears the state word at its largest.

Media is the exception: the album cover sharp on the vinyl, blurred behind the tile. Each widget has its own subject, so neighbours never repeat a picture.

- **Style**: photographic, calm, Scandinavian: oak, stone, linen, plants, soft daylight, muted warm palette, no people, text or logos. A subject that turns to noise at 150px becomes a low-detail matte render. A placeholder that must not look live is softly blurred.
- **Rendered objects**: an object with moving parts is modelled and rendered in Blender (`scripts/widget-art/blender`): one studio, camera and light for every object, a transparent background, rounded edges. Its motion ships as a strip of frames the tile steps through on a state change (`common/art/strip.tsx`). A part that follows a continuous value (a blind, a garage door) is drawn in code over a still render instead; the render script exports that part's projected corners into a generated `.art.ts`, so nothing is hand-measured. Static objects stay photographs.
- **Facing**: an object sits on the tile's right edge, so it is shown in three-quarter view, turned to face left into the tile. Round objects (bulbs, globes, pylon) stay frontal. It faces left because it was photographed or modelled that way, never because it was mirrored.
- **Clean cut-outs**: object photographs are shot on flat neutral grey and cut out by a matting model, so no key colour tints the object or its edges; clear glass stays see-through.
- **State is drawn in code** over an image of the thing at rest: lamp light, blind position, panel glow, wires, the sun's arc. Day and night versions of one image are registered frame for frame and crossfade on `useDaylight()`.
- **The homeowner's choice wins.** Where a photo stands for their home (a room, a camera), what they picked in the widget's `field.image` (a built-in photo or their own) comes first, then the picture Home Assistant has, then the widget's own fallback (plain glass for a room, the soft entrance photo for a camera).
- **Built-in art is chosen, never guessed.** Nothing is inferred from names. Built-in photos (rooms, sample pictures) are `presets` of the widget's own `field.image`, so they sit in one picker beside the homeowner's uploads, with a small thumb each. Object art (lamps, fans, locks, climate devices, covers) is a `field.choice` with `icons`. Where Home Assistant's device class names the object, the default option is an explicit "Match Home Assistant". Defaults are plain: no picture, the table lamp, the standing fan, the front door, the thermostat.
- **Legibility**: a `--card` scrim behind text, a soft text shadow, near-white small lines. Dark scenes put the tile in the theme's `.dark` scope; in dark mode a daytime photo is dimmed.
- **Weight**: images ship inside the bundle, so keep each small (most are 10 to 40KB WebP).
- **Layered scenes**: a scene that weather must move through is cut into full-frame layers (sky, far, near) keyed from one generation, so fog, cloud and rain sit between them. Night gets its own registered pair (moonlight cannot be faked by darkening daylight); dusk, storm and fog are graded in code over the layers, never a new image per condition.
- **Small text never sits on a photo.** A scene that shares a tile with data takes its own region (the top, or the left of a strip) and fades into the widget's glass; only the big value and its one line sit on the picture. Data below reads in theme ink like every other widget. Show a change, not a repeat: a forecast marks the hour the sky turns instead of an icon per hour.

## Live data

A change of state moves: the big value rises in when its words change ("Locked" to "Unlocked", "Off" to "80%"), and rendered art steps to its other state; a reading whose digits tick stays still. Timing comes from the theme's motion tokens, so reduced motion stops it everywhere.

- JSX passed as a prop is read once through `children()` (`TileHead` and `TileHero` do this).
- Layout that depends on which things exist is memoised on that set, not on readings.
- Animation durations move in a few fixed steps, since a new duration restarts the animation.
- Ambient motion is composite-only and pauses offscreen, when hidden, and with reduced motion.
- Particles (rain, snow) are one tiled layer per depth that moves by one tile and loops, never one node per drop.

## Checking a change

The loop in the guide. Official widgets also regenerate their committed previews after a visual change.

## The widgets

| Widget | Answers | Leads with | Art |
|---|---|---|---|
| light | is it on, how bright | brightness | lamp, lit in code |
| climate | what is it set to | target, or the heat/cool band | thermostat, radiator, air conditioner or heat pump; dimmed when off, glowing in the mode's colour while running |
| area | what is the room doing | temperature and humidity, device chips | room photo, day and night |
| clock | what time is it | the chosen face | none |
| media-player | what is playing | title, artist, transport | album cover |
| fan | running, how fast | speed | stand fan or purifier |
| cover | how open | position | window with a blind, curtains, roller shutter or garage door, rendered still; the moving part is drawn in code inside the corners the render exports and follows the position continuously |
| switch | on or off | the state | none |
| lock | locked | the state | front door, garden gate or smart lock, rendered; unlocking swings the door and gate open and slides the bolt in |
| button | last pressed | the time | none |
| scene | what can I run | one chip per scene | none |
| sensor | the reading | the value | sparkline |
| binary-sensor | open, detected | the state | door, window or garage door following the device class, open or closed; none for other classes |
| batteries | anything low | lowest level | lowest four listed |
| energy-balance | how did today go | net energy | horizon with the sun's arc |
| energy-flow | where is power going | home use; a scene on large tiles | house, ribbons sized and tapered by flow |
| electricity-grid | a good time to use power | the verdict | pylon, wires green by low-carbon share |
| weather | is it raining, how warm, how will it go | the temperature, fixed top left, no name unless one is set; days above a curve of the next hours on the bottom edge, one colour scale for both | alpine lake in layers: sky, mountains, shore, with weather between them |
| camera | the live view | the stream | soft entrance photo without a feed |
| header | which dashboard, what needs a look | the dashboard's name under a greeting; one chip per thing left on, tap to turn it off | none |
| picture-frame | the homeowner's own photos | the photo, edge to edge, no scrim; "contain" fills the bars with a blur of the same photo | four sample photos (coast, dog, forest, meadow), shown with a chip until pictures are picked and offered as presets in each picture's picker |

## Keeping this current

This document describes the widgets as they are today. When a direction changes, update the rule here in the same change as the code, and delete a rule nothing follows anymore. A rule that holds for any widget moves to widget-sdk `guide/widgets.md` and leaves this file. A new widget adds its row to the table above. When a rule turns out wrong on a real dashboard, fix the rule; a genuine exception (like media's two images) is named in the section it breaks. Keep it short: a rule that needs a paragraph of reasons is usually two rules or none.
