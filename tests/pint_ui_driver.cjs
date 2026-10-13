// Runs play/pint/game.js itself (not just the rules) for tests/test_promo_showcase.py,
// against a stand-in page: fake elements, a clock the test moves by hand, a fake
// AudioContext that notes every sound it is asked to start, and a fetch that reads the
// skin files from disk. Prints one JSON object with each scenario's observations.
//
//   node tests/pint_ui_driver.cjs

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAME = path.join(__dirname, "..", "play", "pint");
const SOURCES = ["skins/default.js", "engine.js", "game.js"].map((f) => fs.readFileSync(path.join(GAME, f), "utf8"));
const settle = () => new Promise((r) => setImmediate(r));

// tweak: a change made to every skin file as it is fetched, to try a skin nobody ships.
function boot(search, tweak) {
  let clock = 1000;
  let frames = [];
  let timers = [];
  const elements = {};
  const fetched = [];
  const sounds = [];
  const drawn = []; // every canvas call, by name, in order
  const stops = []; // every colour a gradient was given
  const paths = []; // every SVG path the canvas was asked to build

  const paint = new Proxy({}, {
    get: (t, p) => (p in t ? t[p] : () => (drawn.push(p), { addColorStop: (at, colour) => stops.push(colour) })),
    set: (t, p, v) => ((t[p] = v), true),
  });

  function element(id) {
    const e = { id, hidden: false, className: "", scrollTop: 0, own: "", kids: [], attrs: {}, on: {} };
    const classes = () => e.className.split(/\s+/).filter(Boolean);
    e.classList = {
      add: (...c) => (e.className = [...new Set([...classes(), ...c])].join(" ")),
      remove: (...c) => (e.className = classes().filter((x) => !c.includes(x)).join(" ")),
      toggle: (c, want) => (want ? e.classList.add(c) : e.classList.remove(c)),
      contains: (c) => classes().includes(c),
    };
    Object.defineProperty(e, "textContent", {
      get: () => e.own + e.kids.map((k) => k.textContent).join(""),
      set: (v) => ((e.own = String(v)), (e.kids = [])),
    });
    e.style = new Proxy({}, { get: (t, p) => (p === "setProperty" ? () => {} : t[p] || ""), set: (t, p, v) => ((t[p] = v), true) });
    e.appendChild = (k) => (e.kids.push(k), k);
    e.addEventListener = (type, fn) => (e.on[type] = e.on[type] || []).push(fn);
    e.fire = (type, event) => (e.on[type] || []).forEach((fn) => fn(Object.assign({ preventDefault() {} }, event)));
    e.setAttribute = (k, v) => (e.attrs[k] = String(v));
    e.getAttribute = (k) => e.attrs[k];
    e.removeAttribute = (k) => (k === "hidden" ? (e.hidden = false) : delete e.attrs[k]);
    e.focus = () => {};
    e.setPointerCapture = () => {};
    e.getBoundingClientRect = () => ({ width: 375, height: 420, left: 0, top: 0, right: 375, bottom: 420 });
    e.getContext = () => paint;
    e.firstElementChild = { setAttribute() {} };
    e.parentNode = { id: id + "-parent" };
    return e;
  }

  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  function AudioContext() {
    const ctx = this;
    ctx.state = "running";
    ctx.sampleRate = 200;
    ctx.destination = {};
    Object.defineProperty(ctx, "currentTime", { get: () => clock / 1000 });
    ctx.resume = () => (ctx.state = "running");
    ctx.suspend = () => (ctx.state = "suspended");
    ctx.createBuffer = (ch, n) => ({ getChannelData: () => new Float32Array(n) });
    const node = (extra) => Object.assign({ connect() {}, stop() {} }, extra);
    // A sound counts if the context would actually play it, and where the page was then.
    const started = () => ctx.state === "running" && sounds.push({ hidden: document.hidden });
    ctx.createOscillator = () => node({ frequency: param(), start: started });
    ctx.createBufferSource = () => node({ start: started });
    ctx.createGain = () => node({ gain: param() });
    ctx.createBiquadFilter = () => node({ frequency: param(), Q: param() });
  }

  const document = element("document");
  document.hidden = false;
  document.documentElement = element("html");
  document.getElementById = (id) => elements[id] || (elements[id] = element(id));
  document.querySelector = () => element("meta");
  document.createElement = () => element("new");
  document.createElementNS = () => element("new");
  document.createTextNode = (text) => ({ textContent: text });

  const window = element("window");
  Object.assign(window, {
    window,
    document,
    navigator: {},
    location: { search },
    performance: { now: () => clock },
    devicePixelRatio: 1,
    AudioContext,
    Path2D: function (d) {
      paths.push(d);
    },
    URLSearchParams,
    console,
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (fn) => frames.push(fn),
    setTimeout: (fn, ms) => timers.push({ at: clock + ms, fn }),
    fetch: (url) => {
      fetched.push(url);
      const file = path.join(GAME, url.split("?")[0]);
      if (!fs.existsSync(file)) return Promise.resolve({ ok: false, status: 404 });
      const skin = JSON.parse(fs.readFileSync(file, "utf8"));
      if (tweak) tweak(skin);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(skin) });
    },
  });
  vm.createContext(window);
  SOURCES.forEach((src) => vm.runInContext(src, window));

  const get = document.getElementById;
  return {
    get,
    window,
    document,
    fetched,
    sounds,
    drawn,
    stops,
    paths,
    settle,
    // Move the clock on, running whatever timers and animation frames fall due.
    advance(ms) {
      for (const end = clock + ms; clock < end; ) {
        clock = Math.min(end, clock + 16);
        const due = timers.filter((t) => t.at <= clock);
        timers = timers.filter((t) => t.at > clock);
        due.forEach((t) => t.fn());
        if (!document.hidden) {
          const run = frames;
          frames = [];
          run.forEach((fn) => fn(clock));
        }
      }
    },
    down: (id) => get("pour").fire("pointerdown", { button: 0, pointerId: id }),
    up: (id) => window.fire("pointerup", { pointerId: id }),
    hide(hidden) {
      document.hidden = hidden;
      document.fire("visibilitychange", {});
    },
  };
}

