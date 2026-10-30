// Drives the second way to play in play/pour/engine.js (createSplit, P2.0ac) for
// tests/test_promo_showcase.py.
//
//   node tests/split_driver.cjs <skin.json> '<plays>'
//
// <plays> is a JSON array with one entry per glass: a number of seconds to hold the sip,
// "gap" to let go when the line would settle in the middle of the gap, or "never" to hold
// on. The settle's random part is fixed at its middle, so a run is repeatable.
// Prints one JSON object: the skin's problems, whether it offers the mode, and each glass:
// the line every quarter second of the sip, where it was let go, and its result.

const fs = require("fs");
const path = require("path");
const engine = require(path.join(__dirname, "..", "play", "pour", "engine.js"));

const skin = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const plays = JSON.parse(process.argv[3] || "[]");
const STEP = 1 / 240;

const out = { problems: engine.validateSkin(skin), offers: engine.offersSplit(skin) };
if (out.problems.length === 0 && out.offers) {
  const game = engine.createSplit(skin, () => 0.5);
  const played = engine.splitSkin(skin);
  out.rounds = played.rounds.length;
  out.copy = played.copy;
  out.samples = played.sampleScores;
  out.glasses = [];
  for (const play of plays) {
    const glass = { start: game.level, top: game.top, sip: [], speeds: [] };
    game.press();
    let held = 0;
    let mark = 0.25;
    while (game.phase === "pouring") {
      if (play === "gap" && game.restsAt() <= skin.mark.gap) break;
      if (typeof play === "number" && held + 1e-9 >= play) break;
      game.tick(STEP);
      held += STEP;
      if (held + 1e-9 >= mark) {
        glass.sip.push(game.level);
        glass.speeds.push(game.v);
        mark += 0.25;
      }
    }
    glass.held = held;
    glass.letGo = game.level;
    glass.stoppedItself = game.phase === "settling";
    game.release();
    glass.phase = game.phase;
    let settled = 0;
    while (game.phase === "settling") {
      game.tick(STEP);
      settled += STEP;
    }
    glass.settledFor = settled;
    glass.result = game.results[game.results.length - 1];
    out.glasses.push(glass);
    game.next();
  }
  out.phase = game.phase;
  out.total = game.score;
}
process.stdout.write(JSON.stringify(out));
