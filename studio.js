// The studio pages' bits of play (D-019). Three small things, each drawn from the games
// rather than laid over them, and all of it optional: the pages read and work without it.
//   1. A floating Play button that takes you straight into something playable.
//   2. The page wears the colour of the game you're looking at.
//   3. The dot in the wordmark is a ball. Flick it, and a paddle turns up to keep it in the air.
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
      if (then) then();
    }, 360);
  }
})();
