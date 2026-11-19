// Vice Story cover renderer. Draws the three-panel poster, the slitted retro sun,
// the palm silhouettes and the bold caption onto any canvas, at any post size.
// Every colour, panel and letter here is original art drawn in code.

var GRADES = {
  sunset: {
    label: 'Sunset', note: 'Orange sky, pink sea',
    sky: ['#2b0f3a', '#8f1d54', '#ff6a3d', '#ffb347'],
    sun: '#ffd76a', accent: '#ffb347', ink: '#1c0b26', tint: 'rgba(255, 90, 60, 0.16)',
    chip: '#2b0f3a', text: '#ffffff'
  },
  neon: {
    label: 'Neon Nights', note: 'Magenta streets, cyan glow',
    sky: ['#0d0620', '#3b0f5e', '#c2188b', '#22d3ee'],
    sun: '#ff4fd8', accent: '#22d3ee', ink: '#0d0620', tint: 'rgba(255, 60, 200, 0.18)',
    chip: '#160a33', text: '#ffffff'
  },
  gold: {
    label: 'Palm Gold', note: 'Gold light, teal shade',
    sky: ['#241505', '#7a4a08', '#e8a020', '#f7dc7d'],
    sun: '#fff3b0', accent: '#0f766e', ink: '#241505', tint: 'rgba(232, 160, 32, 0.16)',
    chip: '#241505', text: '#fff8e0'
  },
  midnight: {
    label: 'Midnight', note: 'Deep blue, violet haze',
    sky: ['#060a24', '#1b1f4b', '#5b2a86', '#b06fd6'],
    sun: '#c9b8ff', accent: '#8b7cff', ink: '#060a24', tint: 'rgba(90, 70, 220, 0.20)',
    chip: '#0a0f33', text: '#eef0ff'
  }
};

var LAYOUTS = {
  split: {
    label: 'Sunset Split', note: 'One hero panel, two stacked',
    rects: function (w, h) {
      var top = h * 0.74, m = w * 0.02, g = w * 0.015;
      return [
        { x: m, y: m, w: w * 0.58 - m - g / 2, h: top - m },
        { x: w * 0.58 + g / 2, y: m, w: w - w * 0.58 - m - g / 2, h: (top - m - g) / 2 },
        { x: w * 0.58 + g / 2, y: m + (top - m + g) / 2, w: w - w * 0.58 - m - g / 2, h: (top - m - g) / 2 }
      ];
    }
  },
  grid: {
    label: 'Neon Grid', note: 'Three tall columns',
    rects: function (w, h) {
      var top = h * 0.74, m = w * 0.02, g = w * 0.015;
      var cw = (w - 2 * m - 2 * g) / 3;
      return [
        { x: m, y: m, w: cw, h: top - m },
        { x: m + cw + g, y: m, w: cw, h: top - m },
        { x: m + 2 * (cw + g), y: m, w: cw, h: top - m }
      ];
    }
  },
  strip: {
    label: 'Vice Strip', note: 'Three wide bands',
    rects: function (w, h) {
      var top = h * 0.74, m = w * 0.02, g = h * 0.015;
      var rh = (top - m - 2 * g) / 3;
      return [
        { x: m, y: m, w: w - 2 * m, h: rh },
        { x: m, y: m + rh + g, w: w - 2 * m, h: rh },
        { x: m, y: m + 2 * (rh + g), w: w - 2 * m, h: rh }
      ];
    }
  }
};

/** Panel rectangles for a layout id at a canvas size. */
function panelRects(layout, w, h) {
  return LAYOUTS[layout].rects(w, h);
}

/** A retro sun: a filled disc with horizontal slits cut through its lower half. */
function drawSlittedSun(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  var gap = r * 0.22, y = cy + r * 0.08, thick = r * 0.07;
  while (y < cy + r) {
    ctx.fillRect(cx - r - 2, y, r * 2 + 4, thick);
    y += gap;
    thick += r * 0.02;
  }
  ctx.restore();
}

