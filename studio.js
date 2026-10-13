// The studio pages' bits of play (D-019). Three small things, each drawn from the games
// rather than laid over them, and all of it optional: the pages read and work without it.
//   1. The page wears the colour of the game you're looking at.
//   2. A floating Play button that takes you straight into something playable.
//   3. The dot in the wordmark is a ball. Flick it.
// Nothing is stored, and nothing is fetched.
(function () {
  "use strict";

  var FRAME = "#141312"; // body.studio's --bg0
  var body = document.body;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  // ---------------------------------------------------------------- 1. the page's tint

  var tinted = Array.prototype.slice.call(document.querySelectorAll(".work, [data-tint]"));
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
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
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

  // ---------------------------------------------------------------- 2. the Play button

  // Anything playable in a browser is marked in the page: <a data-play="What the button says">.
  var plays = Array.prototype.slice.call(document.querySelectorAll("a[data-play]")).map(function (a) {
    var card = a.closest(".work, [data-tint]");
    var glow = card && card.classList.contains("glow");
    return {
      card: card,
      name: a.dataset.play,
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
    fab.querySelector("span").textContent = play.name;
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
    var source = document.querySelector("a[data-play]");
    new IntersectionObserver(function (seen) {
      fab.hidden = seen[seen.length - 1].isIntersecting;
    }).observe(source);
  }

  // The footer's "Ask the site a question" opens the same chat as the dock's button.
  var ask = document.getElementById("chatFab");
  Array.prototype.forEach.call(document.querySelectorAll("[data-open-chat]"), function (el) {
    el.addEventListener("click", function () {
      if (ask) ask.click();
    });
  });

  // ---------------------------------------------------------------- 3. the dot is a ball

  var dot = document.querySelector("header .wm-dot");
  var colours = tinted.map(colourOf).filter(rgb);
  if (!colours.length) colours = ["#f5b544", "#4be08a", "#e8562a", "#00b3b3"];
  var pick = function () {
    return colours[Math.floor(Math.random() * colours.length)];
  };
  var audio = null;

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

  if (dot) {
    dot.style.background = pick();
    dot.classList.add("toy");
    dot.title = "Flick me";
    var ball = null;

    dot.addEventListener("click", function (e) {
      // the dot sits inside the home link: a flick is not a click on that
      e.preventDefault();
      e.stopPropagation();
      if (calm) {
        dot.style.background = pick();
        return;
      }
      if (ball) return kick();
      var home = dot.getBoundingClientRect();
      var size = Math.max(14, home.width * 2);
      var el = document.createElement("span");
      el.className = "wmBall";
      el.style.width = el.style.height = size + "px";
      el.style.background = dot.style.background;
      body.appendChild(el);
      dot.style.visibility = "hidden";
      ball = { el: el, size: size, x: home.left, y: home.top, vx: 0, vy: 0, life: 0, last: performance.now() };
      el.addEventListener("pointerdown", function (ev) {
        ev.preventDefault();
        kick();
      });
      kick();
      requestAnimationFrame(roll);
    });
  }

  function kick() {
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
    ball.vy += 1900 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    var maxX = document.documentElement.clientWidth - ball.size;
    var maxY = window.innerHeight - ball.size;
    var hit = 0;
    if (ball.x < 0 || ball.x > maxX) {
      ball.x = ball.x < 0 ? 0 : maxX;
      ball.vx *= -0.82;
      hit = Math.abs(ball.vx);
    }
    if (ball.y < 0) {
      ball.y = 0;
      ball.vy *= -0.82;
      hit = Math.max(hit, Math.abs(ball.vy));
    } else if (ball.y > maxY) {
      ball.y = maxY;
      ball.vy *= -0.8;
      ball.vx *= 0.94;
      hit = Math.max(hit, Math.abs(ball.vy));
    }
    if (hit > 90) {
      ball.el.style.background = pick();
      blip(hit);
    }
    ball.el.style.transform = "translate(" + ball.x + "px," + ball.y + "px)";
    // after a few seconds, or once it has come to rest, the ball goes home
    var resting = ball.y >= maxY - 1 && Math.abs(ball.vy) < 60 && Math.abs(ball.vx) < 30;
    if (ball.life > 7 || resting) return home();
    requestAnimationFrame(roll);
  }

  function home() {
    var to = dot.getBoundingClientRect();
    var el = ball.el;
    dot.style.background = el.style.background;
    el.style.transition = "transform .35s ease-in, width .35s ease-in, height .35s ease-in";
    el.style.width = el.style.height = to.width + "px";
    el.style.transform = "translate(" + to.left + "px," + to.top + "px)";
    ball = null;
    setTimeout(function () {
      el.remove();
      dot.style.visibility = "";
    }, 360);
  }
})();
