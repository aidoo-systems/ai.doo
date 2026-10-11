// Everything the player sees and hears. The rules are in engine.js; the venue, its
// colours, its words, its glass and its rounds all come from a skin file in skins/.
// Three parts: makeSound (synthesised, no audio files), makeScene (the canvas: counter,
// tap, glass, liquid, foam and particles) and start (the screens and the one control).
(function () {
  "use strict";

  var E = PourEngine;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NEXT_DELAY = 550; // ms before "next" takes a tap, so letting go can't skip the result
  var STAR = "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z";

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function toward(a, b, k) {
    return a + (b - a) * Math.min(1, k);
  }
  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }
  // A skin colour (#rgb or #rrggbb, already validated) at an opacity.
  function rgba(hex, a) {
    var h = hex.slice(1);
    if (h.length < 6) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h.slice(0, 6), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function skinId() {
    var asked = new URLSearchParams(location.search).get("skin");
    return asked && /^[a-z0-9-]+$/.test(asked) ? asked : window.POUR_SKIN;
  }

  fetch("skins/" + skinId() + ".json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("skin " + res.status);
      return res.json();
    })
    .then(function (skin) {
      if (E.validateSkin(skin).length) throw new Error("skin invalid");
      start(skin);
    })
    .catch(function () {
      $("tagline").textContent = "Sorry, this game couldn't load. Please try again.";
    });

  // ---------------------------------------------------------------- sound

  function makeSound() {
    var ctx = null;
    var on = true;
    var noise = null;
    var pour = null;

    // Browsers only allow sound after a tap, so this is first called from one.
    function ready() {
      if (!on) return null;
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        var data = noise.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function tone(freq, dur, vol, opts) {
      var c = ready();
      if (!c) return;
      opts = opts || {};
      var t = c.currentTime + (opts.delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = opts.type || "sine";
      osc.frequency.setValueAtTime(freq, t);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    function splash(dur, vol, cutoff) {
      var c = ready();
      if (!c) return;
      var t = c.currentTime;
      var src = c.createBufferSource();
      var filter = c.createBiquadFilter();
      var gain = c.createGain();
      src.buffer = noise;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoff, t);
      filter.frequency.exponentialRampToValueAtTime(cutoff / 4, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(t);
      src.stop(t + dur + 0.05);
    }

    return {
      unlock: ready,
      // Filtered noise whose pitch climbs as the glass fills, the way a real one does.
      startPour: function () {
        var c = ready();
        if (!c || pour) return;
        var src = c.createBufferSource();
        var band = c.createBiquadFilter();
        var gain = c.createGain();
        src.buffer = noise;
        src.loop = true;
        band.type = "bandpass";
        band.Q.value = 0.9;
        band.frequency.value = 420;
        gain.gain.setValueAtTime(0.0001, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, c.currentTime + 0.07);
        src.connect(band);
        band.connect(gain);
        gain.connect(c.destination);
        src.start();
        pour = { src: src, band: band, gain: gain };
      },
      setPour: function (level) {
        if (pour) pour.band.frequency.setTargetAtTime(420 + 1900 * level, ctx.currentTime, 0.06);
      },
      stopPour: function () {
        if (!pour) return;
        var p = pour;
        pour = null;
        p.gain.gain.cancelScheduledValues(ctx.currentTime);
        p.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.035);
        p.src.stop(ctx.currentTime + 0.3);
      },
      click: function () {
        tone(620, 0.06, 0.05, { type: "triangle" });
      },
      tick: function () {
        tone(1500, 0.03, 0.025, { type: "square" });
      },
      star: function (i, delay) {
        tone([784, 988, 1319][i] || 1319, 0.5, 0.13, { delay: delay });
      },
      verdict: function (verdict) {
        if (verdict === "perfect") {
          tone(1046.5, 0.5, 0.16);
          tone(1568, 0.7, 0.11, { delay: 0.09 });
          tone(2093, 0.9, 0.07, { delay: 0.18 });
        } else if (verdict === "good") {
          tone(880, 0.3, 0.13);
          tone(1174.7, 0.4, 0.09, { delay: 0.08 });
        } else if (verdict === "spill") {
          splash(0.55, 0.32, 1400);
          tone(300, 0.45, 0.07, { type: "sawtooth", to: 80 });
        } else {
          tone(330, 0.28, 0.13, { type: "triangle", to: 196 });
        }
      },
      toggle: function () {
        on = !on;
        if (!on && pour) this.stopPour();
        if (ctx) on ? ctx.resume() : ctx.suspend();
        return on;
      },
      quiet: function () {
        if (pour) this.stopPour();
      },
    };
  }

  // ---------------------------------------------------------------- scene

  function makeScene(canvas, skin) {
    var ctx = canvas.getContext("2d");
    var th = skin.theme;
    var dr = skin.drink;
    var W = 0;
    var H = 0;
    var g = null; // geometry, rebuilt by layout()
    var fx;
    var bubbles = [];
    var parts = [];
    var floats = [];
    // The foam's top edge: fixed bump sizes, so it doesn't boil from frame to frame.
    var bumps = [];
    for (var i = 0; i < 64; i++) bumps.push(3.4 + 3.2 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1));

    function reset() {
      fx = { t: 0, wave: 0, slosh: 0, head: 0, tail: 0, handle: 0, slide: 0, ghost: null, shake: 0, spilling: false, spill: 0, glow: 0 };
      bubbles = [];
      parts = [];
      floats = [];
    }
    reset();

    function layout() {
      var box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      W = box.width;
      H = box.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var counterH = clamp(H * 0.13, 28, 60);
      var counterY = H - counterH;
      var gh = Math.min(counterY - clamp(H * 0.2, 36, 78), 330); // the room above is the tap's
      var gw = gh * 0.66;
      if (gw > W * 0.6) {
        gw = W * 0.6;
        gh = gw / 0.66;
      }
      var gx = (W - gw) / 2;
      var gy = counterY - gh + 4;
      var wall = Math.max(3, gw * 0.022);
      var base = Math.max(8, gh * 0.045);
      var cx = W / 2;
      g = { counterY: counterY, counterH: counterH, gx: gx, gy: gy, gw: gw, gh: gh, cx: cx, wall: wall, base: base, tip: Math.max(16, gy - 16) };
      g.outer = dr.glass.map(function (p) {
        return [gx + (p[0] / 100) * gw, gy + (p[1] / 100) * gh];
      });
      g.inner = g.outer.map(function (p) {
        return [cx + (p[0] - cx) * (1 - (2 * wall) / gw), gy + (p[1] - gy) * (1 - base / gh)];
      });
      g.top = gy;
      g.bottom = gy + gh - base;
    }

    // Where a level (0 empty, 1 the rim) sits on the canvas.
    function yAt(level) {
      return g.bottom - level * (g.bottom - g.top);
    }

    // The left and right edges of a polygon at a height, or null above and below it.
    function xRange(pts, y) {
      var lo = Infinity;
      var hi = -Infinity;
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i];
        var b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] >= y) || (b[1] <= y && a[1] >= y)) {
          var x = a[1] === b[1] ? a[0] : a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
          lo = Math.min(lo, x, a[1] === b[1] ? b[0] : x);
          hi = Math.max(hi, x, a[1] === b[1] ? b[0] : x);
        }
      }
      return hi >= lo ? [lo, hi] : null;
    }

    function poly(pts, r) {
      var n = pts.length;
      ctx.beginPath();
      ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
      for (var i = 0; i < n; i++) {
        var b = pts[(i + 1) % n];
        ctx.arcTo(pts[i][0], pts[i][1], b[0], b[1], r);
      }
      ctx.closePath();
    }

    function box(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function wave(x) {
      return fx.wave * (Math.sin(x * 0.06 + fx.t * 9) + 0.5 * Math.sin(x * 0.13 - fx.t * 6)) +
        fx.slosh * ((x - g.cx) / g.gw) * Math.sin(fx.t * 13);
    }

    function drawCounter() {
      var shade = ctx.createLinearGradient(0, g.counterY - 22, 0, g.counterY);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,.28)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, g.counterY - 22, W, 22);
      var wood = ctx.createLinearGradient(0, g.counterY, 0, H);
      wood.addColorStop(0, th.counter);
      wood.addColorStop(1, th.counterEdge);
      ctx.fillStyle = wood;
      ctx.fillRect(0, g.counterY, W, g.counterH);
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(0, g.counterY, W, 2);
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.fillRect(0, g.counterY + 10, W, 2);
    }

    function drawTap() {
      var cx = g.cx;
      var tip = g.tip;
      // the handle, behind the pipe, pulled down while pouring
      ctx.save();
      ctx.translate(cx + 12, tip - 30);
      ctx.rotate(lerp(0.28, 1.1, smooth(fx.handle)));
      ctx.fillStyle = th.metal;
      box(-4, -24, 8, 28, 3);
      ctx.fill();
      ctx.fillStyle = th.accent;
      box(-11, -84, 22, 64, 11);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.16)";
      box(3, -80, 6, 56, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.3)";
      box(-7, -78, 4, 46, 2);
      ctx.fill();
      ctx.fillStyle = rgba(th.accentInk, 0.82);
      ctx.beginPath();
      ctx.arc(0, -54, 6, 0, 6.3);
      ctx.fill();
      ctx.restore();
      // the pipe, its collar and the nozzle
      ctx.fillStyle = th.metal;
      ctx.fillRect(cx - 11, -4, 22, tip - 14);
      box(cx - 17, tip - 38, 34, 13, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 9, tip - 20);
      ctx.lineTo(cx + 9, tip - 20);
      ctx.lineTo(cx + 5.5, tip);
      ctx.lineTo(cx - 5.5, tip);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.4)";
      ctx.fillRect(cx - 7, -4, 4, tip - 36);
      ctx.fillRect(cx - 13, tip - 35, 7, 3);
      ctx.fillStyle = "rgba(0,0,0,.24)";
      ctx.fillRect(cx + 4, -4, 7, tip - 16);
      ctx.fillRect(cx - 17, tip - 28, 34, 3);
    }

    function drawStream(level) {
      if (fx.head <= 0) return;
      var target = level > 0.01 ? yAt(level) + 3 : g.bottom;
      var y0 = lerp(g.tip, target, fx.tail);
      var y1 = lerp(g.tip, target, fx.head);
      if (y1 - y0 < 2) return;
      var left = [];
      var right = [];
      for (var y = y0; ; y += 6) {
        if (y > y1) y = y1;
        var k = (y - g.tip) / Math.max(1, target - g.tip);
        var mid = g.cx + Math.sin(y * 0.045 + fx.t * 11) * 1.3 * k;
        var half = lerp(5.4, 3.4, k);
        left.push([mid - half, y]);
        right.push([mid + half, y]);
        if (y === y1) break;
      }
      ctx.beginPath();
      left.forEach(function (p, i) {
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      });
      right.reverse().forEach(function (p) {
        ctx.lineTo(p[0], p[1]);
      });
      ctx.closePath();
      var grad = ctx.createLinearGradient(0, g.tip, 0, target);
      grad.addColorStop(0, dr.liquid);
      grad.addColorStop(1, dr.liquidDeep);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.3)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      left.forEach(function (p, i) {
        if (i) ctx.lineTo(p[0] + 1.6, p[1]);
        else ctx.moveTo(p[0] + 1.6, p[1]);
      });
      ctx.stroke();
    }

    // One glass at a sideways offset. live: the one being poured (bubbles, churn, arrows).
    function drawGlass(ox, level, line, live, pouring) {
      var span = g.bottom - g.top;
      ctx.save();
      ctx.translate(ox, 0);

      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.beginPath();
      ctx.ellipse(g.cx, g.counterY + 7, g.gw * 0.46, 6, 0, 0, 6.3);
      ctx.fill();

      poly(g.inner, 3);
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.fill();

      ctx.save();
      poly(g.inner, 3);
      ctx.clip();
      if (level > 0.004) {
        var ys = yAt(level);
        var headH = dr.headDepth * level * span;
        var bodyTop = ys + headH;
        var x0 = g.gx - 4;
        var x1 = g.gx + g.gw + 4;
        var x;

        // the drink
        var grad = ctx.createLinearGradient(0, bodyTop, 0, g.bottom);
        grad.addColorStop(0, dr.liquid);
        grad.addColorStop(1, dr.liquidDeep);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x0, g.bottom + g.base);
        for (x = x0; x <= x1; x += 6) ctx.lineTo(x, bodyTop + wave(x) * 0.5);
        ctx.lineTo(x1, g.bottom + g.base);
        ctx.closePath();
        ctx.fill();
        var lit = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + 30);
        lit.addColorStop(0, "rgba(255,255,255,.2)");
        lit.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = lit;
        ctx.fillRect(x0, bodyTop - 3, x1 - x0, 34);

        if (live) {
          ctx.fillStyle = rgba(dr.head, 0.55);
          bubbles.forEach(function (b) {
            if (b.y > bodyTop + 3) {
              ctx.beginPath();
              ctx.arc(b.x, b.y, b.r, 0, 6.3);
              ctx.fill();
            }
          });
          if (pouring && level > 0.03) {
            // churn where the stream lands
            for (var c = 0; c < 7; c++) {
              ctx.beginPath();
              ctx.arc(g.cx + rand(-13, 13), bodyTop + rand(0, 26), rand(1.5, 4.5), 0, 6.3);
              ctx.fill();
            }
          }
        }

        // the head
        if (headH > 1.2) {
          ctx.fillStyle = dr.head;
          ctx.beginPath();
          ctx.moveTo(x0, bodyTop + 1);
          for (x = x0; x <= x1; x += 6) ctx.lineTo(x, ys + wave(x) + 3);
          for (x = x1; x >= x0; x -= 6) ctx.lineTo(x, bodyTop + wave(x) * 0.5 + 1.5);
          ctx.closePath();
          ctx.fill();
          var n = 0;
          for (x = g.gx; x <= g.gx + g.gw; x += 9) {
            var r = Math.min(bumps[n++ % bumps.length], headH * 0.8 + 1.5);
            ctx.beginPath();
            ctx.arc(x, ys + wave(x) + r * 0.62, r, 0, 6.3);
            ctx.fill();
          }
          var under = ctx.createLinearGradient(0, ys, 0, bodyTop + 2);
          under.addColorStop(0, "rgba(0,0,0,0)");
          under.addColorStop(1, "rgba(0,0,0,.1)");
          ctx.fillStyle = under;
          ctx.fillRect(x0, ys, x1 - x0, headH + 2);
        }
      }

      if (line !== null) {
        var yl = yAt(line);
        ctx.setLineDash([7, 6]);
        ctx.lineCap = "butt";
        ctx.strokeStyle = "rgba(0,0,0,.4)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(g.gx, yl);
        ctx.lineTo(g.gx + g.gw, yl);
        ctx.stroke();
        ctx.strokeStyle = th.ink;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.setLineDash([]);
        if (live && fx.glow > 0) {
          ctx.strokeStyle = rgba(th.accent, fx.glow);
          ctx.shadowColor = th.accent;
          ctx.shadowBlur = 16 * fx.glow;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // light on the glass
      var top = g.gy + g.gh * 0.07;
      var bot = g.gy + g.gh * 0.7;
      var a = xRange(g.inner, top);
      var b = xRange(g.inner, bot);
      if (a && b) {
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255,255,255,.15)";
        ctx.lineWidth = g.gw * 0.05;
        ctx.beginPath();
        ctx.moveTo(a[0] + g.gw * 0.12, top);
        ctx.lineTo(b[0] + g.gw * 0.12, bot);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.14)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a[1] - g.gw * 0.08, top + 10);
        ctx.lineTo(b[1] - g.gw * 0.08, bot - 30);
        ctx.stroke();
      }
      ctx.restore();

      // the glass itself: a thick base and a bright edge
      ctx.save();
      poly(g.outer, 5);
      ctx.clip();
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(g.gx, g.bottom, g.gw, g.base + 2);
      ctx.restore();
      poly(g.outer, 5);
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255,255,255,.62)";
      ctx.lineWidth = Math.max(2.5, g.wall);
      ctx.stroke();

      if (line !== null) {
        var yy = yAt(line);
        var edge = xRange(g.outer, yy);
        var bob = live && !pouring && level === 0 && !calm ? Math.sin(fx.t * 4) * 2.5 : 0;
        ctx.fillStyle = th.accent;
        [-1, 1].forEach(function (side) {
          var tipX = (side < 0 ? edge[0] - 7 : edge[1] + 7) + side * bob;
          ctx.beginPath();
          ctx.moveTo(tipX, yy);
          ctx.lineTo(tipX + side * 11, yy - 7.5);
          ctx.lineTo(tipX + side * 11, yy + 7.5);
          ctx.closePath();
          ctx.fill();
        });
      }
      ctx.restore();
    }

    function drawSpill() {
      if (fx.spill <= 0) return;
      ctx.fillStyle = rgba(dr.head, 0.9);
      ctx.beginPath();
      ctx.ellipse(g.cx, g.counterY + 8, g.gw * (0.3 + 0.36 * fx.spill), 5.5, 0, 0, 6.3);
      ctx.fill();
      ctx.strokeStyle = dr.head;
      ctx.fillStyle = dr.head;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 7;
      [0, 1].forEach(function (side) {
        var len = fx.spill * g.gh * (side ? 0.36 : 0.55);
        var end = null;
        ctx.beginPath();
        for (var y = g.gy; y <= g.gy + len; y += 6) {
          var edge = xRange(g.outer, y);
          if (!edge) break;
          end = [side ? edge[1] + 2 : edge[0] - 2, y];
          if (y === g.gy) ctx.moveTo(end[0], end[1]);
          else ctx.lineTo(end[0], end[1]);
        }
        ctx.stroke();
        if (end) {
          ctx.beginPath();
          ctx.arc(end[0], end[1] + 2, 5, 0, 6.3);
          ctx.fill();
        }
      });
      box(g.gx - 3, g.gy - 6, g.gw + 6, 10, 5);
      ctx.fill();
    }

    function drawParts(dt) {
      parts = parts.filter(function (p) {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > g.counterY + 6) return false;
        var s = p.r * Math.min(1, p.life / 0.25);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.star) {
          // a four-point glint
          ctx.moveTo(p.x, p.y - s * 2);
          ctx.quadraticCurveTo(p.x, p.y, p.x + s * 2, p.y);
          ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s * 2);
          ctx.quadraticCurveTo(p.x, p.y, p.x - s * 2, p.y);
          ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s * 2);
        } else {
          ctx.arc(p.x, p.y, s, 0, 6.3);
        }
        ctx.fill();
        return true;
      });
      floats = floats.filter(function (f) {
        f.life -= dt / 1.1;
        if (f.life <= 0) return false;
        var y = f.y - (1 - f.life) * 48;
        ctx.globalAlpha = Math.min(1, f.life * 2.4);
        ctx.font = "900 34px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(0,0,0,.5)";
        ctx.strokeText(f.text, f.x, y);
        ctx.fillStyle = th.accent;
        ctx.fillText(f.text, f.x, y);
        ctx.globalAlpha = 1;
        return true;
      });
    }

    function burst(count, x, y, opts) {
      if (calm) return;
      for (var i = 0; i < count; i++) {
        parts.push({
          x: x + rand(-opts.spread, opts.spread),
          y: y,
          vx: rand(-opts.vx, opts.vx),
          vy: rand(opts.vy[0], opts.vy[1]),
          gravity: opts.gravity,
          r: rand(opts.r[0], opts.r[1]),
          life: rand(0.6, 1.1),
          color: opts.colors[i % opts.colors.length],
          star: !!opts.star,
        });
      }
    }

    return {
      layout: layout,
      reset: reset,
      press: function () {
        fx.head = 0;
        fx.tail = 0;
      },
      result: function (result) {
        var yl = yAt(result.line);
        fx.slosh = calm ? 0 : 5;
        floats.push({ text: "+" + result.score, x: g.cx, y: Math.max(40, yAt(result.level) - 26), life: 1 });
        if (result.verdict === "perfect") {
          fx.glow = 1;
          burst(24, g.cx, yl, { spread: g.gw * 0.4, vx: 190, vy: [-260, -60], gravity: 420, r: [2, 4.2], colors: [th.accent, dr.head, th.ink], star: true });
        } else if (result.verdict === "good") {
          burst(8, g.cx, yl, { spread: g.gw * 0.35, vx: 120, vy: [-180, -50], gravity: 420, r: [1.6, 3], colors: [th.accent, dr.head], star: true });
        } else if (result.verdict === "spill") {
          fx.spilling = true;
          fx.shake = calm ? 0 : 1;
          burst(26, g.cx, g.gy, { spread: g.gw * 0.5, vx: 210, vy: [-230, -40], gravity: 900, r: [2, 4.5], colors: [dr.head, dr.liquid, dr.head] });
        }
      },
      // The finished glass slides off along the counter as an empty one slides in.
      nextRound: function (level) {
        fx.ghost = calm ? null : { level: level };
        fx.slide = calm ? 0 : 1;
        fx.spilling = false;
        fx.spill = 0;
        fx.glow = 0;
        fx.head = 0;
        bubbles = [];
        parts = [];
        floats = [];
      },
      frame: function (dt, s) {
        if (!g) layout();
        if (!g) return;
        fx.t += dt;
        fx.wave = toward(fx.wave, s.pouring ? (calm ? 0.6 : 2.1) : 0, dt * 7);
        fx.slosh *= Math.exp(-dt * 4.5);
        fx.handle = toward(fx.handle, s.pouring ? 1 : 0, dt * 10);
        fx.glow = Math.max(0, fx.glow - dt / 0.9);
        fx.shake = Math.max(0, fx.shake - dt / 0.4);
        if (fx.spilling) fx.spill = Math.min(1, fx.spill + dt / 0.8);
        if (fx.slide > 0) fx.slide = Math.max(0, fx.slide - dt / 0.42);
        if (s.pouring) {
          fx.head = Math.min(1, fx.head + dt / 0.11);
          fx.tail = 0;
        } else if (fx.head > 0) {
          fx.tail += dt / 0.13;
          if (fx.tail >= 1) fx.head = 0;
        }

        var span = g.bottom - g.top;
        var bodyTop = yAt(s.level) + dr.headDepth * s.level * span;
        if (s.level > 0.06 && bubbles.length < 20 && Math.random() < dt * 16) {
          var by = g.bottom - rand(0, 10);
          var edge = xRange(g.inner, by - 4);
          if (edge) bubbles.push({ x: rand(edge[0] + 6, edge[1] - 6), y: by, r: rand(0.8, 2.3), v: rand(24, 56), ph: rand(0, 6) });
        }
        bubbles = bubbles.filter(function (b) {
          b.y -= b.v * dt;
          b.x += Math.sin(fx.t * 5 + b.ph) * 7 * dt;
          return b.y > bodyTop + 2;
        });

        ctx.clearRect(0, 0, W, H);
        ctx.save();
        if (fx.shake > 0) ctx.translate(Math.sin(fx.t * 70) * 5 * fx.shake, Math.cos(fx.t * 55) * 3 * fx.shake);
        drawCounter();
        drawTap();
        var e = smooth(1 - fx.slide);
        if (fx.slide > 0 && fx.ghost) drawGlass(e * W * 0.95, fx.ghost.level, null, false, false);
        else fx.ghost = null;
        var ox = fx.slide > 0 ? -(1 - e) * W * 0.95 : 0;
        if (ox === 0) drawStream(s.level);
        drawGlass(ox, s.level, s.line, true, s.pouring);
        drawSpill();
        drawParts(dt);
        ctx.restore();
      },
    };
  }

  // ---------------------------------------------------------------- the game

  function dress(skin) {
    var style = document.documentElement.style;
    Object.keys(skin.theme).forEach(function (key) {
      style.setProperty("--" + key, skin.theme[key]);
    });
    document.querySelector('meta[name="theme-color"]').setAttribute("content", skin.theme.panel);
    document.title = skin.tagline + " | " + skin.venue;
    $("venue").textContent = skin.venue;
    $("tagline").textContent = skin.tagline;
    $("how").textContent = skin.copy.hint;
    $("fictional").textContent = skin.fictional;
    $("start").textContent = skin.copy.start;
    $("again").textContent = skin.copy.again;
    $("totalLabel").textContent = skin.copy.total;
    $("boardTitle").textContent = skin.copy.boardTitle;
    $("prize").textContent = skin.copy.prize;
    $("outOf").textContent = "/ " + skin.rounds.length * 100;
    var top = E.topScore(skin);
    $("beat").textContent = top > 0 ? skin.copy.beat.replace("{score}", String(top)) : "";
    if (skin.emblem) {
      var svg = $("emblem");
      svg.setAttribute("viewBox", "0 0 " + skin.emblem.width + " " + skin.emblem.height);
      svg.firstElementChild.setAttribute("d", skin.emblem.path);
      svg.removeAttribute("hidden");
    }
  }

  function start(skin) {
    var game = E.createGame(skin);
    var sound = makeSound();
    var scene = makeScene($("scene"), skin);
    var pourBtn = $("pour");
    var nextBtn = $("next");
    var againBtn = $("again");
    var startBtn = $("start");
    var muteBtn = $("mute");
    var holding = false;
    var running = false;
    var last = 0;
    var shown = 0; // the score the HUD is showing, on its way to the real one

    dress(skin);
    startBtn.hidden = false;
    muteBtn.hidden = false;

    function screen(id) {
      ["title", "play", "done"].forEach(function (name) {
        $(name).hidden = name !== id;
      });
    }

    function say(strong, rest, result) {
      var el = $("say");
      el.textContent = "";
      el.classList.toggle("result", !!result);
      if (strong) {
        var b = document.createElement("strong");
        b.textContent = strong;
        el.appendChild(b);
      }
      var s = document.createElement("span");
      s.textContent = rest;
      el.appendChild(s);
    }

    // Counts a number on screen from one value to another.
    function count(el, from, to, ms, each) {
      if (calm || from === to) {
        el.textContent = String(to);
        return;
      }
      var t0 = performance.now();
      var seen = from;
      (function step(now) {
        var k = clamp((now - t0) / ms, 0, 1);
        var v = Math.round(lerp(from, to, 1 - Math.pow(1 - k, 3)));
        if (v !== seen) {
          seen = v;
          el.textContent = String(v);
          if (each) each(v);
        }
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }

    function buzz(verdict) {
      if (!navigator.vibrate) return;
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
      if (verdict === "perfect") navigator.vibrate(25);
      else if (verdict === "spill") navigator.vibrate([70, 40, 70]);
    }

    function drawPips() {
      var list = $("pips");
      list.textContent = "";
      for (var i = 0; i < game.total; i++) {
        var li = document.createElement("li");
        var r = game.results[i];
        if (r) {
          li.textContent = String(r.score);
          li.className = r.verdict === "perfect" ? "got best" : "got";
        } else if (i === game.round) {
          li.className = "now";
        }
        list.appendChild(li);
      }
    }

    function beginRound() {
      $("round").textContent = E.roundLabel(skin, game.round);
      drawPips();
      say("", skin.copy.hint);
      pourBtn.textContent = skin.copy.hold;
      pourBtn.classList.remove("down");
      nextBtn.hidden = true;
      pourBtn.hidden = false;
      pourBtn.focus({ preventScroll: true });
    }

    function result() {
      var r = game.results[game.results.length - 1];
      sound.stopPour();
      sound.verdict(r.verdict);
      buzz(r.verdict);
      scene.result(r);
      say(skin.copy[r.verdict], "+" + r.score, true);
      drawPips();
      count($("points"), shown, game.score, 450);
      shown = game.score;
      pourBtn.classList.remove("down");
      pourBtn.hidden = true;
      nextBtn.textContent = game.round + 1 < game.total ? skin.copy.next : skin.copy.finish;
      nextBtn.disabled = true;
      nextBtn.hidden = false;
      setTimeout(function () {
        nextBtn.disabled = false;
        if (!holding) nextBtn.focus({ preventScroll: true });
      }, NEXT_DELAY);
    }

    function results() {
      running = false;
      screen("done");
      var earned = E.stars(skin, game.score);
      var stars = $("stars");
      stars.textContent = "";
      stars.setAttribute("aria-label", earned + " of 3 stars");
      for (var i = 0; i < 3; i++) {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        svg.setAttribute("viewBox", "0 0 24 24");
        path.setAttribute("d", STAR);
        path.setAttribute("fill", "currentColor");
        svg.appendChild(path);
        if (i < earned) {
          svg.setAttribute("class", "lit");
          svg.style.animationDelay = 0.35 + i * 0.22 + "s";
          sound.star(i, 0.35 + i * 0.22);
        }
        stars.appendChild(svg);
      }
      count($("total"), 0, game.score, 900, function (v) {
        if (v % 9 === 0) sound.tick();
      });

      var chips = $("chips");
      chips.textContent = "";
      game.results.forEach(function (r) {
        var li = document.createElement("li");
        var b = document.createElement("b");
        b.textContent = String(r.score);
        li.appendChild(document.createTextNode(skin.copy[r.verdict] + " "));
        li.appendChild(b);
        chips.appendChild(li);
      });

      var list = $("board");
      list.textContent = "";
      E.board(skin, game.score).forEach(function (row, n) {
        var li = document.createElement("li");
        var name = document.createElement("span");
        var score = document.createElement("span");
        name.textContent = row.name;
        score.textContent = String(row.score);
        if (row.you) li.className = "you";
        li.style.animationDelay = 0.5 + n * 0.06 + "s";
        li.appendChild(name);
        li.appendChild(score);
        list.appendChild(li);
      });
      $("done").scrollTop = 0;
      againBtn.focus({ preventScroll: true });
    }

    function loop(now) {
      if (!running) return;
      var dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      if (game.phase === "pouring") {
        game.tick(dt);
        sound.setPour(game.level);
        if (game.phase === "poured") result();
      }
      scene.frame(dt, {
        level: game.level,
        line: skin.rounds[game.round].line,
        pouring: game.phase === "pouring",
      });
      requestAnimationFrame(loop);
    }

    function play() {
      screen("play");
      shown = 0;
      $("points").textContent = "0";
      scene.reset();
      scene.layout();
      beginRound();
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }

    function press() {
      holding = true;
      if (game.phase !== "ready") return;
      game.press();
      scene.press();
      sound.startPour();
      pourBtn.classList.add("down");
      pourBtn.textContent = skin.copy.release;
    }

    function release() {
      holding = false;
      if (game.phase !== "pouring") return;
      game.release();
      result();
    }

    pourBtn.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      e.preventDefault();
      try {
        pourBtn.setPointerCapture(e.pointerId);
      } catch (err) {
        /* an old browser without pointer capture still gets pointerup on the window */
      }
      press();
    });
    ["pointerup", "pointercancel"].forEach(function (type) {
      window.addEventListener(type, release);
    });
    pourBtn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    pourBtn.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        press();
      }
    });
    window.addEventListener("keyup", function (e) {
      if (e.key === " " || e.key === "Enter") release();
    });
    // Leaving the page mid-pour ends the pour where it is, rather than pouring unseen.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        release();
        sound.quiet();
      }
    });
    window.addEventListener("blur", release);
    window.addEventListener("resize", scene.layout);
    if (window.ResizeObserver) new ResizeObserver(scene.layout).observe($("stage"));

    startBtn.addEventListener("click", function () {
      sound.unlock();
      sound.click();
      play();
    });
    nextBtn.addEventListener("click", function () {
      var level = game.level;
      sound.click();
      game.next();
      if (game.phase === "done") results();
      else {
        scene.nextRound(level);
        beginRound();
      }
    });
    againBtn.addEventListener("click", function () {
      sound.click();
      game.reset();
      play();
    });
    muteBtn.addEventListener("click", function () {
      muteBtn.setAttribute("aria-pressed", String(sound.toggle()));
    });
  }
})();
