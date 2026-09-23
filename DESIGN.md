# Widget design

How the official GlassHome widgets look and behave. Values live in code: layout in `src/common/tile/`, tokens in `@glasshome/ui` `theme.css`.

## Principle

Every widget is the same anatomy filled differently, so a dashboard reads as one product. Each widget answers one question a homeowner asks ("is the living room lit?", "how did today go?", "is now a good time to run the dishwasher?") and leads with the answer: a few words or one big number. A picture shows the answer where it can; a list of numbers is the last resort.

## Anatomy

Built from `src/common/tile/tile.tsx`. Each zone appears only when the box has room for it.

| Zone | Component | Holds |
|---|---|---|
| Head | `TileHead` | icon (`WidgetIcon`, stacked for groups via `count`), a small line above the name, optional chips |
| Hero | `TileHero` | a small line above the big value, the value with its unit, art on the right |
| Controls | `TileControls` | one row: `TileStepper`, `TileChoice`, transport buttons, chips |

`Tile` is the frame, `TileBackdrop` a full-bleed image layer, `TileGlyph` the faint corner icon on compact tiles, `TileChip` a small fact.

## Size

A "2x2" is 156px tall and 150 to 370px wide depending on the screen, so layout follows the measured box (container queries in `tile.css`):

| Box | Change |
|---|---|
| under 230px tall | controls row hides; tap and drag still work |
| under 170px tall or 260px wide | head chips hide |
| under 240px wide | a choice row keeps only the selected segment |
| under 200px wide | art hides |
| under 180px wide | head stacks icon over name; photo tiles drop the icon |
| under 130px tall or 140px wide | compact: name on top, value at the bottom, faint glyph in the corner |
| under 130px tall, 260px wide or more | one row: name left, value right |

The icon uses the SDK's `--widget-icon-box`; head text scales from it.

## Words

- Lead with the answer: a number with its unit, or a short verdict ("Good time", "Locked").
- The small line explains it ("Now 21.8°C", "69% low-carbon").
- Never show a value twice on one tile.
- Groups read as a count ("2/3") or their shared state ("Closed").
- States follow the device class: a door is Open or Closed, motion is Detected or Clear.
- The degree sign sits raised; other units small at the baseline. No all-caps. Separator " · ".

## Controls

- `@glasshome/ui` components through the SDK only: `Button`, `ButtonGroup`, `ToggleGroup`, `Toggle`, `Badge`, `Icon`.
- A continuous value (brightness, setpoint, volume, speed, position) keeps the full-tile `WidgetSliderFill`. Buttons sit beside it.
- A selected segment wears the widget's colour.
- Doors, gates and garage doors never join a one-tap bulk action.
- Corners are concentric: shapes flush to the tile edge use `TILE_INNER_RADIUS`, inset shapes the theme corner.
- Use theme token names (`--card`, `--foreground`, `--muted-foreground`, `--primary`); `--color-*` aliases do not exist in a widget's shadow root.

## Art

Two roles, one per widget:

- **Backdrop**: a full-bleed photo under a scrim, text on top (area, energy balance, weather, camera placeholder).
- **Object**: a cut-out in the hero's art slot (lamps, fan, window, pylon, house).

Media is the exception: the album cover sharp on the vinyl, blurred behind the tile. Each widget has its own subject, so neighbours never repeat a picture.

