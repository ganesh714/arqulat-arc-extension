/**
 * arc-preview.js
 * Runs inside VS Code's markdown preview context (nonce-approved via package.json).
 * Handles zoom controls for arqulat-arc diagrams using event delegation.
 * NO inline scripts or onclick handlers used — all CSP-safe.
 */
(function () {
  function fitDiagram(uid) {
    var wrap = document.getElementById(uid + '_wrap');
    var canvas = document.getElementById(uid + '_canvas');
    var label = document.getElementById(uid + '_zoom_label');
    if (!wrap || !canvas) { return; }
    var nw = parseFloat(canvas.dataset.nativeWidth || '800');
    var nh = parseFloat(canvas.dataset.nativeHeight || '400');
    var availW = wrap.clientWidth - 16;
    var availH = 440;
    var scl = Math.min(availW / nw, availH / nh, 1);
    scl = Math.round(scl * 100) / 100;
    canvas.style.transform = 'scale(' + scl + ')';
    canvas.style.transformOrigin = 'top left';
    wrap.style.maxHeight = Math.ceil(nh * scl + 24) + 'px';
    canvas.dataset.scale = String(scl);
    if (label) { label.textContent = Math.round(scl * 100) + '%'; }
  }

  function applyScale(uid, scl) {
    var wrap = document.getElementById(uid + '_wrap');
    var canvas = document.getElementById(uid + '_canvas');
    var label = document.getElementById(uid + '_zoom_label');
    if (!wrap || !canvas) { return; }
    var nh = parseFloat(canvas.dataset.nativeHeight || '400');
    canvas.style.transform = 'scale(' + scl + ')';
    canvas.style.transformOrigin = 'top left';
    wrap.style.maxHeight = Math.ceil(nh * scl + 24) + 'px';
    wrap.style.overflow = 'auto';
    canvas.dataset.scale = String(scl);
    if (label) { label.textContent = Math.round(scl * 100) + '%'; }
  }

  // Event delegation — single listener on document handles all diagram buttons
  document.addEventListener('click', function (e) {
    var btn = e.target;
    if (!btn || !btn.dataset) { return; }

    var uid = btn.dataset.arcUid;
    if (!uid) { return; }

    var action = btn.dataset.arcAction;
    var canvas = document.getElementById(uid + '_canvas');
    if (!canvas) { return; }

    var cur = parseFloat(canvas.dataset.scale || '1');

    if (action === 'fit') {
      fitDiagram(uid);
    } else if (action === '100') {
      applyScale(uid, 1);
    } else if (action === 'zoomin') {
      applyScale(uid, Math.min(Math.round((cur + 0.1) * 10) / 10, 3));
    } else if (action === 'zoomout') {
      applyScale(uid, Math.max(Math.round((cur - 0.1) * 10) / 10, 0.2));
    }
  });

  // Auto-fit all diagrams on load and on window resize
  function fitAll() {
    var wraps = document.querySelectorAll('[data-arc-wrap]');
    for (var i = 0; i < wraps.length; i++) {
      var uid = wraps[i].dataset.arcWrap;
      if (uid) { fitDiagram(uid); }
    }
  }

  // Run on first load and whenever the preview re-renders
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fitAll);
  } else {
    fitAll();
  }
  window.addEventListener('resize', fitAll);

  // VS Code re-renders markdown on save — observe DOM for new diagrams
  var observer = new MutationObserver(function () { fitAll(); });
  observer.observe(document.body, { childList: true, subtree: true });
})();