/** A small palm silhouette: one leaning trunk and five drooping fronds. */
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.3, y - s * 0.95);
  ctx.stroke();
  var topX = x + s * 0.3, topY = y - s * 0.95;
  for (var i = 0; i < 5; i++) {
    var a = -Math.PI * (0.08 + i * 0.19);
    var ex = topX + Math.cos(a) * s * 0.62;
    var ey = topY + Math.sin(a) * s * 0.42 + s * 0.34;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.4, topY + Math.sin(a) * s * 0.12, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** One photo, cover-fit into a panel rect, with zoom and pan offsets in -0.5..0.5. */
function drawPanelPhoto(ctx, img, rect, zoom, panX, panY) {
  if (!img) return;
  var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  var scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  var dw = iw * scale, dh = ih * scale;
  var dx = rect.x + (rect.w - dw) / 2 + panX * rect.w;
  var dy = rect.y + (rect.h - dh) / 2 + panY * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** The chapter tag chip pinned to a panel's top-left corner. */
function drawChapterTag(ctx, rect, text, grade) {
  if (!text) return;
  ctx.save();
  ctx.font = '700 ' + Math.max(12, rect.w * 0.032) + 'px "Arial Narrow", sans-serif';
  var pad = rect.w * 0.02 + 8;
  var tw = ctx.measureText(text).width + pad * 2;
  var th = Math.max(20, rect.w * 0.05);
  ctx.fillStyle = grade.chip;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(rect.x + rect.w * 0.02, rect.y + rect.w * 0.02, tw, th);
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.accent;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + rect.w * 0.02 + pad, rect.y + rect.w * 0.02 + th / 2 + 1);
  ctx.restore();
}

/** Kicker, big caption and subtitle across the foot band of the cover. */
function drawCaptionBlock(ctx, w, h, state, grade) {
  var bandY = h * 0.74, bandH = h - bandY;
  ctx.save();
  ctx.textAlign = 'center';
  var kicker = 'V I C E   S T O R Y';
  ctx.font = '700 ' + Math.max(13, h * 0.018) + 'px "Arial Narrow", sans-serif';
  ctx.fillStyle = grade.accent;
  ctx.fillText(kicker, w / 2, bandY + bandH * 0.16);
  var text = (state.caption || '').trim().toUpperCase();
  if (text) {
    var size = h * 0.105;
    ctx.font = '900 ' + size + 'px "Arial Narrow", "Helvetica Neue", sans-serif';
    while (ctx.measureText(text).width > w * 0.92 && size > 14) {
      size -= 2;
      ctx.font = '900 ' + size + 'px "Arial Narrow", "Helvetica Neue", sans-serif';
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.ink;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeText(text, w / 2, bandY + bandH * 0.60);
    ctx.fillStyle = grade.text;
    ctx.fillText(text, w / 2, bandY + bandH * 0.60);
  }
  var sub = (state.subtitle || '').trim().toUpperCase();
  if (sub) {
    ctx.font = '700 ' + Math.max(12, h * 0.02) + 'px "Arial Narrow", sans-serif';
    ctx.fillStyle = grade.text;
    ctx.globalAlpha = 0.85;
    ctx.fillText(sub, w / 2, bandY + bandH * 0.86);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Draws the whole cover for a state onto the canvas at its own size. */
function drawCover(canvas, state) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  var grade = GRADES[state.grade] || GRADES.sunset;
  var sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.45, grade.sky[1]);
  sky.addColorStop(0.75, grade.sky[2]);
  sky.addColorStop(1, grade.sky[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // The slitted sun rises behind the caption band, flanked by palms.
  var bandY = h * 0.74;
  drawSlittedSun(ctx, w * 0.5, bandY + (h - bandY) * 0.62, Math.min(w, h) * 0.16, grade.sun);
  drawPalm(ctx, w * 0.045, h * 0.985, Math.min(w, h) * 0.24, grade.ink);
  drawPalm(ctx, w * 0.955, h * 0.985, Math.min(w, h) * 0.20, grade.ink);

  // The three photo panels, each with its own crop and chapter tag.
  var rects = panelRects(state.layout, w, h);
  var firstImg = state.panels[0] && state.panels[0].img;
  for (var i = 0; i < 3; i++) {
    var p = state.panels[i] || {};
    var img = state.singlePhoto ? firstImg : p.img;
    var r = rects[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    if (img) {
      drawPanelPhoto(ctx, img, r, p.zoom || 1, p.panX || 0, p.panY || 0);
      ctx.fillStyle = grade.tint;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    } else {
      ctx.fillStyle = grade.sky[1];
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = grade.accent;
      ctx.font = '700 ' + Math.max(13, r.w * 0.04) + 'px "Arial Narrow", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ADD PHOTO ' + (i + 1), r.x + r.w / 2, r.y + r.h / 2);
    }
    ctx.restore();
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.strokeStyle = grade.ink;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = Math.max(1, w * 0.0012);
    ctx.strokeStyle = grade.accent;
    ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    drawChapterTag(ctx, r, (state.chapters || [])[i] || '', grade);
  }

  drawCaptionBlock(ctx, w, h, state, grade);
}
