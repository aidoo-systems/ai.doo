// Drives play/pour/engine.js from the command line for tests/test_promo_showcase.py.
//
//   node tests/pint_driver.cjs <skin.json> '<plays>'
//
// <plays> is a JSON array with one entry per round: a number of seconds to hold,
// "line" to let go as the pour reaches the line, or "never" to hold until it spills.
// A play the skin counts as a false start uses up its entry but not its round.
// Prints one JSON object: the skin's problems, each round's result, the total and the board.

const fs = require("fs");
const path = require("path");
const engine = require(path.join(__dirname, "..", "play", "pour", "engine.js"));

const skin = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const plays = JSON.parse(process.argv[3] || "[]");
const STEP = 1 / 240;

const out = { problems: engine.validateSkin(skin) };
if (out.problems.length === 0) {
  const game = engine.createGame(skin);
  out.labels = plays.map((_, i) => engine.roundLabel(skin, i));
  out.rounds = [];
  out.falseStarts = 0;
  for (const play of plays) {
    const line = skin.rounds[game.round].line;
    game.press();
    let held = 0;
    while (game.phase === "pouring") {
      if (play === "line" && game.level + 1e-9 >= line) break;
      if (typeof play === "number" && held + 1e-9 >= play) break;
      game.tick(STEP);
      held += STEP;
    }
    if (game.release() === "falseStart") {
      out.falseStarts += 1;
      continue;
    }
    out.rounds.push(game.results[game.results.length - 1]);
    game.next();
  }
  out.phase = game.phase;
  out.total = game.score;
  out.board = engine.board(skin, game.score);
  out.stars = engine.stars(skin, game.score);
  out.topScore = engine.topScore(skin);
  out.rival = engine.nextRival(skin, game.score);
  out.serves = skin.rounds.map((_, i) => engine.serveOf(skin, i));
}
process.stdout.write(JSON.stringify(out));
