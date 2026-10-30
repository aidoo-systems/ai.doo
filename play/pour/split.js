// The second way to play (P2.0ac, D-039), drawn: the venue's glass, full, with its mark
// printed on it (the emblem in a ring, the gap cut on the ring's right, the venue's name
// over it) and wrapped round the glass, the line falling as it's sipped and creeping as the
// head settles. The rules are engine.js's (createSplit); game.js runs the screens. Same
// calls as game.js's scene. Its drinks are always dark (the engine refuses a pale one), so
// the light through them is drawn here: ruby where the drink is thin, a tan settle.
(function () {
  "use strict";

  var NAME_FONT = "'Bricolage Grotesque', Inter, system-ui, sans-serif";
  var RUBY = "168,40,16"; // light through a dark drink at its foot and edges
  var TILT = 0.06; // how far above the glass the camera sits: the print's rows bow by this
  var LIT = 1.05; // seconds a split's print stays lit: done inside game.js's hold on a result (1.15s)

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function rgb(hex) {
    var h = hex.slice(1);
    if (h.length < 6) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h.slice(0, 6), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    return "rgba(" + rgb(hex).join(",") + "," + a + ")";
  }
  function mix(hex, to, t) {
    var a = rgb(hex);
    var b = rgb(to);
    return "rgb(" + a.map(function (v, i) {
      return Math.round(v + (b[i] - v) * t);
    }).join(",") + ")";
  }

  // How far a row of the print drops at an angle round the glass, seen from just above: the
  // front of the round lower than its sides, and nothing at all at the gap's own angle.
  function bow(theta, gapTheta, radius) {
    return (Math.cos(theta) - Math.cos(gapTheta)) * radius * TILT;
  }

  window.PourSplitScene = function (canvas, skin, calm) {
    var ctx = canvas.getContext("2d");
    var th = skin.theme;
    var mark = skin.mark;
    var emblem = skin.emblem && typeof Path2D === "function" ? new Path2D(skin.emblem.path) : null;
    var dr = skin.drink;
    var W = 0;
    var H = 0;
    var dpr = 1;
    var g = null;
    var drawn = null;
    var print = null; // the print wrapped round the glass, made once a layout
    var lit = null; // a lit copy of it while a split catches the light
    var mirror = null; // the strip above the counter, for its reflection in the varnish
    var ruby = null; // the red at the drink's edges, worked out once a layout and glass
    var foam = [];
    var fx;
    if (document.fonts && document.fonts.load) document.fonts.load("700 16px " + NAME_FONT).then(function () {
      print = null;
      if (drawn) api.frame(0, drawn);
    }, function () {});

    function reset() {
      fx = { t: 0, lace: [], nextLace: 0.86, specks: [], settle: 0, lit: -1, slide: 0, ghost: null, verdict: null };
    }
    reset();

    // A fine, tight foam: dots at fixed spots in the head, so it doesn't fizz from frame to frame.
    for (var f = 0; f < 140; f++) foam.push({ y: Math.random(), x: Math.random(), r: 0.5 + Math.random() * 0.8, a: 0.12 + Math.random() * 0.18 });

    function layout() {
      var box = canvas.getBoundingClientRect();
      if (box.width < 60 || box.height < 90) {
        g = null;
        return;
      }
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      W = box.width;
      H = box.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // The camera in close: the glass as tall as the stage allows, so it grows on a phone.
      var counterH = clamp(H * 0.1, 18, 46);
      var counterY = H - counterH;
      var gh = counterY - clamp(H * 0.07, 8, 40);
      var gw = gh * 0.66;
      if (gw > W * 0.86) {
        gw = W * 0.86;
        gh = gw / 0.66;
      }
      g = { counterY: counterY, counterH: counterH, gw: gw, gh: gh, gx: (W - gw) / 2, cx: W / 2, wall: Math.max(3, gw * 0.022), base: Math.max(6, gh * 0.045) };
      print = null;
      mirror = null;
      ruby = null;
      fit(dr);
      if (drawn) api.frame(0, drawn);
    }

    function fit(d) {
      var gy = (g.gy = g.counterY - g.gh + 4);
      g.outer = d.glass.map(function (p) {
        return [g.gx + (p[0] / 100) * g.gw, gy + (p[1] / 100) * g.gh];
      });
      g.inner = g.outer.map(function (p) {
        return [g.cx + (p[0] - g.cx) * (1 - (2 * g.wall) / g.gw), gy + (p[1] - gy) * (1 - g.base / g.gh)];
      });
      g.top = gy;
      g.bottom = gy + g.gh - g.base;
    }

    // Where a height (0 the base, 1 the rim) sits on the canvas: the same scale the engine scores on.
    function yAt(level) {
      return g.bottom - level * (g.bottom - g.top);
    }

    function xRange(pts, y) {
      var lo = Infinity;
      var hi = -Infinity;
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i];
        var b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] >= y) || (b[1] <= y && a[1] >= y)) {
          if (a[1] === b[1]) {
            lo = Math.min(lo, a[0], b[0]);
            hi = Math.max(hi, a[0], b[0]);
          } else {
            var x = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
          }
        }
      }
      return hi >= lo ? [lo, hi] : null;
    }

    // The pour game's soft outline: corners rounded as far as their sides allow, a crisp lip.
    function glassPath(pts) {
      var n = pts.length;
      ctx.beginPath();
      ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
      for (var i = 0; i < n; i++) {
        var a = pts[(i + n - 1) % n];
        var p = pts[i];
        var b = pts[(i + 1) % n];
        var ax = a[0] - p[0];
        var ay = a[1] - p[1];
        var bx = b[0] - p[0];
        var by = b[1] - p[1];
        var la = Math.hypot(ax, ay);
        var lb = Math.hypot(bx, by);
        var angle = Math.acos(clamp((ax * bx + ay * by) / (la * lb || 1), -1, 1));
        var hard = clamp((Math.PI - angle - 0.6) / 0.6, 0, 1);
        var t = Math.min(Math.min(la, lb) * 0.5, g.gw * 0.2 * (1 - hard) + g.gw * 0.045 * hard);
        if (Math.abs(p[1] - g.top) < 0.5) t = Math.min(t, Math.max(2, g.gw * 0.015));
        var r = t * Math.tan(angle / 2);
        if (!isFinite(r) || r < 0.01) ctx.lineTo(p[0], p[1]);
        else ctx.arcTo(p[0], p[1], b[0], b[1], r);
      }
      ctx.closePath();
    }

    // The bar dark around the glass, with one warm light over it.
    function drawRoom() {
      ctx.fillStyle = mix(th.bg, "#000000", 0.55);
      ctx.fillRect(0, 0, W, H);
      var spot = ctx.createRadialGradient(g.cx, -H * 0.1, 0, g.cx, -H * 0.1, H * 1.05);
      spot.addColorStop(0, "rgba(255,206,140,.22)");
      spot.addColorStop(0.55, "rgba(255,190,120,.07)");
      spot.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);
    }

    // Drawn wider than the stage, so a push in never shows its ends.
    function drawCounter() {
      var shade = ctx.createLinearGradient(0, g.counterY - 22, 0, g.counterY);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,.28)");
      ctx.fillStyle = shade;
      ctx.fillRect(-W, g.counterY - 22, 3 * W, 22);
      var top = ctx.createLinearGradient(0, g.counterY, 0, H);
      top.addColorStop(0, mix(th.counter, "#000000", 0.25));
      top.addColorStop(1, mix(th.counterEdge, "#000000", 0.4));
      ctx.fillStyle = top;
      ctx.fillRect(-W, g.counterY, 3 * W, H);
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(-W, g.counterY, 3 * W, 2);
      // a pool of the light on the counter under the glass
      var pool = ctx.createRadialGradient(g.cx, g.counterY + 4, 0, g.cx, g.counterY + 4, g.gw * 0.9);
      pool.addColorStop(0, "rgba(255,210,150,.22)");
      pool.addColorStop(1, "rgba(255,210,150,0)");
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(g.cx, g.counterY + 6, g.gw * 0.9, g.counterH * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // The glass's reflection in the varnish: the strip just above the counter, flipped under
    // it and fading, only round the glass.
    function drawReflection() {
      var foot = g.counterY + 4;
      var rh = Math.min(g.counterH - 4, g.gh * 0.3);
      if (rh < 4) return;
      var pw = Math.ceil(W * dpr);
      var ph = Math.ceil(rh * dpr);
      if (!mirror) {
        mirror = document.createElement("canvas");
        mirror.width = pw;
        mirror.height = ph;
      }
      var mc = mirror.getContext("2d");
      mc.save();
      mc.setTransform(1, 0, 0, 1, 0, 0);
      mc.globalCompositeOperation = "copy";
      mc.drawImage(canvas, 0, Math.round((foot - rh) * dpr), pw, ph, 0, 0, pw, ph);
      mc.globalCompositeOperation = "destination-in";
      var fade = mc.createLinearGradient(0, 0, 0, ph);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      mc.fillStyle = fade;
      mc.fillRect(0, 0, pw, ph);
      var across = mc.createLinearGradient(g.gx * dpr, 0, (g.gx + g.gw) * dpr, 0);
      across.addColorStop(0, "rgba(0,0,0,0)");
      across.addColorStop(0.2, "rgba(0,0,0,1)");
      across.addColorStop(0.8, "rgba(0,0,0,1)");
      across.addColorStop(1, "rgba(0,0,0,0)");
      mc.fillStyle = across;
      mc.fillRect(0, 0, pw, ph);
      mc.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, foot, W, rh);
      ctx.clip();
      ctx.globalAlpha = 0.24;
      ctx.translate(0, foot + rh);
      ctx.scale(1, -1);
      ctx.drawImage(mirror, 0, 0, W, rh);
      ctx.restore();
    }

    // The print (look A), drawn flat: the emblem inside a ring, the gap cut through the ring's
    // right side at (cx, cy), the venue's name over the ring with a dark keyline, so it still
    // reads over the cream of a full glass's head.
    function drawFlat(c, cx, cy, S, R, w, gapH, width) {
      var ink = th.accent;
      c.save();
      c.globalAlpha = 0.93;
      c.save();
      c.beginPath();
      c.rect(cx - 2 * R, cy - 3 * R, 4 * R, 6 * R);
      c.rect(cx, cy - gapH / 2, 2 * R, gapH);
      c.clip("evenodd");
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.arc(cx, cy, R - w, 0, Math.PI * 2, true);
      c.fillStyle = ink;
      c.fill();
      c.restore();
      if (emblem) {
        var size = S * 0.78;
        var k = size / Math.max(skin.emblem.width, skin.emblem.height);
        c.save();
        c.translate(cx - (skin.emblem.width * k) / 2, cy - (skin.emblem.height * k) / 2);
        c.scale(k, k);
        c.fillStyle = ink;
        if (skin.emblem.rule) c.fill(emblem, skin.emblem.rule);
        else c.fill(emblem);
        c.restore();
      }
      // A long name (a prospect's own, up to 32 letters) shrinks to sit over the ring.
      var name = skin.venue.toUpperCase();
      var px = Math.round(g.gw * 0.06);
      c.font = "700 " + px + "px " + NAME_FONT;
      while (px > 7 && c.measureText(name).width > width * 0.86) {
        px -= 1;
        c.font = "700 " + px + "px " + NAME_FONT;
      }
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.lineJoin = "round";
      c.strokeStyle = "rgba(24,10,2,.72)";
      c.lineWidth = Math.max(2, px * 0.24);
      c.strokeText(name, cx, cy - R - 8);
      c.fillStyle = ink;
      c.fillText(name, cx, cy - R - 8);
      c.restore();
    }

    // The print wrapped round the glass: each column of the flat print laid on a cylinder as
    // wide as the glass at the gap, squashed and dimmer towards its edges, the rows bowed as
    // seen from just above. The gap's own column stays at the gap's height, so the line
    // still scores where it looks. Made once a layout (and glass), then drawn whole.
    function wrapped() {
      var gapY = yAt(mark.gap);
      var edge = xRange(g.inner, gapY);
      if (!edge) return null;
      var width = edge[1] - edge[0];
      var key = width.toFixed(2);
      if (print && print.key === key) return print;
      var S = width * 0.56;
      var R = S * 0.64;
      var w = S * 0.085;
      var gapH = mark.gapSize * (g.bottom - g.top);
      var Rw = width / 2 + g.wall; // the glass's radius at the gap, out to its face
      var px = Math.round(g.gw * 0.06);
      var ocy = R + 14 + px * 1.3; // the gap's row in the flat print
      var offW = 2 * Rw;
      var offH = ocy + R + 6;
      var pad = Rw * TILT; // room for the bow, above and below
      var thGap = (R - w / 2) / Rw; // where round the glass the gap is, as an angle
      var flat = document.createElement("canvas");
      flat.width = Math.ceil(offW * dpr);
      flat.height = Math.ceil(offH * dpr);
      var fc = flat.getContext("2d");
      fc.save();
      fc.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFlat(fc, offW / 2, ocy, S, R, w, gapH, width);
      fc.restore();
      var out = document.createElement("canvas");
      out.width = Math.ceil(offW * dpr);
      out.height = Math.ceil((offH + 2 * pad) * dpr);
      var oc = out.getContext("2d");
      oc.save();
      oc.setTransform(1, 0, 0, 1, 0, 0);
      // one device pixel at a time across the glass's face
      for (var i = 0; i < out.width; i++) {
        var u0 = clamp((i / dpr - Rw) / Rw, -0.999, 0.999);
        var u1 = clamp(((i + 1) / dpr - Rw) / Rw, -0.999, 0.999);
        var t0 = Math.asin(u0);
        var t1 = Math.asin(u1);
        var sx = (Rw + t0 * Rw) * dpr;
        var sw = (t1 - t0) * Rw * dpr;
        if (sx < 0 || sx + sw > flat.width) continue;
        var tm = (t0 + t1) / 2;
        var dy = bow(tm, thGap, Rw);
        oc.globalAlpha = 0.25 + 0.75 * Math.pow(Math.cos(tm), 1.3);
        oc.drawImage(flat, sx, 0, Math.max(0.01, sw), flat.height, i, (pad + dy) * dpr, 1, flat.height);
      }
      oc.restore();
      lit = null;
      print = {
        key: key,
        image: out,
        x: g.cx - Rw,
        y: gapY - ocy - pad,
        w: offW,
        h: offH + 2 * pad,
        // where the gap's column lands: across, and the height its cut sits at
        gapX: g.cx + Rw * Math.sin(thGap),
        gapRow: gapY - ocy - pad + pad + bow(thGap, thGap, Rw) + ocy,
        R: R,
        w0: w,
      };
      return print;
    }

    // How a split's light plays out, t seconds after it lands: the print warms and a sheen
    // crosses it, a star opens where the line meets the gap, and the glass pushes in a
    // touch and eases back. Calm: the light without the movement.
    function litAt(t) {
      var on = smooth(t / 0.22) * (1 - smooth((t - 0.55) / (LIT - 0.55)));
      return {
        on: on,
        sheen: calm ? 0 : smooth((t - 0.05) / 0.6) * 2 - 1,
        star: (calm ? 1 : smooth(t / 0.25)) * (1 - smooth((t - 0.5) / (LIT - 0.5))),
        push: calm ? 0 : 0.05 * smooth(t / 0.2) * (1 - smooth((t - 0.3) / (LIT - 0.3))),
      };
    }

    function drawPrint(light) {
      var p = wrapped();
      if (!p) return;
      var img = p.image;
      if (light && light.on > 0.001) {
        if (!lit) {
          lit = document.createElement("canvas");
          lit.width = img.width;
          lit.height = img.height;
        }
        var lc = lit.getContext("2d");
        lc.save();
        lc.setTransform(1, 0, 0, 1, 0, 0);
        lc.globalCompositeOperation = "copy";
        lc.drawImage(img, 0, 0);
        lc.globalCompositeOperation = "source-atop";
        lc.fillStyle = "rgba(255,244,208," + 0.35 * light.on + ")";
        lc.fillRect(0, 0, lit.width, lit.height);
        var mid = (0.5 + light.sheen * 0.45) * lit.width;
        var band = lit.width * 0.28;
        var sheen = lc.createLinearGradient(mid - band, 0, mid + band, lit.height);
        sheen.addColorStop(0, "rgba(255,255,255,0)");
        sheen.addColorStop(0.5, "rgba(255,255,255," + 0.6 * light.on + ")");
        sheen.addColorStop(1, "rgba(255,255,255,0)");
        lc.fillStyle = sheen;
        lc.fillRect(0, 0, lit.width, lit.height);
        lc.restore();
        img = lit;
        ctx.save();
        ctx.shadowColor = th.accent;
        ctx.shadowBlur = 16 * light.on;
        ctx.drawImage(img, p.x, p.y, p.w, p.h);
        ctx.restore();
        return;
      }
      ctx.drawImage(img, p.x, p.y, p.w, p.h);
    }

    // The gap lit, and a star where the line meets it.
    function drawStar(light) {
      var p = wrapped();
      if (!p || light.star < 0.001) return;
      var gapY = yAt(mark.gap);
      var r1 = g.gw * 0.07 * (0.4 + 0.6 * light.star);
      ctx.save();
      ctx.globalAlpha = light.star;
      ctx.shadowColor = "#fff2c8";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#fff6dc";
      ctx.fillRect(p.gapX - p.w0 * 1.5, gapY - 1, p.w0 * 3.2, 2);
      ctx.translate(p.gapX, gapY);
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = (i * Math.PI) / 4;
        var r = i % 2 ? r1 * 0.16 : i % 4 ? r1 * 0.55 : r1;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // The red at a dark drink's edges, from the rim to the base: how much thinner than its
    // widest the glass is at each height (most at the narrow foot), a little more on the lit
    // left side, fading softly in. Drawn once a layout and glass, then shown under the line.
    function rubyEdges() {
      var shape = String(dr.glass);
      if (ruby && ruby.glass === shape) return ruby.image;
      var floor = g.bottom + g.base;
      var widest = 0;
      for (var yy = g.top; yy <= g.bottom; yy += 2) {
        var r0 = xRange(g.inner, yy);
        if (r0) widest = Math.max(widest, r0[1] - r0[0]);
      }
      var image = document.createElement("canvas");
      image.width = Math.ceil(W * dpr);
      image.height = Math.ceil(H * dpr);
      var c = image.getContext("2d");
      c.save();
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (var y = g.top; y < floor; y += 2) {
        var e = xRange(g.inner, Math.min(y, g.bottom - 0.5));
        if (!e) continue;
        var w = e[1] - e[0];
        var thin = clamp((widest - w) / (widest * 0.5), 0, 1);
        var a = 0.06 + 0.3 * thin * thin;
        var fw = w * (0.14 + 0.1 * thin);
        var left = c.createLinearGradient(e[0], 0, e[0] + fw, 0);
        left.addColorStop(0, "rgba(" + RUBY + "," + a + ")");
        left.addColorStop(1, "rgba(" + RUBY + ",0)");
        c.fillStyle = left;
        c.fillRect(e[0] - 2, y, fw + 2, 2);
        var right = c.createLinearGradient(e[1], 0, e[1] - fw, 0);
        right.addColorStop(0, "rgba(" + RUBY + "," + a * 0.6 + ")");
        right.addColorStop(1, "rgba(" + RUBY + ",0)");
        c.fillStyle = right;
        c.fillRect(e[1] - fw, y, fw + 2, 2);
      }
      c.restore();
      ruby = { glass: shape, image: image };
      return image;
    }

    // A dark drink: near-black, ruby where it's thin at the edges and the foot, light under the head.
    function drawDrink(x0, x1, lineY) {
      var span = g.bottom - g.top;
      var floor = g.bottom + g.base;
      ctx.fillStyle = mix(dr.liquidDeep, "#000000", 0.35);
      ctx.fillRect(x0, lineY, x1 - x0, floor - lineY);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, lineY, x1 - x0, floor - lineY);
      ctx.clip();
      ctx.drawImage(rubyEdges(), 0, 0, W, H);
      ctx.restore();
      // the light through the foot, low and wide, fading up into the black
      var foot = ctx.createRadialGradient(g.cx, g.bottom, 0, g.cx, g.bottom, g.gw * 0.4);
      foot.addColorStop(0, "rgba(" + RUBY + ",.55)");
      foot.addColorStop(0.45, "rgba(110,22,8,.22)");
      foot.addColorStop(1, "rgba(60,10,4,0)");
      ctx.fillStyle = foot;
      ctx.fillRect(x0, lineY, x1 - x0, floor - lineY);
      var under = ctx.createLinearGradient(0, lineY, 0, lineY + span * 0.06);
      under.addColorStop(0, rgba(dr.liquid, 0.9));
      under.addColorStop(0.3, "rgba(98,36,14,.4)");
      under.addColorStop(1, "rgba(98,36,14,0)");
      ctx.fillStyle = under;
      ctx.fillRect(x0, lineY, x1 - x0, span * 0.06);
    }

    // The settle: a tan cloud clearing from the foot up, bubbles drifting down the sides.
    function drawSettle(x0, x1, lineY, k) {
      var yb = g.bottom - (g.bottom - lineY) * k;
      var end = yb + 14;
      var cloud = ctx.createLinearGradient(0, lineY, 0, end);
      cloud.addColorStop(0, mix(dr.head, "#3a1c08", 0.42));
      cloud.addColorStop(clamp((yb - lineY - 30) / (end - lineY), 0, 1), "rgba(118,78,48,.86)");
      cloud.addColorStop(1, "rgba(80,46,24,0)");
      ctx.fillStyle = cloud;
      ctx.globalAlpha = 0.96;
      ctx.fillRect(x0, lineY, x1 - x0, end - lineY);
      ctx.globalAlpha = 1;
      // each bubble keeps its own place down the drink; the clearing cloud only hides it
      fx.specks.forEach(function (p) {
        var y = lineY + (p.y % 1) * (g.bottom - lineY);
        if (y > yb + 10) return;
        var e = xRange(g.inner, y);
        if (!e) return;
        var x = p.left ? e[0] + 2 + p.k * (e[1] - e[0]) : e[1] - 2 - p.k * (e[1] - e[0]);
        ctx.fillStyle = "rgba(232,214,180," + p.a + ")";
        ctx.fillRect(x, y, p.w, p.h);
      });
    }

    // A creamy head that domes a little, with a fine foam and a soft seam to the drink.
    function drawHead(x0, x1, topY, lineY) {
      var dome = g.gh * 0.014;
      var hg = ctx.createLinearGradient(0, topY - dome, 0, lineY);
      hg.addColorStop(0, mix(dr.head, "#ffffff", 0.25));
      hg.addColorStop(0.65, dr.head);
      hg.addColorStop(1, mix(dr.head, "#8a6a48", 0.45));
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(x0, lineY);
      ctx.lineTo(x0, topY + 1);
      ctx.quadraticCurveTo(g.cx, topY - dome * 2, x1, topY + 1);
      ctx.lineTo(x1, lineY);
      ctx.closePath();
      ctx.fill();
      foam.forEach(function (d) {
        var y = topY + d.y * (lineY - topY);
        var e = xRange(g.inner, y);
        if (!e) return;
        ctx.fillStyle = "rgba(255,255,255," + d.a + ")";
        ctx.beginPath();
        ctx.arc(e[0] + d.x * (e[1] - e[0]), y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      var seam = ctx.createLinearGradient(0, lineY - 4, 0, lineY + 3);
      seam.addColorStop(0, "rgba(90,60,36,0)");
      seam.addColorStop(0.6, "rgba(90,60,36,.55)");
      seam.addColorStop(1, "rgba(40,20,10,0)");
      ctx.fillStyle = seam;
      ctx.fillRect(x0, lineY - 4, x1 - x0, 7);
    }

    function drawGlass(ox, s, live, light) {
      ctx.save();
      ctx.translate(ox, 0);
      var foot = xRange(g.outer, g.bottom + g.base - 1);
      ctx.fillStyle = "rgba(0,0,0,.34)";
      ctx.beginPath();
      ctx.ellipse(g.cx, g.counterY + 6, foot ? (foot[1] - foot[0]) * 0.62 : g.gw * 0.3, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      glassPath(g.inner);
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.fill();

      ctx.save();
      glassPath(g.inner);
      ctx.clip();
      var x0 = g.gx - 4;
      var x1 = g.gx + g.gw + 4;
      var lineY = yAt(s.level);
      var topY = yAt(s.top);
      drawDrink(x0, x1, lineY);
      if (live && s.settling) drawSettle(x0, x1, lineY, fx.settle);
      if (lineY - topY > 0.5) drawHead(x0, x1, topY, lineY);

      // the lacing each sip leaves on the glass above the head
      ctx.strokeStyle = rgba(dr.head, 0.32);
      ctx.lineWidth = 1.5;
      fx.lace.forEach(function (h) {
        if (h <= s.top + 0.01) return;
        var y = yAt(h);
        var e = xRange(g.inner, y);
        if (!e) return;
        ctx.beginPath();
        for (var lx = e[0]; lx <= e[1]; lx += 4) {
          var ly = y + Math.sin(lx * 0.12 + h * 90) * 1.6;
          if (lx === e[0]) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      });
      ctx.restore();

      drawPrint(light);

      // light on a round glass: a broad soft band running down through the print, a thin one opposite
      ctx.save();
      glassPath(g.outer);
      ctx.clip();
      [[0.24, 0.07, 0.2], [0.83, 0.018, 0.14]].forEach(function (b) {
        var at = g.gx + g.gw * b[0];
        var half = g.gw * b[1];
        var band = ctx.createLinearGradient(at - half, 0, at + half, 0);
        band.addColorStop(0, "rgba(255,255,255,0)");
        band.addColorStop(0.5, "rgba(255,255,255," + b[2] + ")");
        band.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = band;
        ctx.fillRect(at - half, g.top, half * 2, g.bottom - g.top);
      });
      // the glass's thick base: the drink seen down through it, darker and red, a light edge on top
      var slab = ctx.createLinearGradient(0, g.bottom - g.base * 0.5, 0, g.bottom + g.base);
      slab.addColorStop(0, "rgba(70,16,6,.55)");
      slab.addColorStop(1, "rgba(24,8,4,.35)");
      ctx.fillStyle = slab;
      ctx.beginPath();
      ctx.moveTo(g.gx - 4, g.bottom + g.base * 0.35);
      ctx.quadraticCurveTo(g.cx, g.bottom - g.base * 0.9, g.gx + g.gw + 4, g.bottom + g.base * 0.35);
      ctx.lineTo(g.gx + g.gw + 4, g.bottom + g.base + 4);
      ctx.lineTo(g.gx - 4, g.bottom + g.base + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,230,210,.28)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(g.gx - 4, g.bottom + g.base * 0.35);
      ctx.quadraticCurveTo(g.cx, g.bottom - g.base * 0.9, g.gx + g.gw + 4, g.bottom + g.base * 0.35);
      ctx.stroke();
      ctx.restore();
      var edge = ctx.createLinearGradient(g.gx, 0, g.gx + g.gw, 0);
      edge.addColorStop(0, "rgba(255,255,255,.8)");
      edge.addColorStop(0.5, "rgba(255,255,255,.6)");
      edge.addColorStop(1, "rgba(255,255,255,.42)");
      glassPath(g.outer);
      ctx.lineJoin = "round";
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(2.5, g.wall);
      ctx.stroke();
      var rim = xRange(g.outer, g.top + 0.5);
      if (rim) {
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255,236,200,.95)";
        ctx.lineWidth = Math.max(1.5, g.wall * 0.55);
        ctx.beginPath();
        ctx.moveTo(rim[0] + g.wall, g.top + 0.5);
        ctx.lineTo(rim[1] - g.wall, g.top + 0.5);
        ctx.stroke();
      }
      if (light) drawStar(light);
      ctx.restore();
    }

    var api = {
      layout: layout,
      reset: reset,
      press: function () {
        fx.specks = [];
      },
      serve: function (d) {
        dr = d;
        if (g) fit(d);
      },
      result: function (result) {
        fx.verdict = result.verdict;
        fx.lit = result.verdict === "perfect" || result.verdict === "good" ? 0 : -1;
      },
      // The finished glass slides off along the counter as a full one slides in.
      nextRound: function () {
        fx.ghost = calm || !drawn ? null : { s: drawn, dr: dr, lace: fx.lace };
        fx.slide = calm ? 0 : 1;
        fx.lace = [];
        fx.nextLace = 0.86;
        fx.specks = [];
        fx.settle = 0;
        fx.lit = -1;
      },
      // Where the gap is on the canvas, and where the wrapped print puts its cut (for the tests).
      gap: function () {
        if (!g) layout();
        var p = g && wrapped();
        return p ? { y: yAt(mark.gap), x: p.gapX, printed: p.gapRow, ring: g.cx + p.R } : null;
      },
      // s: { top, level, pouring, settling, settled (0 to 1) } from the engine's createSplit.
      frame: function (dt, s) {
        if (!g) layout();
        if (!g) return;
        drawn = s;
        fx.t += dt;
        if (fx.lit >= 0) fx.lit = fx.lit + dt > LIT ? -1 : fx.lit + dt;
        if (fx.slide > 0) fx.slide = Math.max(0, fx.slide - dt / 0.42);
        if (s.pouring && s.top < fx.nextLace) {
          fx.lace.push(s.top + 0.006);
          fx.nextLace = s.top - 0.045 - Math.random() * 0.03;
        }
        if (s.settling) {
          if (!fx.specks.length) {
            for (var i = 0; i < 260; i++) {
              fx.specks.push({ left: Math.random() < 0.5, k: Math.pow(Math.random(), 2.2) * 0.22, y: Math.random(), v: 0.18 + Math.random() * 0.3, w: 1 + Math.random() * 1.2, h: 1.4 + Math.random() * 2.6, a: 0.25 + Math.random() * 0.4 });
            }
          }
          fx.settle = s.settled;
          // calm: the bubbles stay put
          if (!calm) fx.specks.forEach(function (p) {
            p.y += dt * p.v;
          });
        }
        var light = fx.lit >= 0 ? litAt(fx.lit) : null;
        ctx.clearRect(0, 0, W, H);
        drawRoom();
        ctx.save();
        if (light && light.push > 0) {
          var gapY = yAt(mark.gap);
          ctx.translate(g.cx, gapY);
          ctx.scale(1 + light.push, 1 + light.push);
          ctx.translate(-g.cx, -gapY);
        }
        drawCounter();
        var e = smooth(1 - fx.slide);
        if (fx.slide > 0 && fx.ghost) {
          var now = [dr, fx.lace];
          dr = fx.ghost.dr;
          fx.lace = fx.ghost.lace;
          fit(dr);
          drawGlass(e * W * 0.95, fx.ghost.s, false, null);
          dr = now[0];
          fx.lace = now[1];
          fit(dr);
        } else fx.ghost = null;
        drawGlass(fx.slide > 0 ? -(1 - e) * W * 0.95 : 0, s, true, light);
        ctx.restore();
        drawReflection();
      },
    };
    return api;
  };
})();
