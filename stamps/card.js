// The rules of the stamp card demo at /stamps/. No DOM in here: index.html draws it,
// and tests/test_stamps_demo.py runs it under Node (tests/stamps_driver.cjs).
// A business is a link: ?shop=Gelatory&icon=icecream&reward=free%20scoop&color=D74000&stamps=10,
// and &fg=FFF3E0 for the card's writing and stamps if the shop has its own (else white or near-black),
// and &logo=davisons for a shop whose logo we hold (LOGOS).
// Every value is checked here; anything that isn't one falls back to the plain demo.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.StampCard = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // The plain demo is a made-up shop, Little Gull Coffee, in the colours of its real test pass
  var DEFAULTS = { shop: null, icon: "coffee", reward: "free coffee", color: "#1f4e5a", fg: "#f3e6cf", stamps: 8 };
  var ICONS = {
    coffee: "☕", tea: "🍵", icecream: "🍦", cake: "🍰", croissant: "🥐", donut: "🍩",
    cookie: "🍪", sandwich: "🥪", pizza: "🍕", burger: "🍔", flower: "🌸", scissors: "✂️",
    paw: "🐾", star: "⭐",
  };
  // A shop's own logo, by name from this list only (a link never names a file). `tint` marks a
  // one-colour line mark, worn in the card's writing colour so it reads on the shop's ground;
  // `whole` a mark shown uncropped (not in a circle), as a heart's lobes would be cut.
  var LOGOS = {
    davisons: { key: "davisons", src: "logos/davisons.png", tint: true }, // their site's tab icon
    madrina: { key: "madrina", src: "logos/madrina.png", tint: false, whole: true }, // their site's icon
  };
  var MIN_STAMPS = 4;
  var MAX_STAMPS = 12;
  var CODE_LETTERS = "ACDEFGHJKMNPQRTUVWXY34679"; // nothing that reads as another letter

  // Letters, digits, spaces and & ' . - with at least one letter or digit, or null.
  function cleanText(asked, max) {
    var text = typeof asked === "string" ? asked.trim().replace(/\s+/g, " ") : "";
    return text.length <= max && /^[\p{L}\p{N} &'.-]+$/u.test(text) && /[\p{L}\p{N}]/u.test(text) ? text : null;
  }

  function cleanColor(asked) {
    var hex = typeof asked === "string" ? asked.trim().replace(/^#/, "") : "";
    if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.replace(/./g, "$&$&");
    return /^[0-9a-f]{6}$/i.test(hex) ? "#" + hex.toLowerCase() : null;
  }

  function luminance(color) {
    return [1, 3, 5]
      .map(function (i) {
        var c = parseInt(color.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      })
      .reduce(function (sum, c, i) {
        return sum + c * [0.2126, 0.7152, 0.0722][i];
      }, 0);
  }

  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // White on the card's colour while it keeps 3.5:1 (a brand's orange or red reads as
  // theirs in white), near-black on anything paler.
  function inkFor(color) {
    return contrast(color, "#ffffff") >= 3.5 ? "#ffffff" : "#1a1a1a";
  }

  // The card's writing and stamps: the shop's own colour if it reads on the card (3:1, as the
  // service asks of a shop's two colours), else the plain demo's cream on its own teal, else ink.
  function fgFor(asked, color, plain) {
    var fg = cleanColor(asked);
    if (fg && contrast(fg, color) >= 3) return fg;
    return plain ? DEFAULTS.fg : inkFor(color);
  }

  // The demo's settings from a link's query values (a plain object of strings).
  function settings(query) {
    query = query || {};
    var stamps = parseInt(query.stamps, 10);
    var asked = cleanColor(query.color), color = asked || DEFAULTS.color;
    var icon = Object.prototype.hasOwnProperty.call(ICONS, query.icon) ? query.icon : DEFAULTS.icon;
    var shop = cleanText(query.shop, 32);
    // The plain page is Little Gull's, so a logo needs a shop
    var logo = shop && Object.prototype.hasOwnProperty.call(LOGOS, query.logo) ? LOGOS[query.logo] : null;
    return {
      shop: shop,
      icon: ICONS[icon],
      reward: cleanText(query.reward, 24) || DEFAULTS.reward,
      color: color,
      ink: inkFor(color),
      fg: fgFor(query.fg, color, !asked),
      stamps: stamps >= MIN_STAMPS && stamps <= MAX_STAMPS ? stamps : DEFAULTS.stamps,
      logo: logo,
    };
  }

  function possessive(name) {
    return /s$/i.test(name) ? name + "'" : name + "'s";
  }

  // A fresh card code, as the real server gives each card a random one.
  function cardCode(random) {
    random = random || Math.random;
    var code = "";
    for (var i = 0; i < 5; i++) code += CODE_LETTERS[Math.floor(random() * CODE_LETTERS.length)];
    return code;
  }

  // One card, kept the way the real server keeps it: a stamp never overfills it, the free
  // item is given only from a full card, and undo puts back exactly the last change.
  function createCard(need) {
    var card = { count: 0, need: need, last: null };
    card.full = function () {
      return card.count >= card.need;
    };
    card.stamp = function (n) {
      var add = Math.min(Math.max(1, n | 0), card.need - card.count);
      if (add <= 0) return 0;
      card.last = card.count;
      card.count += add;
      return add;
    };
    card.redeem = function () {
      if (!card.full()) return false;
      card.last = card.count;
      card.count -= card.need;
      return true;
    };
    card.undo = function () {
      if (card.last === null) return false;
      card.count = card.last;
      card.last = null;
      return true;
    };
    return card;
  }

  return {
    ICONS: ICONS,
    LOGOS: LOGOS,
    DEFAULTS: DEFAULTS,
    settings: settings,
    cleanText: cleanText,
    cleanColor: cleanColor,
    inkFor: inkFor,
    contrast: contrast,
    possessive: possessive,
    cardCode: cardCode,
    createCard: createCard,
  };
});
