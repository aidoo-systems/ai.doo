# Promo videos

Silent social videos for the pour game (`/play/pour/`) and the stamp card demo (`/stamps/`),
drawn from the real pages, one frame at a time. Nothing here is served: `scripts/` is in
deploy's exclude list.

| File | What it is |
|------|------------|
| `pour.html` | The pour game video: hook, scan, prize, pour, results, winner and staff tap, café → dairy → ice cream, end card |
| `stamps.html` | The stamp card video: hook, the demo's own phones (sign, Wallet, staff scan, full card), end card |
| `clock.js` | A virtual clock loaded into every frame, so each frame is exact however slow the screenshot |
| `render.mjs` | Serves the repo, plays the page, screenshots at 2x, encodes with ffmpeg |
| `posts.md` | Which video goes on which account, and the words to post with it |

## Setup (once)

Node, ffmpeg on the PATH, and Playwright:

```
cd scripts/promo-video
npm install
```

Then either `npx playwright install chromium`, or use the installed Edge with `PW_CHANNEL=msedge`
(PowerShell: `$env:PW_CHANNEL="msedge"`).

## Render

```
node render.mjs all                       # every public version: pour and stamps, full and short, 9:16 and 16:9
node render.mjs pour                      # pour, full, 9:16
node render.mjs pour --cut short --land   # pour, 15s, 16:9
node render.mjs stamps --shop "shop=Gelatory&icon=icecream&reward=free%20scoop&color=D74000&stamps=10"
node render.mjs pour --frames 0,345,640   # stills only, to check a layout
```

MP4s land in `out/` (ignored by git), named like `pour-full-9x16.mp4`. A full video takes one
to two minutes. If ffmpeg is missing, the frames stay in `out/<name>/`.

| Video | Length | Notes |
|-------|--------|-------|
| pour full | 27.6s | scan → prize (spotlight) → pour → results (spotlight) → winner (camera push on the staff tap) → café, dairy, ice cream |
| pour short | 15.5s | scan → pour → winner → end card |
| stamps full | 34s | the demo's whole loop |
| stamps short | 21s | skips from the first stamp to the full card |

`--shop` takes the demo's own link query (see the stamps emails in
`docs/design/2026-10-22-second-outreach-emails.md`); the end card then asks
"Want this for <shop>?". Those carry a real business's name: send each to that shop only,
never post them.

## Changing a video

Each page's timeline is the `CUTS` object near the top of its script: when each shot, caption,
spotlight or push starts and ends, in seconds. The copy is plain HTML above it. Check with
`--frames` before a full render.

## Rules

- **Say only what ships.** Every line must be on `/promo-games/` or `/stamps/` already. The
  stamp card isn't built: its video shows the demo and offers only the free pilot, no price.
- **Re-render when the game changes.** The pub's first pour is held for `HOLD` (1.66s) to land
  on the line, and the results screen comes from `HOLDS`. render.mjs prints the first pour's
  verdict and the results screen: if a skin's rounds change and the verdict isn't "A perfect
  pint", retune `HOLD`.
- The winner's screen clock is fixed to Fri 23 Oct, 19:42, so a render never shows when it
  was made.
- The 16:9 pour end card shows `images/promo/pour-qr.svg`; if the demo moves, that QR code
  and the video move with it.
