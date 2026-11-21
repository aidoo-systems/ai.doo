# Stamp card shop pack

The Davison's pilot pack (2026-11-11) as a template: every new stamp card shop gets the same
framed counter sign, laminated staff guide and visit notes, in its own colours.

```
py internal/stamp-pack/make_pack.py internal/<shop>/shop.json
```

writes `sign.html` (A6, for a 10x15cm frame), `leaflet.html` (A4, to laminate), `briefing.html`
(the owner's notes, not for the shop), `qr.svg`, `<slug>-stamp-card-qr.png` (1184px, quiet zone,
for posts and menus) and `card.png` (loyalty's own renderer) beside the `shop.json`. Needs Pillow,
`qrcode`, and the loyalty repo beside this one (or `LOYALTY_SRC`). Print with no margins and
background graphics on.

Shop packs stay **untracked** in `internal/<shop>/`: a shop's logo and name are for its own pack,
never ai.doo's posts. Only this folder is tracked.

## shop.json

See `example-shop.json`. Required: `slug`, `name`, `stamps` (3 to 15), `reward` ("A free coffee", as
typed on /owner), `reward_noun` ("coffee": "The free coffee", "give them their coffee"), `card`
(`bg`, `fg`: what /owner gets), `print.ink` and `print.accent` (the sign's main colour and its frame
rule). Optional: `print.wash`, `print.deep`, `print.paper` (default white), `print.backdrop`;
`logo` (the stamp mark), `wordmark` (name picture for print, copied to `wordmark.png`),
`card_wordmark` (a light one for a dark card); `headline_html`, `counters_line` (the leaflet's
line about more phones: say "parlour"/"shop" and real towns for a chain), `in_the_bag`,
`talking_points` (an HTML file; default `templates/talking-points.html`, a walk-in), `occasion`,
`when_html`, `notes_kind`, `card_count`, wordmark widths in mm.

Davison's own `shop.json` rebuilds its original pack exactly (the leaflet differs only in line
endings), which is how the template was checked.

## Rules carried over from Davison's

- Logos only from the shop's own website, with the owner's OK before downloading; ask the owner
  for images where the site's are poor. Check the name picture and badge at real size, and that
  the round badge doesn't clip the mark.
- The QR (`stamps.aidoo.biz/s/<slug>/new`) only works once the owner has created the shop on
  /owner with exactly that slug. Never create shops from here.
- No em dashes in printed copy. The price is on the leaflet only (as Davison's), never the sign.
- If the shop says no, the frame comes home.
