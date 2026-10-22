// Drives stamps/card.js from the command line for tests/test_stamps_demo.py.
//
//   node tests/stamps_driver.cjs '<query>' '<actions>'
//
// <query> is a JSON object of the link's values; <actions> a JSON array of
// ["stamp", n], ["redeem"] or ["undo"]. Prints the settings, each action's result
// and the count after it, and a few card codes.

const path = require("path");
const card = require(path.join(__dirname, "..", "stamps", "card.js"));

const settings = card.settings(JSON.parse(process.argv[2] || "{}"));
const actions = JSON.parse(process.argv[3] || "[]");
const c = card.createCard(settings.stamps);
const steps = actions.map(([kind, n]) => {
  const result = kind === "stamp" ? c.stamp(n) : kind === "redeem" ? c.redeem() : c.undo();
  return { kind, result, count: c.count, full: c.full() };
});
let seed = 1;
const codes = [0, 1, 2].map(() => card.cardCode(() => ((seed = (seed * 9301 + 49297) % 233280) / 233280)));
process.stdout.write(JSON.stringify({ settings, steps, codes, possessive: ["Gelatory", "Jess"].map(card.possessive) }));
