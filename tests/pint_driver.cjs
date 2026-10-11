// Drives play/pint/engine.js from the command line for tests/test_promo_showcase.py.
//
//   node tests/pint_driver.cjs <skin.json> '<plays>'
//
// <plays> is a JSON array with one entry per round: a number of seconds to hold,
// "line" to let go as the pour reaches the line, or "never" to hold until it spills.
// Prints one JSON object: the skin's problems, each round's result, the total and the board.

const fs = require("fs");
const path = require("path");
const engine = require(path.join(__dirname, "..", "play", "pint", "engine.js"));

const skin = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const plays = JSON.parse(process.argv[3] || "[]");
const STEP = 1 / 240;

const out = { problems: engine.validateSkin(skin) };
if (out.problems.length === 0) {
  const game = engine.createGame(skin);
  out.labels = plays.map((_, i) => engine.roundLabel(skin, i));
  out.rounds = [];
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
    game.release();
    out.rounds.push(game.results[game.results.length - 1]);
    game.next();
  }
  out.phase = game.phase;
  out.total = game.score;
  out.board = engine.board(skin, game.score);
}
process.stdout.write(JSON.stringify(out));
