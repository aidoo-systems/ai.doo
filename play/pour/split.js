// The second way to play (P2.0ac, D-039), drawn: the venue's glass, full, with its mark
// printed on it (the emblem in a ring, the gap cut on the ring's right, the venue's name
// over it), the line falling as it's sipped and creeping as the head settles. The rules
// are engine.js's (createSplit); game.js runs the screens. Same calls as game.js's scene.
(function () {
  "use strict";

  var NAME_FONT = "'Bricolage Grotesque', Inter, system-ui, sans-serif";

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function rgba(hex, a) {
    var h = hex.slice(1);
    if (h.length < 6) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h.slice(0, 6), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  window.PourSplitScene = function (canvas, skin, calm) {
    var ctx = canvas.getContext("2d");
    var th = skin.theme;
    var mark = skin.mark;
    var emblem = skin.emblem && typeof Path2D === "function" ? new Path2D(skin.emblem.path) : null;
    var dr = skin.drink;
    var W = 0;
    var H = 0;
    var g = null;
    var drawn = null;
    var fx;
    if (document.fonts && document.fonts.load) document.fonts.load("700 16px " + NAME_FONT).then(function () {
      if (drawn) api.frame(0, drawn);
    }, function () {});

    function reset() {
      fx = { t: 0, lace: [], nextLace: 0.86, specks: [], settle: 0, glow: 0, slide: 0, ghost: null, verdict: null };
    }
    reset();

    function layout() {
      var box = canvas.getBoundingClientRect();
      if (box.width < 60 || box.height < 90) {
        g = null;
        return;
      }
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      W = box.width;
      H = box.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var counterH = clamp(H * 0.13, 22, 60);
      var counterY = H - counterH;
      var gh = Math.min(counterY - clamp(H * 0.06, 10, 30), 380);
      var gw = gh * 0.66;
      if (gw > W * 0.62) {
        gw = W * 0.62;
        gh = gw / 0.66;
      }
      g = { counterY: counterY, counterH: counterH, gw: gw, gh: gh, gx: (W - gw) / 2, cx: W / 2, wall: Math.max(3, gw * 0.022), base: Math.max(6, gh * 0.045) };
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

    function drawCounter() {
      var shade = ctx.createLinearGradient(0, g.counterY - 22, 0, g.counterY);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,.28)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, g.counterY - 22, W, 22);
      var top = ctx.createLinearGradient(0, g.counterY, 0, H);
      top.addColorStop(0, th.counter);
      top.addColorStop(1, th.counterEdge);
      ctx.fillStyle = top;
      ctx.fillRect(0, g.counterY, W, g.counterH);
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(0, g.counterY, W, 2);
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.fillRect(0, g.counterY + 10, W, 2);
    }

    // The print on the glass (look A): the emblem inside a ring, the gap cut through the
    // ring's right side at the height to settle on, the venue's name over the ring.
    function drawPrint(glow) {
      var gapY = yAt(mark.gap);
      var gapH = mark.gapSize * (g.bottom - g.top);
      var edge = xRange(g.inner, gapY);
      if (!edge) return;
      var S = (edge[1] - edge[0]) * 0.56;
      var R = S * 0.64;
      var w = S * 0.085;
      var ink = th.accent;
      ctx.save();
      ctx.globalAlpha = 0.93;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(g.cx, gapY - gapH / 2, W, gapH);
      ctx.clip("evenodd");
      ctx.beginPath();
      ctx.arc(g.cx, gapY, R, 0, Math.PI * 2);
      ctx.arc(g.cx, gapY, R - w, 0, Math.PI * 2, true);
      ctx.fillStyle = ink;
      ctx.fill();
      ctx.restore();
      if (emblem) {
        var size = S * 0.78;
        var k = size / Math.max(skin.emblem.width, skin.emblem.height);
        ctx.save();
        ctx.translate(g.cx - (skin.emblem.width * k) / 2, gapY - (skin.emblem.height * k) / 2);
        ctx.scale(k, k);
        ctx.fillStyle = ink;
        if (skin.emblem.rule) ctx.fill(emblem, skin.emblem.rule);
        else ctx.fill(emblem);
        ctx.restore();
      }
      // A long name (a prospect's own, up to 32 letters) shrinks to sit over the ring.
      var name = skin.venue.toUpperCase();
      var px = Math.round(g.gw * 0.06);
      ctx.font = "700 " + px + "px " + NAME_FONT;
      while (px > 7 && ctx.measureText(name).width > (edge[1] - edge[0]) * 0.86) {
        px -= 1;
        ctx.font = "700 " + px + "px " + NAME_FONT;
      }
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(name, g.cx, gapY - R - 8);
      ctx.restore();
      // A split lights the gap for a moment.
      if (glow > 0) {
        ctx.save();
        ctx.globalAlpha = glow;
        ctx.fillStyle = th.accent;
        ctx.shadowColor = th.accent;
        ctx.shadowBlur = 14;
        ctx.fillRect(g.cx + R - w - 2, gapY - 1, w + 10, 2);
        ctx.restore();
      }
    }

    function drawGlass(ox, s, live) {
      var span = g.bottom - g.top;
      ctx.save();
      ctx.translate(ox, 0);
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.beginPath();
      ctx.ellipse(g.cx, g.counterY + 7, g.gw * 0.46, 6, 0, 0, 6.3);
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

      // the drink
      var grad = ctx.createLinearGradient(0, lineY, 0, g.bottom);
      grad.addColorStop(0, dr.liquid);
      grad.addColorStop(1, dr.liquidDeep);
      ctx.fillStyle = grad;
      ctx.fillRect(x0, lineY, x1 - x0, g.bottom + g.base - lineY);

      // the cascade while it settles: the drink under the head runs pale, and clears from the top
      if (live && s.settling && !calm) {
        var k = fx.settle;
        var surge = ctx.createLinearGradient(0, lineY, 0, lineY + span * 0.35);
        surge.addColorStop(0, rgba(dr.head, 0.32 * (1 - k)));
        surge.addColorStop(1, rgba(dr.head, 0));
        ctx.fillStyle = surge;
        ctx.fillRect(x0, lineY, x1 - x0, span * 0.35);
        ctx.fillStyle = rgba(dr.head, 0.4 * (1 - k * 0.6));
        fx.specks.forEach(function (p) {
          var yy = lineY + (p.y % 1) * Math.min(span * 0.3, g.bottom - lineY);
          var e = xRange(g.inner, yy);
          if (!e) return;
          var x = e[0] + 4 + p.x * (e[1] - e[0] - 8);
          ctx.fillRect(x, yy, 1 + p.s, 1 + p.s);
        });
      }

      // the head, with its soft top
      if (lineY - topY > 0.5) {
        var hg = ctx.createLinearGradient(0, topY, 0, lineY);
        hg.addColorStop(0, dr.head);
        hg.addColorStop(1, rgba(dr.head, 0.86));
        ctx.fillStyle = hg;
        ctx.fillRect(x0, topY + 2, x1 - x0, lineY - topY - 2);
        ctx.fillStyle = dr.head;
        for (var x = g.gx; x <= g.gx + g.gw; x += 9) {
          ctx.beginPath();
          ctx.arc(x, topY + 2.6, 2.8, 0, 6.3);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(0,0,0,.18)";
        ctx.fillRect(x0, lineY - 1, x1 - x0, 1.5);
      }

      // the lacing each sip leaves on the glass above the head
      ctx.strokeStyle = rgba(dr.head, 0.24);
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

      // light on the glass
      var a = xRange(g.inner, g.gy + g.gh * 0.07);
      var b = xRange(g.inner, g.gy + g.gh * 0.7);
      if (a && b) {
        ctx.strokeStyle = "rgba(255,255,255,.16)";
        ctx.lineWidth = g.gw * 0.045;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a[0] + g.gw * 0.09, g.gy + g.gh * 0.07);
        ctx.lineTo(b[0] + g.gw * 0.09, g.gy + g.gh * 0.7);
        ctx.stroke();
      }
      ctx.restore();

      drawPrint(live ? fx.glow : 0);

      // the glass itself: a thick base and a bright edge
      ctx.save();
      glassPath(g.outer);
      ctx.clip();
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.beginPath();
      ctx.moveTo(g.gx - 4, g.bottom + g.base * 0.35);
      ctx.quadraticCurveTo(g.cx, g.bottom - g.base * 0.9, g.gx + g.gw + 4, g.bottom + g.base * 0.35);
      ctx.lineTo(g.gx + g.gw + 4, g.bottom + g.base + 4);
      ctx.lineTo(g.gx - 4, g.bottom + g.base + 4);
      ctx.closePath();
      ctx.fill();
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
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.lineWidth = Math.max(1.5, g.wall * 0.55);
        ctx.beginPath();
        ctx.moveTo(rim[0] + g.wall, g.top + 0.5);
        ctx.lineTo(rim[1] - g.wall, g.top + 0.5);
        ctx.stroke();
      }
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
        fx.glow = result.verdict === "perfect" || result.verdict === "good" ? 1 : 0;
      },
      // The finished glass slides off along the counter as a full one slides in.
      nextRound: function () {
        fx.ghost = calm || !drawn ? null : { s: drawn, dr: dr, lace: fx.lace };
        fx.slide = calm ? 0 : 1;
        fx.lace = [];
        fx.nextLace = 0.86;
        fx.specks = [];
        fx.settle = 0;
        fx.glow = 0;
      },
      // s: { top, level, pouring, settling, settled (0 to 1) } from the engine's createSplit.
      frame: function (dt, s) {
        if (!g) layout();
        if (!g) return;
        drawn = s;
        fx.t += dt;
        fx.glow = Math.max(0, fx.glow - dt / 1.2);
        if (fx.slide > 0) fx.slide = Math.max(0, fx.slide - dt / 0.42);
        if (s.pouring && s.top < fx.nextLace) {
          fx.lace.push(s.top + 0.006);
          fx.nextLace = s.top - 0.045 - Math.random() * 0.03;
        }
        if (s.settling) {
          if (!fx.specks.length) {
            for (var i = 0; i < 80; i++) fx.specks.push({ x: Math.random(), y: Math.random(), s: Math.random() });
          }
          fx.settle = s.settled;
          fx.specks.forEach(function (p) {
            p.y += dt * (0.25 + p.s * 0.35);
          });
        }
        ctx.clearRect(0, 0, W, H);
        drawCounter();
        var e = smooth(1 - fx.slide);
        if (fx.slide > 0 && fx.ghost) {
          var now = [dr, fx.lace];
          dr = fx.ghost.dr;
          fx.lace = fx.ghost.lace;
          fit(dr);
          drawGlass(e * W * 0.95, fx.ghost.s, false);
          dr = now[0];
          fx.lace = now[1];
          fit(dr);
        } else fx.ghost = null;
        drawGlass(fx.slide > 0 ? -(1 - e) * W * 0.95 : 0, s, true);
      },
    };
    return api;
  };
})();
