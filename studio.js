// The studio pages' bits of play (D-019). A few small things, each drawn from the games
// rather than laid over them, and all of it optional: the pages read and work without it.
//   1. A floating Play button that takes you straight into something playable.
//   2. The page wears the colour of the game you're looking at.
//   3. The dot in the wordmark is a ball. Flick it, and a paddle turns up to keep it in the air,
//      and the o's of "doo" watch it while it's out (D-041).
//   4. On a computer, the homepage's demo opens over the page in a sheet (D-041).
//   5. The footer's line about cookies is a biscuit you can dunk in tea or bite (D-043).
// Nothing is stored, and nothing is fetched.
(function () {
  "use strict";

  var FRAME = "#141312"; // body.studio's --bg0
  var body = document.body;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var theme = document.querySelector('meta[name="theme-color"]');

  // "#rgb" or "#rrggbb" to [r, g, b]; null for anything else.
  function rgb(hex) {
    var h = String(hex || "").trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [0, 2, 4].map(function (i) {
      return parseInt(h.slice(i, i + 2), 16);
    });
  }
  // A colour laid over the frame. A deep colour needs more of itself to show than a
  // bright one does, or a dark green card would leave the page looking unchanged.
  function wash(hex) {
    var a = rgb(hex);
    var b = rgb(FRAME);
    if (!a) return FRAME;
    var bright = (a[0] * 299 + a[1] * 587 + a[2] * 114) / 255000;
    var share = bright < 0.35 ? 0.36 : 0.17;
    return "#" + a.map(function (v, i) {
      return Math.round(v * share + b[i] * (1 - share)).toString(16).padStart(2, "0");
    }).join("");
  }
  function prop(el, name) {
    return getComputedStyle(el).getPropertyValue(name).trim();
  }
  // A game card's own colour: the bright one for dark-art cards, the block colour otherwise.
  function colourOf(el) {
    if (el.dataset.tint) return el.dataset.tint;
    return el.classList.contains("glow") ? prop(el, "--g") : prop(el, "--c");
  }
  function all(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  var tinted = all(".work, [data-tint]");

  // ---------------------------------------------------------------- 1. the Play button

  // Anything playable in a browser is marked in the page: <a data-play="What the button says">.
  var plays = all("a[data-play]").map(function (a) {
    var card = a.closest(".work, [data-tint]");
    var glow = card && card.classList.contains("glow");
    return {
      card: card,
      says: a.dataset.play,
      href: a.getAttribute("href"),
      away: a.target === "_blank",
      back: a.dataset.playBack || (card ? (glow ? prop(card, "--g") : prop(card, "--c")) : "#f4f1ea"),
      ink: a.dataset.playInk || (card && !glow ? prop(card, "--t") : FRAME),
    };
  });
  var fab = document.getElementById("playFab");

  function show(play) {
    if (!fab || !play) return;
    fab.href = play.href;
    if (play.away) {
      fab.target = "_blank";
      fab.rel = "noopener";
    } else {
      fab.removeAttribute("target");
      fab.removeAttribute("rel");
    }
    fab.style.background = play.back;
    fab.style.color = play.ink;
    fab.querySelector("span").textContent = play.says;
    fab.hidden = false;
  }
  // When the game in view can be played here and now, the button offers that one.
  function offer(card) {
    for (var i = 0; i < plays.length; i++) {
      if (plays[i].card === card) return show(plays[i]);
    }
  }
  if (plays.length) show(plays[Math.floor(Math.random() * plays.length)]);
  // A page with one thing to play already has a button for it: the floating one waits
  // until that button has scrolled out of sight.
  if (fab && plays.length === 1 && "IntersectionObserver" in window) {
    new IntersectionObserver(function (seen) {
      fab.hidden = seen[seen.length - 1].isIntersecting;
    }).observe(document.querySelector("a[data-play]"));
  }

  // The footer's "Ask the site a question" opens the same chat as the dock's button.
  var ask = document.getElementById("chatFab");
  all("[data-open-chat]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (ask) ask.click();
    });
  });

  // ---------------------------------------------------------------- 2. the page's tint

  var wearing = null;

  function wear(el) {
    if (el === wearing) return;
    wearing = el;
    var colour = el ? wash(colourOf(el)) : FRAME;
    body.style.setProperty("--bg0", colour);
    if (theme) theme.setAttribute("content", colour);
    if (el) offer(el);
  }

  if (tinted.length) {
    if (mouse) {
      // with a mouse: whatever the pointer is over
      tinted.forEach(function (el) {
        el.addEventListener("pointerenter", function () {
          wear(el);
        });
        el.addEventListener("focusin", function () {
          wear(el);
        });
      });
      document.querySelector("main").addEventListener("pointerleave", function () {
        wear(null);
      });
    } else {
      // on a phone: whatever sits across the middle of the screen
      var due = null;
      var look = function () {
        due = null;
        var y = window.innerHeight * 0.45;
        var found = null;
        for (var i = 0; i < tinted.length && !found; i++) {
          var r = tinted[i].getBoundingClientRect();
          if (r.top <= y && r.bottom >= y) found = tinted[i];
        }
        wear(found);
      };
      // a short timer, not an animation frame: the tint should follow even when the
      // browser is too busy scrolling to draw
      window.addEventListener("scroll", function () {
        if (due === null) due = setTimeout(look, 60);
      }, { passive: true });
      look();
    }
  }

  // ---------------------------------------------------------------- 3. the dot is a ball

  var dot = document.querySelector("header .wm-dot");
  var doo = document.querySelector("header .wm-doo");
  var nav = document.querySelector("header .nav");
  var brand = document.querySelector("header .brand");
  var colours = tinted.map(colourOf).filter(rgb);
  if (!colours.length) colours = ["#f5b544", "#4be08a", "#e8562a", "#00b3b3"];
  var pick = function () {
    return colours[Math.floor(Math.random() * colours.length)];
  };
  var audio = null;
  var ball = null;
  var rally = null; // the paddle and its count, while the ball is out
  var GRAVITY = 1900;
  var KEEP_UPS = 6;
  var eyes = [];

  function blip(speed) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = audio || new AC();
      var t = audio.currentTime;
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.frequency.setValueAtTime(420 + Math.min(speed, 1400) * 0.5, t);
      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (err) {
      /* no sound is fine */
    }
  }

  if (dot && nav && brand) {
    dot.classList.add("toy");
    // The dot sits inside the home link, so the thing you press is a button of its own,
    // laid over the dot: reachable by keyboard, named for a screen reader, and big
    // enough for a thumb. The link still goes home.
    var toy = document.createElement("button");
    toy.type = "button";
    toy.className = "wmToy";
    toy.setAttribute("aria-label", "Flick the dot");
    brand.insertAdjacentElement("afterend", toy);
    var place = function () {
      var d = dot.getBoundingClientRect();
      var n = nav.getBoundingClientRect();
      toy.style.left = d.left + d.width / 2 - n.left - 15 + "px";
      toy.style.top = d.top + d.height / 2 - n.top - 15 + "px";
    };
    place();
    window.addEventListener("resize", place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    toy.addEventListener("click", flick);
    // The o's of "doo" are eyes (D-041): a pupil in each, seen only while the ball is out.
    // The home link's own label names it, so a screen reader still hears "ai.doo home".
    if (doo && doo.textContent === "doo" && !calm) {
      doo.textContent = "d";
      for (var i = 0; i < 2; i++) {
        var o = document.createElement("span");
        o.className = "wmEye";
        o.textContent = "o";
        var pupil = document.createElement("span");
        pupil.className = "wmPupil";
        o.appendChild(pupil);
        doo.appendChild(o);
        eyes.push({ o: o, pupil: pupil });
      }
    }
  }

  // Each pupil slides towards the ball, a little further the further away it is.
  function watch() {
    var bx = ball.x + ball.size / 2;
    var by = ball.y + ball.size / 2;
    eyes.forEach(function (eye) {
      var r = eye.o.getBoundingClientRect();
      var dx = bx - (r.left + r.width / 2);
      var dy = by - (r.top + r.height * 0.57);
      var far = Math.sqrt(dx * dx + dy * dy) || 1;
      var reach = 0.11 * Math.min(1, far / 60); // in em: about 3px at 24px, inside the eye's 0.26em
      eye.pupil.style.transform = "translate(" + ((dx / far) * reach).toFixed(3) + "em," + ((dy / far) * reach).toFixed(3) + "em)";
    });
  }
  // Home: both o's blink once, and the eyes drain back to letters while they're shut.
  function blink() {
    if (!eyes.length) return;
    doo.classList.add("blink");
    setTimeout(function () {
      body.classList.remove("watching");
    }, 100);
    setTimeout(function () {
      doo.classList.remove("blink");
    }, 200);
  }

  function flick() {
    dot.classList.add("flicked"); // it has been found: no more asking
    if (calm) return; // no motion wanted: the mark stays as it is
    if (ball) return kick();
    var home = dot.getBoundingClientRect();
    var size = Math.max(14, home.width * 2);
    var el = document.createElement("span");
    el.className = "wmBall";
    el.style.width = el.style.height = size + "px";
    body.appendChild(el);
    dot.style.visibility = "hidden";
    if (eyes.length) body.classList.add("watching");
    ball = { el: el, size: size, x: home.left, y: home.top, vx: 0, vy: 0, life: 0, last: performance.now() };
    el.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      kick();
    });
    serve();
    kick();
    requestAnimationFrame(roll);
  }

  // The paddle (D-021). Until it first touches the ball, the bottom of the screen is a
  // floor and the ball bounces about as it always did. From the first hit the paddle is
  // the floor: keep the ball up six times and it goes home by itself; miss, and it drops
  // out of the bottom and falls back into the wordmark.
  function serve() {
    var wide = document.documentElement.clientWidth;
    var el = document.createElement("span");
    el.className = "wmPaddle";
    el.dataset.n = mouse ? "keep it up" : "drag to keep it up";
    var court = document.createElement("span");
    court.className = "wmCourt";
    body.appendChild(court);
    body.appendChild(el);
    body.classList.add("rally"); // the dock steps aside
    if (fab) fab.classList.remove("cheer");
    rally = { el: el, court: court, w: Math.max(84, Math.min(132, wide * 0.24)), x: 0, hits: 0 };
    el.style.width = rally.w + "px";
    steer((wide - rally.w) / 2);
    window.addEventListener("pointerdown", follow);
    window.addEventListener("pointermove", follow);
    window.addEventListener("keydown", nudge);
  }
  // The sixth keep-up throws six sparks off the paddle, one for each, in the games' colours.
  function burst() {
    var x = rally.x + rally.w / 2;
    var y = paddleTop();
    for (var i = 0; i < KEEP_UPS; i++) {
      var spark = document.createElement("span");
      var turn = Math.PI * (1.12 + (0.76 * i) / (KEEP_UPS - 1)); // fanned upwards, left to right
      var far = 70 + Math.random() * 50;
      var size = 8 + Math.random() * 5;
      spark.className = "wmSpark";
      spark.style.left = x + "px";
      spark.style.top = y + "px";
      spark.style.width = spark.style.height = size.toFixed(1) + "px";
      spark.style.background = colours[i % colours.length];
      spark.style.setProperty("--dx", (Math.cos(turn) * far).toFixed(1) + "px");
      spark.style.setProperty("--dy", (Math.sin(turn) * far).toFixed(1) + "px");
      body.appendChild(spark);
      setTimeout(spark.remove.bind(spark), 760);
    }
  }
  // A thumb covers what it drags, so on a phone the paddle rides above it.
  function paddleTop() {
    return window.innerHeight - (mouse ? 28 : 92) - 14;
  }
  function steer(x) {
    rally.x = Math.max(0, Math.min(document.documentElement.clientWidth - rally.w, x));
    rally.el.style.transform = "translate(" + rally.x + "px," + paddleTop() + "px)";
  }
  // A mouse or a finger steers from anywhere. What a finger needs is for the page not to
  // scroll under it: the court (the bottom half of the screen, then all of it once the
  // paddle has hit the ball) sees to that.
  function follow(ev) {
    if (rally) steer(ev.clientX - rally.w / 2);
  }
  function nudge(ev) {
    if (!rally || (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight")) return;
    ev.preventDefault();
    steer(rally.x + (ev.key === "ArrowLeft" ? -48 : 48));
  }
  function putAway() {
    if (!rally) return;
    window.removeEventListener("pointerdown", follow);
    window.removeEventListener("pointermove", follow);
    window.removeEventListener("keydown", nudge);
    rally.el.remove();
    rally.court.remove();
    body.classList.remove("rally");
    rally = null;
  }
  // Six keep-ups: the toy points at the real thing.
  function cheer() {
    if (!fab || fab.hidden) return;
    fab.querySelector("span").textContent = "Play a real one";
    fab.classList.add("cheer");
  }

  function kick() {
    if (!ball) return; // a late tap on a ball that is already on its way home
    ball.vx = (Math.random() < 0.5 ? -1 : 1) * (260 + Math.random() * 420);
    ball.vy = -(520 + Math.random() * 380);
    ball.life = 0;
    ball.el.style.background = pick();
    blip(700);
  }

  function roll(now) {
    if (!ball) return;
    var dt = Math.min(0.033, (now - ball.last) / 1000);
    ball.last = now;
    ball.life += dt;
    steer(rally.x); // drawn afresh each frame, so a turned phone or a resized window can't leave it behind
    var was = ball.y;
    ball.vy += GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    var maxX = document.documentElement.clientWidth - ball.size;
    var maxY = window.innerHeight - ball.size;
    var hit = 0;
    var struck = false;
    if (ball.x < 0 || ball.x > maxX) {
      ball.x = ball.x < 0 ? 0 : maxX;
      ball.vx *= -0.82;
      hit = Math.abs(ball.vx);
    }
    if (ball.y < 0) {
      ball.y = 0;
      ball.vy *= -0.82;
      hit = Math.max(hit, Math.abs(ball.vy));
    } else {
      var top = paddleTop() - ball.size; // where the ball sits when it touches the paddle
      var mid = ball.x + ball.size / 2;
      var over = mid >= rally.x - ball.size / 2 && mid <= rally.x + rally.w + ball.size / 2;
      if (ball.vy > 0 && was <= top && ball.y >= top && over && !ball.done) {
        ball.y = top;
        // where it lands on the paddle aims it, and every hit sends it as high as the last
        ball.vx = ((mid - rally.x) / rally.w - 0.5) * 920 + ball.vx * 0.25;
        ball.vy = -Math.min(1500, Math.sqrt(2 * GRAVITY * window.innerHeight * 0.55));
        rally.hits++;
        rally.court.classList.add("all");
        ball.life = 0;
        rally.el.dataset.n = rally.hits + " / " + KEEP_UPS;
        ball.done = rally.hits >= KEEP_UPS;
        if (ball.done) burst();
        hit = 500 + rally.hits * 150; // each one rings a little higher
        struck = true;
      } else if (ball.y > maxY && !rally.hits) {
        ball.y = maxY;
        ball.vy *= -0.8;
        ball.vx *= 0.94;
        hit = Math.max(hit, Math.abs(ball.vy));
      }
    }
    if (hit > 90) {
      ball.el.style.background = pick();
      if (struck) rally.el.style.background = ball.el.style.background;
      blip(hit);
    }
    ball.el.style.transform = "translate(" + ball.x + "px," + ball.y + "px)";
    if (eyes.length) watch();
    // missed: it has dropped out of the bottom, so it comes back in from the top
    if (ball.y > window.innerHeight + ball.size) {
      ball.x = dot.getBoundingClientRect().left;
      ball.y = -ball.size * 2;
      ball.el.style.transform = "translate(" + ball.x + "px," + ball.y + "px)";
      ball.el.getBoundingClientRect(); // drawn there first, so the trip home starts from the top
      return goHome();
    }
    // kept up six times: it goes home from the top of its last bounce
    if (ball.done && ball.vy >= 0) return goHome(cheer);
    // after a few seconds, or once it has come to rest, the ball goes home
    var resting = ball.y >= maxY - 1 && Math.abs(ball.vy) < 60 && Math.abs(ball.vx) < 30;
    if (ball.life > 7 || resting) return goHome();
    requestAnimationFrame(roll);
  }

  function goHome(then) {
    putAway();
    var to = dot.getBoundingClientRect();
    var el = ball.el;
    el.style.background = "#f5b544"; // back to the mark's own amber on the way in
    el.style.pointerEvents = "none";
    el.style.transition = "transform .35s ease-in, width .35s ease-in, height .35s ease-in, background-color .35s ease-in";
    el.style.width = el.style.height = to.width + "px";
    el.style.transform = "translate(" + to.left + "px," + to.top + "px)";
    ball = null;
    setTimeout(function () {
      el.remove();
      dot.style.visibility = "";
      blink();
      if (then) then();
    }, 360);
  }

  // ---------------------------------------------------------------- 4. the pint over the page

  // A game living on top of a business's own site is what we sell, so on a computer the
  // homepage's "Play the demo" acts it out: the real game rises over the page in a sheet
  // (D-041). Typing "pour" anywhere but the chat opens it too. Phones, and anyone who wants
  // no motion, go to the game's own page as before.
  var demo = document.querySelector("a[data-sheet]");
  var sheet = null;
  var typed = "";

  if (demo && mouse && !calm) {
    // On the window, before anything else hears it: the analytics script would otherwise
    // follow the link itself once it had counted the click, so the count is sent from here.
    window.addEventListener("click", function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
      if (a !== demo || ev.button || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      ev.stopPropagation();
      try {
        if (window.umami && demo.dataset.umamiEvent) window.umami.track(demo.dataset.umamiEvent);
      } catch (err) {
        /* uncounted is fine */
      }
      rise();
    }, true);
    document.addEventListener("keydown", function (ev) {
      if (sheet) {
        if (ev.key === "Escape") sink();
        return;
      }
      if (ev.ctrlKey || ev.metaKey || ev.altKey || typing(ev.target) || !ev.key || ev.key.length !== 1) return;
      typed = (typed + ev.key.toLowerCase()).slice(-4);
      if (typed === "pour") {
        typed = "";
        rise();
      }
    });
  }

  function typing(el) {
    if (!el) return false;
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || !!el.isContentEditable;
  }

  function rise() {
    if (sheet) return;
    var back = document.createElement("div");
    back.className = "pourBack";
    var el = document.createElement("div");
    el.className = "pourSheet";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "A pint on us");
    var grip = document.createElement("div");
    grip.className = "pourGrip";
    var shut = document.createElement("button");
    shut.type = "button";
    shut.className = "pourShut";
    shut.setAttribute("aria-label", "Put the pint away");
    shut.textContent = "\u00d7";
    grip.appendChild(shut);
    var frame = document.createElement("iframe");
    frame.src = demo.href;
    frame.title = "Pour the perfect pint";
    el.appendChild(grip);
    el.appendChild(frame);
    body.appendChild(back);
    body.appendChild(el);
    var root = document.documentElement;
    // the keyboard stays in the sheet: everything behind it is inert until it goes
    var away = Array.prototype.filter.call(body.children, function (k) {
      return k !== back && k !== el && !k.inert;
    });
    away.forEach(function (k) {
      k.inert = true;
    });
    sheet = { el: el, back: back, away: away, before: document.activeElement, overflow: root.style.overflow };
    root.style.overflow = "hidden"; // the page stays put underneath
    body.classList.add("pourOpen"); // one game at a time: the Play button waits

    back.addEventListener("click", sink);
    shut.addEventListener("click", sink);
    frame.addEventListener("load", function () {
      try {
        // the game's own links (the offer, the email, the split) leave for the whole window
        var inner = frame.contentDocument;
        var base = inner.createElement("base");
        base.target = "_top";
        inner.head.prepend(base);
        // and Esc works while the game has the keyboard
        frame.contentWindow.addEventListener("keydown", function (ev) {
          if (ev.key === "Escape") sink();
        });
        frame.contentWindow.focus();
      } catch (err) {
        /* the close button and Esc outside still work */
      }
    });
    swipe(grip, el);

    el.getBoundingClientRect(); // drawn below the screen first, so it rises
    back.classList.add("up");
    el.classList.add("up");
  }

  // Swipe the grip down far enough and the sheet goes; not far enough and it springs back.
  function swipe(grip, el) {
    var from = null;
    grip.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest(".pourShut")) return;
      from = ev.clientY;
      grip.setPointerCapture(ev.pointerId);
      el.style.transition = "none";
    });
    grip.addEventListener("pointermove", function (ev) {
      if (from !== null) el.style.transform = "translate(-50%," + Math.max(0, ev.clientY - from) + "px)";
    });
    function end(ev) {
      if (from === null) return;
      var dy = ev.clientY - from;
      from = null;
      el.style.transition = "";
      el.style.transform = "";
      if (dy > el.offsetHeight * 0.22) sink();
    }
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
  }

  function sink() {
    if (!sheet) return;
    var s = sheet;
    sheet = null;
    s.back.classList.remove("up");
    s.el.classList.remove("up");
    s.el.style.transform = "";
    document.documentElement.style.overflow = s.overflow;
    body.classList.remove("pourOpen");
    s.away.forEach(function (k) {
      k.inert = false;
    });
    setTimeout(function () {
      s.back.remove();
      s.el.remove(); // the game goes with it: nothing keeps running
    }, 400);
    if (s.before && s.before.focus) s.before.focus();
  }

  // ---------------------------------------------------------------- 5. the footer biscuit

  // The footer says there are no cookies and offers a biscuit instead (D-043). Hold the line (or
  // hover it on a computer) and a mug of tea rises over the footer, moving nothing, and the
  // biscuit goes in and darkens as it soaks. Let go inside two seconds and it is a perfect dunk;
  // hold longer and the soaked half snaps off and sinks. A tap takes a bite, and the third
  // leaves crumbs. Nothing is stored, so a reload brings the biscuit back. The drawing is in
  // style.css (.biscuit): this decides which classes are on.
  var cookieLine = document.querySelector("[data-biscuit]");
  if (cookieLine) biscuit(cookieLine);

  function biscuit(root) {
    var LINE = root.textContent;
    var HOLD = 220; // a press this long is a hold, not a tap
    var SNAP = 2000; // held this long, the soaked half snaps off
    var SAYS = {
      perfect: "Perfect dunk.",
      lost: "Lost it. Happens to everyone.",
      bite: "Go on, then.",
      gone: "We'd remember you ate it, but that would need a cookie.",
    };
    var CRUMBS = [[18, 19, 1.1], [23, 21, 0.8], [13, 21, 0.7], [-14, 21, 1.1], [-7, 21.5, 0.8], [2, 21, 1.2], [9, 21.6, 0.7]];

    // the biscuit is the ball's three flat shapes plus four docking holes
    var defs =
      '<svg class="bskDefs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
      '<g id="bskBody"><circle r="14" fill="#dcae6a"/>' +
      '<path d="M8.66 -10.99A14 14 0 1 1 -10.99 8.66 14 14 0 0 0 8.66 -10.99z" fill="#c4914b"/>' +
      '<ellipse cx="-5" cy="-6.5" rx="3.6" ry="2.2" transform="rotate(-38 -5 -6.5)" fill="#f3d9a4"/>' +
      '<circle cx="-4" cy="1" r="1.15" fill="#a9763a"/><circle cx="2.5" cy="-4.5" r="1.15" fill="#a9763a"/>' +
      '<circle cx="4.5" cy="3.5" r="1.15" fill="#a9763a"/><circle cx="-1" cy="7" r="1.15" fill="#a9763a"/></g>' +
      '<clipPath id="bskSoakClip"><path d="M-16 4C-11 2 -7 5.5 -2 3.5S6 2 10 4.5 14 3 16 3.5V17H-16Z"/></clipPath>' +
      '<clipPath id="bskTopClip"><path d="M-16 -16H16V1.5L11 3.5 7 1 3 4 -1 1.5 -5 4 -9 1 -13 3.5 -16 2z"/></clipPath>' +
      '<clipPath id="bskLowClip"><path d="M-16 16H16V1.5L11 3.5 7 1 3 4 -1 1.5 -5 4 -9 1 -13 3.5 -16 2z"/></clipPath>' +
      '<mask id="bskBite"><rect x="-16" y="-16" width="32" height="32" fill="#fff"/>' +
      '<circle class="bskCut c1" cx="13" cy="-9" r="6" fill="#000"/><circle class="bskCut c2" cx="16" cy="-1" r="5.5" fill="#000"/>' +
      '<circle class="bskCut c3" cx="9" cy="9" r="7" fill="#000"/><circle class="bskCut c4" cx="-1" cy="15" r="6" fill="#000"/></mask>' +
      "</defs></svg>";
    var soak = '<g clip-path="url(#bskSoakClip)"><circle class="bskSoak" r="14" fill="#8a5a2b"/></g>';
    var body = '<use href="#bskBody"/>';
    // whole, then the two halves it snaps into
    function pieces(cls, drip) {
      return (
        '<g class="' + cls + 'bskWhole"><g mask="url(#bskBite)">' + body + soak + "</g>" + (drip || "") + "</g>" +
        '<g class="' + cls + 'bskTop"><g clip-path="url(#bskTopClip)"><g mask="url(#bskBite)">' + body + "</g></g></g>" +
        '<g class="' + cls + 'bskLow"><g clip-path="url(#bskLowClip)"><g mask="url(#bskBite)">' + body +
        '<circle class="bskSoakFix" r="14" fill="#8a5a2b"/></g></g></g>'
      );
    }
    var mugBack =
      '<g class="bskMug"><ellipse class="bskRip" cx="2" cy="1.4" rx="14" ry="2.9" fill="none" stroke="#8a5a2b" stroke-width=".6"/>' +
      '<ellipse class="bskRip" cx="2" cy="1.4" rx="9" ry="2" fill="none" stroke="#8a5a2b" stroke-width=".9"/>' +
      '<ellipse cx="0" cy="0" rx="20" ry="5" fill="#d9d2c4"/><ellipse cx="0" cy="1.2" rx="17.5" ry="3.6" fill="#6e4322"/></g>';
    var mugFront =
      '<g class="bskMug"><path d="M20 4C29 4 31 9 30 14S24 23 18.5 22" fill="none" stroke="#d9d2c4" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M-20 0A20 5 0 0 0 20 0L17.5 27Q0 31 -17.5 27Z" fill="#eee8dc"/>' +
      '<path d="M8 4.6A20 5 0 0 0 20 0L17.5 27Q13 28.6 8 29.2Z" fill="#d9d2c4"/></g>';
    var drip = '<ellipse class="bskDrip" cx="1" cy="17.5" rx="1.3" ry="1.8" fill="#6e4322"/>';
    var crumbs = CRUMBS.map(function (c, i) {
      return '<circle class="bskCrumb k' + (i + 1) + '" cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="#c4914b"/>';
    }).join("");

    var say = document.createElement("span");
    say.className = "biscuitSay";
    say.setAttribute("role", "button");
    say.setAttribute("tabindex", "0");
    say.setAttribute("aria-live", "polite");
    var words = document.createElement("span");
    words.className = "bskWords";
    words.textContent = LINE;
    var tiny = document.createElement("span");
    tiny.innerHTML =
      '<svg class="bskInline" viewBox="-15 -15 30 30" width="15" height="15" aria-hidden="true" focusable="false">' + pieces("") + "</svg>";
    var holder = document.createElement("span");
    holder.innerHTML = defs;
    var stage = document.createElement("div");
    stage.className = "bskStage";
    stage.setAttribute("aria-hidden", "true");
    stage.innerHTML =
      '<svg viewBox="-38 -40 76 76" width="76" height="76" focusable="false"><g class="bskScene">' +
      mugBack + pieces("bsk ", drip) + mugFront +
      '</g><g transform="translate(0 12)">' + crumbs + "</g></svg>";
    say.appendChild(words);
    say.appendChild(tiny);
    root.textContent = "";
    root.appendChild(say);
    root.appendChild(holder);
    root.appendChild(stage);
    root.classList.add("on");

    var bites = 0;
    var pressing = false;
    var tapBites = false;
    var dunking = false;
    var snapped = false;
    var holdT = null;
    var snapT = null;
    var endT = null;
    var tidyT = null;

    function has(el, name) {
      return el.className.split(" ").indexOf(name) >= 0;
    }
    function eaten() {
      return has(root, "eaten");
    }
    function saying(text) {
      words.textContent = text;
      say.classList.add("said");
      if (calm) return;
      words.classList.remove("pop");
      words.getBoundingClientRect(); // restart the fade
      words.classList.add("pop");
    }
    function off(names) {
      names.forEach(function (n) {
        stage.classList.remove(n);
      });
    }
    function settle() {
      clearTimeout(snapT);
      clearTimeout(endT);
      clearTimeout(tidyT);
    }
    // the mug goes back down; a finished biscuit leaves its crumbs
    function retire() {
      off(["up", "dunk", "drip"]);
      if (!eaten()) off(["show"]);
      root.classList.remove("busy");
      tidyT = setTimeout(function () {
        off(["snapped"]);
      }, 1200);
    }

    function startDunk() {
      holdT = null;
      if (dunking || eaten()) return;
      settle();
      dunking = true;
      snapped = false;
      if (!calm) {
        off(["eat", "drip", "snapped"]);
        stage.getBoundingClientRect(); // drawn where it was first, so the mug rises
        stage.classList.add("show");
        stage.classList.add("up");
        stage.classList.add("dunk");
        root.classList.add("busy");
      }
      snapT = setTimeout(snap, SNAP);
    }
    function snap() {
      snapped = true;
      var whole = !has(root, "half");
      root.classList.add("half");
      root.classList.remove("soaked");
      if (!calm && whole) stage.classList.add("snapped");
      saying(SAYS.lost);
    }
    function endDunk() {
      if (!dunking) return;
      dunking = false;
      clearTimeout(snapT);
      if (snapped) {
        endT = setTimeout(retire, 1300); // let the sinking finish
        return;
      }
      saying(SAYS.perfect);
      root.classList.add("soaked");
      if (!calm) {
        off(["dunk"]);
        stage.classList.add("drip");
      }
      endT = setTimeout(retire, 1700);
    }
    function bite() {
      if (eaten()) return;
      if (dunking) {
        dunking = false;
        clearTimeout(snapT);
      }
      settle();
      bites++;
      root.classList.add(bites < 3 ? "bit" + bites : "eaten");
      saying(bites < 3 ? SAYS.bite : SAYS.gone);
      if (calm) return;
      off(["up", "dunk", "drip", "snapped"]);
      stage.getBoundingClientRect();
      stage.classList.add("show");
      stage.classList.add("eat");
      root.classList.add("busy");
      endT = setTimeout(function () {
        if (eaten()) root.classList.remove("busy");
        else retire();
      }, 1800);
    }

    // a press that turns into a hold dunks; one that ends first is a tap
    function press(tap) {
      if (pressing || eaten()) return;
      pressing = true;
      tapBites = tap;
      holdT = setTimeout(startDunk, HOLD);
    }
    function release(cancelled) {
      if (!pressing) return;
      pressing = false;
      if (holdT) {
        clearTimeout(holdT);
        holdT = null;
        if (tapBites && !cancelled) bite();
        return;
      }
      endDunk();
    }

    say.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse") {
        // a click bites, even when the pointer has already been hovering
        pressing = false;
        clearTimeout(holdT);
        holdT = null;
        bite();
      } else {
        press(true);
      }
    });
    say.addEventListener("pointerup", function () {
      release(false);
    });
    say.addEventListener("pointercancel", function () {
      release(true);
    });
    say.addEventListener("pointerenter", function (ev) {
      if (ev.pointerType === "mouse") press(false);
    });
    say.addEventListener("pointerleave", function (ev) {
      if (ev.pointerType === "mouse") release(true);
    });
    say.addEventListener("contextmenu", function (ev) {
      ev.preventDefault(); // a long press is a dunk, not a menu
    });
    say.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      if (!ev.repeat) press(true);
    });
    say.addEventListener("keyup", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") release(false);
    });
    say.addEventListener("blur", function () {
      release(true);
    });
    // a screen reader's "activate" arrives as a click with no pointer behind it
    say.addEventListener("click", function (ev) {
      if (ev.detail === 0) bite();
    });
  }
})();
