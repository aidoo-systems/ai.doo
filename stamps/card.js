// The rules of the stamp card demo at /stamps/. No DOM in here: index.html draws it,
// and tests/test_stamps_demo.py runs it under Node (tests/stamps_driver.cjs).
// A business is a link: ?shop=Gelatory&icon=icecream&reward=free%20scoop&color=D74000&stamps=10
// Every value is checked here; anything that isn't one falls back to the plain demo.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.StampCard = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEFAULTS = { shop: null, icon: "coffee", reward: "free coffee", color: "#2f6f5e", stamps: 10 };
  var ICONS = {
    coffee: "☕", tea: "🍵", icecream: "🍦", cake: "🍰", croissant: "🥐", donut: "🍩",
    cookie: "🍪", sandwich: "🥪", pizza: "🍕", burger: "🍔", flower: "🌸", scissors: "✂️",
    paw: "🐾", star: "⭐",
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

  // White on the card's colour while it keeps 3.5:1 (a brand's orange or red reads as
  // theirs in white), near-black on anything paler.
  function inkFor(color) {
    var lum = [1, 3, 5]
      .map(function (i) {
        var c = parseInt(color.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      })
      .reduce(function (sum, c, i) {
        return sum + c * [0.2126, 0.7152, 0.0722][i];
      }, 0);
    return 1.05 / (lum + 0.05) >= 3.5 ? "#ffffff" : "#1a1a1a";
  }

  // The demo's settings from a link's query values (a plain object of strings).
  function settings(query) {
    query = query || {};
    var stamps = parseInt(query.stamps, 10);
    var color = cleanColor(query.color) || DEFAULTS.color;
    var icon = Object.prototype.hasOwnProperty.call(ICONS, query.icon) ? query.icon : DEFAULTS.icon;
    return {
      shop: cleanText(query.shop, 32),
      icon: ICONS[icon],
      reward: cleanText(query.reward, 24) || DEFAULTS.reward,
      color: color,
      ink: inkFor(color),
      stamps: stamps >= MIN_STAMPS && stamps <= MAX_STAMPS ? stamps : DEFAULTS.stamps,
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
    DEFAULTS: DEFAULTS,
    settings: settings,
    cleanText: cleanText,
    cleanColor: cleanColor,
    inkFor: inkFor,
    possessive: possessive,
    cardCode: cardCode,
    createCard: createCard,
  };
});
