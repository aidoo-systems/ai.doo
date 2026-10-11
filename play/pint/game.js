// Draws the pour game and wires the one control. The rules are in engine.js; the
// venue, its colours, its words and its rounds all come from a skin file in skins/.
(function () {
  "use strict";

  var $ = function (id) {
    return document.getElementById(id);
  };
  var app = $("app");
  var pourBtn = $("pour");
  var nextBtn = $("next");
  var againBtn = $("again");
  var NEXT_DELAY = 450; // ms before "next" takes a tap, so letting go can't skip the result

  function skinId() {
    var asked = new URLSearchParams(location.search).get("skin");
    return asked && /^[a-z0-9-]+$/.test(asked) ? asked : window.POUR_SKIN;
  }

  function fail() {
    $("tagline").textContent = "Sorry, this game couldn't load. Please try again.";
  }

  fetch("skins/" + skinId() + ".json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("skin " + res.status);
      return res.json();
    })
    .then(function (skin) {
      if (PourEngine.validateSkin(skin).length) throw new Error("skin invalid");
      start(skin);
    })
    .catch(fail);

  function dress(skin) {
    var style = document.documentElement.style;
    Object.keys(skin.theme).forEach(function (key) {
      style.setProperty("--" + key, skin.theme[key]);
    });
    ["liquid", "liquidDeep", "head"].forEach(function (key) {
      style.setProperty("--" + key, skin.drink[key]);
    });
    var shape = "polygon(" + skin.drink.glass.map(function (p) {
      return p[0] + "% " + p[1] + "%";
    }).join(",") + ")";
    ["glass", "inside"].forEach(function (id) {
      $(id).style.clipPath = shape;
      $(id).style.webkitClipPath = shape;
    });
    document.querySelector('meta[name="theme-color"]').setAttribute("content", skin.theme.bg);
    document.title = skin.tagline + " | " + skin.venue;
    $("venue").textContent = skin.venue;
    $("tagline").textContent = skin.tagline;
    $("fictional").textContent = skin.fictional;
    pourBtn.textContent = skin.copy.hold;
    againBtn.textContent = skin.copy.again;
    $("totalLabel").textContent = skin.copy.total;
    $("boardTitle").textContent = skin.copy.boardTitle;
    $("prize").textContent = skin.copy.prize;
    $("outOf").textContent = "/ " + skin.rounds.length * 100;
  }

  function start(skin) {
    var game = PourEngine.createGame(skin);
    var last = 0;
    var holding = false;
    dress(skin);

    function say(strong, rest) {
      var el = $("say");
      el.textContent = "";
      if (strong) {
        var b = document.createElement("strong");
        b.textContent = strong;
        el.appendChild(b);
      }
      var s = document.createElement("span");
      s.textContent = rest;
      el.appendChild(s);
    }

    // A short buzz on phones that have one: a tick for a perfect pour, a rumble for a spill.
    function buzz(verdict) {
      if (!navigator.vibrate) return;
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
      if (verdict === "perfect") navigator.vibrate(25);
      else if (verdict === "spill") navigator.vibrate([70, 40, 70]);
    }

    function show(el, on) {
      el.hidden = !on;
    }

    function drawLevel() {
      var top = game.level * 100;
      var foam = top * skin.drink.headDepth;
      $("fill").style.height = top - foam + "%";
      $("foam").style.bottom = top - foam + "%";
      $("foam").style.height = foam + "%";
      // The stream stops at the surface: the stage is taller than the glass by its top padding.
      $("stream").style.bottom = "calc((100% - 22px) * " + game.level * 0.98 + ")";
    }

    function drawRound() {
      var line = skin.rounds[game.round].line * 100;
      $("mark").style.bottom = line + "%";
      $("tickL").style.bottom = $("tickR").style.bottom = line + "%";
      $("round").textContent = PourEngine.roundLabel(skin, game.round);
      $("points").textContent = String(game.score);
      $("stage").className = "stage rise";
      $("say").classList.remove("result");
      drawLevel();
      say("", skin.copy.hint);
      show($("play"), true);
      show($("stage"), true);
      show($("say"), true);
      show($("done"), false);
      show(againBtn, false);
      show(nextBtn, false);
      show(pourBtn, true);
    }

    function drawResult() {
      var result = game.results[game.results.length - 1];
      app.classList.remove("pouring");
      $("stage").className = "stage v-" + result.verdict + (result.verdict === "spill" ? " spilled" : "");
      $("say").classList.add("result");
      buzz(result.verdict);
      $("points").textContent = String(game.score);
      say(skin.copy[result.verdict], "+" + result.score);
      show(pourBtn, false);
      nextBtn.textContent = game.round + 1 < game.total ? skin.copy.next : skin.copy.finish;
      nextBtn.disabled = true;
      show(nextBtn, true);
      setTimeout(function () {
        nextBtn.disabled = false;
        if (!holding) nextBtn.focus({ preventScroll: true });
      }, NEXT_DELAY);
    }

    function drawDone() {
      var list = $("board");
      list.textContent = "";
      PourEngine.board(skin, game.score).forEach(function (row) {
        var li = document.createElement("li");
        var name = document.createElement("span");
        var score = document.createElement("span");
        name.textContent = row.name;
        score.textContent = String(row.score);
        if (row.you) li.className = "you";
        li.appendChild(name);
        li.appendChild(score);
        list.appendChild(li);
      });
      $("total").textContent = String(game.score);
      show($("play"), false);
      show($("stage"), false);
      show($("say"), false);
      show(nextBtn, false);
      show($("done"), true);
      show(againBtn, true);
      againBtn.focus({ preventScroll: true });
    }

    function frame(now) {
      if (game.phase !== "pouring") return;
      game.tick((now - last) / 1000);
      last = now;
      drawLevel();
      if (game.phase === "poured") drawResult();
      else requestAnimationFrame(frame);
    }

    function press() {
      holding = true;
      if (game.phase !== "ready") return;
      game.press();
      app.classList.add("pouring");
      last = performance.now();
      requestAnimationFrame(frame);
    }

    function release() {
      holding = false;
      if (game.phase !== "pouring") return;
      game.release();
      drawLevel();
      drawResult();
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
      if (document.hidden) release();
    });
    window.addEventListener("blur", release);

    nextBtn.addEventListener("click", function () {
      game.next();
      if (game.phase === "done") drawDone();
      else {
        drawRound();
        pourBtn.focus({ preventScroll: true });
      }
    });
    againBtn.addEventListener("click", function () {
      game.reset();
      drawRound();
      pourBtn.focus({ preventScroll: true });
    });

    drawRound();
  }
})();
