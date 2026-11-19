// Vice Story editor: wires the controls to the cover renderer, loads photos from
// the user's machine, crops each panel by drag and wheel, and exports exact-size PNGs.
// A `?shot=` query builds a fixed scene for screenshots instead of the editor.

var SIZES = {
  square: { label: 'Square', note: '1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait', note: '1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide', note: '1920 × 1080', w: 1920, h: 1080 }
};
var SAMPLES = ['samples/pier.jpg', 'samples/boulevard.jpg'];

var state = {
  layout: 'split',
  grade: 'sunset',
  size: 'square',
  caption: 'Sunset Heist',
  subtitle: 'LEONIDA · 2026',
  chapters: ['01 · Arrival', '02 · The Hustle', '03 · Sunset'],
  singlePhoto: true,
  panels: [
    { img: null, zoom: 1.15, panX: 0, panY: 0 },
    { img: null, zoom: 1.15, panX: 0, panY: 0 },
    { img: null, zoom: 1.15, panX: 0, panY: 0 }
  ]
};
var selected = 0;
var sampleIndex = 0;

var preview = document.getElementById('preview');
var statusEl = document.getElementById('status');

/** Loads an image from a URL or blob URL, resolving once it can be drawn. */
function loadImage(url) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function setStatus(text) { statusEl.textContent = text; }

/** Redraws the preview canvas at the chosen post size. */
function redraw() {
  var size = SIZES[state.size];
  preview.width = size.w;
  preview.height = size.h;
  drawCover(preview, state);
}

/** Builds one row of toggle buttons from a table of {label, note} entries. */
function buildChoices(el, table, current, onPick) {
  el.innerHTML = '';
  Object.keys(table).forEach(function (key) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (key === current ? ' active' : '');
    b.innerHTML = '';
    var t = document.createElement('span');
    t.textContent = table[key].label;
    var n = document.createElement('small');
    n.textContent = table[key].note;
    b.appendChild(t);
    b.appendChild(n);
    b.addEventListener('click', function () {
      onPick(key);
      buildChoices(el, table, key, onPick);
      redraw();
    });
    el.appendChild(b);
  });
}

function buildPickers() {
  var wrap = document.getElementById('panelPickers');
  wrap.innerHTML = '';
  state.panels.forEach(function (panel, i) {
    var row = document.createElement('div');
    row.className = 'picker-row';
    var name = document.createElement('span');
    name.textContent = 'Panel ' + (i + 1) + (panel.img ? ' · photo set' : ' · empty');
    var label = document.createElement('label');
    label.textContent = 'Choose photo';
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      loadImage(URL.createObjectURL(file)).then(function (img) {
        if (state.singlePhoto) {
          state.panels.forEach(function (p) { p.img = img; });
        } else {
          panel.img = img;
        }
        buildPickers();
        redraw();
        setStatus('Photo loaded. Drag a panel to frame it, then export.');
      });
    });
    label.appendChild(input);
    row.appendChild(name);
    row.appendChild(label);
    wrap.appendChild(row);
  });
}

function buildChapters() {
  var wrap = document.getElementById('chapterInputs');
  wrap.innerHTML = '';
  state.chapters.forEach(function (text, i) {
    var label = document.createElement('label');
    label.className = 'field';
    label.textContent = 'Chapter ' + (i + 1) + ' tag';
    var input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 24;
    input.value = text;
    input.addEventListener('input', function () {
      state.chapters[i] = input.value;
      redraw();
    });
    label.appendChild(input);
    wrap.appendChild(label);
  });
}

function syncPanelControls() {
  var p = state.panels[selected];
  document.getElementById('zoomRange').value = p.zoom;
  document.getElementById('panXRange').value = p.panX;
  document.getElementById('panYRange').value = p.panY;
  document.getElementById('selectedLabel').textContent = 'Panel ' + (selected + 1) + ' selected.';
}

