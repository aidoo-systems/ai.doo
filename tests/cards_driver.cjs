// Runs studio.js for tests/test_cards_that_move.py against a stand-in page carrying the
// first three game cards' drawings (P2.1e, stage 2 of D-018): checks that a drawing is
// paused until it is seen (IntersectionObserver), and that a tap sets off its own reaction
// and the reaction clears itself afterwards.
//
//   node tests/cards_driver.cjs
//
// CALM=1 asks for reduced motion, as studio_driver.cjs's RALLY=calm does.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(process.env.STUDIO_JS || path.join(__dirname, "..", "studio.js"), "utf8");

function element(extra) {
  const e = { dataset: {}, style: {}, attrs: {}, on: {}, hidden: false, textContent: "", className: "" };
  e.style.setProperty = (k, v) => (e.style[k] = v);
  e.classList = {
    add: (c) => {
      if (!e.className.split(" ").includes(c)) e.className = (e.className + " " + c).trim();
    },
    remove: (c) => (e.className = e.className.split(" ").filter((k) => k !== c).join(" ").trim()),
    contains: (c) => e.className.split(" ").filter(Boolean).includes(c),
    toggle: (c, on) => (on ? e.classList.add(c) : e.classList.remove(c)),
  };
  e.addEventListener = (type, fn) => (e.on[type] = e.on[type] || []).push(fn);
  e.removeEventListener = (type, fn) => (e.on[type] = (e.on[type] || []).filter((k) => k !== fn));
  e.setAttribute = (k, v) => (e.attrs[k] = String(v));
  e.getAttribute = (k) => e.attrs[k];
  e.removeAttribute = (k) => delete e.attrs[k];
  e.getBoundingClientRect = () => ({ left: 10, top: 10, width: 8, height: 8, right: 18, bottom: 18 });
  e.insertAdjacentElement = () => {};
  e.appendChild = (k) => k;
  e.remove = () => (e.removed = true);
  return Object.assign(e, extra);
}

// Three drawings, one per card, each with its own tap reaction class.
const sonar = element({ dataset: { react: "pinged" } });
const cards = element({ dataset: { react: "shuffled" } });
const orbit = element({ dataset: { react: "boost" } });
const drawings = [sonar, cards, orbit];

const one = {
  'meta[name="theme-color"]': element(),
  main: element(),
  "header .wm-dot": null,
  "header .nav": null,
  "header .brand": null,
  "a[data-play]": null,
};
const many = { ".work, [data-tint]": [], "a[data-play]": [], "[data-open-chat]": [], ".cardDrawing": drawings };

const observers = [];
function FakeIntersectionObserver(cb) {
  this.cb = cb;
  this.targets = [];
}
FakeIntersectionObserver.prototype.observe = function (el) {
  this.targets.push(el);
  observers.push({ cb: this.cb, el });
};

let clock = 0;
let nextTimerId = 1;
const timers = [];
const calm = !!process.env.CALM;

function tick(ms) {
  clock += ms;
  timers
    .filter((t) => t.at <= clock)
    .forEach((t) => {
      timers.splice(timers.indexOf(t), 1);
      t.fn();
    });
}

const window = {
  innerHeight: 800,
  performance: { now: () => clock },
  requestAnimationFrame: () => {},
  setTimeout: (fn, ms) => {
    const id = nextTimerId++;
    timers.push({ id, at: clock + (ms || 0), fn });
    return id;
  },
  clearTimeout: (id) => {
    const found = timers.find((t) => t.id === id);
    if (found) timers.splice(timers.indexOf(found), 1);
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: (query) => ({ matches: calm && query.includes("reduced-motion") }),
  getComputedStyle: (el) => ({ getPropertyValue: () => (el.vars && el.vars["--c"]) || "" }),
  IntersectionObserver: FakeIntersectionObserver,
  document: {
    body: element(),
    documentElement: { clientWidth: 375 },
    querySelector: (sel) => one[sel] || null,
    querySelectorAll: (sel) => many[sel] || [],
    getElementById: () => null,
    createElement: () => element(),
  },
};
window.window = window;

const out = { error: null };
try {
  vm.runInContext(source, vm.createContext(window));
} catch (err) {
  out.error = String(err);
}

function seenBy(el) {
  const found = observers.find((o) => o.el === el);
  return found ? found.cb : null;
}

function fire(el, isIntersecting) {
  const cb = seenBy(el);
  if (cb) cb([{ target: el, isIntersecting }]);
}

out.observedAll = drawings.every((el) => !!seenBy(el));

// off screen to begin with: a drawing that has never been seen does not play
out.playingBeforeSeen = sonar.classList.contains("playing");

fire(sonar, true);
out.playingOnScreen = sonar.classList.contains("playing");
fire(sonar, false);
out.playingOffScreen = sonar.classList.contains("playing");

// a tap sets off the drawing's own reaction, which clears itself afterwards
(sonar.on.click || []).forEach((fn) => fn());
out.reactedOnTap = sonar.classList.contains("pinged");
tick(2000);
out.reactionCleared = !sonar.classList.contains("pinged");

(cards.on.click || []).forEach((fn) => fn());
out.cardsReacted = cards.classList.contains("shuffled");
(orbit.on.click || []).forEach((fn) => fn());
out.orbitReacted = orbit.classList.contains("boost");

// a keyboard Enter sets off the same reaction as a tap (Codex round 1, P2)
(cards.on.keydown || []).forEach((fn) => fn({ key: "Enter", preventDefault() {} }));
out.keyboardReacted = cards.classList.contains("shuffled");

// a repeat tap restarts the reaction instead of letting the first tap's timeout cut it
// short (Codex round 1, P2): tap, wait half the window, tap again — the reaction must
// still be showing a moment after the *first* tap's own timeout would have fired, and
// only clear a moment after the *second* tap's.
(orbit.on.click || []).forEach((fn) => fn());
tick(500); // t+500: first tap's reaction is still running (900ms window)
(orbit.on.click || []).forEach((fn) => fn()); // retapped; restarts the window
tick(500); // t+1000: the first tap's own timeout (due at t+900) must not have fired
out.stillReactingAfterRepeatTap = orbit.classList.contains("boost");
tick(500); // t+1500: the second tap's timeout (due at t+1400) should have cleared it
out.reactionClearedAfterRepeatTap = !orbit.classList.contains("boost");

process.stdout.write(JSON.stringify(out));
