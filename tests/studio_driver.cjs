// Runs studio.js for tests/test_quiet_frame.py against a stand-in page, as a phone would
// load it: no hover, and already scrolled so that a game card sits across the middle of
// the screen. Prints what the script did as JSON.
//
//   node tests/studio_driver.cjs

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// STUDIO_JS lets a test point this at another copy of the script.
const source = fs.readFileSync(process.env.STUDIO_JS || path.join(__dirname, "..", "studio.js"), "utf8");

function element(extra) {
  const e = { dataset: {}, style: {}, attrs: {}, on: {}, hidden: false, textContent: "", className: "" };
  e.style.setProperty = (k, v) => (e.style[k] = v);
  e.classList = { add: (c) => (e.className += " " + c), contains: (c) => e.className.split(" ").includes(c) };
  e.addEventListener = (type, fn) => (e.on[type] = e.on[type] || []).push(fn);
  e.setAttribute = (k, v) => (e.attrs[k] = String(v));
  e.getAttribute = (k) => e.attrs[k];
  e.removeAttribute = (k) => delete e.attrs[k];
  e.getBoundingClientRect = () => ({ left: 10, top: 10, width: 8, height: 8, right: 18, bottom: 18 });
  e.insertAdjacentElement = (where, other) => ((e.after = other), other);
  e.appendChild = (k) => k;
  e.remove = () => {};
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
const body = element();
const created = [];

const one = { 'meta[name="theme-color"]': meta, main: element(), "header .wm-dot": dot, "header .nav": nav, "header .brand": brand, "a[data-play]": link };
const many = { ".work, [data-tint]": [above, inView], "a[data-play]": [link], "[data-open-chat]": [footerAsk] };

const window = {
  innerHeight: 800,
  performance: { now: () => 0 },
  requestAnimationFrame: () => 0,
  setTimeout: () => 0,
  addEventListener: () => {},
  matchMedia: () => ({ matches: false }), // no hover, no fine pointer, motion allowed
  getComputedStyle: (el) => ({ getPropertyValue: (name) => (el.vars && el.vars[name]) || "" }),
  document: {
    body,
    documentElement: { clientWidth: 375 },
    querySelector: (sel) => one[sel] || null,
    querySelectorAll: (sel) => many[sel] || [],
    getElementById: (id) => ({ playFab: fab, chatFab: chat })[id] || null,
    createElement: () => {
      const el = element();
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
process.stdout.write(JSON.stringify(out));
