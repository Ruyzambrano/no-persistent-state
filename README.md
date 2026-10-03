# No Persistent State

A live visualisation of BGP routing updates from RIPE NCC's [RIS Live](https://ris-live.ripe.net/) feed. Each route announcement is drawn as a stroke on a canvas and then fades out. Nothing is stored or replayed.

**Live:** https://ruyzambrano.github.io/no-persistent-state/

## Running locally

There's no build step and there are no dependencies. Open `index.html` in a browser, or serve the folder with any static file server:

```
python -m http.server
```

## Stack

- Vanilla HTML, CSS and JavaScript
- Canvas 2D for drawing
- Web Audio API for sound
- WebSocket connection to RIS Live

## Controls

| Control | Effect |
|---|---|
| Speed of sample | Delay between new strokes (higher is slower) |
| Light / Dark | Page background colour |
| Play sound | Turns audio on or off |
| Modal scale | Musical scale that pitches are snapped to (default Phrygian) |
| Follow pitch / Fixed pitch | Whether a stroke's pitch changes as it draws or stays on its starting note |

## How it works

### Data

The page subscribes to a single RIS Live collector, `rrc21`, at `wss://ris-live.ripe.net/v1/ws/`. Incoming `ris_message` events go into a buffer capped at the 500 most recent. On each tick, the newest message is taken and its AS path is drawn, as long as the path has more than two hops. If the connection drops, it reconnects with exponential backoff (1s doubling up to 30s).

### Colour and position

Each AS number is hashed to a fixed hue and a fixed canvas position, so the same network always appears in the same place and colour. The hash function runs three times with different salts to get hue, x and y, which stops the three values correlating with each other.

- **Hue** comes from the last ASN in the path (the origin network).
- **Points** along the stroke are the positions of each ASN in the path.
- **Line width** scales with path length.

### Strokes

Strokes are drawn as a chain of quadratic Bezier curves. Each hop is a control point, and each segment runs between the midpoints of neighbouring hops, so the joins stay smooth. The first and last segments start and end on the actual first and last points. Strokes animate in a little at a time, one segment after another.

### Fading

The canvas is never cleared. Every frame it draws a near-transparent rectangle using `destination-out` compositing, which lowers the alpha of existing pixels. Old strokes fade to transparent, so this works the same on either background.

### Sound

Sound is off by default; browsers require a click before audio can play. When it's on, each stroke gets its own oscillator:

| Parameter | Source | Mapping |
|---|---|---|
| Pitch | y-position | ±2 octaves around A440, snapped to the selected scale |
| Pan | x-position | Linear, left to right |
| Waveform | Hue | Sine, triangle, square or sawtooth by hue range |
| Gain | Path length | 0.02 to 0.15, kept low because overlapping strokes add up |

Strokes that start while sound is off stay silent; nothing is queued.

## Repo contents

- `index.html`, `styles.css`, `stream-connect.js`: the site
- `subscribe.py`, `stream.ipynb`, `requirements.txt`: Python scripts I used to explore the RIS Live feed before building the site. The site doesn't need them.

## Credit

Routing data comes from [RIPE NCC RIS Live](https://ris-live.ripe.net/), a free public BGP monitoring service.

## Licence

MIT. See [LICENSE](LICENSE).
