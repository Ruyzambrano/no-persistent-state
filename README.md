# No Persistent State

A live visualisation of BGP routing updates from RIPE NCC's RIS Live feed. Every stroke on the canvas is a real route announcement, drawn once, animated, and left to fade. Nothing is stored or replayed.

**Live:** https://ruyzambrano.github.io/no-persistent-state/

## Running it locally

No build step and no dependencies. Clone the repo and open `index.html` directly in a browser, or serve the folder with any static file server if you'd rather not open it straight from disk.

## Stack

Vanilla HTML, CSS and JavaScript. Canvas 2D for drawing, the Web Audio API for the optional sound, and a plain websocket connection to RIPE's public RIS Live feed. No frameworks, no libraries, no build tools.

## Controls

- **Speed of sample** — how often a new route gets picked up and drawn
- **Light / Dark** — changes which colour the canvas fades towards
- **Play sound** — opt-in, since browsers won't allow audio without a click anyway. Each stroke gets its own tone, mapped from its colour, position and length
- **Follow pitch / Fixed pitch** — whether a stroke's pitch moves with it as it draws, or stays fixed at the note it started on

## Data

Routing data comes from RIPE NCC's RIS Live, a free public BGP monitoring service, at `wss://ris-live.ripe.net/v1/ws/`. This project connects to one collector, `rrc21`, to keep the volume manageable. Each message carries an AS path, the sequence of networks a route passed through to reach its destination. I'm treating that path as the shape of a brushstroke.

Credit to RIPE NCC for running and maintaining RIS Live as an open, public service. This project only exists because that data is free to connect to.

## Colour and position

I wanted the same network to always look the same, so a viewer who sticks around long enough starts recognising recurring networks by colour and position, the way you'd recognise a voice. That meant hashing each AS number into a hue and a canvas position, consistently, every time it shows up.

My first attempt at a hash function had a real problem: nearby AS numbers produced nearly identical colours, because the maths was mostly linear underneath a thin layer of mixing. I tested it properly rather than assuming it worked, ran a few thousand consecutive ASNs through it and measured how much the output actually scattered. It didn't scatter enough. I rebuilt it with a proper shift-XOR mix, tested that too, and got something that spreads genuinely unrelated numbers apart while still giving the same input the same output every time.

Colour, x-position and y-position all come from that same function, called three separate times with three different salts. Without the salts, all three values end up correlated with each other, since they're derived from the same underlying number. The salts break that correlation.

## Drawing the strokes

Straight lines between each hop looked exactly like what they are: raw data points connected by rulers. I wanted something that read as organic rather than plotted, so I moved to quadratic Bezier curves, with each curve threading through the midpoint between consecutive points rather than the points themselves. That's the standard trick for turning a jagged line into a smooth one with no visible kink at the joins.

Getting this right took a few real bugs along the way. Using the original points directly as curve segments doesn't connect properly, consecutive segments overlap and double back over each other rather than flowing forward. Fixing it meant understanding exactly which point should be the start, which the control, and which the end for every segment, including the first and last, which are special cases since there's no point before the first or after the last to take a midpoint with.

Each stroke animates in gradually, segment by segment, using linear interpolation for position within a segment and the quadratic Bezier formula for the actual curve shape.

## Decay

The canvas never clears. Instead, every frame, it paints a near-transparent layer over itself using the canvas compositing mode `destination-out`, which erases existing pixels proportionally rather than painting a colour over them. That's what lets old strokes fade to nothing regardless of whether the page is in light or dark mode, instead of fading toward whatever flat colour the wash itself happens to be.

## Sound

Sound is opt-in. It has to be, since browsers won't let audio play without the person clicking something first, but I'd have made that choice anyway. The piece is meant to be heard only live, only while you're actually watching, and I didn't want missed strokes queued up or replayed once you switch sound back on.

Each stroke gets its own oscillator, tied to its own pitch, pan, timbre and volume:

- Pitch comes from the y-position, mapped onto a Phrygian scale rather than raw frequency. Pitch perception is logarithmic, so a straight linear map from pixels to Hz sounds uneven, bunched up at one end. I wanted some real tension in the sound too, so I picked Phrygian specifically for the half-step sitting right above its root note, which gives it a dark, slightly unresolved character rather than defaulting to something that always sounds comfortable.
- Timbre comes from hue, bucketed across the four waveforms Web Audio ships with, sine through to sawtooth, calmest to harshest. Timbre is genuinely called tone colour in music theory, so this mapping isn't just convenient, it's accurate.
- Pan comes from x-position, a straight left-to-right remap, no scale quantising needed since stereo position isn't perceived logarithmically the way pitch is.
- Gain comes from path length, capped low on purpose. Several strokes can be sounding at once, and their volumes add together, so even a modest ceiling can get loud fast with enough overlap.

You can choose whether pitch follows the brush live as it moves, or stays fixed at the note it started on. I went back and forth on this for a while. The fixed version gives you a quiet wash of sustained, harmonically related notes, since everything's drawn from the same scale. The live version gives you more of a stepped little melody per stroke, but loses some of that calm, drone-like quality once several strokes are moving independently. In the end I decided not to decide, and gave the choice to whoever's listening instead.

## How I actually built this

I started this project knowing Python and data engineering, and no JavaScript at all. I mean that literally. Early on I didn't know the syntax for an `if` statement. Everything in this project, the websocket handling, the recursive `setTimeout` pacing pattern, the hash function, the Bezier maths, the Web Audio synthesis chain, I learned by building it, one bug at a time, mostly by writing something, watching it fail, and working out exactly why.

A few of the bugs taught me more than the features did. A scoping mistake with `const` inside an `if`/`else` block showed me how block scope actually works. An off-by-one in a stroke's removal condition, that only showed up after I'd already fixed two other bugs in the same function, taught me to verify fixes properly rather than assume one correction means the whole thing's sorted. Floating point drift meant `t === 1` silently never fired, which is the kind of bug that doesn't throw an error, it just quietly does nothing forever.

If you're reading this and you're earlier in learning to code than I was when I started: it's genuinely possible to go from not knowing basic syntax to shipping something like this. It just takes testing every assumption instead of trusting that it probably works.