// The rules of the pour game. No DOM in here: game.js draws it, and the tests run
// it under Node (the driver in tests/). A venue is a skin: a JSON file in skins/.
// Nothing about any one venue or drink belongs in this file.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PourEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SURGE_HZ = 1; // how fast a round's surge pulses the flow, unless the round says
  var MAX_STEP = 0.05; // a tick never pours more than this many seconds' worth
  var COLOUR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i; // #rgb or #rrggbb, the two forms game.js draws with
  var EMBLEM = /^[MmLlHhVvCcSsQqTtAaZz0-9 ,.\-]+$/;
  var THEME = ["bg", "panel", "ink", "muted", "accent", "accentInk", "counter", "counterEdge", "metal"];
  var DRINK = ["liquid", "liquidDeep", "head"];
  var POURERS = ["tap", "jug", "carton", "machine"]; // what game.js can draw pouring the drink; a skin that doesn't say gets the first
  var TOPS = ["liquid", "coil"]; // what the top of the drink looks like; a skin that doesn't say gets the first
  var OUTLINES = ["glass", "none"]; // a glass round the drink, or nothing round it (soft serve stands up on its own)
  var TOPPINGS = ["stick", "drizzle", "scatter", "dust"]; // how a serve can be finished once it's poured
  // What a round's serve can say for itself. What pours it, its fizz, top and outline stay the skin's.
  var SERVE = ["name", "liquid", "liquidDeep", "head", "headDepth", "stream", "glass", "vessel", "handle", "steam", "topping", "coils"];
  var COPY = [
    "start", "offer", "beat", "round", "hold", "release", "hint", "falseStart", "again",
    "perfect", "good", "short", "over", "spill", "total", "boardTitle", "you", "prize",
    "rival", "rivalTop", "top", "best", "newBest", "claim",
  ];

  function isText(v, max) {
    return typeof v === "string" && v.trim().length > 0 && v.length <= max;
  }
  function isNum(v, min, max) {
    return typeof v === "number" && isFinite(v) && v >= min && v <= max;
  }
  function isObj(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  // How wide a glass outline is at a height, both in its own 0 to 100 units; 0 where
  // the outline doesn't reach.
  function glassWidth(glass, y) {
    var lo = Infinity;
    var hi = -Infinity;
    for (var i = 0; i < glass.length; i++) {
      var a = glass[i];
      var b = glass[(i + 1) % glass.length];
      if ((a[1] <= y && b[1] >= y) || (b[1] <= y && a[1] >= y)) {
        var xs = a[1] === b[1] ? [a[0], b[0]] : [a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0])];
        lo = Math.min.apply(null, xs.concat(lo));
        hi = Math.max.apply(null, xs.concat(hi));
      }
    }
    return hi >= lo ? hi - lo : 0;
  }

  // 3 to 24 points, each [x, y] from 0 to (by default) 100. wide: x may run from -40 to 140,
  // past the glass's sides (a saucer is wider than the base it holds, a handle stands off the side).
  function isOutline(pts, maxY, wide) {
    return Array.isArray(pts) && pts.length >= 3 && pts.length <= 24 && pts.every(function (p) {
      return Array.isArray(p) && p.length === 2 && isNum(p[0], wide ? -40 : 0, wide ? 140 : 100) && isNum(p[1], 0, maxY || 100);
    });
  }

  // The drink's own colours and shapes, at the skin's level or a round's serve (where each
  // is optional: the serve takes the skin's for anything it doesn't say).
  function checkDrink(d, at, partial, problems) {
    DRINK.concat("stream").forEach(function (key) {
      var must = !partial && key !== "stream";
      if ((must || d[key] !== undefined) && !COLOUR.test(d[key])) problems.push(at + key + " must be a hex colour");
    });
    if ((!partial || d.headDepth !== undefined) && !isNum(d.headDepth, 0, 0.3)) problems.push(at + "headDepth must be between 0 and 0.3");
    if ((!partial || d.glass !== undefined) && !isOutline(d.glass)) problems.push(at + "glass must be 3 to 24 points, each [x, y] from 0 to 100");
    // What the drink is served in, drawn and never filled: a holder under it, a cup round
    // it, a stem under a bowl. Its points are in the glass's units, down to y 200 below it.
    if (d.vessel !== undefined) {
      var v = isObj(d.vessel) ? d.vessel : {};
      var ok = isOutline(v.points, 200, true) && COLOUR.test(v.colour) && (v.edge === undefined || COLOUR.test(v.edge)) && (v.grid === undefined || typeof v.grid === "boolean");
      if (!ok) problems.push(at + "vessel needs 3 to 24 points (x -40 to 140, y 0 to 200), a hex colour, and may have a hex edge and a grid");
    }
    // A handle stands off the glass's side: an open line through 3 to 24 points, x from -40 to 140 and
    // y down the glass (0 to 100). Steam rises off a serve once it's poured.
    if (d.handle !== undefined && !(isObj(d.handle) && isOutline(d.handle.points, 100, true))) problems.push(at + "handle needs 3 to 24 points (x -40 to 140, y 0 to 100)");
    if (d.steam !== undefined && typeof d.steam !== "boolean") problems.push(at + "steam must be true or false");
    // How many coils of soft serve fill the glass, from its bottom to its top.
    if (d.coils !== undefined && !(Number.isInteger(d.coils) && d.coils >= 2 && d.coils <= 12)) problems.push(at + "coils must be a whole number from 2 to 12");
    // How it's finished once it's poured: a kind and its colours.
    if (d.topping !== undefined) {
      var t = isObj(d.topping) ? d.topping : {};
      var colours = Array.isArray(t.colours) && t.colours.length >= 1 && t.colours.length <= 6 && t.colours.every(function (c) {
        return COLOUR.test(c);
      });
      if (TOPPINGS.indexOf(t.kind) < 0 || !colours) problems.push(at + "topping needs a kind (" + TOPPINGS.join(", ") + ") and 1 to 6 hex colours");
    }
  }

  // Every problem with a skin, as plain sentences. An empty list means it can be played.
  function validateSkin(skin) {
    var problems = [];
    if (!isObj(skin)) return ["the skin is not an object"];

    if (typeof skin.id !== "string" || !/^[a-z0-9-]+$/.test(skin.id)) problems.push("id must be lower-case letters, digits and hyphens");
    ["venue", "tagline", "fictional", "switchLabel"].forEach(function (key) {
      if (!isText(skin[key], 160)) problems.push(key + " is missing");
    });

    // The emblem is optional: one SVG path, drawn above the venue's name. It may say how the
    // path fills, so a shape can have holes cut in it (D-030).
    if (skin.emblem !== undefined) {
      var em = isObj(skin.emblem) ? skin.emblem : {};
      var emOk = isNum(em.width, 1, 512) && isNum(em.height, 1, 512) && typeof em.path === "string" && em.path.length <= 1200 && EMBLEM.test(em.path);
      if (!emOk) problems.push("emblem needs a width, a height and an SVG path of drawing commands only");
      if (em.rule !== undefined && em.rule !== "nonzero" && em.rule !== "evenodd") problems.push("emblem rule must be nonzero or evenodd");
    }

    var theme = isObj(skin.theme) ? skin.theme : {};
    THEME.forEach(function (key) {
      if (!COLOUR.test(theme[key])) problems.push("theme." + key + " must be a hex colour");
    });

    var drink = isObj(skin.drink) ? skin.drink : {};
    checkDrink(drink, "drink.", false, problems);
    if (drink.pourer !== undefined && POURERS.indexOf(drink.pourer) < 0) problems.push("drink.pourer must be one of: " + POURERS.join(", "));
    // Bubbles, churn and a frothy head are on unless the skin turns them off (a still drink has none).
    if (drink.fizz !== undefined && typeof drink.fizz !== "boolean") problems.push("drink.fizz must be true or false");
    if (drink.top !== undefined && TOPS.indexOf(drink.top) < 0) problems.push("drink.top must be one of: " + TOPS.join(", "));
    if (drink.outline !== undefined && OUTLINES.indexOf(drink.outline) < 0) problems.push("drink.outline must be one of: " + OUTLINES.join(", "));
    var glassOk = isOutline(drink.glass);

    var copy = isObj(skin.copy) ? skin.copy : {};
    COPY.forEach(function (key) {
      if (!isText(copy[key], 120)) problems.push("copy." + key + " is missing");
    });

    var scoring = isObj(skin.scoring) ? skin.scoring : {};
    if (!isNum(scoring.window, 0.01, 1)) problems.push("scoring.window must be between 0.01 and 1");
    if (!isNum(scoring.perfect, 0, 1) || scoring.perfect >= scoring.window) problems.push("scoring.perfect must be smaller than scoring.window");
    if (scoring.falseStart !== undefined && !isNum(scoring.falseStart, 0, 0.3)) problems.push("scoring.falseStart must be between 0 and 0.3");

    var rounds = skin.rounds;
    if (!Array.isArray(rounds) || rounds.length < 1 || rounds.length > 10) {
      problems.push("rounds must hold 1 to 10 rounds");
      rounds = [];
    }
    rounds.forEach(function (r, i) {
      var at = "rounds[" + i + "].";
      if (!isObj(r)) return problems.push("rounds[" + i + "] is not an object");
      if (!isNum(r.line, 0.1, 0.97)) problems.push(at + "line must be between 0.1 and 0.97");
      if (!isNum(r.speed, 0.05, 5)) problems.push(at + "speed must be between 0.05 and 5");
      if (r.surge !== undefined && !isNum(r.surge, 0, 0.9)) problems.push(at + "surge must be between 0 and 0.9");
      if (r.surgeHz !== undefined && !isNum(r.surgeHz, 0.2, 4)) problems.push(at + "surgeHz must be between 0.2 and 4");
      // A line a false start can reach could never be scored on.
      if (isNum(r.line, 0, 1) && isNum(scoring.falseStart, 0, 1) && r.line - scoring.falseStart < 0.1) problems.push(at + "line must sit at least 0.1 above scoring.falseStart");
      // A round can serve something of its own, over the skin's drink.
      if (r.serve !== undefined) {
        if (!isObj(r.serve)) return problems.push(at + "serve must be an object");
        Object.keys(r.serve).forEach(function (key) {
          if (SERVE.indexOf(key) < 0) problems.push(at + "serve." + key + " is the skin's to say, not a round's");
        });
        if (r.serve.name !== undefined && !isText(r.serve.name, 40)) problems.push(at + "serve.name must be up to 40 letters");
        checkDrink(r.serve, at + "serve.", true, problems);
      }
    });

    // The glass is drawn from its rim (y 0) to its base (y 100) and marked at every
    // round's line: it has to be a real, open shape at each of those heights.
    // A round with a glass of its own is marked on that glass, not the skin's.
    var wide = function (glass, marked, at) {
      var heights = [0.5, 25, 50, 75, 99.5];
      marked.forEach(function (r) {
        if (isNum(r.line, 0, 1)) heights.push(100 * (1 - r.line));
      });
      var thin = heights.some(function (y) {
        return glassWidth(glass, y) < 20;
      });
      if (thin) problems.push(at + " must run from its rim at y 0 to its base at y 100 and be at least 20 wide all the way down");
    };
    var own = function (r) {
      return isObj(r) && isObj(r.serve) && r.serve.glass !== undefined;
    };
    if (glassOk) {
      wide(drink.glass, rounds.filter(function (r) {
        return isObj(r) && !own(r);
      }), "drink.glass");
    }
    rounds.forEach(function (r, i) {
      if (own(r) && isOutline(r.serve.glass)) wide(r.serve.glass, [r], "rounds[" + i + "].serve.glass");
    });

    var samples = skin.sampleScores;
    if (!Array.isArray(samples) || samples.length > 20) {
      problems.push("sampleScores must be a list of up to 20 scores");
      samples = [];
    }
    var best = rounds.length * 100;
    samples.forEach(function (s, i) {
      var ok = isObj(s) && isText(s.name, 16) && isNum(s.score, 0, best) && Math.floor(s.score) === s.score;
      if (!ok) problems.push("sampleScores[" + i + "] needs a name and a whole score no higher than " + best);
    });

    return problems;
  }

  // One pour's result. level and the line both run from 0 (empty) to 1 (the rim).
  function scorePour(skin, round, level) {
    var line = skin.rounds[round].line;
    if (level >= 1) return { level: 1, line: line, score: 0, verdict: "spill" };
    var diff = Math.abs(level - line);
    if (diff <= skin.scoring.perfect) return { level: level, line: line, score: 100, verdict: "perfect" };
    var score = Math.min(99, Math.max(0, Math.round(100 * (1 - diff / skin.scoring.window))));
    var verdict = score >= 70 ? "good" : level < line ? "short" : "over";
    return { level: level, line: line, score: score, verdict: verdict };
  }

  // How hard the tap is running, as a multiple of the round's speed: 1 without a surge.
  function flowAt(skin, round, held) {
    var r = skin.rounds[round];
    return 1 + (r.surge || 0) * Math.sin(2 * Math.PI * (r.surgeHz || SURGE_HZ) * held);
  }

  // What a round serves: its own serve over the skin's drink, or the drink itself.
  function serveOf(skin, round) {
    var serve = skin.rounds[round].serve;
    return serve ? Object.assign({}, skin.drink, serve) : skin.drink;
  }

  function roundLabel(skin, round) {
    return skin.copy.round.replace("{n}", String(round + 1)).replace("{total}", String(skin.rounds.length));
  }

  // 0 to 3 stars for a finished game: 90%, 70% and 40% of the best possible score.
  function stars(skin, score) {
    var share = score / (skin.rounds.length * 100);
    return share >= 0.9 ? 3 : share >= 0.7 ? 2 : share >= 0.4 ? 1 : 0;
  }

  // The score to beat: the best of the samples, or 0 when the skin has none.
  function topScore(skin) {
    return skin.sampleScores.reduce(function (best, s) {
      return Math.max(best, s.score);
    }, 0);
  }

  // The sample score just above the player's, how far off it is, and whether passing
  // it would put the player top of the board; null when they already are.
  function nextRival(skin, score) {
    var rival = null;
    skin.sampleScores.forEach(function (s) {
      if (s.score > score && (!rival || s.score < rival.score)) rival = s;
    });
    return rival ? { name: rival.name, gap: rival.score - score, top: rival.score === topScore(skin) } : null;
  }

  // This visit's name on the board: an adjective and an animal from nicknames.json,
  // picked with rand (Math.random in the game). Nobody types a name, so none is rude.
  function nickname(words, rand) {
    function pick(list) {
      return list[Math.floor(rand() * list.length) % list.length];
    }
    return pick(words.adjectives) + " " + pick(words.animals);
  }

  function liveRows(live) {
    return (Array.isArray(live) ? live : []).filter(function (s) {
      return isObj(s) && isText(s.name, 20) && isNum(s.score, 0, Infinity) && Math.floor(s.score) === s.score;
    });
  }

  // The skin with this week's live scores among its sample ones. The player's own row
  // (their name) comes off, because board() ranks them back in as "You".
  function withLive(skin, live, name) {
    var rest = liveRows(live)
      .filter(function (s) {
        return s.name !== name;
      })
      .map(function (s) {
        return { name: s.name, score: s.score };
      });
    return Object.assign({}, skin, { sampleScores: skin.sampleScores.concat(rest) });
  }

  // The player's place on the week's board: the best the server keeps for their name,
  // or this game's score when it is higher (or the server hasn't seen it yet).
  function standing(live, name, score) {
    return liveRows(live).reduce(function (best, s) {
      return s.name === name ? Math.max(best, s.score) : best;
    }, score);
  }

  // The sample board with the player's score ranked into it. The player wins a tie.
  function board(skin, score) {
    var rows = [{ name: skin.copy.you, score: score, you: true }];
    skin.sampleScores.forEach(function (s) {
      rows.push({ name: s.name, score: s.score });
    });
    return rows.sort(function (a, b) {
      return b.score - a.score;
    });
  }

  // phase: ready -> pouring -> poured -> (next round: ready) ... -> done
  function createGame(skin) {
    var game = {
      skin: skin,
      total: skin.rounds.length,
      round: 0,
      level: 0,
      held: 0,
      score: 0,
      results: [],
      phase: "ready",
    };

    function finish() {
      var result = scorePour(skin, game.round, game.level);
      game.results.push(result);
      game.score += result.score;
      game.phase = "poured";
    }

    game.press = function () {
      if (game.phase === "ready") game.phase = "pouring";
    };
    game.tick = function (seconds) {
      if (game.phase !== "pouring" || !(seconds > 0)) return;
      var dt = Math.min(seconds, MAX_STEP);
      game.level += skin.rounds[game.round].speed * flowAt(skin, game.round, game.held) * dt;
      game.held += dt;
      if (game.level >= 1) {
        game.level = 1;
        finish();
      }
    };
    // Letting go ends the pour. A touch that barely poured is a false start, not a
    // score: the glass empties and the round is still to play.
    game.release = function () {
      if (game.phase !== "pouring") return null;
      if (game.level < (skin.scoring.falseStart || 0)) {
        game.level = 0;
        game.held = 0;
        game.phase = "ready";
        return "falseStart";
      }
      finish();
      return "poured";
    };
    game.next = function () {
      if (game.phase !== "poured") return;
      if (game.round + 1 >= game.total) {
        game.phase = "done";
        return;
      }
      game.round += 1;
      game.level = 0;
      game.held = 0;
      game.phase = "ready";
    };
    game.reset = function () {
      game.round = 0;
      game.level = 0;
      game.held = 0;
      game.score = 0;
      game.results = [];
      game.phase = "ready";
    };
    return game;
  }

  // A prospect's venue name from the demo's link (?name=), or null if it isn't one: at
  // most 32 letters, digits, spaces and & ' . - with at least one letter or digit.
  function guestName(asked) {
    var name = typeof asked === "string" ? asked.trim() : "";
    return name.length <= 32 && /^[\p{L}\p{N} &'.-]+$/u.test(name) && /[\p{L}\p{N}]/u.test(name) ? name : null;
  }

  return {
    validateSkin: validateSkin,
    guestName: guestName,
    scorePour: scorePour,
    roundLabel: roundLabel,
    serveOf: serveOf,
    board: board,
    nickname: nickname,
    withLive: withLive,
    standing: standing,
    stars: stars,
    flowAt: flowAt,
    nextRival: nextRival,
    topScore: topScore,
    createGame: createGame,
  };
});
