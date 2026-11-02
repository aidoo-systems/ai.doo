// Runs studio.js for tests/test_quiet_frame.py against a stand-in page, as a phone would
// load it: no hover, and already scrolled so that a game card sits across the middle of
// the screen. Prints what the script did as JSON.
//
//   node tests/studio_driver.cjs
//
// RALLY=keepup|miss|idle|keys|turn|calm then flicks the dot and plays the paddle game (D-021)
// frame by frame on a clock of its own: keeping the paddle under the ball, hitting it once
// and then missing, never touching it, pressing the arrow keys and steering by finger,
// turning the phone on its side, or asking for reduced motion. The keep-up run also
// reports the sparks off the paddle and the o's of "doo" watching the ball (D-041).
//
// SHEET=button|word|chat|phone|calm opens the pint over the page (D-041) as a computer
// would: clicking "Play the demo", typing "pour", typing it in the chat box, or the same
// click on a phone or with reduced motion, then puts it away again.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// STUDIO_JS lets a test point this at another copy of the script.
const source = fs.readFileSync(process.env.STUDIO_JS || path.join(__dirname, "..", "studio.js"), "utf8");

function element(extra) {
  const e = { dataset: {}, style: {}, attrs: {}, on: {}, children: [], hidden: false, textContent: "", className: "" };
  e.style.setProperty = (k, v) => (e.style[k] = v);
  e.classList = {
    add: (c) => (e.className += " " + c),
    remove: (c) => (e.className = e.className.split(" ").filter((k) => k !== c).join(" ")),
    contains: (c) => e.className.split(" ").includes(c),
  };
  e.addEventListener = (type, fn) => (e.on[type] = e.on[type] || []).push(fn);
  e.removeEventListener = (type, fn) => (e.on[type] = (e.on[type] || []).filter((k) => k !== fn));
  e.setAttribute = (k, v) => (e.attrs[k] = String(v));
  e.getAttribute = (k) => e.attrs[k];
  e.removeAttribute = (k) => delete e.attrs[k];
  e.getBoundingClientRect = () => ({ left: 10, top: 10, width: 8, height: 8, right: 18, bottom: 18 });
  e.insertAdjacentElement = (where, other) => ((e.after = other), other);
  e.appendChild = (k) => (e.children.push(k), k);
  e.prepend = (k) => e.children.unshift(k);
  e.focus = () => (e.focused = (e.focused || 0) + 1);
  e.remove = () => (e.removed = true);
  return Object.assign(e, extra);
}

// Two cards: the first is off the top of the screen, the second spans its middle and can be played.
const above = element({ vars: { "--c": "#17533f" }, getBoundingClientRect: () => ({ top: -600, bottom: -100 }) });
const inView = element({ vars: { "--c": "#008080", "--t": "#ffffff" }, getBoundingClientRect: () => ({ top: 200, bottom: 700 }) });
const link = element({ dataset: { play: "Play Pipes 98" }, target: "_blank", closest: () => inView });
link.attrs.href = "https://pipes98.com/";
const label = element();
const fab = element({ hidden: true, querySelector: () => label });
const chat = element({ clicks: 0 });
chat.click = () => chat.clicks++;
const footerAsk = element();
const meta = element();
const dot = element();
const nav = element();
const brand = element();
const doo = element({ textContent: "doo" });
const body = element();
const sheetRun = process.env.SHEET || "";
// the homepage's "Play the demo", which opens over the page on a computer
const demo = element({ tagName: "A", dataset: { sheet: "", umamiEvent: "play-demo-home" }, href: "https://aidoo.biz/play/pour/" });
demo.attrs.href = "play/pour/";
demo.closest = () => demo;
const counted = [];
const created = [];
const rally = process.env.RALLY || "";
let clock = 0;
const frames = [];
const timers = [];
const onWindow = element();
const onDocument = element();

const one = { 'meta[name="theme-color"]': meta, main: element(), "header .wm-dot": dot, "header .nav": nav, "header .brand": brand, "header .wm-doo": doo, "a[data-play]": link, "a[data-sheet]": demo };
const many = { ".work, [data-tint]": [above, inView], "a[data-play]": [link], "[data-open-chat]": [footerAsk] };

