// P2.1m piece 4, option A (mock): type "pour" anywhere on the homepage and the pint rises
// over the page as a sheet you play there and then. The pint is the real /play/pour/ page in
// a frame, so there is still one game. Esc, the close button, a tap outside or a swipe down
// on the grip puts it away. Nothing is stored. Desktop only in practice: it needs a keyboard.
(function () {
  "use strict";

  var WORD = "pour";
  var doc = document;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var typed = "";
  var sheet = null;
  var before = null; // what had focus, to hand it back

  var css = doc.createElement("style");
  css.textContent = [
    ".pourBack{position:fixed;inset:0;z-index:400;background:rgba(10,9,8,.6);opacity:0;transition:opacity .3s ease}",
    ".pourBack.up{opacity:1}",
    ".pourSheet{position:fixed;left:50%;bottom:0;z-index:401;width:min(460px,100%);height:min(860px,94vh);",
    "  display:flex;flex-direction:column;border-radius:20px 20px 0 0;background:#101214;overflow:hidden;",
    "  box-shadow:0 -12px 40px rgba(0,0,0,.55);transform:translate(-50%,100%);transition:transform .38s cubic-bezier(.2,.9,.25,1.05)}",
    ".pourSheet.up{transform:translate(-50%,0)}",
    ".pourTop{flex:none;position:relative;height:30px;cursor:grab;touch-action:none}",
    ".pourTop::before{content:'';position:absolute;left:50%;top:11px;width:44px;height:5px;margin-left:-22px;border-radius:3px;background:rgba(255,255,255,.35)}",
    ".pourShut{position:absolute;right:8px;top:3px;width:26px;height:26px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#f4f1ea;font:700 15px/1 Inter,system-ui,sans-serif;cursor:pointer}",
    ".pourShut:hover{background:rgba(255,255,255,.2)}",
    ".pourSheet iframe{flex:1 1 auto;width:100%;border:0;background:#101214}",
    ".pourOpen .playDock{visibility:hidden}", // one game at a time: the Play button waits
    "@media (prefers-reduced-motion:reduce){.pourBack,.pourSheet{transition:none}}",
  ].join("\n");
  doc.head.appendChild(css);

  function typing(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  doc.addEventListener("keydown", function (ev) {
    if (sheet) {
      if (ev.key === "Escape") shut();
      return;
    }
    if (ev.ctrlKey || ev.metaKey || ev.altKey || typing(ev.target)) return;
    if (ev.key.length !== 1) return;
    typed = (typed + ev.key.toLowerCase()).slice(-WORD.length);
    if (typed === WORD) {
      typed = "";
      open();
    }
  });

  function open() {
    before = doc.activeElement;
    var back = doc.createElement("div");
    back.className = "pourBack";
    var el = doc.createElement("div");
    el.className = "pourSheet";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "A pint on us");
    var top = doc.createElement("div");
    top.className = "pourTop";
    var x = doc.createElement("button");
    x.type = "button";
    x.className = "pourShut";
    x.setAttribute("aria-label", "Put the pint away");
    x.textContent = "×";
    top.appendChild(x);
    var frame = doc.createElement("iframe");
    frame.src = "/play/pour/";
    frame.title = "Pour the perfect pint";
    el.appendChild(top);
    el.appendChild(frame);
    doc.body.appendChild(back);
    doc.body.appendChild(el);
    sheet = { el: el, back: back, frame: frame, overflow: doc.documentElement.style.overflow };
    doc.documentElement.style.overflow = "hidden"; // the page stays put underneath
    doc.body.classList.add("pourOpen");

    back.addEventListener("click", shut);
    x.addEventListener("click", shut);
    // Esc works while the game has the keyboard too: the frame is the same site, so it can be heard
    frame.addEventListener("load", function () {
      try {
        frame.contentWindow.addEventListener("keydown", function (ev) {
          if (ev.key === "Escape") shut();
        });
        frame.contentWindow.focus();
      } catch (err) {
        /* not the same site: the button and Esc outside still work */
      }
    });
    drag(top, el);

    el.getBoundingClientRect(); // drawn below the screen first, so it rises
    back.classList.add("up");
    el.classList.add("up");
  }

  // Swipe the grip down far enough and the sheet goes; not far enough and it springs back.
  function drag(handle, el) {
    var from = null;
    handle.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest(".pourShut")) return;
      from = ev.clientY;
      handle.setPointerCapture(ev.pointerId);
      el.style.transition = "none";
    });
    handle.addEventListener("pointermove", function (ev) {
      if (from === null) return;
      var dy = Math.max(0, ev.clientY - from);
      el.style.transform = "translate(-50%," + dy + "px)";
    });
    function end(ev) {
      if (from === null) return;
      var dy = ev.clientY - from;
      from = null;
      el.style.transition = "";
      el.style.transform = "";
      if (dy > el.offsetHeight * 0.22) shut();
    }
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  function shut() {
    if (!sheet) return;
    var s = sheet;
    sheet = null;
    s.back.classList.remove("up");
    s.el.classList.remove("up");
    s.el.style.transform = "";
    doc.documentElement.style.overflow = s.overflow;
    doc.body.classList.remove("pourOpen");
    setTimeout(function () {
      s.back.remove();
      s.el.remove(); // the game goes with it: nothing keeps running
    }, calm ? 0 : 400);
    if (before && before.focus) before.focus();
    else window.focus();
  }
})();