- **Style**: photographic, calm, Scandinavian: oak, stone, linen, plants, soft daylight, muted warm palette, no people, text or logos. A subject that turns to noise at 150px becomes a low-detail matte render. A placeholder that must not look live is softly blurred.
- **State is drawn in code** over an image of the thing at rest: lamp light, blind position, panel glow, wires, the sun's arc. Day and night versions of one image are registered frame for frame and crossfade on `useDaylight()`.
- **The homeowner's picture wins.** Where a photo stands for their home (a room, a camera), a picture they chose replaces the built-in one: the widget's own `field.image`, then the picture Home Assistant has, then the default. Object art is illustrative and stays built in.
- **Legibility**: a `--card` scrim behind text, a soft text shadow, near-white small lines. Dark scenes put the tile in the theme's `.dark` scope; in dark mode a daytime photo is dimmed.
- **Weight**: images ship inside the bundle, so keep each small (most are 10 to 40KB WebP).
- **Layered scenes**: a scene that weather must move through is cut into full-frame layers (sky, far, near) keyed from one generation, so fog, cloud and rain sit between them. Night gets its own registered pair (moonlight cannot be faked by darkening daylight); dusk, storm and fog are graded in code over the layers, never a new image per condition.
- **Small text never sits on a photo.** A scene that shares a tile with data takes its own region (the top, or the left of a strip) and fades into the widget's glass; only the big value and its one line sit on the picture. Data below reads in theme ink like every other widget. Show a change, not a repeat: a forecast marks the hour the sky turns instead of an icon per hour.

## Live data

A new reading changes text and attributes in place; it never rebuilds DOM.

- JSX passed as a prop is read once through `children()` (`TileHead` and `TileHero` do this).
- Lists that update with readings use `Index`.
- Layout that depends on which things exist is memoised on that set, not on readings.
- Animation durations move in a few fixed steps, since a new duration restarts the animation.
- Ambient motion is composite-only and pauses offscreen, when hidden, and with reduced motion.
- Particles (rain, snow) are one tiled layer per depth that moves by one tile and loops, never one node per drop.

## Checking a change

Look at pixels, in both themes, at real sizes.

- `bun widget preview <widget> --sizes grid` renders every example across common sizes into `preview/sweep/`, with one contact sheet per example and theme. Narrow it with `--sizes 150x156,340x242`, `--theme dark` and `--example 0`; change the state with `--config '<json>'`, `--service 'domain.service|entity_id|<json>'`, `--at <iso time>` and `--click <selector>`; `--eval '<expr>'` prints a value per render (`root` is the widget's shadow root). `bun widget help` lists them all.
- Over 20 seconds of changing demo data, a widget adds and removes no DOM nodes.
- Regenerate previews after a visual change.

## The widgets

| Widget | Answers | Leads with | Art |
|---|---|---|---|
| light | is it on, how bright | brightness | lamp, lit in code |
| climate | what is it set to | target, or the heat/cool band | none |
| area | what is the room doing | temperature and humidity, device chips | room photo, day and night |
| clock | what time is it | the chosen face | none |
| media-player | what is playing | title, artist, transport | album cover |
| fan | running, how fast | speed | stand fan or purifier |
| cover | how open | position | window, blind drawn to position |
| switch, lock | on or off, locked | the state | none |
| button | last pressed | the time | none |
| scene | what can I run | one chip per scene | none |
| sensor | the reading | the value | sparkline |
| binary-sensor | open, detected | the state | none |
| batteries | anything low | lowest level | lowest four listed |
| energy-balance | how did today go | net energy | horizon with the sun's arc |
| energy-flow | where is power going | home use; a scene on large tiles | house, ribbons sized and tapered by flow |
| electricity-grid | a good time to use power | the verdict | pylon, wires green by low-carbon share |
| weather | is it raining, how warm, how will it go | the temperature, fixed top left, no name unless one is set; days above a curve of the next hours on the bottom edge, one colour scale for both | alpine lake in layers: sky, mountains, shore, with weather between them |
| camera | the live view | the stream | soft entrance photo without a feed |

Picture-frame and header are not on this system yet.

## Keeping this current

This document describes the widgets as they are today. When a direction changes, update the rule here in the same change as the code, and delete a rule nothing follows anymore. A new widget adds its row to the table above. When a rule turns out wrong on a real dashboard, fix the rule; a genuine exception (like media's two images) is named in the section it breaks. Keep it short: a rule that needs a paragraph of reasons is usually two rules or none.
