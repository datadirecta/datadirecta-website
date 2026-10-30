// Wavy scrolling text banner: every character rides a sine wave while the row drifts left.
(function () {
  var STAR = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="' + starPath() + '"/></svg>';

  function starPath() {
    var pts = [];
    for (var i = 0; i < 16; i++) {
      var a = (Math.PI / 8) * i - Math.PI / 2;
      var r = i % 2 === 0 ? (i % 4 === 0 ? 50 : 38) : 7;
      pts.push((Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1));
    }
    return 'M' + pts.join('L') + 'Z';
  }

  function build(el) {
    el.querySelectorAll('.tok').forEach(function (t) { t.remove(); });
    var phrases = el.dataset.phrases.split('|');
    var peak = parseFloat(el.dataset.peak || '.37');
    var speed = parseFloat(el.dataset.speed || '70');
    var W = el.clientWidth;
    var amp = parseFloat(el.dataset.amp || '0.05') * W;
    var lambda = parseFloat(el.dataset.lambda || '.68') * W;

    // one unit = every phrase followed by a star
    function unit() {
      var toks = [];
      phrases.forEach(function (p) {
        for (var i = 0; i < p.length; i++) toks.push({ html: p[i] === ' ' ? ' ' : p[i] });
        toks.push({ html: STAR, star: true });
      });
      return toks;
    }

    var probe = document.createElement('div');
    probe.style.cssText = 'visibility:hidden;width:max-content;left:0;top:0';
    probe.className = 'tok';
    el.appendChild(probe);

    // measure one unit; stars get breathing room on both sides
    var starPad = W * 0.042;
    var one = unit();
    var measured = one.map(function (t) {
      var s = document.createElement('span');
      s.style.cssText = 'display:inline-block;white-space:pre';
      s.innerHTML = t.html;
      probe.appendChild(s);
      return s;
    });
    var widths = measured.map(function (s, i) {
      return s.getBoundingClientRect().width + (one[i].star ? starPad * 2 : 0);
    });
    var cycle = widths.reduce(function (a, b) { return a + b; }, 0);
    probe.remove();

    var reps = Math.ceil((W + cycle) / cycle) + 1;
    var total = cycle * reps;
    var nodes = [];
    var x = 0;
    for (var r = 0; r < reps; r++) {
      one.forEach(function (t, i) {
        var n = document.createElement('span');
        n.className = 'tok';
        n.innerHTML = t.html;
        if (t.star) n.style.padding = '0 ' + starPad + 'px';
        el.appendChild(n);
        nodes.push({ el: n, x: x, w: widths[i] });
        x += widths[i];
      });
    }
    return { nodes: nodes, total: total, W: W, peak: peak, speed: speed, amp: amp, lambda: lambda };
  }

  function start(el) {
    var state = build(el);
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t0 = performance.now();
    var k = 2 * Math.PI;

    function frame(now) {
      var s = state;
      var off = reduce ? 0 : ((now - t0) / 1000) * s.speed;
      var mid = el.clientHeight / 2;
      for (var i = 0; i < s.nodes.length; i++) {
        var n = s.nodes[i];
        var px = (((n.x - off) % s.total) + s.total) % s.total - s.total * 0.15;
        var cx = px + n.w / 2;
        if (cx < -n.w * 2 || cx > s.W + n.w * 2) { n.el.style.visibility = 'hidden'; continue; }
        n.el.style.visibility = 'visible';
        var ph = k * (cx - s.peak * s.W) / s.lambda;
        var y = -s.amp * Math.cos(ph);
        var ang = Math.atan(s.amp * (k / s.lambda) * Math.sin(ph)) * 180 / Math.PI;
        n.el.style.transform = 'translate(' + px.toFixed(1) + 'px,' + (mid + y).toFixed(1) + 'px) translateY(-50%) rotate(' + ang.toFixed(2) + 'deg)';
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    var raf = requestAnimationFrame(frame);

    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        cancelAnimationFrame(raf);
        state = build(el);
        raf = requestAnimationFrame(frame);
      }, 150);
    });
  }

  function init() {
    document.querySelectorAll('.marquee[data-phrases]').forEach(start);
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);
})();
