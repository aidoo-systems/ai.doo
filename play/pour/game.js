// Everything the player sees and hears. The rules are in engine.js; the venue, its
// colours, its words, its glass and its rounds all come from a skin file in skins/.
// Three parts: makeSound (synthesised, no audio files), makeScene (the canvas: counter,
// what pours, glass, liquid, foam and particles) and start (the screens and the one control).
(function () {
  "use strict";

  var E = PourEngine;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HOLD = 1150; // ms a result stays up before the next glass slides in
  var HOLD_SPILL = 1600;
  var HOLD_TOPPED = 350; // and this much longer when the serve has a topping, so its finish is seen
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
  // A skin colour taken toward white (k above 0) or a dark wine (k below 0), for shading.
  function shade(hex, k) {
    var c = rgba(hex, 1).slice(5, -3).split(",").map(Number);
    var to = k > 0 ? [255, 255, 255] : [40, 0, 10];
    return "rgb(" + c.map(function (v, i) {
      return Math.round(v + (to[i] - v) * Math.abs(k));
    }).join(",") + ")";
  }

  function skinId() {
    var asked = new URLSearchParams(location.search).get("skin");
    var kinds = window.POUR_KINDS || {};
    if (asked && Object.prototype.hasOwnProperty.call(kinds, asked)) asked = kinds[asked];
    return asked && /^[a-z0-9-]+$/.test(asked) ? asked : window.POUR_SKIN;
  }

  // A skin by name, or a rejection if it is missing or not playable.
  function loadSkin(id) {
    return fetch("skins/" + id + ".json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("skin " + res.status);
        return res.json();
      })
      .then(function (skin) {
        if (E.validateSkin(skin).length) throw new Error("skin invalid");
        return skin;
      });
  }

  // The prospect's own venue name, from the link in our email; null when there isn't one.
  // It is only ever drawn as text, and goes nowhere but this page and its venue switch.
  var guest = E.guestName(new URLSearchParams(location.search).get("name"));

  // The skin as the prospect sees it: their name for the made-up venue's, and not its emblem.
  function forGuest(skin) {
    if (!guest) return skin;
    var named = Object.assign({}, skin, { venue: guest, fictional: "Made for " + guest + " as a sample." });
    named.copy = Object.assign({}, skin.copy, { boardTitle: "This week's scores" });
    delete named.emblem;
    return named;
  }

  // A name nobody has (a typo, a retired skin on old artwork) plays the default skin.
  var asked = skinId();
  loadSkin(asked)
    .catch(function (err) {
      if (asked === window.POUR_SKIN) throw err;
      return loadSkin(window.POUR_SKIN);
    })
    .then(function (skin) {
      return start(forGuest(skin));
    })
    .catch(function () {
      $("tagline").textContent = "Sorry, this game couldn't load. Please try again.";
      document.documentElement.classList.add("ready");
    });

  // ---------------------------------------------------------------- sound

  function makeSound() {
    var ctx = null;
    var on = true;
    var noise = null;
    var pour = null;
    var asleep = false; // the page is hidden: nothing may sound until it is back

    // Browsers only allow sound after a tap, so this is first called from one.
    function ready() {
      if (!on || asleep) return null;
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        var data = noise.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (ctx.state !== "running") ctx.resume(); // "suspended", or iOS's "interrupted"
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
      // Filtered noise: its pitch climbs as the glass fills, the way a real one does,
      // and it gets louder and quieter with the flow, so a surge can be heard coming.
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
        gain.gain.exponentialRampToValueAtTime(0.19, c.currentTime + 0.07);
        src.connect(band);
        band.connect(gain);
        gain.connect(c.destination);
        src.start();
        pour = { src: src, band: band, gain: gain, from: c.currentTime + 0.08 };
      },
      setPour: function (level, flow) {
        if (!pour) return;
        pour.band.frequency.setTargetAtTime(420 + 1900 * level, ctx.currentTime, 0.06);
        if (ctx.currentTime > pour.from) pour.gain.gain.setTargetAtTime(0.19 * Math.pow(clamp(flow, 0.3, 1.8), 1.5), ctx.currentTime, 0.04);
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
      nudge: function () {
        tone(440, 0.12, 0.07, { type: "triangle", to: 330 });
      },
      best: function () {
        tone(1319, 0.25, 0.1, { delay: 1.15 });
        tone(1760, 0.5, 0.1, { delay: 1.27 });
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
      sleep: function () {
        if (pour) this.stopPour();
        asleep = true;
        if (ctx) ctx.suspend();
      },
      wake: function () {
        asleep = false;
        if (ctx && on) ctx.resume();
      },
    };
  }

  // ---------------------------------------------------------------- scene

  function makeScene(canvas, skin) {
    var ctx = canvas.getContext("2d");
    var th = skin.theme;
    var dr = skin.drink; // what this round serves: the skin's drink, or a round's own serve (serve())
    var W = 0;
    var H = 0;
    var g = null; // geometry, rebuilt by layout()
    var fx;
    var bubbles = [];
    var parts = [];
    var floats = [];
    // The foam's top edge: fixed bump sizes, so it doesn't boil from frame to frame.
    var bumps = [];
    for (var i = 0; i < 64; i++) bumps.push(3.4 + 3.2 * Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1));
    var BUMP_MAX = 6.6;
    // The venue's emblem, to go on whatever pours the drink.
    var mark = skin.emblem && typeof Path2D === "function" ? new Path2D(skin.emblem.path) : null;
    // A still drink has no bubbles, churn or frothy head: a skin turns them off with fizz: false.
    var fizz = dr.fizz !== false;
    // A tap's stream comes out from under it; a jug or a carton is in front of its own.
    var inFront = dr.pourer === "jug" || dr.pourer === "carton";
    // Soft serve: laid in coils (D-030) in place of a liquid top, with no glass round it.
    var coil = dr.top === "coil";
    var bare = dr.outline === "none";
    // The scene is sized for the deepest vessel any round serves in, so nothing shrinks between rounds.
    var deep = 1;
    skin.rounds.forEach(function (r, i) {
      deep = Math.max(deep, depth(E.serveOf(skin, i)));
    });

    // How far down a serve's vessel reaches, in glass heights: 1 when it has none below the glass.
    function depth(d) {
      if (!d.vessel) return 1;
      return Math.max(1, Math.max.apply(null, d.vessel.points.map(function (p) {
        return p[1];
      })) / 100);
    }

    function reset() {
      fx = { t: 0, wave: 0, slosh: 0, flow: 1, head: 0, tail: 0, handle: 0, slide: 0, ghost: null, shake: 0, spilling: false, spill: 0, glow: 0, freeze: 0, pending: null, measure: null, topped: false };
      bubbles = [];
      parts = [];
      floats = [];
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
      var gh = Math.min(counterY - clamp(H * 0.2, 36, 78), 330) / deep; // the room above is the tap's
      var gw = gh * 0.66;
      if (gw > W * 0.58) {
        gw = W * 0.58;
        gh = gw / 0.66;
      }
      var gx = (W - gw) / 2;
      var gy = counterY - gh * deep + 4; // where the tallest serve's top is
      var wall = bare ? 0 : Math.max(3, gw * 0.022);
      var base = bare ? 0 : Math.max(6, gh * 0.045);
      var cx = W / 2;
      g = { counterY: counterY, counterH: counterH, gx: gx, gy: gy, gw: gw, gh: gh, cx: cx, wall: wall, base: base, tip: Math.max(16, gy - 16) };
      fit(dr);
    }

    // Where a serve sits: its glass at the scene's size, its vessel on the counter.
    function fit(d) {
      var gy = (g.gy = g.counterY - g.gh * depth(d) + 4);
      var place = function (p) {
        return [g.gx + (p[0] / 100) * g.gw, gy + (p[1] / 100) * g.gh];
      };
      g.outer = d.glass.map(place);
      g.inner = g.outer.map(function (p) {
        return [g.cx + (p[0] - g.cx) * (1 - (2 * g.wall) / g.gw), gy + (p[1] - gy) * (1 - g.base / g.gh)];
      });
      g.vessel = d.vessel ? d.vessel.points.map(place) : null;
      g.top = gy;
      g.bottom = gy + g.gh - g.base;
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

    // The emblem, fitted into a square of this size around a point.
    function drawMark(x, y, size, colour) {
      var k = size / Math.max(skin.emblem.width, skin.emblem.height);
      ctx.save();
      ctx.translate(x - (skin.emblem.width * k) / 2, y - (skin.emblem.height * k) / 2);
      ctx.scale(k, k);
      ctx.fillStyle = colour;
      if (skin.emblem.rule) ctx.fill(mark, skin.emblem.rule);
      else ctx.fill(mark);
      ctx.restore();
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

    function drawTap() {
      var cx = g.cx;
      var tip = g.tip;
      // the handle, behind the pipe: pulled down while pouring, and it judders with the flow
      // at rest the handle reaches 114 above the nozzle: smaller where there is less room
      var s = clamp((tip - 6) / 114, 0.3, 1);
      ctx.save();
      ctx.translate(cx + 12 * s, tip - 30 * s);
      ctx.rotate(lerp(0.28, 1.1, smooth(fx.handle)) + (fx.flow - 1) * 0.24 * fx.handle);
      ctx.scale(s, s);
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
      // a badge over the collar with the emblem on it, as big as the room above it allows
      var by = tip - 32;
      var r = Math.min(15, by - 2);
      if (mark && r >= 9) {
        ctx.beginPath();
        ctx.arc(cx, by, r, 0, 6.3);
        ctx.fillStyle = th.accentInk;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = th.accent;
        ctx.stroke();
        drawMark(cx, by, r * 1.4, th.accent);
      }
    }

    // A jug held over the glass: upright and clear of the rim until the pour, then it
    // swings in and tips, pivoting on its lip, and tips further the harder it pours.
    function drawJug() {
      var p = smooth(fx.handle * 1.5); // there before the stream is
      // upright or tipped, the handle reaches about 1.4h above the lip: smaller where there is little room
      var h = clamp(Math.min(g.gh * 0.3, (g.tip - 6) / 1.42), 14, 88);
      var w = h * 0.74;
      ctx.save();
      ctx.translate(g.cx + lerp(w * 0.5, 0, p), g.tip - 1 - lerp(h * 0.92, 0, p));
      ctx.rotate(-(lerp(0.42, 1.86, p) + (fx.flow - 1) * 0.16 * fx.handle));
      // the handle, behind the body
      ctx.lineCap = "round";
      ctx.strokeStyle = th.metal;
      ctx.lineWidth = Math.max(4, h * 0.085);
      ctx.beginPath();
      ctx.moveTo(w, h * 0.16);
      ctx.bezierCurveTo(w * 1.62, h * 0.12, w * 1.62, h * 0.82, w + 2, h * 0.78);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // the body, from the tip of the lip round the rim and the base
      var body = [[0, 0], [w * 0.2, -h * 0.05], [w, -h * 0.05], [w + h * 0.05, h], [w * 0.1, h], [w * 0.16, h * 0.2]];
      poly(body, h * 0.06);
      ctx.fillStyle = th.metal;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = th.accent;
      ctx.fillRect(-4, h * 0.56, w + 12, h * 0.17);
      if (mark) drawMark(w * 0.58, h * 0.28, h * 0.36, th.accent);
      ctx.fillStyle = "rgba(255,255,255,.42)";
      ctx.fillRect(w * 0.26, -h * 0.1, w * 0.11, h * 1.2);
      ctx.fillStyle = "rgba(0,0,0,.2)";
      ctx.fillRect(w * 0.8, -h * 0.1, w * 0.4, h * 1.2);
      ctx.fillRect(-4, h * 0.93, w + 12, h * 0.1);
      ctx.restore();
      ctx.restore();
    }

    // A gable-top carton, poured from the spout notch at the top of one side: upright and
    // clear of the rim until the pour, then it tips on its spout, further as the glass
    // fills (it is emptying), and judders on each glug of a surge.
    function drawCarton(level) {
      var p = smooth(fx.handle * 1.5);
      // tipped all the way, the far corner reaches about 1.25h above the spout: smaller where there is little room
      var h = clamp(Math.min(g.gh * 0.34, (g.tip - 8) / 1.32), 8, 96);
      var w = h * 0.62;
      var k = w * 0.12; // the spout's reach out from the side
      var roof = w * 0.42;
      var glug = Math.max(0, fx.flow - 1) * fx.handle;
      ctx.save();
      ctx.translate(g.cx + lerp(w * 0.5, 0, p), g.tip - 1 - lerp(h, 0, p));
      ctx.rotate(-(lerp(0.1, 1.7, p) + 0.5 * level * fx.handle + (fx.flow - 1) * 0.2 * fx.handle + Math.sin(fx.t * 46) * 0.03 * glug));
      var top = k * 0.5;
      var body = [[k, top], [k + w / 2, top - roof], [k + w, top], [k + w, top + h], [k, top + h]];
      // the fin along the ridge, then the spout, then the carton
      ctx.fillStyle = th.metal;
      box(k + w / 2 - w * 0.05, top - roof - w * 0.1, w * 0.1, w * 0.16, 1.5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(k * 1.4, top - k * 0.9);
      ctx.lineTo(k * 1.4, top + k * 1.2);
      ctx.closePath();
      ctx.fill();
      poly(body, h * 0.04);
      ctx.fill();
      ctx.save();
      ctx.clip();
      // the roof is a shade darker than the sides
      ctx.fillStyle = "rgba(0,0,0,.1)";
      ctx.beginPath();
      ctx.moveTo(k - 2, top);
      ctx.lineTo(k + w / 2, top - roof - 2);
      ctx.lineTo(k + w + 2, top);
      ctx.closePath();
      ctx.fill();
      // the label face, for the venue's emblem, and a band of the room's colour under it
      ctx.fillStyle = th.accent;
      ctx.fillRect(k - 2, top + h * 0.16, w + 4, h * 0.52);
      ctx.fillStyle = th.panel;
      ctx.fillRect(k - 2, top + h * 0.72, w + 4, h * 0.1);
      if (mark) drawMark(k + w / 2, top + h * 0.42, Math.min(w * 0.7, h * 0.4), th.accentInk);
      ctx.fillStyle = "rgba(255,255,255,.4)";
      ctx.fillRect(k + w * 0.1, top - roof, w * 0.1, h + roof);
      ctx.fillStyle = "rgba(0,0,0,.16)";
      ctx.fillRect(k + w * 0.8, top - roof, w * 0.3, h + roof);
      ctx.restore();
      // the notch the drink runs from
      ctx.strokeStyle = "rgba(0,0,0,.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(k * 0.3, 0);
      ctx.lineTo(k * 1.4, top);
      ctx.stroke();
      ctx.restore();
    }

    // A soft-serve machine across the top of the scene: its front carries the badge, and the
    // lever beside the nozzle is pulled down while it pours and kicks on each surge.
    function drawMachine() {
      var cx = g.cx;
      var tip = g.tip;
      var mw = clamp(g.gw * 1.4, 64, 170);
      var foot = tip - 24; // the underside of the machine, where the nozzle hangs
      ctx.fillStyle = th.metal;
      box(cx - mw / 2, -12, mw, foot + 12, 10);
      ctx.fill();
      ctx.fillStyle = th.accent;
      ctx.fillRect(cx - mw / 2, foot - Math.min(14, foot * 0.3), mw, Math.min(8, foot * 0.16));
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fillRect(cx - mw / 2 + 6, -4, 5, foot - 8);
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.fillRect(cx + mw / 2 - 12, -4, 8, foot);
      // the nozzle, with ridges that give the swirl its grooves
      ctx.fillStyle = th.metal;
      ctx.beginPath();
      ctx.moveTo(cx - 11, foot - 2);
      ctx.lineTo(cx + 11, foot - 2);
      ctx.lineTo(cx + 7, tip);
      ctx.lineTo(cx - 7, tip);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.22)";
      for (var i = -1; i <= 1; i++) ctx.fillRect(cx + i * 5 - 1, foot + 2, 2, 20);
      // the lever, smaller where there is less room above the nozzle
      var s = clamp((tip - 6) / 62, 0.15, 1);
      ctx.save();
      ctx.translate(cx + 20 * s, tip - 22 * s);
      ctx.rotate(lerp(0.3, 1.25, smooth(fx.handle)) + (fx.flow - 1) * 0.3 * fx.handle);
      ctx.scale(s, s);
      ctx.fillStyle = th.metal;
      box(-3, -34, 6, 36, 3);
      ctx.fill();
      ctx.fillStyle = th.accent;
      ctx.beginPath();
      ctx.arc(0, -34, 7, 0, 6.3);
      ctx.fill();
      ctx.restore();
      // the badge on the front, as big as the machine allows
      var by = foot / 2;
      var r = Math.min(16, by - 4, mw * 0.2);
      if (mark && r >= 9) {
        ctx.beginPath();
        ctx.arc(cx, by, r, 0, 6.3);
        ctx.fillStyle = th.accentInk;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = th.accent;
        ctx.stroke();
        drawMark(cx, by, r * 1.4, th.accent);
      }
    }

    function drawPourer(level) {
      if (dr.pourer === "jug") drawJug();
      else if (dr.pourer === "carton") drawCarton(level);
      else if (dr.pourer === "machine") drawMachine();
      else drawTap();
    }

    // Soft serve comes out as a rope, grooved and lit like the turns it lays (P2.0w, mock B).
    // It swings out towards the turn being laid and sways as it goes, and a surge swells it.
    // Let go, it necks at the nozzle and snaps, and the last of it drops onto the top turn.
    function drawRope(level) {
      if (fx.head <= 0) return;
      var target = level > 0.01 ? yAt(level) + 3 : g.bottom;
      var neck = smooth(clamp(fx.tail / 0.35, 0, 1));
      var drop = smooth(clamp((fx.tail - 0.35) / 0.65, 0, 1));
      var y0 = lerp(g.tip, target, drop * 0.92);
      var y1 = lerp(g.tip, target, fx.head);
      if (y1 - y0 < 2) return;
      var r0 = 9.6 * (1 + clamp(fx.flow - 1, -0.6, 0.6) * 0.75);
      var land = coil ? landing(level) - g.cx : 0;
      var pts = [];
      var N = 36;
      for (var i = 0; i <= N; i++) {
        var y = lerp(y0, y1, i / N);
        var k = (y - g.tip) / Math.max(1, target - g.tip);
        var r = r0 * lerp(1, 0.86, k);
        var below = y - y0; // how far down from the rope's top end
        if (drop <= 0) r *= lerp(1, 0.18, neck * clamp(1 - below / (r0 * 2.6), 0, 1));
        else r *= clamp(below / (r0 * 1.6), 0.25, 1); // the broken end comes to a point
        pts.push({ x: g.cx + land * (1 - Math.pow(1 - k, 2.2)) * 0.95 + Math.sin(fx.t * 4.2) * 2.4 * k, y: y, r: r });
      }
      ctx.save();
      ctx.beginPath();
      pts.forEach(function (p) {
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, 6.3);
      });
      var mx = (pts[0].x + pts[N].x) / 2;
      var grad = ctx.createLinearGradient(mx - r0, 0, mx + r0, 0);
      grad.addColorStop(0, dr.liquid);
      grad.addColorStop(0.45, dr.liquid);
      grad.addColorStop(1, dr.liquidDeep);
      ctx.fillStyle = grad;
      ctx.fill("nonzero");
      ctx.clip("nonzero");
      // its far side in the turns' shadow, their grooves, and their light
      ctx.lineCap = "round";
      [
        [0.62, "rgba(120,80,20,.22)", r0 * 0.7],
        [-0.3, rgba(dr.head, 0.7), Math.max(1.3, r0 * 0.14)],
        [0.3, rgba(dr.head, 0.7), Math.max(1.3, r0 * 0.14)],
        [-0.6, "rgba(255,255,255,.6)", 2],
      ].forEach(function (s) {
        ctx.strokeStyle = s[1];
        ctx.lineWidth = s[2];
        ctx.beginPath();
        pts.forEach(function (p, i) {
          if (i) ctx.lineTo(p.x + s[0] * p.r, p.y);
          else ctx.moveTo(p.x + s[0] * p.r, p.y);
        });
        ctx.stroke();
      });
      ctx.restore();
      // a little bead left on the nozzle once it's snapped
      if (fx.tail > 0.35 && fx.tail < 0.9) {
        ctx.fillStyle = dr.liquid;
        ctx.beginPath();
        ctx.arc(g.cx, g.tip + 1.5, r0 * 0.3 * (1 - drop), 0, 6.3);
        ctx.fill();
      }
    }

    // The stream is as wide as the flow is strong: a surge is a visibly fatter pour.
    function drawStream(level) {
      if (dr.pourer === "machine") return drawRope(level);
      if (fx.head <= 0) return;
      var target = level > 0.01 ? yAt(level) + 3 : g.bottom;
      var y0 = lerp(g.tip, target, fx.tail);
      var y1 = lerp(g.tip, target, fx.head);
      if (y1 - y0 < 2) return;
      var fat = clamp(0.55 + 0.5 * fx.flow, 0.6, 1.5);
      var land = coil ? landing(level) - g.cx : 0; // a coil's rope lands where the turn is being laid
      var left = [];
      var right = [];
      for (var y = y0; ; y += 6) {
        if (y > y1) y = y1;
        var k = (y - g.tip) / Math.max(1, target - g.tip);
        var mid = g.cx + Math.sin(y * 0.045 + fx.t * 11) * 1.3 * k + (coil ? land * k * k : 0);
        var half = lerp(5.4, 3.4, k) * fat;
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
      grad.addColorStop(0, dr.stream || dr.liquid);
      grad.addColorStop(1, dr.stream || dr.liquidDeep);
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

    // Soft serve in coils (D-030). The rope lays a turn at a time where it lands, each turn a
    // little narrower than the one below (the glass is their envelope) and tilted into the next,
    // so it reads as one rope going round. The turn being laid rises as it goes round, so the top
    // of the stack is the level. Poured and topped, that turn becomes a curl whose tip is exactly
    // the scored height. Depends only on the level, shape, serve and whether it's topped.
    function coilCount() {
      return dr.coils || 5;
    }

    // Turn i of n: the top of its slot, half its width and its height.
    function coilAt(i, n) {
      var ch = (g.bottom - g.top) / n;
      var edge = xRange(g.outer, g.bottom - ch * (i + 0.5)) || [g.cx - 10, g.cx + 10];
      return { top: g.bottom - ch * (i + 1), hw: ((edge[1] - edge[0]) / 2) * lerp(1, 0.55, i / n), ch: ch };
    }

    // Where the rope lands while it pours: the end of the turn being laid.
    function landing(level) {
      var n = coilCount();
      var laid = clamp(level, 0, 1) * n;
      var i = Math.min(n - 1, Math.floor(laid));
      var c = coilAt(i, n);
      return g.cx - c.hw + 2 * c.hw * (laid - i);
    }

    // How long the serve has been topped, for the finish arriving in stages (D-030, look b).
    // The glass sliding off, and a calm screen, have it all at once.
    var since = 0;

    // One light for the whole stack, from the upper left, in canvas space (not per turn).
    function stackFill() {
      var c0 = coilAt(0, coilCount());
      var grad = ctx.createLinearGradient(g.cx - c0.hw, g.top, g.cx + c0.hw, g.bottom);
      grad.addColorStop(0, dr.liquid);
      grad.addColorStop(0.4, dr.liquid);
      grad.addColorStop(1, dr.liquidDeep);
      return grad;
    }

    function drawCoil(c, frac) {
      var h = c.ch * 1.12;
      var tilt = Math.atan2(c.ch * 0.42, 2 * c.hw);
      var mid = c.top + c.hw * Math.sin(tilt) + (h / 2) * Math.cos(tilt);
      ctx.save();
      if (frac < 1) {
        ctx.beginPath();
        ctx.rect(g.cx - c.hw - 6, mid - c.ch * 2, (2 * c.hw + 12) * frac, c.ch * 4);
        ctx.clip();
      }
      ctx.save();
      ctx.translate(g.cx, mid);
      ctx.rotate(-tilt);
      box(-c.hw, -h / 2, 2 * c.hw, h, h / 2);
      ctx.restore();
      ctx.fillStyle = stackFill();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.translate(g.cx, mid);
      ctx.rotate(-tilt);
      // the crease where it sits on the turn below: shade inside its own underside, no drop shadow
      var sh = ctx.createLinearGradient(0, h * 0.05, 0, h / 2);
      sh.addColorStop(0, "rgba(120,80,20,0)");
      sh.addColorStop(1, "rgba(120,80,20,.2)");
      ctx.fillStyle = sh;
      ctx.fillRect(-c.hw, 0, 2 * c.hw, h / 2);
      // the rope turns away round the back: its right end rolls into shadow, no cap
      var re = ctx.createLinearGradient(c.hw - h * 1.3, 0, c.hw, 0);
      re.addColorStop(0, "rgba(120,80,20,0)");
      re.addColorStop(0.65, "rgba(120,80,20,.12)");
      re.addColorStop(1, "rgba(120,80,20,.34)");
      ctx.fillStyle = re;
      ctx.fillRect(c.hw - h * 1.3, -h / 2, h * 1.3, h);
      // and a little light bounced up from below along its rim
      ctx.strokeStyle = "rgba(255,250,235,.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c.hw - h / 2, 0, h / 2 - 1.5, 0.15, 1.1);
      ctx.stroke();
      ctx.strokeStyle = rgba(dr.head, 0.7);
      ctx.lineWidth = Math.max(1.3, h * 0.05);
      [-0.15, 0.15].forEach(function (f) {
        ctx.beginPath();
        ctx.moveTo(-c.hw, f * h);
        ctx.quadraticCurveTo(0, f * h + h * 0.28, c.hw, f * h);
        ctx.stroke();
      });
      ctx.strokeStyle = "rgba(255,255,255,.6)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-c.hw * 0.7, -h * 0.3);
      ctx.quadraticCurveTo(-c.hw * 0.2, -h * 0.42, c.hw * 0.1, -h * 0.36);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    // The tip: the rope's own end, drawn like the turns, coming off the top turn's right-hand end
    // and curling up over the middle. grow (0..1) is how much of it has come out; whatever it is,
    // the whole tip is scaled so its highest point is exactly the scored height and its lowest is
    // foot, the bottom of what it replaces: stretched up when there's room, and where there isn't,
    // shrunk, less across than up, so it's a smaller, lower curl and not a dot (owner, 2026-10-23).
    function drawTip(foot, tip, hw, r0, grow) {
      var base = foot - r0 * 1.15;
      var peak = Math.min(tip, base - r0);
      var rEnd = r0 * 0.28;
      var p0 = [g.cx + hw * 0.8, base + r0 * 0.15];
      var p1 = [g.cx - hw * 1.05, base - (base - peak) * 0.2];
      var p2 = [g.cx + hw * 0.08, peak];
      var pts = [];
      var N = 40;
      for (var k = 0; k <= N; k++) {
        var t = (k / N) * grow;
        var u = 1 - t;
        pts.push({
          x: u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
          y: u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
          r: lerp(r0, rEnd, t),
        });
      }
      var last = pts[pts.length - 1];
      var top = Infinity;
      var bottom = -Infinity;
      pts.forEach(function (p) {
        top = Math.min(top, p.y - p.r);
        bottom = Math.max(bottom, p.y + p.r);
      });
      // from its foot, so its top is the tip, at every stage of growing
      var ky = bottom - top > 0.5 ? (foot - tip) / (bottom - top) : 1;
      var kx = Math.min(1, Math.sqrt(ky));
      var X = function (x) {
        return g.cx + (x - g.cx) * kx;
      };
      var Y = function (y) {
        return foot - (bottom - y) * ky;
      };
      ctx.save();
      ctx.beginPath();
      pts.forEach(function (p) {
        ctx.moveTo(X(p.x) + p.r * kx, Y(p.y));
        ctx.ellipse(X(p.x), Y(p.y), p.r * kx, p.r * ky, 0, 0, 6.3);
      });
      ctx.fillStyle = stackFill();
      ctx.fill("nonzero");
      ctx.clip("nonzero");
      // its underside's crease, its grooves and its light, as on the turns
      var sh = ctx.createLinearGradient(0, Y(base - r0 * 2), 0, foot);
      sh.addColorStop(0, "rgba(120,80,20,0)");
      sh.addColorStop(1, "rgba(120,80,20,.18)");
      ctx.fillStyle = sh;
      ctx.fillRect(g.cx - hw * 1.5, Y(base - r0 * 2), hw * 3, foot - Y(base - r0 * 2));
      // its foot, at the top turn's right-hand end, turns away into the same shadow
      var fx0 = X(p0[0] + r0 * 0.4);
      var fr = r0 * 1.6 * kx;
      var fe = ctx.createRadialGradient(fx0, Y(p0[1]), 0, fx0, Y(p0[1]), fr);
      fe.addColorStop(0, "rgba(120,80,20,.3)");
      fe.addColorStop(1, "rgba(120,80,20,0)");
      ctx.fillStyle = fe;
      ctx.fillRect(fx0 - fr, Y(p0[1]) - fr, fr * 2, fr * 2);
      ctx.lineCap = "round";
      [
        [-0.3, rgba(dr.head, 0.7), Math.max(1.3, r0 * 0.1)],
        [0.3, rgba(dr.head, 0.7), Math.max(1.3, r0 * 0.1)],
        [-0.62, "rgba(255,255,255,.6)", 2],
      ].forEach(function (s) {
        ctx.strokeStyle = s[1];
        ctx.lineWidth = s[2];
        ctx.beginPath();
        for (var i = 1; i < pts.length; i++) {
          var a = pts[i - 1];
          var b = pts[i];
          var dx = (b.x - a.x) * kx;
          var dy = (b.y - a.y) * ky;
          var len = Math.hypot(dx, dy) || 1;
          var nx = dy / len;
          var ny = -dx / len;
          var x = X(b.x) + nx * s[0] * b.r * kx;
          var y = Y(b.y) + ny * s[0] * b.r * ky;
          if (i === 1) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();
      return { x: X(last.x), y: Y(last.y), r: last.r * kx };
    }

    // How far one stage of the finish has got: it starts at from seconds and takes dur.
    function stage(from, dur) {
      return smooth(clamp((since - from) / dur, 0, 1));
    }

    // The turn being laid: it reaches down into the turn below as a settled turn does, so no seam
    // shows (D-030, fix a); its top is still the level, and at a whole turn it's a settled turn.
    function laying(level, c, rest) {
      return { top: yAt(level), hw: c.hw, ch: Math.max(3, c.ch * (rest + 0.12)) / 1.12 };
    }

    // The lowest point of a turn as drawCoil draws it: the bottom of its lower, left-hand end.
    function coilBottom(c) {
      var h = c.ch * 1.12;
      var tilt = Math.atan2(c.ch * 0.42, 2 * c.hw);
      return c.top + c.hw * Math.sin(tilt) + (h / 2) * Math.cos(tilt) + (c.hw - h / 2) * Math.sin(tilt) + h / 2;
    }

    function drawCoils(level, topped) {
      var n = coilCount();
      var laid = clamp(level, 0, 1) * n;
      var full = Math.min(n, Math.floor(laid));
      var rest = laid - full;
      for (var i = 0; i < full; i++) drawCoil(coilAt(i, n), 1);
      // served on a whole turn, it still gets its tip, a small one (Codex, round 1 of look b)
      if (full >= n || (rest < 0.001 && !topped)) return;
      var c = coilAt(full, n);
      var floor = g.bottom - c.ch * full; // the top of the turns already laid
      if (!topped) return drawCoil(laying(level, c, rest), rest);
      // Served, the tip takes the place of the turn being laid and ends where it ended, so nothing
      // below it moves (owner, 2026-10-23).
      var foot = coilBottom(laying(level, c, rest));
      var below = full > 0 ? coilAt(full - 1, n) : c;
      var hw = Math.min(c.hw, below.hw * 0.92);
      var t = dr.topping;
      // a stick goes in before the tip is drawn over its foot, so it's partly hidden
      if (t && t.kind === "stick") drawStick(floor, hw, stage(0.18, 0.22));
      drawTip(foot, yAt(level), hw, c.ch * 0.56, 0.65 + 0.35 * stage(0, 0.18));
      if (t && t.kind === "drizzle") drawSauce(floor, yAt(level), hw, n, full, since - 0.18);
      if (t && t.kind === "scatter") drawScatter(floor, yAt(level), hw, n, full, since - 0.18);
    }

    function drawStick(floor, hw, q) {
      var c = dr.topping.colours;
      var len = g.gw * 0.55;
      var w = Math.max(5, g.gw * 0.11);
      if (q <= 0) return;
      ctx.save();
      ctx.translate(g.cx + hw * 0.3, floor - hw * 0.05);
      ctx.rotate(0.42);
      ctx.translate(0, -(1 - q) * len * 0.9); // slides in along its own length
      ctx.globalAlpha = Math.min(1, q * 3);
      ctx.fillStyle = c[0];
      box(-w / 2, -len, w, len, 2);
      ctx.fill();
      ctx.strokeStyle = c[1] || "rgba(0,0,0,.25)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var k = 1; k < 4; k++) {
        ctx.moveTo(-w / 2 + (w * k) / 4, -len + 2);
        ctx.lineTo(-w / 2 + (w * k) / 4, -4);
      }
      ctx.stroke();
      ctx.restore();
    }

    // The top surface of the stack at x: the tip's hump, then the turns' tops on the way down.
    function surfaceY(x, floor, tip, hw, n, full) {
      var d = Math.abs(x - g.cx);
      if (d < hw * 0.7) return lerp(tip + 4, floor + 2, smooth(d / (hw * 0.7)));
      for (var j = full - 1; j >= 0; j--) {
        var c = coilAt(j, n);
        if (d < c.hw * 0.95) return c.top + 3 + (x > g.cx ? c.ch * 0.25 : 0);
      }
      return g.bottom;
    }

    // Sauce (D-030, sauce 1, then C3 on P2.0x): a thread of sauce falls onto the tip, wide and
    // rounded at its leading end and thin at its tail. Where it lands the end pools into a round
    // blob that swells as the thread feeds it; the thread necks, breaks, and its tail drops in.
    // The blob then levels off and spreads out into a glossy ribbon over the top (thick where it
    // landed, shaded top to bottom, thinning as it runs, sagging into the grooves between the
    // turns), and three short, fat drips gather, creep and stop, each a different length and let
    // go at a different moment. One glint travels along it once it has settled, and is over by
    // 700ms. Only the falling thread is ever above the tip; none of the rest rises above it, or
    // reaches past the bottom turn.
    function eOut(t) {
      return 1 - Math.pow(1 - clamp(t, 0, 1), 2.2);
    }
    function eIn(t) {
      t = clamp(t, 0, 1);
      return t * t;
    }

    function drawSauce(floor, tip, hw, n, full, s) {
      var col = dr.topping.colours[0];
      if (s <= 0) return;
      var T0 = 0.1; // the thread's leading end touches the tip
      var lw = Math.max(3, g.gw * 0.06);
      var lwd = lw * 0.85; // the drips' scale: small bulbs
      var room = coilAt(0, n).hw - lw; // the bulbs' edge stays inside the bottom turn
      var wide = Math.min(hw * 1.25, room);
      var on = function (x) {
        return surfaceY(x, floor, tip, hw, n, full);
      };
      // The cream's top edge, blurred: the turns' tops step down in a stair, and the sauce lies
      // along it as one smooth curve over a turn's edge, not a stair of its own.
      var bx = g.cx - wide - lw * 2;
      var raw = [];
      for (var i = 0; i * 2 <= 2 * wide + lw * 4; i++) raw.push(on(bx + i * 2));
      for (var pass = 0; pass < 3; pass++) {
        raw = raw.map(function (v, j) {
          var sum = 0;
          for (var d = -3; d <= 3; d++) sum += raw[Math.max(0, Math.min(raw.length - 1, j + d))];
          return sum / 7;
        });
      }
      // and never steeper than a gentle drape, so no end of it can run straight down
      var mid0 = Math.round((g.cx - bx) / 2);
      for (var q = mid0 + 1; q < raw.length; q++) raw[q] = clamp(raw[q], raw[q - 1] - 1.4, raw[q - 1] + 1.4);
      for (var q2 = mid0 - 1; q2 >= 0; q2--) raw[q2] = clamp(raw[q2], raw[q2 + 1] - 1.4, raw[q2 + 1] + 1.4);
      var lie = function (x) {
        var f = clamp((x - bx) / 2, 0, raw.length - 1.001);
        var k = Math.floor(f);
        return lerp(raw[k], raw[k + 1], f - k);
      };
      var x0 = g.cx - 0.12 * wide; // where it lands: off the middle, so it runs one way
      var a = s - T0; // seconds since contact
      ctx.save();
      if (a < 0) {
        sauceThread(x0, tip, lw, col, s, T0, a);
        ctx.restore();
        return;
      }
      var lag = 0.05; // the ribbon starts once the blob has begun to swell
      var frontL = function (t) {
        return lerp(x0, g.cx - wide * 0.92, eOut(t / 0.6));
      };
      var frontR = function (t) {
        return lerp(x0, g.cx + wide, eOut(t / 0.45));
      };
      var xL = frontL(Math.max(0, a - lag));
      var xR = frontR(Math.max(0, a - lag));
      var settle = smooth((a - 0.15) / 0.5); // the ribbon sinking into the grooves
      var period = g.gw * 0.2;
      var groove = function (x) {
        return 0.5 + 0.5 * Math.sin(((x - g.cx) / period) * 6.283 - 1.2);
      };
      sauceThread(x0, tip, lw, col, s, T0, a);
      // the drips: each lets go when the ribbon's front passes it, a bead gathering first
      var drips = [];
      [[-0.75, 0.235, 0.6, 0], [0.15, 0.22, 0.38, 0.12], [0.9, 0.235, 0.5, 0.06]].forEach(function (sp) {
        var x = g.cx + sp[0] * Math.min(hw * 1.15, room);
        var reach = -1;
        for (var t = 0; t <= 1.2; t += 0.01) {
          if (x >= frontL(t) && x <= frontR(t)) {
            reach = t + lag;
            break;
          }
        }
        if (reach < 0) return;
        var len = coilAt(0, n).ch * sp[2]; // short: well within a turn
        var start = reach + sp[3];
        var gather = 0.08;
        var dur = sp[1] * 0.85;
        var u = (a - start - gather) / dur;
        if (u <= 0) {
          var bead = smooth((a - start) / gather);
          if (bead > 0) sauceBead(x, lie(x) + lw * 0.4, lwd, col, bead);
          return;
        }
        var k = Math.min(u, 1);
        // slow in, speed up, ease as the bulb fills; a hair of overshoot, then rest
        var base = k < 1 ? Math.pow(k, 1.8) * (1 - k) + smooth(k) * k : 1;
        var settled = u > 1 ? (u - 1) * dur : 0;
        var over = Math.exp(-settled / 0.07) * Math.sin(settled * 38);
        var wob = Math.exp(-settled / 0.12) * Math.sin(settled * 30);
        var vel = k < 1 ? Math.sin(k * 3.14159) * 0.5 : 0;
        var sway = Math.sin(a * 11 + sp[0]) * 0.9 * (1 - k);
        drips.push(function () {
          drip(x + sway, lie(x) + lw * 0.4, len * (base + (u > 1 ? 0.06 * over : 0)), lwd, col, vel, wob);
        });
      });
      drips.forEach(function (draw) {
        draw();
      });
      // the ribbon: thick where it landed, thinning as it runs; sagging into the grooves
      if (xR - xL >= 2 * lw) {
        var mid = (xL + xR) / 2;
        var half = (xR - xL) / 2;
        // thickness at x: thick where it landed and mid-run, the same either side of a groove
        var thick = function (x) {
          var edge = 1 - Math.pow(Math.min(1, Math.abs(x - mid) / Math.max(1, half)), 3);
          var th = lw * (0.85 + 0.45 * edge) * (1 + 0.12 * Math.sin(x * 0.35));
          th *= 1 + 0.9 * Math.exp(-Math.pow((x - x0) / (lw * 2.2), 2)) * Math.exp(-a / 0.5);
          return th * (0.55 + 0.45 * smooth((a - lag) / 0.15));
        };
        // each end is a round cap of its own thickness; the body runs between them
        var rL = thick(xL) / 2;
        var rR = thick(xR) / 2;
        var top = [];
        var bot = [];
        var edgeAt = function (x) {
          var th = thick(x);
          var yt = Math.max(tip, lie(x) - th * 0.45 + lw * 0.5 * settle * groove(x));
          return [[x, yt], [x, yt + th]];
        };
        var x1 = Math.max(xL + rL, xR - rR);
        for (var x = xL + rL; x < x1 + 1; x += 2) {
          var e2 = edgeAt(Math.min(x, x1));
          top.push(e2[0]);
          bot.push(e2[1]);
        }
        // a cap rounds an end along the ribbon's own direction there, so it joins the edges
        // without a corner even where the ribbon is steep, dipping over a turn's edge
        var cap = function (i1, i0) {
          var c1 = [(top[i1][0] + bot[i1][0]) / 2, (top[i1][1] + bot[i1][1]) / 2];
          var c0 = top.length > 1 ? [(top[i0][0] + bot[i0][0]) / 2, (top[i0][1] + bot[i0][1]) / 2] : [c1[0] - 1, c1[1]];
          var tx = c1[0] - c0[0];
          var ty = c1[1] - c0[1];
          var tl = Math.hypot(tx, ty) || 1;
          var ux = (bot[i1][0] - top[i1][0]) / 2;
          var uy = (bot[i1][1] - top[i1][1]) / 2;
          var r = Math.hypot(ux, uy);
          var out = [];
          for (var ang = -75; ang <= 75; ang += 15) {
            var rad = (ang * Math.PI) / 180;
            out.push([c1[0] + ux * Math.sin(rad) + (tx / tl) * r * Math.cos(rad), c1[1] + uy * Math.sin(rad) + (ty / tl) * r * Math.cos(rad)]);
          }
          return out;
        };
        var capR = cap(top.length - 1, Math.max(0, top.length - 2));
        var capL = cap(0, Math.min(1, top.length - 1)).reverse();
        var outline = top.concat(capR, bot.slice().reverse(), capL);
        var trace = function (pts) {
          pts.forEach(function (p, i) {
            if (i) ctx.lineTo(p[0], p[1]);
            else ctx.moveTo(p[0], p[1]);
          });
        };
        var grad = ctx.createLinearGradient(0, tip - lw, 0, floor + lw * 2);
        grad.addColorStop(0, shade(col, 0.25));
        grad.addColorStop(0.5, col);
        grad.addColorStop(1, shade(col, -0.22));
        ctx.beginPath();
        trace(outline);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        // its underside a little darker where it sits on the cream, its top edge lit
        ctx.beginPath();
        trace(bot);
        ctx.lineWidth = Math.max(1, lw * 0.18);
        ctx.strokeStyle = shade(col, -0.28);
        ctx.stroke();
        ctx.beginPath();
        trace(top);
        ctx.lineWidth = Math.max(1, lw * 0.2);
        ctx.strokeStyle = shade(col, 0.4);
        ctx.stroke();
        sauceBlob(x0, tip, lw, col, a, xL, xR);
        // a gloss along the top, broken in two; it dims as one glint travels along it
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1.2, lw * 0.22);
        var dim = 0.65 - 0.3 * smooth(((a - 0.4) / 0.3) * 1.3);
        ctx.strokeStyle = "rgba(255,255,255," + dim * smooth((a - 0.05) / 0.2) + ")";
        [[0.12, 0.42], [0.5, 0.62]].forEach(function (seg) {
          var from = Math.floor(seg[0] * top.length);
          ctx.beginPath();
          for (var m = from; m < seg[1] * top.length; m++) {
            if (m === from) ctx.moveTo(top[m][0], top[m][1] + lw * 0.25);
            else ctx.lineTo(top[m][0], top[m][1] + lw * 0.25);
          }
          ctx.stroke();
        });
        var gp = (a - 0.3) / 0.4; // the glint: from 300ms to 700ms after contact
        if (gp > 0 && gp < 1) {
          var gc = lerp(0.05, 0.95, smooth(gp)) * (top.length - 1);
          var span = Math.max(3, top.length * 0.12);
          var m0 = Math.max(0, Math.floor(gc - span / 2));
          ctx.lineWidth = Math.max(1.6, lw * 0.3);
          ctx.strokeStyle = "rgba(255,255,255," + 0.95 * Math.sin(gp * 3.14159) + ")";
          ctx.beginPath();
          for (var m2 = m0; m2 < Math.min(top.length, gc + span / 2); m2++) {
            if (m2 === m0) ctx.moveTo(top[m2][0], top[m2][1] + lw * 0.3);
            else ctx.lineTo(top[m2][0], top[m2][1] + lw * 0.3);
          }
          ctx.stroke();
        }
      } else {
        sauceBlob(x0, tip, lw, col, a, xL, xR);
      }
      ctx.restore();
    }

    // A soft tapered thread: a round, wide leading end narrowing up to a thin tail, with curved
    // sides. neck (0 to 1) pinches it where it will break.
    function threadShape(x, hy, ty, R, neckAt, neck) {
      var len = hy - ty;
      if (len < 2) return;
      R = Math.min(R, len / 2);
      var N = 30;
      var left = [];
      var right = [];
      for (var i = 0; i <= N; i++) {
        var d = (i / N) * len;
        var w = d < R ? Math.sqrt(Math.max(0, R * R - (R - d) * (R - d))) : R * (0.2 + 0.8 * Math.exp(-(d - R) / (0.45 * len)));
        w *= Math.pow(Math.max(0, Math.min(1, (len - d) / (0.28 * len + 1e-3))), 0.7);
        if (neck > 0) w *= 1 - neck * Math.exp(-Math.pow((d - neckAt * len) / (0.09 * len + 1), 2));
        var y = hy - d;
        var sx = Math.sin(y * 0.09) * 0.5 * (d / len);
        left.push([x + sx - w, y]);
        right.push([x + sx + w, y]);
      }
      ctx.beginPath();
      left.forEach(function (p, i) {
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      });
      for (var k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k][0], right[k][1]);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      for (var m = 2; m < N * 0.6; m++) {
        var hx = left[m][0] + (right[m][0] - left[m][0]) * 0.3;
        if (m === 2) ctx.moveTo(hx, left[m][1]);
        else ctx.lineTo(hx, left[m][1]);
      }
      ctx.lineWidth = Math.max(1, R * 0.25);
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.stroke();
    }

    // The thread falling (s seconds in, a seconds since it touched): it reaches the tip, its end
    // sinks into the blob, it necks and breaks, and the two pieces are absorbed.
    function sauceThread(x0, tip, lw, col, s, T0, a) {
      var src = tip - g.gh * 0.3;
      var floorY = tip - lw * 0.2;
      var inY = tip + lw * 0.8;
      var R = lw * 0.45; // a fine thread
      var fall = function (t) {
        return lerp(src, floorY, eIn(t / T0));
      };
      var length = function (t) {
        return lerp(lw * 1.6, g.gh * 0.2, smooth(t / T0));
      };
      var head = function (aa) {
        return aa <= 0 ? fall(s) : lerp(floorY, inY, smooth(aa / 0.1));
      };
      var tail0 = floorY - length(T0);
      var tailAt = function (aa) {
        return tail0 + (floorY - tail0) * 0.25 * smooth(aa / 0.09);
      };
      var SPLIT = 0.09;
      ctx.fillStyle = col;
      if (a <= 0) {
        var h = fall(s);
        threadShape(x0, h, h - length(s), R, 0.45, 0);
      } else if (a < SPLIT) {
        threadShape(x0, head(a), tailAt(a), R * (1 - 0.15 * smooth(a / SPLIT)), 0.45, smooth((a - 0.02) / 0.07) * 0.97);
      } else {
        var b = a - SPLIT;
        var h12 = head(SPLIT);
        var t12 = tailAt(SPLIT);
        var pinch = h12 - 0.45 * (h12 - t12);
        var t1 = lerp(pinch, head(a) - lw * 0.2, smooth(b / 0.1));
        if (head(a) - t1 > 2) threadShape(x0, head(a), t1, R * 0.85, 0.5, 0);
        var h2 = lerp(pinch - lw * 0.1, inY, eIn(b / 0.13));
        var t2 = lerp(t12, inY - lw * 0.15, eIn(b / 0.16));
        if (h2 - t2 > 2 && b < 0.16) threadShape(x0, h2, t2, R * 0.7, 0.5, 0);
      }
    }

    // The blob the thread pools into: round and domed, swelling as it is fed, its top at the tip.
    // From 200ms after contact it levels off and spreads out to the ribbon's width, staying opaque
    // all the way, until it is the ribbon's own thickness and the ribbon is all there is.
    function sauceBlob(x0, tip, lw, col, a, xL, xR) {
      var t = smooth((a - 0.2) / 0.3);
      if (t >= 1) return;
      var rx0 = lw * (0.35 + 0.75 * smooth(a / 0.25)); // a small bead
      var rx = lerp(rx0, Math.max(rx0, (xR - xL) / 2), t);
      var cx = lerp(x0, (xL + xR) / 2, t);
      var yb = lerp(tip + lw * (0.25 + 0.65 * smooth(a / 0.22)), tip + lw * 0.45, t);
      var h = yb - tip; // its control points reach the tip, and the curve itself 1/4 short of it
      var depth = lerp(rx0 * 0.675, lw * 0.4, t);
      var gr = ctx.createLinearGradient(0, tip, 0, yb + depth);
      gr.addColorStop(0, shade(col, 0.28));
      gr.addColorStop(0.5, col);
      gr.addColorStop(1, shade(col, -0.2));
      ctx.beginPath();
      ctx.moveTo(cx - rx, yb);
      ctx.bezierCurveTo(cx - rx, yb - h, cx + rx, yb - h, cx + rx, yb);
      ctx.bezierCurveTo(cx + rx, yb + depth * 1.33, cx - rx, yb + depth * 1.33, cx - rx, yb);
      ctx.closePath();
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - rx * 0.35, yb - h * 0.4, rx * 0.2 * (1 - t), Math.max(0.8, h * 0.14) * (1 - t * 0.6), -0.2, 0, 6.3);
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.fill();
    }

    // A bead gathering under the ribbon before a drip lets go.
    function sauceBead(x, y0, lw, col, k) {
      var r = lw * 0.5 * k;
      ctx.beginPath();
      ctx.ellipse(x, y0 + r * 0.6, r, r * 0.85, 0, 0, 6.3);
      var lit = ctx.createLinearGradient(x - r, 0, x + r, 0);
      lit.addColorStop(0, shade(col, -0.2));
      lit.addColorStop(0.4, shade(col, 0.2));
      lit.addColorStop(1, col);
      ctx.fillStyle = lit;
      ctx.fill();
    }

    // A drip of sauce from y0: a fat neck ending in a round bulb, lit from the left. It stretches
    // while it moves (vel) and wobbles as it stops (wob).
    function drip(x, y0, len, lw, col, vel, wob) {
      if (len < 1) return;
      var top = lw * 0.42;
      var neck = lw * 0.2 * (1 - 0.35 * vel);
      var r = lw * 0.62 * (1 - 0.12 * vel);
      var ry = r * (1 + 0.35 * vel + 0.14 * wob);
      var rx = r * (1 - 0.1 * wob);
      var cy = y0 + len;
      var grad = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
      grad.addColorStop(0, shade(col, -0.2));
      grad.addColorStop(0.35, shade(col, 0.22));
      grad.addColorStop(0.6, col);
      grad.addColorStop(1, shade(col, -0.25));
      ctx.beginPath();
      ctx.moveTo(x - top, y0 - 2);
      ctx.bezierCurveTo(x - neck, y0 + len * 0.5, x - rx, cy - ry, x - rx, cy);
      ctx.ellipse(x, cy, rx, ry, 0, Math.PI, 0, true);
      ctx.bezierCurveTo(x + rx, cy - ry, x + neck, y0 + len * 0.5, x + top, y0 - 2);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.35, cy - ry * 0.15, rx * 0.2, ry * 0.38, -0.3, 0, 6.3);
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.fill();
    }

    // A scatter is shaken over the stack once the sparkle has gone (owner, spread A, 2026-10-26):
    // most on the tip, fewer on each of the two turns below, resting on the turns' faces.
    function drawScatter(floor, tip, hw, n, full, s) {
      var plan = [24, 14, 8]; // strands on the tip, then on each turn going down
      var cols = dr.topping.colours;
      s = s - 0.17; // after the sparkle burst
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2, g.gw * 0.025);
      var src = { x: g.cx, y: tip - g.gh * 0.28 }; // one shake, a turn above the tip
      var k = 0, total = plan.reduce(function (a, b) { return a + b; }, 0);
      for (var band = 0; band < plan.length; band++) {
        for (var i = 0; i < plan[band]; i++, k++) {
          var r1 = bumps[(k * 7) % bumps.length] / BUMP_MAX, r2 = bumps[(k * 13 + 5) % bumps.length] / BUMP_MAX;
          var x, y, slope;
          if (band === 0) {
            var f = ((k * 0.382) % 1) * 2 - 1;
            x = g.cx + f * hw * 0.6;
            y = Math.max(tip + 10, surfaceY(x, floor, tip, hw, n, full) + 3 + r1 * 6);
            slope = Math.atan2(y - (tip + 4), x - g.cx) * 0.6;
          } else {
            var j = full - band;
            if (j < 0) break;
            var c = coilAt(j, n);
            var f2 = (((i + 0.5) / plan[band] + r2 * 0.12 + band * 0.31) % 1) * 2 - 1;
            x = g.cx + f2 * c.hw * 0.85;
            var tilt = Math.atan2(c.ch * 0.42, 2 * c.hw);
            // the lit upper ledge of the turn, just above its seam with the turn below
            y = c.top + c.ch * (0.42 + 0.62 * r1) - (x - g.cx) * Math.tan(tilt);
            slope = -tilt;
          }
          var at = s - (k / total) * 0.25;
          var q = clamp(at / 0.22, 0, 1);
          if (q <= 0) continue;
          var e = 1 - (1 - q) * (1 - q);
          var px = lerp(src.x + (x - g.cx) * 0.15, x, e);
          var py = lerp(src.y, y, q * q);
          var a = slope + (r2 - 0.5) * 1.2; // along the slope, about 35 degrees either way
          ctx.globalAlpha = clamp(q / 0.3, 0, 1);
          ctx.strokeStyle = cols[k % cols.length];
          ctx.beginPath();
          ctx.moveTo(px - Math.cos(a) * 3, py - Math.sin(a) * 3);
          ctx.lineTo(px + Math.cos(a) * 3, py + Math.sin(a) * 3);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // What the serve is in: drawn, never filled with the drink, and in front of it.
    function drawVessel() {
      var v = dr.vessel;
      poly(g.vessel, 3);
      ctx.fillStyle = v.colour;
      ctx.fill();
      ctx.save();
      ctx.clip();
      if (v.grid) {
        // a criss-cross, pressed into it
        var step = Math.max(6, g.gw * 0.12);
        ctx.strokeStyle = rgba(v.edge || th.ink, 0.7);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var x = g.gx - g.gh * 2; x < g.gx + g.gw + g.gh * 2; x += step) {
          ctx.moveTo(x, g.gy);
          ctx.lineTo(x + g.gh * 2, g.gy + g.gh * 2);
          ctx.moveTo(x, g.gy);
          ctx.lineTo(x - g.gh * 2, g.gy + g.gh * 2);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.fillRect(g.gx + g.gw * 0.12, g.gy, g.gw * 0.07, g.gh * 2);
      ctx.fillStyle = "rgba(0,0,0,.14)";
      ctx.fillRect(g.gx + g.gw * 0.72, g.gy, g.gw * 0.3, g.gh * 2);
      ctx.restore();
      if (v.edge) {
        poly(g.vessel, 3);
        ctx.strokeStyle = v.edge;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // How the serve is finished once it's poured, at the top of what was poured.
    function drawTopping(level) {
      var t = dr.topping;
      var ys = yAt(level);
      var c = t.colours;
      ctx.save();
      if (t.kind === "stick") {
        // a bar pushed in at an angle beside the peak
        var len = g.gw * 0.55;
        var w = Math.max(5, g.gw * 0.11);
        ctx.translate(g.cx + g.gw * 0.1, ys + g.gw * 0.12);
        ctx.rotate(0.42);
        ctx.fillStyle = c[0];
        box(-w / 2, -len, w, len, 2);
        ctx.fill();
        ctx.strokeStyle = c[1] || "rgba(0,0,0,.25)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (var k = 1; k < 4; k++) {
          ctx.moveTo(-w / 2 + (w * k) / 4, -len + 2);
          ctx.lineTo(-w / 2 + (w * k) / 4, -4);
        }
        ctx.stroke();
      } else {
        poly(g.inner, 3);
        ctx.clip();
        var x0 = g.gx;
        var x;
        if (t.kind === "drizzle") {
          // sauce run over the peak, with drips down the sides
          ctx.strokeStyle = c[0];
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(3, g.gw * 0.06);
          ctx.beginPath();
          for (x = x0; x <= x0 + g.gw; x += 4) {
            var y = ys + 4 + Math.abs(x - g.cx) * 0.25 + Math.sin(x * 0.16) * 3;
            if (x === x0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          [-0.28, 0.05, 0.3].forEach(function (f, i) {
            var dx = g.cx + f * g.gw;
            var top = ys + 4 + Math.abs(dx - g.cx) * 0.25;
            ctx.beginPath();
            ctx.moveTo(dx, top);
            ctx.lineTo(dx, top + g.gh * (0.12 + 0.07 * i));
            ctx.stroke();
          });
        } else {
          // a scatter of little strands over the top
          ctx.lineCap = "round";
          ctx.lineWidth = Math.max(2, g.gw * 0.025);
          for (var n = 0; n < 26; n++) {
            var fx0 = bumps[n] / BUMP_MAX;
            var fy0 = bumps[(n * 7) % bumps.length] / BUMP_MAX;
            var sx = x0 + g.gw * ((n * 0.382) % 1);
            var sy = ys + 3 + fy0 * g.gh * 0.3;
            var a = fx0 * 6.3;
            ctx.strokeStyle = c[n % c.length];
            ctx.beginPath();
            ctx.moveTo(sx - Math.cos(a) * 3, sy - Math.sin(a) * 3);
            ctx.lineTo(sx + Math.cos(a) * 3, sy + Math.sin(a) * 3);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // One glass at a sideways offset. live: the one being poured (bubbles, churn, marks).
    // topped: poured and finished, so its topping goes on.
    function drawGlass(ox, level, line, live, pouring, topped) {
      var span = g.bottom - g.top;
      ctx.save();
      ctx.translate(ox, 0);

      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.beginPath();
      ctx.ellipse(g.cx, g.counterY + 7, g.gw * 0.46, 6, 0, 0, 6.3);
      ctx.fill();

      // With no glass round it, a soft silhouette of the finished serve stands up to the line,
      // under the coils, so the line doesn't float over an empty vessel (D-030, line look c).
      if (bare && line !== null && live) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(g.gx - 40, yAt(line), g.gw + 80, g.bottom - yAt(line) + 2);
        ctx.clip();
        poly(g.outer, 3);
        ctx.fillStyle = rgba(th.ink, 0.09);
        ctx.fill();
        ctx.restore();
      }
      if (coil) {
        since = live && !calm ? fx.since || 0 : 9;
        if (level > 0.004) drawCoils(level, topped);
      } else {
        poly(g.inner, 3);
        ctx.fillStyle = "rgba(255,255,255,.05)";
        ctx.fill();
      }

      ctx.save();
      poly(g.inner, 3);
      ctx.clip();
      if (level > 0.004 && !coil) {
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

        if (live && fizz) {
          ctx.fillStyle = rgba(dr.head, 0.55);
          bubbles.forEach(function (b) {
            if (b.y > bodyTop + 3) {
              ctx.beginPath();
              ctx.arc(b.x, b.y, b.r, 0, 6.3);
              ctx.fill();
            }
          });
          if (pouring && level > 0.03) {
            // churn where the stream lands, more of it the harder the tap runs
            for (var c = 0; c < Math.round(7 * fx.flow); c++) {
              ctx.beginPath();
              ctx.arc(g.cx + rand(-13, 13), bodyTop + rand(0, 26), rand(1.5, 4.5), 0, 6.3);
              ctx.fill();
            }
          }
        }

        // the head: its bumps all top out on the level, so what you see is what is scored
        if (headH > 1.2) {
          ctx.fillStyle = dr.head;
          ctx.beginPath();
          ctx.moveTo(x0, bodyTop + 1);
          for (x = x0; x <= x1; x += 6) ctx.lineTo(x, ys + wave(x) + 3);
          for (x = x1; x >= x0; x -= 6) ctx.lineTo(x, bodyTop + wave(x) * 0.5 + 1.5);
          ctx.closePath();
          ctx.fill();
          var n = 0;
          for (x = g.gx; fizz && x <= g.gx + g.gw; x += 9) {
            var r = Math.min(bumps[n++ % bumps.length], headH * 0.8 + 1.5);
            ctx.beginPath();
            ctx.arc(x, ys + wave(x) + r + (BUMP_MAX - r) * 0.22, r, 0, 6.3);
            ctx.fill();
          }
          var under = ctx.createLinearGradient(0, ys, 0, bodyTop + 2);
          under.addColorStop(0, "rgba(0,0,0,0)");
          under.addColorStop(1, "rgba(0,0,0,.1)");
          ctx.fillStyle = under;
          ctx.fillRect(x0, ys, x1 - x0, headH + 2);
        }
      }

      if (line !== null && !bare) drawLine(g.gx, g.gx + g.gw, yAt(line), live);

      // light on the glass
      var top = g.gy + g.gh * 0.07;
      var bot = g.gy + g.gh * 0.7;
      var a = xRange(g.inner, top);
      var b = xRange(g.inner, bot);
      if (a && b && !bare) {
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

      if (!bare) {
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
      }
      // the finish, then what it's served in, so a cup hides the sauce that runs into it
      if (!coil && topped && dr.topping && level > 0.004 && level < 1) drawTopping(level);
      if (g.vessel) drawVessel();

      if (line !== null) {
        var yy = yAt(line);
        var edge = xRange(g.outer, yy);
        // Soft serve's line is one width, drawn over the rope: the swirl's taper at
        // that height made it a stub on the tall serves (D-030, line look c).
        if (bare && edge) edge = [g.cx - g.gw * 0.45, g.cx + g.gw * 0.45];
        if (!edge) {
          ctx.restore();
          return;
        }
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
        if (bare) drawLine(edge[0] + 2, edge[1] - 2, yy, live);
        if (live && fx.measure) drawMeasure(edge[1] + 30);
      }
      ctx.restore();
    }

    // The line to pour to: dark under light, so it shows against the glass, the drink and a
    // pale head; it glows when a pour lands on it.
    function drawLine(x0, x1, y, live) {
      ctx.setLineDash([7, 6]);
      ctx.lineCap = "butt";
      ctx.strokeStyle = "rgba(0,0,0,.6)";
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
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

    // After a pour: a bracket from where the head stopped to the line. The miss, drawn.
    function drawMeasure(x) {
      var m = fx.measure;
      var a = smooth(m.t / 0.18);
      var yh = yAt(m.level);
      var yl = yAt(m.line);
      var win = m.verdict === "perfect" || m.verdict === "good";
      ctx.globalAlpha = a;
      ctx.strokeStyle = win ? th.accent : th.ink;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3.5;
      if (Math.abs(yh - yl) < 3.5) {
        // on the line: a tick
        ctx.beginPath();
        ctx.moveTo(x - 7, yl);
        ctx.lineTo(x - 2, yl + 6);
        ctx.lineTo(x + 8, yl - 7);
        ctx.stroke();
      } else {
        var end = lerp(yl, yh, a);
        ctx.beginPath();
        ctx.moveTo(x - 8, yl);
        ctx.lineTo(x, yl);
        ctx.lineTo(x, end);
        ctx.lineTo(x - 8, end);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Too much soft serve doesn't run down the sides: its top turn leans off to one side and
    // falls onto the counter.
    function drawTopple() {
      var k = smooth(fx.spill);
      var n = coilCount();
      var c = coilAt(n - 1, n);
      var x = g.cx + g.gw * (0.25 + 0.5 * k);
      var y = lerp(g.top - c.ch * 0.5, g.counterY - c.ch * 0.45, k * k); // where its middle goes
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.6 + 1.2 * k);
      ctx.translate(-g.cx, -(c.top + c.ch / 2));
      drawCoil({ top: c.top, hw: c.hw * 0.9, ch: c.ch * 0.9 }, 1);
      drawTip(c.top + c.ch * 0.2, c.top - c.ch * 0.8, c.hw * 0.6, c.ch * 0.5, 1);
      ctx.restore();
      // where it lands
      ctx.fillStyle = rgba(dr.liquidDeep, 0.9 * k);
      ctx.beginPath();
      ctx.ellipse(x, g.counterY + 4, Math.max(1, c.hw * k), 4, 0, 0, 6.3);
      ctx.fill();
    }

    function drawSpill() {
      if (fx.spill <= 0) return;
      if (coil) return drawTopple();
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
        var y = f.y - (1 - f.life) * f.size * 1.4;
        ctx.globalAlpha = Math.min(1, f.life * 2.4);
        ctx.font = "900 " + f.size + "px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.lineWidth = f.size * 0.18;
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

    // What a result sets off, once the beat of stillness after letting go is over.
    function celebrate(result) {
      var yl = yAt(result.line);
      fx.slosh = calm ? 0 : 3;
      fx.measure = { level: result.level, line: result.line, verdict: result.verdict, t: 0 };
      var size = clamp(g.gh * 0.13, 15, 34); // smaller on the title screen's little scene
      floats.push({ text: "+" + result.score, x: g.cx, y: Math.max(size * 2.4, yAt(result.level) - size * 0.8), size: size, life: 1 });
      fx.topped = result.verdict !== "spill";
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
    }

    return {
      layout: layout,
      reset: reset,
      press: function () {
        fx.head = 0;
        fx.tail = 0;
        fx.topped = false;
      },
      // What the next pour serves (E.serveOf): its glass, colours, vessel and topping.
      serve: function (d) {
        dr = d;
        if (g) fit(d);
      },
      // Everything holds still for a moment, then the result lands.
      result: function (result) {
        if (!g) return;
        fx.pending = result;
        fx.freeze = calm ? 0.001 : 0.1;
        fx.wave = 0;
      },
      // The finished glass slides off along the counter as an empty one slides in.
      // It slides off as it was served, whatever the next round serves.
      nextRound: function (level) {
        fx.ghost = calm ? null : { level: level, g: g && Object.assign({}, g), dr: dr, topped: fx.topped };
        fx.topped = false;
        fx.slide = calm ? 0 : 1;
        fx.spilling = false;
        fx.spill = 0;
        fx.glow = 0;
        fx.head = 0;
        fx.measure = null;
        fx.pending = null;
        fx.freeze = 0;
        bubbles = [];
        parts = [];
        floats = [];
      },
      frame: function (dt, s) {
        if (!g) layout();
        if (!g) return;
        if (fx.freeze > 0) {
          fx.freeze -= dt;
          dt = 0;
          if (fx.freeze <= 0 && fx.pending) {
            celebrate(fx.pending);
            fx.pending = null;
          }
        }
        fx.t += dt;
        fx.since = fx.topped ? (fx.since || 0) + dt : 0;
        fx.wave = toward(fx.wave, s.pouring ? (calm ? 0.5 : 1.6) : 0, dt * 9);
        fx.flow = toward(fx.flow, s.pouring ? s.flow : 1, dt * 16);
        fx.slosh *= Math.exp(-dt * 5);
        fx.handle = toward(fx.handle, s.pouring ? 1 : 0, dt * 10);
        fx.glow = Math.max(0, fx.glow - dt / 0.9);
        fx.shake = Math.max(0, fx.shake - dt / 0.4);
        if (fx.measure) fx.measure.t += dt;
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
        if (fizz && s.level > 0.06 && bubbles.length < 20 && Math.random() < dt * 16) {
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

        if (!inFront) drawPourer(s.level);
        var e = smooth(1 - fx.slide);
        if (fx.slide > 0 && fx.ghost) {
          var now = [g, dr];
          if (fx.ghost.g) g = fx.ghost.g;
          dr = fx.ghost.dr;
          drawGlass(e * W * 0.95, fx.ghost.level, null, false, false, fx.ghost.topped);
          g = now[0];
          dr = now[1];
        } else fx.ghost = null;
        var ox = fx.slide > 0 ? -(1 - e) * W * 0.95 : 0;
        if (ox === 0) drawStream(s.level);
        if (inFront) drawPourer(s.level);
        drawGlass(ox, s.level, s.line, true, s.pouring, fx.topped);
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
    ["venue", "playVenue", "doneVenue", "claimVenue"].forEach(function (id) {
      $(id).textContent = skin.venue;
    });
    $("tagline").textContent = skin.tagline;
    $("offer").textContent = skin.copy.offer;
    $("fictional").textContent = skin.fictional;
    $("start").textContent = skin.copy.start;
    $("again").textContent = skin.copy.again;
    $("totalLabel").textContent = skin.copy.total + " ";
    $("boardTitle").textContent = skin.copy.boardTitle;
    $("prize").textContent = skin.copy.prize;
    $("outOf").textContent = "/ " + skin.rounds.length * 100;
    var top = E.topScore(skin);
    $("beat").textContent = top > 0 ? skin.copy.beat.replace("{score}", String(top)) : "";
    $("claimPrize").textContent = skin.copy.claim;
    if (skin.emblem) {
      ["emblem", "playEmblem", "doneEmblem", "claimEmblem"].forEach(function (id) {
        var svg = $(id);
        svg.setAttribute("viewBox", "0 0 " + skin.emblem.width + " " + skin.emblem.height);
        svg.firstElementChild.setAttribute("d", skin.emblem.path);
        if (skin.emblem.rule) svg.firstElementChild.setAttribute("fill-rule", skin.emblem.rule);
        svg.removeAttribute("hidden");
      });
    }
    document.documentElement.classList.add("ready");
  }

  // Links to the same game in its other skins, each labelled by the skin it leads to.
  function offerOthers(current) {
    (window.POUR_SKINS || []).forEach(function (id) {
      if (id === current.id || !/^[a-z0-9-]+$/.test(id)) return;
      loadSkin(id).then(function (other) {
        ["othersTitle", "othersDone"].forEach(function (where) {
          var a = document.createElement("a");
          a.className = "other";
          a.href = "?skin=" + id + (guest ? "&name=" + encodeURIComponent(guest) : "");
          a.textContent = other.switchLabel;
          $(where).appendChild(a);
        });
      }, function () {});
    });
  }

  function start(skin) {
    var game = E.createGame(skin);
    var sound = makeSound();
    var scene = makeScene($("scene"), skin);
    var pourBtn = $("pour");
    var againBtn = $("again");
    var startBtn = $("start");
    var muteBtn = $("mute");
    var holder = null; // what is holding the pour: a pointer's id, or "key:" and the key; null when nothing is
    var waiting = []; // what fell due while the page was hidden, run when it is back
    var running = false;
    var last = 0;
    var shown = 0; // the score the HUD is showing, on its way to the real one
    var best = null; // this visit's best score: a variable, gone when the page is
    var turn = 0; // goes up whenever the screen changes, so a late timer does nothing

    dress(skin);
    offerOthers(skin);
    startBtn.hidden = false;
    muteBtn.hidden = false;

    // Nothing moves on while the page is hidden: what falls due then waits for the player.
    function later(ms, fn) {
      var mine = turn;
      var run = function () {
        if (mine === turn) fn();
      };
      setTimeout(function () {
        if (document.hidden) waiting.push(run);
        else run();
      }, ms);
    }

    function screen(id) {
      turn++;
      ["title", "play", "done", "claim"].forEach(function (name) {
        $(name).hidden = name !== id;
      });
    }

    // The line under the scene keeps the tallest it has been at this width: a result shorter
    // than the hint would grow the stage, and the refit would move the serve as it finishes.
    var sayRoom = { width: 0, height: 0 };
    function say(strong, rest, verdict) {
      var el = $("say");
      el.textContent = "";
      el.className = "say" + (verdict ? " result" : "") + (verdict === "perfect" || verdict === "good" ? " win" : "");
      if (strong) {
        var b = document.createElement("strong");
        b.textContent = strong;
        el.appendChild(b);
      }
      var s = document.createElement("span");
      s.textContent = rest;
      el.appendChild(s);
      var box = el.getBoundingClientRect();
      if (box.width !== sayRoom.width) {
        sayRoom.width = box.width;
        sayRoom.height = 0;
        el.style.minHeight = "";
        box = el.getBoundingClientRect();
      }
      if (box.height > sayRoom.height) {
        sayRoom.height = box.height;
        el.style.minHeight = box.height + "px";
      }
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

    // One pill per round: its score once poured, an outline while it is the one to play.
    function pills(list, current) {
      list.textContent = "";
      for (var i = 0; i < game.total; i++) {
        var li = document.createElement("li");
        var r = game.results[i];
        if (r) {
          li.textContent = String(r.score);
          li.className = r.verdict === "perfect" ? "got best" : "got";
        } else if (i === current) {
          li.className = "now";
        }
        list.appendChild(li);
      }
    }

    // A round that serves something of its own says what, over the hint.
    function beginRound() {
      var serve = skin.rounds[game.round].serve;
      scene.serve(E.serveOf(skin, game.round));
      $("round").textContent = E.roundLabel(skin, game.round);
      pills($("pips"), game.round);
      say(serve && serve.name ? serve.name : "", skin.copy.hint);
      pourBtn.textContent = skin.copy.hold;
      pourBtn.classList.remove("down", "wait");
    }

    function result() {
      var r = game.results[game.results.length - 1];
      sound.stopPour();
      sound.verdict(r.verdict);
      buzz(r.verdict);
      scene.result(r);
      say(skin.copy[r.verdict], "+" + r.score, r.verdict);
      pills($("pips"), -1);
      count($("points"), shown, game.score, 450);
      shown = game.score;
      pourBtn.textContent = skin.copy.hold;
      pourBtn.classList.remove("down");
      pourBtn.classList.add("wait");
      // No button between rounds: the result holds for a beat, then the game moves on.
      var topped = E.serveOf(skin, game.round).topping;
      later(r.verdict === "spill" ? HOLD_SPILL : HOLD + (topped ? HOLD_TOPPED : 0), function () {
        var level = game.level;
        game.next();
        if (game.phase === "done") results();
        else {
          scene.nextRound(level);
          beginRound();
        }
      });
    }

    function falseStart() {
      sound.stopPour();
      sound.nudge();
      say("", skin.copy.falseStart);
      pourBtn.textContent = skin.copy.hold;
      pourBtn.classList.remove("down");
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
      pills($("chips"), -1);

      // What to play again for: the next name up the board, and this visit's own best.
      var rival = E.nextRival(skin, game.score);
      $("goal").textContent = rival
        ? (rival.top ? skin.copy.rivalTop : skin.copy.rival).replace("{gap}", String(rival.gap)).replace("{name}", rival.name)
        : skin.copy.top;
      if (best === null) $("mine").textContent = "";
      else if (game.score > best) {
        $("mine").textContent = skin.copy.newBest;
        sound.best();
      } else $("mine").textContent = skin.copy.best.replace("{score}", String(best));
      best = best === null ? game.score : Math.max(best, game.score);

      // The top three, then the player and whoever is just ahead of them.
      var rows = E.board(skin, game.score);
      var me = rows.findIndex(function (row) {
        return row.you;
      });
      var list = $("board");
      var shownRows = 0;
      var prev = -1;
      list.textContent = "";
      rows.forEach(function (row, n) {
        if (n > 2 && n !== me && n !== me - 1) return;
        var li;
        if (n > prev + 1) {
          li = document.createElement("li");
          li.className = "gap";
          li.textContent = "⋮";
          li.setAttribute("aria-hidden", "true");
          list.appendChild(li);
        }
        prev = n;
        li = document.createElement("li");
        [["rank", n + 1 + "."], ["name", row.name], ["pts", String(row.score)]].forEach(function (cell) {
          var span = document.createElement("span");
          span.className = cell[0];
          span.textContent = cell[1];
          li.appendChild(span);
        });
        if (row.you) li.className = "you";
        li.style.animationDelay = 0.5 + shownRows++ * 0.06 + "s";
        list.appendChild(li);
      });
      $("doneBody").scrollTop = 0;
      againBtn.focus({ preventScroll: true });
    }

    function loop(now) {
      if (!running) return;
      var dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      var pouring = game.phase === "pouring";
      var flow = pouring ? E.flowAt(skin, game.round, game.held) : 1;
      if (pouring) {
        game.tick(dt);
        sound.setPour(game.level, flow);
        if (game.phase === "poured") result();
      }
      scene.frame(dt, {
        level: game.level,
        line: skin.rounds[game.round].line,
        pouring: game.phase === "pouring",
        flow: flow,
      });
      requestAnimationFrame(loop);
    }

    function play() {
      demoOn = false;
      screen("play");
      shown = 0;
      $("points").textContent = "0";
      scene.reset();
      scene.layout();
      beginRound();
      pourBtn.focus({ preventScroll: true });
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }

    // One thing holds the pour at a time, and only that thing can end it: a second
    // finger, a brushing palm or a stray key changes nothing.
    function press(by) {
      if (holder !== null) return;
      holder = by;
      if (game.phase !== "ready") return;
      game.press();
      scene.press();
      sound.startPour();
      last = performance.now();
      pourBtn.classList.add("down");
      pourBtn.textContent = skin.copy.release;
    }

    // by: what let go. Left out when the page itself takes the pour away (hidden, blurred).
    function release(by) {
      if (holder === null || (by !== undefined && by !== holder)) return;
      holder = null;
      if (game.phase !== "pouring") return;
      // Pour right up to the moment of letting go, not just to the last frame drawn.
      var now = performance.now();
      game.tick((now - last) / 1000);
      last = now;
      if (game.phase === "poured") result();
      else if (game.release() === "falseStart") falseStart();
      else result();
    }

    pourBtn.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      e.preventDefault();
      try {
        pourBtn.setPointerCapture(e.pointerId);
      } catch (err) {
        /* an old browser without pointer capture still gets pointerup on the window */
      }
      press(e.pointerId);
    });
    ["pointerup", "pointercancel"].forEach(function (type) {
      window.addEventListener(type, function (e) {
        release(e.pointerId);
      });
    });
    pourBtn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    pourBtn.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        press("key:" + e.key);
      }
    });
    window.addEventListener("keyup", function (e) {
      if (e.key === " " || e.key === "Enter") release("key:" + e.key);
    });
    // Leaving the page mid-pour ends the pour where it is, silently, and the game then
    // waits: no sound and no moving on until the player is looking again.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        sound.sleep();
        release();
      } else {
        sound.wake();
        last = performance.now();
        var due = waiting;
        waiting = [];
        due.forEach(function (run) {
          run();
        });
      }
    });
    window.addEventListener("blur", function () {
      release();
    });

    startBtn.addEventListener("click", function () {
      sound.unlock();
      sound.click();
      play();
    });
    againBtn.addEventListener("click", function () {
      sound.click();
      game.reset();
      play();
    });
    muteBtn.addEventListener("click", function () {
      muteBtn.setAttribute("aria-pressed", String(sound.toggle()));
    });

    // ---- an example of what a winner shows the staff. A moving clock doesn't stop a screen
    // recording, so it claims nothing; a live game gives the real winner a one-off code (P2.0b).

    var markBtn = $("claimMark");
    var markText = markBtn.textContent;

    function clockTime() {
      return new Date().toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    function tickClock() {
      $("claimClock").textContent = clockTime();
      later(500, tickClock);
    }
    $("claimOpen").addEventListener("click", function () {
      sound.click();
      screen("claim");
      markBtn.textContent = markText;
      markBtn.disabled = false;
      tickClock();
      markBtn.focus({ preventScroll: true });
    });
    markBtn.addEventListener("click", function () {
      sound.verdict("good");
      markBtn.textContent = "Handed over · " + clockTime();
      markBtn.disabled = true;
    });
    $("claimBack").addEventListener("click", function () {
      sound.click();
      screen("done");
      againBtn.focus({ preventScroll: true });
    });

    // ---- the title screen plays itself: one silent pour to the line, over and over

    var demo = E.createGame(skin);
    var attract = makeScene($("attract"), skin);
    attract.serve(E.serveOf(skin, 0));
    var demoOn = true;
    var demoWait = 0.7;
    var demoLast = performance.now();
    var demoLine = skin.rounds[0].line;

    function demoLoop(now) {
      if (!demoOn) return;
      var dt = clamp((now - demoLast) / 1000, 0, 0.05);
      demoLast = now;
      var flow = 1;
      if (calm) {
        // no motion wanted: show the finished pour, still
        attract.frame(0, { level: demoLine, line: demoLine, pouring: false, flow: 1 });
        return;
      }
      if (demo.phase === "ready") {
        demoWait -= dt;
        if (demoWait <= 0) {
          demo.press();
          attract.press();
        }
      } else if (demo.phase === "pouring") {
        flow = E.flowAt(skin, 0, demo.held);
        demo.tick(dt);
        if (demo.phase === "pouring" && demo.level >= demoLine - 0.004) demo.release();
        if (demo.phase === "poured") {
          attract.result(demo.results[0]);
          demoWait = 1.9;
        }
      } else {
        demoWait -= dt;
        if (demoWait <= 0) {
          var level = demo.level;
          demo.reset();
          attract.nextRound(level);
          demoWait = 0.9;
        }
      }
      attract.frame(dt, { level: demo.level, line: demoLine, pouring: demo.phase === "pouring", flow: flow });
      requestAnimationFrame(demoLoop);
    }
    requestAnimationFrame(demoLoop);

    function relayout() {
      scene.layout();
      attract.layout();
      if (calm && demoOn) requestAnimationFrame(demoLoop);
    }
    window.addEventListener("resize", relayout);
    if (window.ResizeObserver) {
      var watch = new ResizeObserver(relayout);
      watch.observe($("stage"));
      watch.observe($("attract").parentNode);
    }
  }
})();