/** Picks which panel a point on the preview canvas falls inside. */
function pickPanel(clientX, clientY) {
  var box = preview.getBoundingClientRect();
  var x = (clientX - box.left) * (preview.width / box.width);
  var y = (clientY - box.top) * (preview.height / box.height);
  var rects = panelRects(state.layout, preview.width, preview.height);
  for (var i = 0; i < rects.length; i++) {
    var r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

var dragging = false, lastX = 0, lastY = 0;
preview.addEventListener('pointerdown', function (e) {
  var hit = pickPanel(e.clientX, e.clientY);
  if (hit < 0) return;
  selected = hit;
  syncPanelControls();
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  preview.setPointerCapture(e.pointerId);
});
preview.addEventListener('pointermove', function (e) {
  if (!dragging) return;
  var box = preview.getBoundingClientRect();
  var p = state.panels[selected];
  p.panX = Math.max(-0.5, Math.min(0.5, p.panX + (e.clientX - lastX) / box.width));
  p.panY = Math.max(-0.5, Math.min(0.5, p.panY + (e.clientY - lastY) / box.height));
  lastX = e.clientX;
  lastY = e.clientY;
  syncPanelControls();
  redraw();
});
preview.addEventListener('pointerup', function () { dragging = false; });
preview.addEventListener('wheel', function (e) {
  e.preventDefault();
  var hit = pickPanel(e.clientX, e.clientY);
  if (hit < 0) return;
  selected = hit;
  var p = state.panels[selected];
  p.zoom = Math.max(1, Math.min(2.5, p.zoom + (e.deltaY < 0 ? 0.08 : -0.08)));
  syncPanelControls();
  redraw();
}, { passive: false });

document.getElementById('zoomRange').addEventListener('input', function (e) {
  state.panels[selected].zoom = parseFloat(e.target.value);
  redraw();
});
document.getElementById('panXRange').addEventListener('input', function (e) {
  state.panels[selected].panX = parseFloat(e.target.value);
  redraw();
});
document.getElementById('panYRange').addEventListener('input', function (e) {
  state.panels[selected].panY = parseFloat(e.target.value);
  redraw();
});
document.getElementById('singlePhoto').addEventListener('change', function (e) {
  state.singlePhoto = e.target.checked;
  if (state.singlePhoto) {
    var first = state.panels[0].img || state.panels[1].img || state.panels[2].img;
    state.panels.forEach(function (p) { p.img = first; });
  }
  buildPickers();
  redraw();
});
document.getElementById('captionInput').addEventListener('input', function (e) {
  state.caption = e.target.value;
  redraw();
});
document.getElementById('subtitleInput').addEventListener('input', function (e) {
  state.subtitle = e.target.value;
  redraw();
});

/** Loads the next sample photo into every panel. */
function loadSample() {
  var url = SAMPLES[sampleIndex % SAMPLES.length];
  sampleIndex++;
  return loadImage(url).then(function (img) {
    state.panels.forEach(function (p) { p.img = img; });
    buildPickers();
    redraw();
    setStatus('Sample photo loaded. Swap in your own photo any time.');
  });
}
document.getElementById('sampleBtn').addEventListener('click', loadSample);

/** Exports the cover at its exact post size as a PNG download. */
function exportPNG() {
  var size = SIZES[state.size];
  var off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  off.toBlob(function (blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vice-story-' + size.w + 'x' + size.h + '.png';
    a.click();
    setStatus('Saved vice-story-' + size.w + 'x' + size.h + '.png (' + size.w + ' × ' + size.h + ').');
  }, 'image/png');
}
document.getElementById('exportBtn').addEventListener('click', exportPNG);
document.getElementById('exportBtn2').addEventListener('click', exportPNG);

/** Fixed scenes for screenshots: ?shot=editor shows the editor with a photo loaded,
 *  ?shot=cover shows the cover alone, full-window. window.__shotReady marks it painted. */
function runShot() {
  var q = new URLSearchParams(location.search);
  var shot = q.get('shot');
  if (!shot) return false;
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('grade') && GRADES[q.get('grade')]) state.grade = q.get('grade');
  if (q.get('size') && SIZES[q.get('size')]) state.size = q.get('size');
  if (q.get('caption')) {
    state.caption = q.get('caption');
    document.getElementById('captionInput').value = state.caption;
  }
  if (q.get('chapters')) state.chapters = q.get('chapters').split('|').slice(0, 3);
  var photo = 'samples/' + (q.get('photo') || 'pier') + '.jpg';
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    document.getElementById('editor').hidden = true;
    document.getElementById('coverStage').hidden = false;
    var stage = document.getElementById('coverCanvas');
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
    return loadImage(photo).then(function (img) {
      state.panels.forEach(function (p) { p.img = img; });
      drawCover(stage, state);
      requestAnimationFrame(function () { requestAnimationFrame(function () { window.__shotReady = true; }); });
    });
  }
  return loadImage(photo).then(function (img) {
    state.panels.forEach(function (p) { p.img = img; });
    buildPickers();
    redraw();
    requestAnimationFrame(function () { requestAnimationFrame(function () { window.__shotReady = true; }); });
  });
}

buildChoices(document.getElementById('layoutChoices'), LAYOUTS, state.layout, function (k) { state.layout = k; });
buildChoices(document.getElementById('gradeChoices'), GRADES, state.grade, function (k) { state.grade = k; });
buildChoices(document.getElementById('sizeChoices'), SIZES, state.size, function (k) { state.size = k; });
buildPickers();
buildChapters();
syncPanelControls();
if (!runShot()) {
  loadSample();
  redraw();
}
