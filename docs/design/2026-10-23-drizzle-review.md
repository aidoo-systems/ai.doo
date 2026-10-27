# The drizzle's motion: animator and designer review (P2.0x)

Scope: sauce 1 on the cup serve (`?skin=icecream`, round 2), `drawSauce` and `drip` in `play/pour/game.js`. Method: read the code, then stepped the real `game.js` on a clock of my own (frames at -40 to +760 ms from the drop touching the tip). Strips are in `.loop/drizzle-mocks/` (scratch, not committed).

## The leads, confirmed or not

1. **Ribbon grows evenly from the middle: confirmed.** `wide` grows about `g.cx` over 0.12 s (`smooth((q - 0.25) / 0.3)`), both ends at once. Real sauce lands on a spot and runs off it, faster one way.
2. **No weight at impact: confirmed.** The drop eases in and out over 0.1 s (`smooth`), so it slows as it reaches the tip, is never stretched, and does not squash. At `q = 0.25` it is dropped from the draw in the same frame the ribbon starts at width 0, which reads as a pop, not a splat.
3. **Three drips at one even pace: confirmed.** One shared `run = smooth(...)` drives all three, from the same moment (`q = 0.45`), whatever the ribbon has reached. Neck and bulb never change shape, so there is no sense of speed, of the bulb filling, or of letting go.
4. **Sits over the swirl, not in its grooves: confirmed.** The underside follows `surfaceY` (the hump, then each turn's top), which is smooth. Nothing sags into the seams between turns, and the thickness ripple is a fixed sine, not a response to the surface.
5. **Static shine: confirmed.** The two gloss strokes are fixed index ranges on the top edge and never change.

## Found on the way

- **The whole sauce is over in 0.4 s and then is dead still.** The result holds 1.15 s before the next glass slides (`HOLD`), and the sauce clock starts 0.28 s after release (0.1 s freeze, 0.18 s tip), so about 0.87 s of sauce time is available. Motion that lands in 0.4 s wastes the rest.
- **Drips appear whole.** A drip is skipped until the ribbon's end passes it, then drawn at its current length, so it is born mid-run with no bead first.
- **Anything new must keep D-030's rule** (nothing above the scored height, nothing past the bottom turn, drips included), and finish by about +700 ms after contact so it is not cut by the slide.

## Mocks (frame strips, +/- ms from the drop touching the tip)

Each strip is the real game's tip and cup, drawn by a patched scratch copy of `game.js`.

- **Now:** `strip-now.png`, the shipped sauce 1.
- **A, lands and runs:** `strip-A-lands-and-runs.png`. The drop accelerates and stretches, lands off-centre, squashes into a thick puddle with a few beads flung along the surface, then runs out faster to the right; drips start as the front passes them.
- **B, A plus drips with character:** `strip-B-eased-drips.png`. Each drip gathers as a bead first, then slow-in/speed-up/ease, stretches thin while it moves, overshoots a hair and wobbles to rest; staggered, the middle one first, three different lengths.
- **C, B plus the grooves and a moving highlight:** `strip-C-grooves-and-glint.png`. The ribbon sags into the seams between turns and thins over the crests as it settles; the fixed shine dims and one glint travels along the sauce once it has settled.

`strip-all.png` stacks all four for comparison.

## Open points for the owner

- C's glint is still mid-sweep at +760 ms; if C is picked it is sped up to finish by about +700 ms.
- The beads flung at impact stay on the surface (no sauce above the tip, per D-030); a higher splash would break that rule.