const window = {
  innerHeight: 800,
  performance: { now: () => clock },
  requestAnimationFrame: (fn) => frames.push(fn),
  setTimeout: (fn, ms) => timers.push({ at: clock + (ms || 0), fn }),
  addEventListener: onWindow.addEventListener,
  removeEventListener: onWindow.removeEventListener,
  // no hover, no fine pointer (a computer's mouse for a sheet run); motion allowed unless the run asks for calm
  matchMedia: (query) => ({
    matches: query.includes("reduced-motion")
      ? rally === "calm" || sheetRun === "calm"
      : query.includes("hover") && !!sheetRun && sheetRun !== "phone",
  }),
  umami: { track: (name) => counted.push(name) },
  getComputedStyle: (el) => ({ getPropertyValue: (name) => (el.vars && el.vars[name]) || "" }),
  document: {
    body,
    head: element(),
    activeElement: body,
    addEventListener: onDocument.addEventListener,
    removeEventListener: onDocument.removeEventListener,
    documentElement: { clientWidth: 375, style: {} },
    querySelector: (sel) => one[sel] || null,
    querySelectorAll: (sel) => many[sel] || [],
    getElementById: (id) => ({ playFab: fab, chatFab: chat })[id] || null,
    createElement: (tag) => {
      const el = element({ tagName: String(tag).toUpperCase() });
      created.push(el);
      return el;
    },
  },
};
window.window = window;

const out = { error: null };
try {
  vm.runInContext(source, vm.createContext(window));
} catch (err) {
  out.error = String(err);
}
(footerAsk.on.click || []).forEach((fn) => fn());
const toy = created.find((el) => el.attrs["aria-label"]);
Object.assign(out, {
  tint: body.style["--bg0"] || "",
  themeColour: meta.attrs.content || "",
  buttonSays: label.textContent,
  buttonHidden: fab.hidden,
  buttonGoesTo: fab.href || "",
  footerOpensChat: chat.clicks,
  toyLabel: toy ? toy.attrs["aria-label"] : "",
  toyIsButton: toy ? toy.type === "button" : false,
  toyPlacedAfterHomeLink: brand.after === toy,
});

const live = (name) => created.find((el) => !el.removed && el.className.split(" ").includes(name));
const runTimers = () => {
  while (timers.length) {
    clock = Math.max(clock, timers[0].at);
    timers.splice(0, 1)[0].fn();
  }
};

