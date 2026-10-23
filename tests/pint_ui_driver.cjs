// Runs play/pour/game.js itself (not just the rules) for tests/test_promo_showcase.py,
// against a stand-in page: fake elements, a clock the test moves by hand, a fake
// AudioContext that notes every sound it is asked to start, and a fetch that reads the
// skin files from disk. Prints one JSON object with each scenario's observations.
//
//   node tests/pint_ui_driver.cjs

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const GAME = path.join(__dirname, "..", "play", "pour");
const SOURCES = ["skins/default.js", "engine.js", "game.js"].map((f) => fs.readFileSync(path.join(GAME, f), "utf8"));
const settle = () => new Promise((r) => setImmediate(r));

// How tall the stand-in canvas is; a scenario may shorten it to a small phone's.
let stage = 420;
let snapLevel = null;

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
  const arcs = []; // every circle drawn: x, y and radius
  const trace = []; // every canvas call and setting, with its values, to compare frames exactly
  const fmt = (v) => (typeof v === "number" ? v.toFixed(2) : typeof v === "string" ? v : typeof v);

  // Where the canvas's own transform puts a point, so a test can ask how high a pourer reaches.
  let m = [1, 0, 0, 1, 0, 0];
  const saved = [];
  const reach = { top: Infinity };
  // Every shape filled, with the highest point of its path, whether a gradient filled it and
  // whether it was built of circles (the whippy's rope is; its turns and tip aren't).
  const fills = [];
  let pathTop = Infinity;
  let pathBottom = -Infinity;
  let pathCircles = false;
  let gradientFill = false;
  let fillColour = null;
  // Every dashed straight line (the line to pour to): its ends, and whether a clip cuts it.
  const dashes = [];
  const clips = [];
  let clipped = false;
  let dashed = false;
  let from = null;
  // Only what is drawn turned (a jug or a carton tipping) counts: the tap's pipe runs off the top on purpose.
  const at = (x, y) => {
    const yy = m[1] * x + m[3] * y + m[5];
    pathTop = Math.min(pathTop, yy);
    pathBottom = Math.max(pathBottom, yy);
    return Math.abs(m[1]) > 1e-9 && (reach.top = Math.min(reach.top, yy));
  };
  const moves = {
    beginPath: () => ((pathTop = Infinity), (pathBottom = -Infinity), (pathCircles = false)),
    fill: () => fills.push({ gradient: !!gradientFill, stops: gradientFill ? gradientFill.stops : [], top: pathTop, bottom: pathBottom, circles: pathCircles, colour: fillColour, at: drawn.length }),
    arc: () => (pathCircles = true),
    save: () => (saved.push(m.slice()), clips.push(clipped)),
    restore: () => ((m = saved.pop() || [1, 0, 0, 1, 0, 0]), (clipped = clips.pop() || false)),
    clip: () => (clipped = true),
    setLineDash: (d) => (dashed = d.length > 0),
    setTransform: (a, b, c, d, e, f) => (m = [a, b, c, d, e, f]),
    translate: (x, y) => ((m[4] += m[0] * x + m[2] * y), (m[5] += m[1] * x + m[3] * y)),
    scale: (x, y) => (m = [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]]),
    rotate: (r) => {
      const c = Math.cos(r);
      const s = Math.sin(r);
      m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, m[2] * c - m[0] * s, m[3] * c - m[1] * s, m[4], m[5]];
    },
    moveTo: (x, y) => (at(x, y), (from = dashed ? [x, y] : null)),
    lineTo: (x, y) => {
      at(x, y);
      if (from && Math.abs(from[1] - y) < 1e-6) dashes.push({ x0: from[0], x1: x, y, clipped, at: drawn.length });
      from = null;
    },
    arcTo: (x1, y1, x2, y2) => (at(x1, y1), at(x2, y2)),
    quadraticCurveTo: (x1, y1, x, y) => (at(x1, y1), at(x, y)),
    bezierCurveTo: (x1, y1, x2, y2, x, y) => (at(x1, y1), at(x2, y2), at(x, y)),
    fillRect: (x, y, w, h) => (at(x, y), at(x + w, y + h), at(x, y + h), at(x + w, y)),
    // an unturned ellipse's top and bottom (the whippy's tip is a run of them)
    ellipse: (x, y, rx, ry, turn) => !turn && (at(x, y - ry), at(x, y + ry)),
  };

  const paint = new Proxy({}, {
    get: (t, p) => (p in t ? t[p] : (...args) => {
      moves[p] && moves[p](...args), drawn.push(p), trace.push(p + "(" + args.map(fmt) + ")"), p === "arc" && arcs.push(args.slice(0, 3));
      const gradient = { stops: [] };
      gradient.addColorStop = (at, colour) => (trace.push("stop(" + fmt(at) + "," + colour + ")"), stops.push(colour), gradient.stops.push(colour));
      return gradient;
    }),
    set: (t, p, v) => ((t[p] = v), p === "fillStyle" && ((gradientFill = typeof v === "object" && v), (fillColour = typeof v === "string" ? v : null)), trace.push(p + "=" + fmt(v)), true),
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
    e.getBoundingClientRect = () => ({ width: 375, height: stage, left: 0, top: 0, right: 375, bottom: stage });
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
  // The same "random" numbers every run, so a whole pour can be compared call for call.
  vm.runInContext("Math.random = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })()", window);
  SOURCES.forEach((src, i) => {
    vm.runInContext(src, window);
    // a scenario may land every pour exactly on a level (snapLevel), once the engine is loaded
    if (i !== 1 || snapLevel === null) return;
    const make = window.PourEngine.createGame;
    window.PourEngine.createGame = (skin) => {
      const game = make(skin);
      const release = game.release;
      game.release = () => ((game.level = snapLevel), release());
      return game;
    };
  });

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
    arcs,
    trace,
    reach,
    fills,
    dashes,
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
  // A link can name the kind of venue, not the skin's file: ?skin=cafe, ?skin=pub.
  page = boot("?skin=cafe");
  for (let i = 0; i < 12; i++) await page.settle();
  out.kindSkin = { fetched: page.fetched.slice(0, 1), venue: page.get("venue").textContent };
  page = boot("?skin=constructor");
  for (let i = 0; i < 12; i++) await page.settle();
  out.oddKind = { fetched: page.fetched.slice(0, 2) };
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
      page.arcs.length = 0;
      page.advance(16);
      out.marks[pourer + " " + mark] = { paths: page.paths.slice(), drawn: page.drawn.join(" "), arcs: page.arcs.slice() };
    }
  }
  page = await started();
  out.venueShown = { venue: skin.venue, play: page.get("playVenue").textContent, done: page.get("doneVenue").textContent };

  // A prospect's own name from the email's link (?name=), and names that aren't one.
  const shown = (p) => ({
    title: p.get("venue").textContent,
    play: p.get("playVenue").textContent,
    done: p.get("doneVenue").textContent,
    claim: p.get("claimVenue").textContent,
    fictional: p.get("fictional").textContent,
    tab: p.document.title,
    board: p.get("boardTitle").textContent,
    emblem: "viewBox" in p.get("emblem").attrs, // the stand-in starts shown; only a skin emblem sets its box
  });
  out.named = {};
  const names = {
    plain: "Noa Bakehouse",
    marks: "O'Brien's Bar & Grill",
    longest: "A".repeat(32),
    tooLong: "A".repeat(33),
    html: "<b>Noa</b>",
    empty: "",
    padded: "  Café 360  ",
    punctuationOnly: "...",
  };
  for (const [key, name] of Object.entries(names)) {
    page = await started("?name=" + encodeURIComponent(name));
    page.advance(16);
    out.named[key] = Object.assign(shown(page), { badge: page.paths.length > 0 });
  }
  page = await started("?skin=wobbly-gull&name=" + encodeURIComponent("Noa Bakehouse"));
  for (let i = 0; i < 6; i++) await page.settle();
  out.namedSwitch = page.get("othersTitle").kids.map((a) => a.href);
  page = await started();
  for (let i = 0; i < 6; i++) await page.settle();
  out.plainSwitch = page.get("othersTitle").kids.map((a) => a.href);
  out.plain = shown(page);

  // P2.0s: the dairy. ?skin=dairy plays it; a carton pours it, and its milk doesn't fizz.
  page = boot("?skin=dairy");
  for (let i = 0; i < 12; i++) await page.settle();
  out.dairySkin = { fetched: page.fetched.slice(0, 1), venue: page.get("venue").textContent };
  page = await started("", (s) => ((s.drink.pourer = "carton"), delete s.drink.stream));
  page.drawn.length = 0;
  page.advance(16);
  out.pourers.carton = page.drawn.join(" ");
  for (const mark of ["with", "without"]) {
    page = await started("", (s) => ((s.drink.pourer = "carton"), mark === "without" && delete s.emblem));
    page.drawn.length = 0;
    page.advance(16);
    out.marks["carton " + mark] = { paths: page.paths.slice(), drawn: page.drawn.join(" ") };
  }
  // The highest the carton reaches, at rest and through a whole pour, on a tall stage
  // and a short one: none of it may go off the top of the canvas.
  out.cartonTop = {};
  for (const tall of [420, 200]) {
    stage = tall;
    page = await started("?skin=dairy");
    page.reach.top = Infinity;
    page.advance(16);
    const rest = page.reach.top;
    page.down(1);
    page.reach.top = Infinity;
    page.advance(1550);
    out.cartonTop[tall] = { rest, pouring: page.reach.top };
  }
  stage = 420;
  // Mid-pour, the bubbles, the churn and the head's bumps are all circles in the glass (poured
  // from the jug, which draws none of its own).
  out.fizz = {};
  for (const fizz of [true, false]) {
    page = await started("", (s) => ((s.drink.pourer = "jug"), fizz ? delete s.drink.fizz : (s.drink.fizz = false)));
    page.down(1);
    page.advance(800);
    page.arcs.length = 0;
    page.advance(16);
    out.fizz[fizz ? "on" : "off"] = page.arcs.filter((a) => a[2] < 9).length;
  }

  // P2.0u: the whippy. ?skin=icecream plays it; a machine pours it, and each round serves
  // something else: what it's in, and its finish once it's poured.
  page = boot("?skin=icecream");
  for (let i = 0; i < 12; i++) await page.settle();
  out.icecreamSkin = { fetched: page.fetched.slice(0, 1), venue: page.get("venue").textContent };
  page = await started("", (s) => ((s.drink.pourer = "machine"), delete s.drink.stream));
  page.drawn.length = 0;
  page.advance(16);
  out.pourers.machine = page.drawn.join(" ");
  for (const mark of ["with", "without"]) {
    page = await started("", (s) => ((s.drink.pourer = "machine"), mark === "without" && delete s.emblem));
    page.drawn.length = 0;
    page.advance(16);
    out.marks["machine " + mark] = { paths: page.paths.slice(), drawn: page.drawn.join(" ") };
  }
  out.machineTop = {};
  for (const tall of [420, 200]) {
    stage = tall;
    page = await started("?skin=icecream");
    page.reach.top = Infinity;
    page.advance(16);
    const rest = page.reach.top;
    page.down(1);
    page.reach.top = Infinity;
    page.advance(600);
    out.machineTop[tall] = { rest, pouring: page.reach.top };
  }
  stage = 420;
  const whippyFile = path.join(GAME, "skins", "giddy-puffin.json");
  const whippy = fs.existsSync(whippyFile) ? JSON.parse(fs.readFileSync(whippyFile, "utf8")) : { rounds: [], drink: {} };
  const paints = (trace, colours) => colours.some((c) => trace.includes("fillStyle=" + c) || trace.includes("strokeStyle=" + c));
  out.whippyRounds = [];
  page = await started("?skin=icecream");
  for (const r of whippy.rounds) {
    const serve = r.serve || {};
    const finish = serve.topping ? serve.topping.colours : [];
    page.advance(500);
    const seen = { say: page.get("say").textContent };
    page.trace.length = 0;
    page.advance(16);
    seen.frame = page.trace.join("\n");
    seen.vessel = !!serve.vessel && page.trace.includes("fillStyle=" + serve.vessel.colour);
    page.down(1);
    page.trace.length = 0;
    page.advance(600);
    seen.toppingWhilePouring = paints(page.trace, finish);
    page.up(1);
    page.trace.length = 0;
    page.advance(400);
    seen.toppingAfter = paints(page.trace, finish);
    page.advance(1400);
    out.whippyRounds.push(seen);
  }
  // D-030: the stack is laid coil by coil, each a tilted turn, so a longer pour draws more.
  page = await started("?skin=icecream");
  page.advance(500);
  page.down(1);
  const turns = () => page.trace.filter((t) => t.startsWith("rotate(")).length;
  page.advance(250);
  page.trace.length = 0;
  page.advance(16);
  const early = turns();
  page.advance(900);
  page.trace.length = 0;
  page.advance(16);
  out.whippyCoils = { early, late: turns() };
  // D-030, seam fix (a): the turn being laid reaches down into the turn below, as a settled
  // turn does, so no seam shows under it. Each turn is one fill in the stack's deep colour.
  out.whippySeams = [];
  for (let hold = 300; hold <= 1500; hold += 60) {
    page = await started("?skin=icecream");
    page.advance(500);
    page.down(1);
    page.advance(hold);
    page.fills.length = 0;
    page.advance(16);
    const turnsDrawn = page.fills.filter((f) => f.stops.includes(whippy.drink.liquidDeep) && !f.circles && f.top < Infinity);
    out.whippySeams.push({ hold, turns: turnsDrawn.map((f) => ({ top: f.top, bottom: f.bottom })) });
  }
  // Owner, 2026-10-23: when a serve finished, its base shifted down. Every turn of the stack, on
  // the last frame poured and on each frame of the finish, top and bottom, bottom turn first.
  out.whippyRelease = [];
  const stackNow = () => {
    page.fills.length = 0;
    page.advance(16);
    return page.fills.filter((f) => f.stops.includes(whippy.drink.liquidDeep) && !f.circles && f.top < Infinity).map((f) => [f.top, f.bottom]);
  };
  for (let hold = 300; hold <= 1700; hold += 80) {
    page = await started("?skin=icecream");
    page.advance(500);
    page.down(1);
    page.advance(hold);
    const poured = stackNow();
    page.up(1);
    const finish = [];
    for (let t = 0; t < 900; t += 16) finish.push(stackNow());
    out.whippyRelease.push({ hold, say: page.get("say").textContent, poured, finish });
  }
  // What is seen is what is scored (Codex, round 1 of the coils): once poured, the top of the
  // soft serve (every shape a gradient fills: the turns and the curl) is the height the
  // result's bracket measures to.
  out.whippyPeaks = [];
  for (let hold = 500; hold <= 1700; hold += 75) {
    page = await started("?skin=icecream");
    page.advance(500);
    page.down(1);
    page.advance(hold);
    page.up(1);
    // and in every frame while the tip comes out, not only once it has (D-030, look b)
    const frames = [];
    for (let t = 0; t < 448; t += 16) {
      page.fills.length = 0;
      page.advance(16);
      // the stack shades to its deep colour; the rope still falling from the nozzle is circles
      const f = page.fills.filter((f) => f.stops.includes(whippy.drink.liquidDeep) && !f.circles && f.top < Infinity).map((f) => f.top);
      if (f.length) frames.push(Math.min(...f));
    }
    page.advance(2);
    page.trace.length = 0;
    page.fills.length = 0;
    page.advance(16);
    const after = page.trace.slice(page.trace.lastIndexOf("lineWidth=3.50"));
    const bracket = after.filter((s) => s.startsWith("lineTo("));
    const tops = page.fills.filter((f) => f.gradient && f.top < Infinity).map((f) => f.top);
    out.whippyPeaks.push({
      hold,
      say: page.get("say").textContent,
      // a bracket is three lines; a tick (on the line) is two, and says nothing more exact
      scored: bracket.length === 3 ? parseFloat(bracket[1].split(",")[1]) : null,
      top: tops.length ? Math.min(...tops) : null,
      frames,
    });
  }
  // D-030, look b: the finish arrives after release (the flake slides in, the sauce falls and
  // runs, the sprinkles fall), none of it on the frame it's served and all of it within a second;
  // and one light over the whole stack, with no drop shadow under each turn.
  out.whippyStaged = [];
  page = await started("?skin=icecream");
  for (const r of whippy.rounds) {
    const serve = r.serve || {};
    const finish = serve.topping ? serve.topping.colours : [];
    page.advance(500);
    page.down(1);
    page.advance(700);
    page.trace.length = 0;
    page.advance(16);
    const shadowed = page.trace.includes("fillStyle=rgba(0,0,0,.16)");
    page.up(1);
    page.advance(134); // the beat of stillness, then the result lands
    page.trace.length = 0;
    page.advance(16);
    const atRelease = paints(page.trace, finish);
    page.advance(834);
    page.trace.length = 0;
    page.advance(16);
    out.whippyStaged.push({ topping: !!serve.topping, shadowed, atRelease, bySecond: paints(page.trace, finish), say: page.get("say").textContent });
    page.advance(1400);
  }
  // Served exactly on a whole turn (0.6 of five), it still gets its tip and finish (Codex,
  // round 1 of look b): the cup with sauce, served at its line's nearest whole turn.
  snapLevel = 0.6;
  page = await started("?skin=icecream");
  const cup = whippy.rounds[1].serve.topping.colours;
  page.advance(500);
  page.down(1);
  page.advance(700);
  page.up(1);
  page.advance(2000);
  page.advance(500);
  page.down(1);
  page.advance(700);
  page.up(1);
  page.advance(984);
  page.trace.length = 0;
  page.fills.length = 0;
  page.advance(16);
  out.whippyWholeTurn = {
    say: page.get("say").textContent,
    finish: paints(page.trace, cup),
    top: Math.min(...page.fills.filter((f) => f.stops.includes(whippy.drink.liquidDeep)).map((f) => f.top)),
  };
  snapLevel = null;
  // Held too long, it topples off to one side: a dollop beside the serve, not drips down a glass.
  page = await started("?skin=icecream");
  page.advance(500);
  page.down(1);
  for (let t = 0; t < 8000 && !page.get("say").textContent.startsWith(whippy.copy ? whippy.copy.spill : "?"); t += 50) page.advance(50);
  page.trace.length = 0;
  page.advance(900);
  const dollops = page.trace.filter((t) => t.startsWith("ellipse(")).map((t) => parseFloat(t.slice(8)));
  out.whippySpill = {
    say: page.get("say").textContent,
    toppled: !page.trace.includes("lineWidth=7.00") && dollops.some((x) => x > 375 / 2 + 30),
  };

  // D-030, line look (c): the line to pour to and the faint swirl under it, every round, at
  // rest and mid-pour; and the pub's line beside it.
  const lineFrame = () => {
    page.dashes.length = 0;
    page.fills.length = 0;
    page.drawn.length = 0;
    page.advance(16);
    const coils = page.fills.filter((f) => f.stops.includes(whippy.drink.liquidDeep) && !f.circles).map((f) => f.at);
    return { dashes: page.dashes.slice(), colours: page.fills.map((f) => [f.colour, f.at]), coils: [Math.min(...coils), Math.max(...coils)] };
  };
  out.whippyLine = [];
  page = await started("?skin=icecream");
  for (let r = 0; r < whippy.rounds.length; r++) {
    page.advance(500);
    const rest = lineFrame();
    page.down(1);
    page.advance(600);
    const pouring = lineFrame();
    page.up(1);
    page.advance(2000);
    out.whippyLine.push({ rest, pouring });
  }
  page = await started("?skin=wobbly-gull");
  page.advance(500);
  out.pubLine = lineFrame().dashes;

  // P2.0w: the whippy's stream, frame by frame (every circle drawn, and what was already there
  // at rest), from pulling the lever to just after it's let go.
  page = await started("?skin=icecream");
  page.advance(500);
  page.arcs.length = 0;
  page.advance(16);
  out.whippyStream = { rest: page.arcs.slice(), pouring: [], after: [] };
  page.down(1);
  for (let held = 0; held < 1600; held += 16) {
    page.arcs.length = 0;
    page.advance(16);
    out.whippyStream.pouring.push({ held: held + 16, arcs: page.arcs.slice() });
  }
  page.up(1);
  for (let since = 0; since < 400; since += 16) {
    page.arcs.length = 0;
    page.advance(16);
    out.whippyStream.after.push({ since: since + 16, arcs: page.arcs.slice() });
  }

  // Each shipped skin, call for call: a frame at rest, then a pour held to the end and
  // its result, so a change to one pourer can't quietly redraw another venue.
  out.traces = {};
  for (const id of ["wobbly-gull", "dozy-otter", "sleepy-cow"]) {
    page = await started("?skin=" + id);
    page.trace.length = 0;
    page.advance(16);
    page.down(1);
    page.advance(900);
    page.up(1);
    page.advance(700);
    out.traces[id] = require("crypto").createHash("sha256").update(page.trace.join("\n")).digest("hex");
  }

  process.stdout.write(JSON.stringify(out));
})();
