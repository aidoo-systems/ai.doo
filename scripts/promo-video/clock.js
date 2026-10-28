// Virtual clock, loaded into every frame by render.mjs: time moves only when the recorder
// calls __step, so every frame is exact however long a screenshot takes. It drives timers,
// requestAnimationFrame, Date and CSS animations and transitions.
(function () {
  var now = 0, base, raf = [], timers = [], seq = 1;
  performance.now = function () { return now; };
  // The winner's screen shows a ticking clock: fix it to a Friday evening and move it with the frames.
  var RealDate = Date;
  base = new RealDate(2026, 9, 23, 19, 42, 5).getTime();
  function VDate() {
    if (!(this instanceof VDate)) return new RealDate(base + now).toString();
    return arguments.length ? new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))() : new RealDate(base + now);
  }
  VDate.prototype = RealDate.prototype;
  VDate.now = function () { return base + now; };
  VDate.UTC = RealDate.UTC;
  VDate.parse = RealDate.parse;
  window.Date = VDate;
  window.requestAnimationFrame = function (cb) { var id = seq++; raf.push({ id: id, cb: cb }); return id; };
  window.cancelAnimationFrame = function (id) { raf = raf.filter(function (r) { return r.id !== id; }); };
  function add(cb, ms, args, every) { var id = seq++; timers.push({ id: id, at: now + (ms || 0), cb: cb, args: args, every: every }); return id; }
  window.setTimeout = function (cb, ms) { return add(cb, ms, [].slice.call(arguments, 2), 0); };
  window.setInterval = function (cb, ms) { return add(cb, ms, [].slice.call(arguments, 2), Math.max(ms || 0, 1)); };
  window.clearTimeout = window.clearInterval = function (id) { timers = timers.filter(function (t) { return t.id !== id; }); };
  window.__step = function (ms) {
    var end = now + ms;
    for (;;) {
      timers.sort(function (a, b) { return a.at - b.at; });
      var t = timers[0];
      if (!t || t.at > end) break;
      now = t.at;
      if (t.every) t.at += t.every; else timers.shift();
      try { typeof t.cb === 'function' ? t.cb.apply(null, t.args) : 0; } catch (e) { console.error(e); }
    }
    now = end;
    var due = raf; raf = [];
    due.forEach(function (r) { try { r.cb(now); } catch (e) { console.error(e); } });
    document.getAnimations().forEach(function (a) {
      if (a.__born === undefined) a.__born = now - ms;
      a.pause();
      a.currentTime = now - a.__born;
    });
    return now;
  };
})();
