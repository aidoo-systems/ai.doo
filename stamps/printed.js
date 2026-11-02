// The printed stamp card, drawn the way the live service draws its stamp image: loyalty's
// src/loyalty/render.py (P1.19, P1.22; its D-032, D-033 and D-040). A rounded panel of dark
// stock on the pass, with a soft shadow, a fine grain and a printed double rule; printed boxes,
// the last a scalloped badge holding a line-drawn gift; each stamp one ink, a double ring and the
// logo's silhouette (its brightest parts, like the ball's shine, carry no ink); at full the rules
// turn foil and a warm light rises over the whole card. Same constants, same order of layers.
//
// No DOM in here beyond the pixels it is handed: index.html gives it the logo's and the
// wordmark's pixels and puts the result on a canvas. Nothing is stored or sent.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PrintedCard = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var WIDTH = 1032, HEIGHT = 812; // Google's hero, which the web card shows too
  var STRIP_WIDTH = 750, STRIP_HEIGHT = 288; // Apple's strip at 2x
  var MARGIN = 40, GAP = 28, MAX_PER_ROW = 5;
  var CARD_MARGIN = 0.045, CARD_CORNER = 0.07, CARD_PAD = 0.06, HEADER = 0.17;
  var PAPER_LIFT = 0.055, PAPER_WARMTH = 0.03, PRINT = 0.72, SHADOW = 110 / 255, PAPER_GRAIN = 0.05;
  var GLOW = [255, 214, 140], FOIL_DARK = [232, 190, 96], FOIL_LIGHT = [168, 116, 24];
  var HOLLOW = 0.10, PRINTED_RING = 0.45, GIFT_TONE = 0.55, STAMP = 0.90, INNER = 0.74, RING_PX = 3;
  var TEX = 256, GRAIN = 512, NOISE_N = 64;

  // render.stamp_pose(i) and its grain offsets, copied from the service so each stamp leans and
  // sits as it does on a real card: tilt (radians), nudge x and y (box radii), ink, grain x and y.
  var POSES = [
    [0.12476, 0.03988, 0.00254, 0.9609, 71, 503], [-0.22027, 0.00322, 0.04107, 0.9733, 443, 475],
    [0.12105, -0.01054, -0.04442, 0.9638, 182, 178], [-0.18605, 0.01922, -0.04482, 0.9621, 434, 3],
    [0.20084, -0.04521, -0.04256, 0.9051, 23, 222], [-0.22182, 0.01317, -0.03882, 0.9427, 39, 510],
    [0.13281, -0.03663, -0.02016, 0.9847, 230, 323], [-0.09042, 0.00121, 0.04616, 0.9152, 123, 459],
    [0.14380, -0.03114, -0.03558, 0.9183, 28, 158], [-0.13283, -0.04731, -0.03917, 0.9711, 344, 406],
    [0.08133, 0.00559, -0.01497, 0.9453, 351, 243], [-0.11334, -0.00258, 0.04271, 0.8832, 460, 101],
  ];

  // A float in [0, 1) from integers: the same on every run. The service hashes with SHA-256;
  // the grain only has to look the same, not be the same pixels.
  function unit(a, b, c) {
    var h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x3c6ef372, 0x165667b1) ^ Math.imul((c | 0) + 0x9e3779b9, 0x85ebca6b);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mixRound(a, b, t) { return mix(a, b, t).map(Math.round); }
  function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function light(c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 140; }

  // erfc, to 1.5e-7 (Abramowitz and Stegun 7.1.26)
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.3275911 * z);
    var y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
    return x >= 0 ? y : 2 - y;
  }

  function paper(bg, fg) {
    var back = rgb(bg);
    if (light(back)) return mixRound(back, [0, 0, 0], PAPER_LIFT);
    return mixRound(mixRound(back, [255, 255, 255], PAPER_LIFT), rgb(fg), PAPER_WARMTH);
  }
  function printColour(bg, fg) { return mixRound(paper(bg, fg), rgb(fg), PRINT); }
  function foil(bg, fg) { return light(paper(bg, fg)) ? FOIL_LIGHT : FOIL_DARK; }

  // --- where everything goes: render.layout, card_frame, _box_area and boxes ------------------

  function layout(required, width, height) {
    var scale = Math.min(1, width / WIDTH, height / HEIGHT);
    var margin = MARGIN * scale, gap = GAP * scale, roomX = width - 2 * margin, roomY = height - 2 * margin;
    var columns = Math.ceil(required / Math.ceil(required / MAX_PER_ROW)), rows = Math.ceil(required / columns);
    var d = Math.min((roomX - (columns - 1) * gap) / columns, (roomY - (rows - 1) * gap) / rows);
    var top = margin + (roomY - (rows * d + (rows - 1) * gap)) / 2, centres = [];
    for (var i = 0; i < required; i++) {
      var row = Math.floor(i / columns), col = i % columns, inRow = Math.min(columns, required - row * columns);
      var left = margin + (roomX - (inRow * d + (inRow - 1) * gap)) / 2;
      centres.push([left + col * (d + gap) + d / 2, top + row * (d + gap) + d / 2]);
    }
    return { radius: d / 2, centres: centres };
  }

  function cardFrame(width, height) {
    var margin = Math.round(Math.min(width, height) * CARD_MARGIN), w = width - 2 * margin, h = height - 2 * margin;
    return { margin: margin, w: w, h: h, corner: Math.round(Math.min(w, h) * CARD_CORNER) };
  }

  function boxArea(width, height, header) {
    var f = cardFrame(width, height), pad = Math.round(Math.min(f.w, f.h) * CARD_PAD);
    var head = header ? Math.round(f.h * HEADER) : 0;
    return { left: f.margin + pad, top: f.margin + pad + head, w: f.w - 2 * pad, h: f.h - 2 * pad - head, head: head };
  }

  function boxes(required, width, height, header) {
    var a = boxArea(width, height, header), l = layout(required, a.w, a.h);
    return { radius: l.radius, centres: l.centres.map(function (c) { return [a.left + c[0], a.top + c[1]]; }) };
  }

  // --- the grains: the paper's (every pixel's brightness) and the ink's (patchy, with flecks) --

  var paperGrain = null, inkGrain = null;

  function getPaperGrain() {
    if (paperGrain) return paperGrain;
    paperGrain = new Uint16Array(TEX * TEX);
    for (var y = 0; y < TEX; y++) for (var x = 0; x < TEX; x++)
      paperGrain[y * TEX + x] = Math.round(256 * (1 + PAPER_GRAIN * ((unit(1, x, y) + unit(2, x, y)) / 2 - 0.5)));
    return paperGrain;
  }

  function getInkGrain() {
    if (inkGrain) return inkGrain;
    var lattice = new Float64Array(NOISE_N * NOISE_N);
    for (var i = 0; i < lattice.length; i++) lattice[i] = unit(3, i % NOISE_N, Math.floor(i / NOISE_N));
    function noise(u, v) {
      var x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var t = ((y0 % NOISE_N) + NOISE_N) % NOISE_N * NOISE_N, l = ((y0 + 1) % NOISE_N + NOISE_N) % NOISE_N * NOISE_N;
      var xa = ((x0 % NOISE_N) + NOISE_N) % NOISE_N, xb = ((x0 + 1) % NOISE_N + NOISE_N) % NOISE_N;
      var a = lattice[t + xa], b = lattice[t + xb], c = lattice[l + xa], d = lattice[l + xb];
      return a + (b - a) * fx + (c + (d - c) * fx - a - (b - a) * fx) * fy;
    }
    inkGrain = new Uint8Array(GRAIN * GRAIN);
    for (var y = 0; y < GRAIN; y++) for (var x = 0; x < GRAIN; x++) {
      var gu = x / GRAIN * 24, gv = y / GRAIN * 24;
      var density = 0.84 + 0.16 * noise(gu, gv);
      var fleck = 0.55 * noise(gu * 3.1 + 11, gv * 3.1 + 5) + 0.45 * noise(gu * 7.7 + 3, gv * 7.7 + 17);
      inkGrain[y * GRAIN + x] = Math.round(255 * density * (1 - 0.80 * clamp01((fleck - 0.78) / 0.04)));
    }
    return inkGrain;
  }

  // --- pixels ----------------------------------------------------------------------------------

  function Img(width, height) {
    this.w = width; this.h = height; this.data = new Uint8ClampedArray(width * height * 4);
  }
  Img.prototype.grained = function (c, x, y) {
    var g = getPaperGrain()[(y % TEX) * TEX + (x % TEX)];
    return [Math.min(255, (Math.round(c[0]) * g) >> 8), Math.min(255, (Math.round(c[1]) * g) >> 8), Math.min(255, (Math.round(c[2]) * g) >> 8)];
  };
  Img.prototype.set = function (x, y, c) {
    var i = (y * this.w + x) * 4, d = this.data;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  };
  Img.prototype.get = function (x, y) {
    var i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  };
  Img.prototype.blend = function (x, y, c, a) {
    var i = (y * this.w + x) * 4, d = this.data;
    d[i] = Math.round(d[i] + (c[0] - d[i]) * a); d[i + 1] = Math.round(d[i + 1] + (c[1] - d[i + 1]) * a);
    d[i + 2] = Math.round(d[i + 2] + (c[2] - d[i + 2]) * a);
  };

  function sdRounded(x, y, box, corner) {
    var qx = Math.abs(x + 0.5 - (box[0] + box[2]) / 2) - ((box[2] - box[0]) / 2 - corner);
    var qy = Math.abs(y + 0.5 - (box[1] + box[3]) / 2) - ((box[3] - box[1]) / 2 - corner);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - corner;
  }

  // Each column of row y within `reach` of the rounded box's edge.
  function edgeColumns(y, box, corner, reach, width, fn) {
    var x;
    if (box[1] + corner <= y + 0.5 && y + 0.5 <= box[3] - corner) {
      var lo = Math.max(0, Math.floor(box[0] - reach)), hi = Math.min(width, Math.ceil(box[0] + reach) + 1);
      var lo2 = Math.max(hi, Math.floor(box[2] - reach)), hi2 = Math.min(width, Math.ceil(box[2] + reach) + 1);
      for (x = lo; x < hi; x++) fn(x);
      for (x = lo2; x < hi2; x++) fn(x);
      return;
    }
    for (x = Math.max(0, Math.floor(box[0] - reach)); x < Math.min(width, Math.ceil(box[2] + reach) + 1); x++) fn(x);
  }

  // --- the blank card ---------------------------------------------------------------------------

  function drawBlank(img, o, full) {
    var width = img.w, height = img.h, back = rgb(o.bg), stock = paper(o.bg, o.fg), f = cardFrame(width, height);
    var panel = [f.margin, f.margin, f.margin + f.w, f.margin + f.h], corner = f.corner, x, y;
    for (y = 0; y < height; y++) for (x = 0; x < width; x++) img.set(x, y, back);

    // the shadow, a little below the panel, blurred: only round the panel's edge does it show
    var drop = f.margin / 3, blur = Math.max(1, f.margin * 0.5), reach = 4 * blur;
    var shadow = [panel[0], panel[1] + drop, panel[2], panel[3] + drop];
    for (y = Math.max(0, Math.floor(shadow[1] - reach)); y < Math.min(height, Math.ceil(shadow[3] + reach)); y++) {
      edgeColumns(y, shadow, corner, reach + drop, width, function (x) {
        if (sdRounded(x, y, panel, corner) < -1) return;
        var a = SHADOW * 0.5 * erfc(sdRounded(x, y, shadow, corner) / (blur * Math.SQRT2));
        if (a > 0.002) img.blend(x, y, [0, 0, 0], a);
      });
    }

    // the panel: grained stock, its corners anti-aliased onto the shadow
    for (y = panel[1]; y < panel[3]; y++) for (x = panel[0]; x < panel[2]; x++) {
      var a = clamp01(0.5 - sdRounded(x, y, panel, corner));
      if (a >= 1) img.set(x, y, img.grained(stock, x, y));
      else if (a > 0) img.blend(x, y, img.grained(stock, x, y), a);
    }

    drawBoxes(img, o, stock);
    var ink = full ? foil(o.bg, o.fg) : printColour(o.bg, o.fg);
    drawRules(img, panel, corner, ink);
    if (o.wordmark) drawHeader(img, o.wordmark, f, ink);
  }

  function drawBoxes(img, o, stock) {
    var b = boxes(o.required, img.w, img.h, !!o.wordmark), radius = b.radius, front = rgb(o.fg);
    var hollow = mixRound(stock, front, HOLLOW), ring = mixRound(stock, front, PRINTED_RING);
    b.centres.forEach(function (c, index) {
      var badge = index === o.required - 1, cx = c[0], cy = c[1];
      for (var y = Math.max(0, Math.floor(cy - radius) - 1); y < Math.min(img.h, Math.floor(cy + radius) + 2); y++) {
        for (var x = Math.max(0, Math.floor(cx - radius) - 1); x < Math.min(img.w, Math.floor(cx + radius) + 2); x++) {
          var dx = x + 0.5 - cx, dy = y + 0.5 - cy, dist = Math.hypot(dx, dy);
          var edge = badge ? radius * (0.97 + 0.03 * Math.cos(18 * Math.atan2(dy, dx))) : radius;
          if (dist > edge + 1) continue; // the stock, as the panel left it
          var col = mix(stock, hollow, clamp01(edge - dist + 0.5));
          col = mix(col, ring, clamp01(0.5 - (Math.abs(dist - edge + RING_PX / 2) - RING_PX / 2)));
          img.set(x, y, img.grained(col, x, y));
        }
      }
    });
    drawGift(img, b.centres[o.required - 1], radius, mixRound(stock, front, GIFT_TONE));
  }

  function sdBox(u, v, x0, y0, x1, y1) {
    var qx = Math.abs(u - (x0 + x1) / 2) - (x1 - x0) / 2, qy = Math.abs(v - (y0 + y1) / 2) - (y1 - y0) / 2;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
  }

  function sdEllipseRing(u, v, cx, cy, rx, ry, rot) {
    var c = Math.cos(rot), s = Math.sin(rot), x = (u - cx) * c + (v - cy) * s, y = -(u - cx) * s + (v - cy) * c;
    var k = Math.hypot(x / rx, y / ry);
    if (k === 0) return Math.min(rx, ry);
    var grad = Math.hypot(x / (rx * rx), y / (ry * ry)) / k;
    return grad ? Math.abs(k - 1) / grad : 0;
  }

  // A line-drawn gift: a lid, a box, a ribbon band as two lines, a two-loop bow and a knot.
  function giftDistance(u, v) {
    var w = 0.045, band = 0.09;
    var d = Math.min(sdBox(u, v, -band - w, -0.20, -band + w, 0.44), sdBox(u, v, band - w, -0.20, band + w, 0.44));
    if (!(Math.abs(u) < band - w && -0.20 + w < v && v < 0.44 - w))
      d = Math.min(d, Math.abs(sdBox(u, v, -0.40, -0.02, 0.40, 0.44)) - w, Math.abs(sdBox(u, v, -0.48, -0.20, 0.48, -0.02)) - w);
    for (var side = -1; side <= 1; side += 2)
      d = Math.min(d, sdEllipseRing(u, v, side * 0.15, -0.34, 0.16, 0.08, side * -0.7) - w * 0.9);
    return Math.min(d, Math.hypot(u, v + 0.25) - 0.055);
  }

  function drawGift(img, centre, radius, tone) {
    var cx = centre[0], cy = centre[1], scale = 0.92 * radius;
    for (var y = Math.floor(cy - 0.52 * radius); y < Math.floor(cy + 0.46 * radius) + 2; y++) {
      for (var x = Math.floor(cx - 0.50 * radius); x < Math.floor(cx + 0.50 * radius) + 2; x++) {
        var a = clamp01(0.5 - giftDistance((x + 0.5 - cx) / scale, (y + 0.5 - cy) / scale) * scale);
        if (a) img.blend(x, y, img.grained(tone, x, y), a);
      }
    }
  }

  // A printed double rule inside the panel's edge: a bold line and a fine one.
  function drawRules(img, panel, corner, ink) {
    var pw = panel[2] - panel[0], ph = panel[3] - panel[1];
    var inset = Math.round(Math.min(pw, ph) * 0.025), second = inset + Math.max(5, Math.floor(pw / 120));
    [[inset, Math.max(2, Math.floor(pw / 300))], [second, 1]].forEach(function (r) {
      var gap = r[0], line = r[1], box = [panel[0] + gap, panel[1] + gap, panel[2] - gap, panel[3] - gap];
      var bend = Math.max(1, corner - Math.floor(gap / 2));
      for (var y = box[1] - 1; y < box[3] + 1; y++) {
        edgeColumns(y, box, bend, line + 1, img.w, function (x) {
          var a = clamp01(0.5 - (Math.abs(sdRounded(x, y, box, bend) + line / 2) - line / 2));
          if (a) img.blend(x, y, img.grained(ink, x, y), a);
        });
      }
    });
  }

  // The wordmark, in its own colours, centred in the header's band, and a short rule under it.
  // `wordmark` is {w, h, scaled(w, h)}: the page scales the picture, as the service does.
  function drawHeader(img, wordmark, f, ink) {
    var x0 = f.margin, x1 = f.margin + f.w, area = boxArea(img.w, img.h, true), head = area.head, band = area.top - head;
    var scale = Math.min(0.6 * (x1 - x0) / wordmark.w, 0.58 * head / wordmark.h);
    var mw = Math.max(1, Math.round(wordmark.w * scale)), mh = Math.max(1, Math.round(wordmark.h * scale));
    var left = Math.floor((x0 + x1 - mw) / 2), upper = band + Math.round(0.41 * head - mh / 2);
    var px = wordmark.scaled(mw, mh);
    for (var k = 0; k < mh; k++) for (var j = 0; j < mw; j++) {
      var i = (k * mw + j) * 4, a = px[i + 3];
      if (a) img.blend(left + j, upper + k, img.grained([px[i], px[i + 1], px[i + 2]], left + j, upper + k), a / 255);
    }
    var ruleY = band + Math.round(0.84 * head), thick = Math.max(1, Math.floor((x1 - x0) / 500));
    for (var y = ruleY; y < ruleY + thick; y++)
      for (var x = x0 + Math.round(0.3 * (x1 - x0)); x < x0 + Math.round(0.7 * (x1 - x0)); x++) img.set(x, y, img.grained(ink, x, y));
  }

  // --- the stamp --------------------------------------------------------------------------------

  // Five points, point up: the stamp of a shop with no readable logo.
  function sdStar(u, v) {
    var pts = [], d2 = 9, inside = false;
    for (var k = 0; k < 10; k++) {
      var r = k % 2 === 0 ? 0.66 : 0.27, t = -Math.PI / 2 + k * Math.PI / 5;
      pts.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    for (k = 0; k < 10; k++) {
      var a = pts[k], b = pts[(k + 9) % 10], ex = b[0] - a[0], ey = b[1] - a[1], wx = u - a[0], wy = v - a[1];
      var h = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey));
      d2 = Math.min(d2, Math.pow(wx - ex * h, 2) + Math.pow(wy - ey * h, 2));
      if ((a[1] > v) !== (b[1] > v) && u < (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside ? -Math.sqrt(d2) : Math.sqrt(d2);
  }

  // The logo's colour at (s, t), each -1 to 1 across it, bilinear and alpha-weighted.
  function sample(mark, n, s, t) {
    var x = (s + 1) / 2 * n - 0.5, y = (t + 1) / 2 * n - 0.5, x0 = Math.floor(x), y0 = Math.floor(y);
    if (x0 < 0 || y0 < 0 || x0 + 1 >= n || y0 + 1 >= n) return null;
    var fx = x - x0, fy = y - y0, r = 0, g = 0, b = 0, a = 0;
    for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < 2; dx++) {
      var w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy), i = ((y0 + dy) * n + x0 + dx) * 4, pa = mark[i + 3];
      r += mark[i] * w * pa; g += mark[i + 1] * w * pa; b += mark[i + 2] * w * pa; a += w * pa;
    }
    return a > 0 ? [r / a, g / a, b / a, a] : null;
  }

  // The stamp's ink cover, 0 to 255 over a `size` square, before any turn: a bold outer ring and
  // a thin inner one, a slightly rough rim drying at its edge, and inside them the logo's
  // silhouette (its brightest parts carry no ink) or a star.
  function rubber(logo, size) {
    var n = Math.ceil(size * INNER) + 3, mark = logo ? logo(n) : null, mean = 128;
    if (mark) {
      var weight = 0, sum = 0;
      for (var i = 0; i < mark.length; i += 4) {
        weight += mark[i + 3]; sum += (0.299 * mark[i] + 0.587 * mark[i + 1] + 0.114 * mark[i + 2]) * mark[i + 3];
      }
      mean = sum / (weight || 1);
    }
    var out = new Uint8Array(size * size), half = size / 2, pixel = 2 / size;
    for (var y = 0; y < size; y++) {
      var t = (y + 0.5 - half) / half;
      for (var x = 0; x < size; x++) {
        var s = (x + 0.5 - half) / half, r = Math.hypot(s, t);
        if (r > 1.03) continue;
        var phi = Math.atan2(t, s);
        var rim = 1 + 0.012 * Math.sin(7 * phi + 1) + 0.008 * Math.sin(13 * phi + 2) + 0.006 * Math.sin(23 * phi + 4);
        var cover = clamp01(0.5 - (r - rim) / pixel);
        var ring = Math.max(clamp01(0.5 - (Math.abs(r - 0.935) - 0.045) / pixel), clamp01(0.5 - (Math.abs(r - 0.82) - 0.016) / pixel));
        var inside;
        if (mark) {
          var p = sample(mark, n, s / INNER, t / INNER);
          var tone = p ? 1 - clamp01((0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] - mean - 18) / 14) : 0;
          inside = p ? p[3] / 255 * tone * clamp01(0.5 - (r - INNER * 0.985) / pixel) : 0;
        } else {
          inside = clamp01(0.5 - sdStar(s / INNER, t / INNER) * INNER / pixel);
        }
        var dry = 1 - 0.30 * clamp01((r - 0.88) / 0.12);
        out[y * size + x] = Math.round(255 * Math.max(ring, inside) * cover * dry);
      }
    }
    return out;
  }

  // Box `index` stamped: the rubber turned and nudged by its pose, inked through its own grain and
  // the paper's, laid in over the disc of the box (radius + 1), as the service lays in its tiles.
  function drawStamp(img, o, rub, size, index, radius, centre) {
    var pose = POSES[index % POSES.length], grain = getInkGrain(), pg = getPaperGrain(), front = rgb(o.fg);
    var ca = Math.cos(pose[0]), sa = Math.sin(pose[0]), sx = centre[0] + pose[1] * radius, sy = centre[1] + pose[2] * radius;
    var reach = STAMP * radius, half = size / 2, last = size - 1, gscale = 256 / size, ink256 = Math.round(pose[3] * 256);
    var clip = radius + 1, d = img.data;
    for (var y = Math.max(0, Math.floor(sy - reach) - 2); y < Math.min(img.h, Math.floor(sy + reach) + 3); y++) {
      for (var x = Math.max(0, Math.floor(sx - reach) - 2); x < Math.min(img.w, Math.floor(sx + reach) + 3); x++) {
        if (Math.hypot(x + 0.5 - centre[0], y + 0.5 - centre[1]) >= clip) continue;
        var px = x + 0.5 - sx, py = y + 0.5 - sy;
        var u = px * ca + py * sa + half - 0.5, v = -px * sa + py * ca + half - 0.5, iu = Math.floor(u), iv = Math.floor(v);
        if (iu < 0 || iv < 0 || iu >= last || iv >= last) continue;
        var k = iv * size + iu, a00 = rub[k], a01 = rub[k + 1], a10 = rub[k + size], a11 = rub[k + size + 1];
        if (!(a00 | a01 | a10 | a11)) continue;
        var fu = u - iu, fv = v - iv, top = a00 + (a01 - a00) * fu, cover = top + (a10 + (a11 - a10) * fu - top) * fv;
        var g = grain[((Math.floor(v * gscale) + pose[5]) % GRAIN) * GRAIN + (Math.floor(u * gscale) + pose[4]) % GRAIN];
        var a = (cover * g * ink256) >> 16;
        if (!a) continue;
        var pgv = pg[(y % TEX) * TEX + (x % TEX)], i = (y * img.w + x) * 4;
        for (var c = 0; c < 3; c++) {
          var f = Math.min(255, (front[c] * pgv) >> 8);
          d[i + c] = d[i + c] + (((f - d[i + c]) * a) >> 8);
        }
      }
    }
  }

  // A warm light over the whole card, stamps and all: strongest round the badge.
  function drawGlow(img, o) {
    var b = boxes(o.required, img.w, img.h, !!o.wordmark), f = cardFrame(img.w, img.h);
    var x0 = f.margin, y0 = f.margin, x1 = x0 + f.w, y1 = y0 + f.h, pw = f.w, ph = f.h, panel = [x0, y0, x1, y1];
    var blur = 0.18 * Math.min(pw, ph), last = b.centres[b.centres.length - 1];
    var lights = [
      [last[0], last[1], 0.30 * pw, 0.425 * ph, 90 / 255 * 0.55],
      [x0 + 0.25 * pw, y0 + 0.25 * ph, 0.35 * pw, 0.45 * ph, 40 / 255 * 0.55],
    ];
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var a = 0;
      for (var n = 0; n < 2; n++) {
        var L = lights[n], k = Math.hypot((x - L[0]) / L[2], (y - L[1]) / L[3]);
        a = Math.max(a, L[4] * 0.5 * erfc((k - 1) * (L[2] + L[3]) / 2 / (blur * Math.SQRT2)));
      }
      if (a < 0.002) continue;
      if (x < x0 + f.corner || x >= x1 - f.corner) a *= clamp01(0.5 - sdRounded(x, y, panel, f.corner));
      img.blend(x, y, GLOW, a);
    }
  }

  // --- the card ---------------------------------------------------------------------------------

  // The card's pixels for `count` of `required`: {width, height, data} (RGBA), ready for ImageData.
  // o: {bg, fg, required, count, logo, wordmark, lit}. `logo(n)` gives the logo as n x n RGBA
  // pixels (null draws the star); `wordmark` is {w, h, scaled(w, h)} or null for no header.
  // A full card is lit (foil and glow) unless `lit` is false, so the page can fade the light in.
  // `width` defaults to the hero's 1032 and `height` keeps the hero's shape; Apple's strip is
  // 375 by 144 points (the service's apple.STRIP), so (750, 288) at 2x.
  var rubbers = {};
  function render(o, width, height) {
    width = width || WIDTH;
    height = height || Math.round(width * HEIGHT / WIDTH);
    var img = new Img(width, height);
    var count = Math.max(0, Math.min(o.count, o.required)), full = count === o.required && o.lit !== false;
    drawBlank(img, o, full);
    var b = boxes(o.required, width, height, !!o.wordmark), size = Math.ceil(2 * STAMP * b.radius) + 2;
    var key = (o.logoKey || "star") + ":" + size;
    if (count && !rubbers[key]) rubbers[key] = rubber(o.logo, size);
    for (var i = 0; i < count; i++) drawStamp(img, o, rubbers[key], size, i, b.radius, b.centres[i]);
    if (full) drawGlow(img, o);
    return { width: width, height: height, data: img.data };
  }

  return {
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    STRIP_WIDTH: STRIP_WIDTH,
    STRIP_HEIGHT: STRIP_HEIGHT,
    POSES: POSES,
    render: render,
    boxes: boxes,
    layout: layout,
    paper: paper,
    printColour: printColour,
    foil: foil,
  };
});