if (rally && toy) {
  const at = (el) => (/translate\(([-\d.]+)px/.exec(el.style.transform || "") || [0, "0"])[1] * 1;
  const send = (type, ev) => (onWindow.on[type] || []).slice().forEach((fn) => fn(Object.assign({ preventDefault() {} }, ev)));
  const up = (el) => (/,([-\d.]+)px\)/.exec(el.style.transform || "") || [0, "0"])[1] * 1;
  const seen = { paddle: false, court: false, aside: false, says: [], moved: 0, finger: 0, stray: 0, top: null };
  const eyes = doo.children;
  const looks = new Set();
  const sparks = new Set();
  toy.on.click.forEach((fn) => fn());
  if (rally === "keys" && live("wmPaddle")) {
    const from = at(live("wmPaddle"));
    for (let i = 0; i < 3; i++) send("keydown", { key: "ArrowRight" });
    seen.moved = at(live("wmPaddle")) - from;
    // a finger steers from wherever it lands, on the court or off it
    send("pointermove", { clientX: 60, pointerType: "touch", target: live("wmCourt") });
    seen.finger = at(live("wmPaddle"));
    send("pointermove", { clientX: 300, pointerType: "touch", target: body });
    seen.stray = at(live("wmPaddle")) - seen.finger;
  }
  // 16ms frames until the ball is home and nothing is left to run, or 40 seconds
  while (clock < 40000 && (frames.length || timers.length)) {
    clock += 16;
    const ball = live("wmBall");
    const paddle = live("wmPaddle");
    if (paddle) {
      seen.paddle = true;
      seen.court = seen.court || !!live("wmCourt");
      seen.whole = seen.whole || (!!live("wmCourt") && live("wmCourt").classList.contains("all"));
      seen.aside = seen.aside || body.classList.contains("rally");
      if (paddle.dataset.n && seen.says[seen.says.length - 1] !== paddle.dataset.n) seen.says.push(paddle.dataset.n);
      if (ball && rally !== "keys") {
        const x = at(ball) + 8;
        const under = rally === "keepup" || (rally === "miss" && seen.says.length < 2);
        send("pointermove", { clientX: under ? x : x < 187 ? 340 : 30 });
      }
    }
    timers.filter((t) => t.at <= clock).forEach((t) => (timers.splice(timers.indexOf(t), 1), t.fn()));
    if (rally === "turn" && clock === 160) window.innerHeight = 500; // the phone goes on its side
    frames.splice(0).forEach((fn) => fn(clock));
    if (rally === "turn" && clock === 160 && live("wmPaddle")) seen.top = up(live("wmPaddle"));
    if (body.classList.contains("watching")) seen.watching = true;
    if (doo.classList.contains("blink")) seen.blinked = seen.blinked || (live("wmBall") ? "with the ball out" : "home");
    eyes.forEach((o) => o.children.forEach((p) => p.style.transform && looks.add(p.style.transform)));
    created.filter((el) => el.className.split(" ").includes("wmSpark")).forEach((el) => sparks.add(el));
  }
  out.eyes = {
    letters: doo.textContent + eyes.map((o) => o.textContent).join(""),
    eyes: eyes.filter((o) => o.className === "wmEye" && o.children.some((p) => p.className === "wmPupil")).length,
    watched: !!seen.watching,
    looks: looks.size,
    blinked: seen.blinked || "never",
    stillWatching: body.classList.contains("watching"),
    stillBlinking: doo.classList.contains("blink"),
  };
  out.sparks = {
    thrown: sparks.size,
    colours: [...new Set([...sparks].map((el) => el.style.background))].sort(),
    leftBehind: [...sparks].filter((el) => !el.removed).length,
  };
  out.rally = {
    paddleShown: seen.paddle,
    courtShown: seen.court,
    courtTookTheWholeScreen: !!seen.whole,
    dockSteppedAside: seen.aside,
    paddleSaid: seen.says,
    arrowsMoved: seen.moved,
    fingerPutPaddleAt: seen.finger,
    strayFingerMoved: seen.stray,
    paddleTopAfterTurn: seen.top,
    seconds: clock / 1000,
    ballMade: created.some((el) => el.className.split(" ").includes("wmBall")),
    leftBehind: ["wmBall", "wmPaddle", "wmCourt"].filter(live),
    dockBack: !body.classList.contains("rally"),
    dotBack: dot.style.visibility !== "hidden",
    listenersLeft: (onWindow.on.pointermove || []).length + (onWindow.on.keydown || []).length,
    buttonSaysAfter: label.textContent,
  };
}
if (sheetRun) {
  const s = {};
  const click = (target) => {
    const ev = { target, button: 0, defaultPrevented: false, stopped: false };
    ev.preventDefault = () => (ev.defaultPrevented = true);
    ev.stopPropagation = () => (ev.stopped = true);
    (onWindow.on.click || []).slice().forEach((fn) => fn(ev));
    return ev;
  };
  const key = (k, target) => (onDocument.on.keydown || []).slice().forEach((fn) => fn({ key: k, target: target || body, preventDefault() {} }));
  if (sheetRun === "word") "spour".split("").forEach((c) => key(c));
  else if (sheetRun === "chat") "pour".split("").forEach((c) => key(c, element({ tagName: "TEXTAREA" })));
  else {
    const ev = click(demo);
    s.pageKeptHome = ev.defaultPrevented && ev.stopped;
  }
  s.counted = counted;
  const sheet = live("pourSheet");
  const back = live("pourBack");
  const frame = created.find((el) => el.tagName === "IFRAME");
  s.opened = !!sheet;
  if (sheet) {
    s.frameGoesTo = frame.src;
    s.dialog = sheet.attrs.role === "dialog" && sheet.attrs["aria-modal"] === "true";
    s.dockHidden = body.classList.contains("pourOpen");
    s.pageHeld = window.document.documentElement.style.overflow === "hidden";
    // the game loads in the frame: its links must leave the sheet for the whole window
    frame.contentDocument = { head: element(), createElement: (tag) => element({ tagName: String(tag).toUpperCase() }) };
    frame.contentWindow = element();
    (frame.on.load || []).forEach((fn) => fn());
    s.linksLeaveTheSheet = frame.contentDocument.head.children.some((el) => el.tagName === "BASE" && el.target === "_top");
    // a second word while it's up opens no second sheet
    "pour".split("").forEach((c) => key(c));
    s.sheets = created.filter((el) => el.className.split(" ").includes("pourSheet")).length;
    // Esc from inside the game (a button run) or from the page (a word run) puts it away
    if (sheetRun === "button") (frame.contentWindow.on.keydown || []).forEach((fn) => fn({ key: "Escape" }));
    else key("Escape");
    s.closed = !body.classList.contains("pourOpen") && window.document.documentElement.style.overflow !== "hidden";
    runTimers();
    s.gone = !!sheet.removed && !!back.removed;
    s.focusBack = body.focused > 0;
  }
  out.sheet = s;
}
process.stdout.write(JSON.stringify(out));