async function started(search, tweak) {
  const page = boot(search || "", tweak);
  for (let i = 0; i < 6; i++) await page.settle();
  page.get("start").fire("click", {});
  page.advance(100);
  return page;
}

(async () => {
  const out = {};
  const skin = JSON.parse(fs.readFileSync(path.join(GAME, "skins", "wobbly-gull.json"), "utf8"));
  out.release = skin.copy.release;

  // A second finger, or a key let go, while the first finger is still holding.
  let page = await started();
  page.down(1);
  page.advance(500);
  page.up(2);
  out.afterSecondFinger = page.get("pour").textContent;
  page.window.fire("keyup", { key: "Enter" });
  out.afterStrayKey = page.get("pour").textContent;
  page.window.fire("pointercancel", { pointerId: 7 });
  out.afterStrayCancel = page.get("pour").textContent;
  page.advance(300);
  page.up(1);
  out.afterOwnFinger = page.get("say").textContent;

  // Poured with the space bar: another key let go while it is still down.
  page = await started();
  page.get("pour").fire("keydown", { key: " ", repeat: false });
  page.advance(500);
  page.window.fire("keyup", { key: "Enter" });
  out.afterOtherKey = page.get("pour").textContent;
  page.window.fire("keyup", { key: " " });
  out.afterOwnKey = page.get("say").textContent;

  // The page is hidden mid-pour, then shown again a while later.
  page = await started();
  out.roundAtStart = page.get("round").textContent;
  page.down(1);
  page.advance(800);
  const before = page.sounds.length;
  page.hide(true);
  page.advance(6000);
  out.soundsWhileHidden = page.sounds.slice(before).filter((s) => s.hidden).length;
  out.roundWhileHidden = page.get("round").textContent;
  out.sayWhileHidden = page.get("say").textContent;
  page.hide(false);
  page.advance(2500);
  out.roundAfterReturn = page.get("round").textContent;

  // A skin name nobody has, and one that tries to leave the skins folder.
  page = boot("?skin=nope");
  for (let i = 0; i < 12; i++) await page.settle();
  out.unknownSkin = { fetched: page.fetched.slice(0, 2), venue: page.get("venue").textContent, start: page.get("start").hidden };
  page = boot("?skin=../x");
  for (let i = 0; i < 6; i++) await page.settle();
  out.unsafeSkin = { fetched: page.fetched.slice(0, 1) };

  // What pours the drink is the skin's to say. The same skin, three ways: the canvas
  // calls of one frame of an empty glass, and the colours of the stream mid-pour.
  out.pourers = {};
  const ways = { jug: (s) => (s.drink.pourer = "jug"), tap: (s) => (s.drink.pourer = "tap"), unsaid: (s) => delete s.drink.pourer };
  for (const way of Object.keys(ways)) {
    page = await started("", (s) => (ways[way](s), delete s.drink.stream));
    page.drawn.length = 0;
    page.advance(16);
    out.pourers[way] = page.drawn.join(" ");
  }
  out.streams = {};
  for (const colour of ["#abcdef", null]) {
    page = await started("", (s) => (colour ? (s.drink.stream = colour) : delete s.drink.stream));
    page.down(1);
    page.advance(400);
    out.streams[colour || "unsaid"] = page.stops.includes("#abcdef");
  }

  // The venue stays in sight after the title screen: its name on the play and results
  // screens, and its emblem on whatever pours the drink. A skin with no emblem has none.
  out.emblem = skin.emblem.path;
  out.marks = {};
  for (const pourer of ["tap", "jug"]) {
    for (const mark of ["with", "without"]) {
      page = await started("", (s) => ((s.drink.pourer = pourer), mark === "without" && delete s.emblem));
      page.drawn.length = 0;
      page.advance(16);
      out.marks[pourer + " " + mark] = { paths: page.paths.slice(), drawn: page.drawn.join(" ") };
    }
  }
  page = await started();
  out.venueShown = { venue: skin.venue, play: page.get("playVenue").textContent, done: page.get("doneVenue").textContent };

  process.stdout.write(JSON.stringify(out));
})();
