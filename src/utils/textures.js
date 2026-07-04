import * as THREE from 'three';

/**
 * Helper to create CanvasTextures for Color, Bump/Height, and Roughness maps
 */
export function createPBRTextures(type, config) {
  if (typeof window === 'undefined') {
    return { map: null, bumpMap: null, roughnessMap: null };
  }

  const width = config.width || 512;
  const height = config.height || 512;

  // 1. CREATE COLOR CANVAS
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const colorCtx = colorCanvas.getContext('2d');

  // 2. CREATE BUMP (HEIGHT) CANVAS (grayscale: white = high, black = deep crack/grain)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext('2d');

  // 3. CREATE ROUGHNESS CANVAS (grayscale: white = rough, black = shiny)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const roughCtx = roughCanvas.getContext('2d');

  if (type === 'wood') {
    const { c1, c2 } = config; // base wood color & grain color

    // --- Color Map ---
    colorCtx.fillStyle = c1;
    colorCtx.fillRect(0, 0, width, height);

    // --- Bump Map (base height) ---
    bumpCtx.fillStyle = '#ffffff';
    bumpCtx.fillRect(0, 0, width, height);

    // --- Roughness Map (base roughness) ---
    roughCtx.fillStyle = '#b3b3b3'; // base 0.7 roughness
    roughCtx.fillRect(0, 0, width, height);

    // Draw wood grain lines on all three maps
    const grainCount = config.grainCount || 80;
    for (let i = 0; i < grainCount; i++) {
      const y = Math.random() * height;
      
      // Draw curvy grain line path
      const drawPath = (ctx) => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(
          width * 0.25, y + (Math.random() - 0.5) * 80,
          width * 0.75, y + (Math.random() - 0.5) * 80,
          width, y + (Math.random() - 0.5) * 30
        );
      };

      // Draw color grain
      drawPath(colorCtx);
      colorCtx.strokeStyle = c2;
      colorCtx.lineWidth = 1 + Math.random() * 2;
      colorCtx.globalAlpha = 0.4 + Math.random() * 0.4;
      colorCtx.stroke();

      // Draw bump depth (grain lines are recessed)
      drawPath(bumpCtx);
      bumpCtx.strokeStyle = '#222222'; // dark recessed lines
      bumpCtx.lineWidth = 1 + Math.random() * 1.5;
      bumpCtx.globalAlpha = 0.5;
      bumpCtx.stroke();

      // Draw roughness (grain lines are rougher/dryer)
      drawPath(roughCtx);
      roughCtx.strokeStyle = '#ffffff'; // rough lines (1.0 roughness)
      roughCtx.lineWidth = 1 + Math.random() * 2;
      roughCtx.globalAlpha = 0.4;
      roughCtx.stroke();
    }

    // Reset alpha
    colorCtx.globalAlpha = 1.0;
    bumpCtx.globalAlpha = 1.0;
    roughCtx.globalAlpha = 1.0;

    // Draw swirls (knots)
    const knotCount = config.knotCount || 2;
    for (let k = 0; k < knotCount; k++) {
      const kx = Math.random() * width;
      const ky = Math.random() * height;
      
      const drawKnot = (ctx, strokeStyle, alpha) => {
        ctx.save();
        ctx.translate(kx, ky);
        ctx.scale(1, 0.45);
        ctx.globalAlpha = alpha;
        for (let r = 10; r < 50; r += 8) {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      };

      drawKnot(colorCtx, c2, 0.25);
      drawKnot(bumpCtx, '#222222', 0.3);
      drawKnot(roughCtx, '#ffffff', 0.25);
    }

    // Add noise speckles (grunge/wear)
    colorCtx.globalAlpha = 1.0;
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 1 + Math.random() * 3;
      const darkOpacity = Math.random() * 0.22;

      colorCtx.fillStyle = `rgba(0, 0, 0, ${darkOpacity})`;
      colorCtx.fillRect(x, y, size, size);

      // Noise makes surface bumpy
      bumpCtx.fillStyle = `rgba(0, 0, 0, ${darkOpacity * 0.4})`;
      bumpCtx.fillRect(x, y, size, size);

      // Noise spots are rougher
      roughCtx.fillStyle = `rgba(255, 255, 255, ${darkOpacity * 0.5})`;
      roughCtx.fillRect(x, y, size, size);
    }

    // Plank seams — long grooves that break the surface into boards
    const plankCount = config.plankCount || 5;
    for (let p = 1; p <= plankCount; p++) {
      const py = (height / (plankCount + 1)) * p + (Math.random() - 0.5) * 12;
      const wobble = (ctx) => {
        ctx.beginPath();
        ctx.moveTo(0, py);
        for (let sx = 0; sx <= width; sx += 32) {
          ctx.lineTo(sx, py + (Math.random() - 0.5) * 3);
        }
      };
      wobble(colorCtx);
      colorCtx.strokeStyle = c2;
      colorCtx.lineWidth = 2.5;
      colorCtx.globalAlpha = 0.85;
      colorCtx.stroke();
      // dark recessed groove
      wobble(bumpCtx);
      bumpCtx.strokeStyle = '#000000';
      bumpCtx.lineWidth = 3;
      bumpCtx.globalAlpha = 0.9;
      bumpCtx.stroke();
      // seams collect dust → rougher
      wobble(roughCtx);
      roughCtx.strokeStyle = '#ffffff';
      roughCtx.lineWidth = 3;
      roughCtx.globalAlpha = 0.7;
      roughCtx.stroke();
    }
    colorCtx.globalAlpha = 1.0;
    bumpCtx.globalAlpha = 1.0;
    roughCtx.globalAlpha = 1.0;
  }

  if (type === 'tile') {
    const { c1, c2 } = config; // base tile color & crack/grain color

    // --- Color Map ---
    colorCtx.fillStyle = c1;
    colorCtx.fillRect(0, 0, width, height);

    // --- Bump Map ---
    bumpCtx.fillStyle = '#ffffff';
    bumpCtx.fillRect(0, 0, width, height);

    // --- Roughness Map ---
    roughCtx.fillStyle = '#999999'; // base 0.6 roughness
    roughCtx.fillRect(0, 0, width, height);

    // Draw tile scratches & cracks
    const crackCount = config.crackCount || 10;
    for (let i = 0; i < crackCount; i++) {
      let cx = Math.random() * width;
      let cy = Math.random() * height;

      const drawCrack = (ctx) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const segments = 3 + Math.floor(Math.random() * 4);
        let tx = cx;
        let ty = cy;
        for (let j = 0; j < segments; j++) {
          tx += (Math.random() - 0.5) * 45;
          ty += (Math.random() - 0.5) * 45;
          ctx.lineTo(tx, ty);
        }
      };

      // Draw color crack
      drawCrack(colorCtx);
      colorCtx.strokeStyle = c2;
      colorCtx.lineWidth = 0.8 + Math.random() * 1.5;
      colorCtx.globalAlpha = 0.35 + Math.random() * 0.35;
      colorCtx.stroke();

      // Draw bump crack (very deep recess)
      drawCrack(bumpCtx);
      bumpCtx.strokeStyle = '#000000'; // black lines (full recess)
      bumpCtx.lineWidth = 1.0 + Math.random() * 1.5;
      bumpCtx.globalAlpha = 0.8;
      bumpCtx.stroke();

      // Draw roughness crack (cracks accumulate dust, so they are 1.0 rough)
      drawCrack(roughCtx);
      roughCtx.strokeStyle = '#ffffff'; // rough lines
      roughCtx.lineWidth = 1.0 + Math.random() * 2.0;
      roughCtx.globalAlpha = 0.6;
      roughCtx.stroke();
    }

    // Reset alpha
    colorCtx.globalAlpha = 1.0;
    bumpCtx.globalAlpha = 1.0;
    roughCtx.globalAlpha = 1.0;

    // Add general grunge stains
    for (let i = 0; i < 15; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      const sr = 10 + Math.random() * 40;
      const opacity = Math.random() * 0.25;

      // Color dark grunge stain
      const colorGrad = colorCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      colorGrad.addColorStop(0, `rgba(10, 8, 5, ${opacity})`);
      colorGrad.addColorStop(1, 'rgba(10, 8, 5, 0)');
      colorCtx.fillStyle = colorGrad;
      colorCtx.beginPath();
      colorCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      colorCtx.fill();

      // Bump recession on stains (simulates indentations/dents)
      const bumpGrad = bumpCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      bumpGrad.addColorStop(0, `rgba(180, 180, 180, ${opacity * 0.5})`);
      bumpGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      bumpCtx.fillStyle = bumpGrad;
      bumpCtx.beginPath();
      bumpCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      bumpCtx.fill();

      // Roughness increase on stains
      const roughGrad = roughCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      roughGrad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.8})`);
      roughGrad.addColorStop(1, 'rgba(153, 153, 153, 0)');
      roughCtx.fillStyle = roughGrad;
      roughCtx.beginPath();
      roughCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      roughCtx.fill();
    }

    // Subtle worn-edge darkening (kept gentle so tiles don't read as framed boxes)
    const bevelGrad = colorCtx.createRadialGradient(width / 2, height / 2, width / 2.2, width / 2, height / 2, width / 1.35);
    bevelGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bevelGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)'); // lightly worn edges
    colorCtx.fillStyle = bevelGrad;
    colorCtx.fillRect(0, 0, width, height);

    // Bevel bump (edges slope gently downward)
    const bevelBumpGrad = bumpCtx.createRadialGradient(width / 2, height / 2, width / 2.2, width / 2, height / 2, width / 1.4);
    bevelBumpGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    bevelBumpGrad.addColorStop(1, 'rgba(150, 150, 150, 0.4)'); // softly sloped edges
    bumpCtx.fillStyle = bevelBumpGrad;
    bumpCtx.fillRect(0, 0, width, height);
  }

  // Generate textures from canvases
  const map = new THREE.CanvasTexture(colorCanvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);

  // Allow callers to tile these (e.g. the board frame) for higher detail.
  for (const t of [map, bumpMap, roughnessMap]) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  }

  return { map, bumpMap, roughnessMap };
}

/**
 * Creates a generic procedural noise texture to be used as a fine bump map on pieces,
 * which scatters light and removes the glossy/smooth plastic look.
 */
export function createNoiseTexture(width = 128, height = 128) {
  if (typeof window === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, width, height);

  // Draw fine random grain
  for (let i = 0; i < width * height * 0.4; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const val = 128 + Math.floor((Math.random() - 0.5) * 80);
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/**
 * Procedural carved-stone / aged-marble material for the chess pieces.
 * Returns tiling color + roughness + bump maps so the pieces read as weathered,
 * chiselled stone instead of smooth plastic.
 *
 * config: { base, vein, spot, repeat }
 *   base = dominant stone colour, vein = mineral veining, spot = age/dirt spots
 */
export function createStoneTexture(config) {
  if (typeof window === 'undefined') {
    return { map: null, bumpMap: null, roughnessMap: null };
  }

  const size = 512;
  const { base, vein, spot } = config;
  const repeat = config.repeat || 2;

  const make = () => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return { c, ctx: c.getContext('2d') };
  };
  const color = make();
  const bump = make();
  const rough = make();

  // Base fills
  color.ctx.fillStyle = base;
  color.ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = '#8a8a8a'; // mid height
  bump.ctx.fillRect(0, 0, size, size);
  rough.ctx.fillStyle = '#a6a6a6'; // fairly rough stone (~0.65)
  rough.ctx.fillRect(0, 0, size, size);

  // Broad mottling — soft cloudy patches of veined / lighter mineral
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 40 + Math.random() * 120;
    const a = 0.05 + Math.random() * 0.14;
    const g = color.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(vein, a));
    g.addColorStop(1, hexA(vein, 0));
    color.ctx.fillStyle = g;
    color.ctx.fillRect(0, 0, size, size);
    // matching gentle height swell + slight polish (lower roughness) on mineral
    const bg = bump.ctx.createRadialGradient(x, y, 0, x, y, r);
    bg.addColorStop(0, `rgba(200,200,200,${a})`);
    bg.addColorStop(1, 'rgba(200,200,200,0)');
    bump.ctx.fillStyle = bg;
    bump.ctx.fillRect(0, 0, size, size);
    const rg = rough.ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(90,90,90,${a * 1.2})`);
    rg.addColorStop(1, 'rgba(90,90,90,0)');
    rough.ctx.fillStyle = rg;
    rough.ctx.fillRect(0, 0, size, size);
  }

  // Thin marble veins — meandering fractal-ish lines
  const veinCount = 16;
  for (let i = 0; i < veinCount; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    let ang = Math.random() * Math.PI * 2;
    const steps = 40 + Math.floor(Math.random() * 40);
    const drawVein = (ctx, style, w, a) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = style;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let vx = x, vy = y, va = ang;
      for (let s = 0; s < steps; s++) {
        va += (Math.random() - 0.5) * 0.7;
        vx += Math.cos(va) * 6;
        vy += Math.sin(va) * 6;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
      ctx.restore();
    };
    drawVein(color.ctx, vein, 0.6 + Math.random() * 1.6, 0.4 + Math.random() * 0.4);
    drawVein(bump.ctx, '#242424', 1.2 + Math.random() * 1.8, 0.7); // deeper recessed grooves
    drawVein(rough.ctx, '#f4f4f4', 1.2 + Math.random() * 1.8, 0.6); // and are rougher
  }

  // Age spots / pitting — dark speckle clusters (chips and dirt)
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = 0.5 + Math.random() * 2.6;
    const d = Math.random();
    color.ctx.fillStyle = hexA(spot, d * 0.3);
    color.ctx.fillRect(x, y, s, s);
    // pits are recessed + catch dirt (rougher)
    const pv = Math.floor(40 + Math.random() * 40);
    bump.ctx.fillStyle = `rgba(${pv},${pv},${pv},${d * 0.7})`;
    bump.ctx.fillRect(x, y, s, s);
    rough.ctx.fillStyle = `rgba(255,255,255,${d * 0.4})`;
    rough.ctx.fillRect(x, y, s, s);
  }

  // Fine chisel/tool striations for a hand-carved read
  for (let i = 0; i < 40; i++) {
    const y0 = Math.random() * size;
    color.ctx.save();
    color.ctx.globalAlpha = 0.05 + Math.random() * 0.06;
    color.ctx.strokeStyle = spot;
    color.ctx.lineWidth = 0.6;
    color.ctx.beginPath();
    color.ctx.moveTo(0, y0);
    color.ctx.lineTo(size, y0 + (Math.random() - 0.5) * 20);
    color.ctx.stroke();
    color.ctx.restore();
    bump.ctx.save();
    bump.ctx.globalAlpha = 0.25;
    bump.ctx.strokeStyle = '#5a5a5a';
    bump.ctx.lineWidth = 0.8;
    bump.ctx.beginPath();
    bump.ctx.moveTo(0, y0);
    bump.ctx.lineTo(size, y0 + (Math.random() - 0.5) * 20);
    bump.ctx.stroke();
    bump.ctx.restore();
  }

  // A few worn / polished highlights where the stone has been handled smooth
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 50;
    const rg = rough.ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(40,40,40,0.35)'); // smoother (shinier) worn spot
    rg.addColorStop(1, 'rgba(40,40,40,0)');
    rough.ctx.fillStyle = rg;
    rough.ctx.fillRect(0, 0, size, size);
  }

  const tex = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    return t;
  };

  return { map: tex(color.c), bumpMap: tex(bump.c), roughnessMap: tex(rough.c) };
}

/**
 * Turned-wood material for chess pieces — vertical grain (along the lathe axis)
 * with figure banding, so the pieces read as satin boxwood / walnut.
 *
 * config: { base, grain, repeat }
 */
export function createWoodPieceTexture(config) {
  if (typeof window === 'undefined') {
    return { map: null, bumpMap: null, roughnessMap: null };
  }

  const size = 512;
  const { base, grain } = config;
  const repeat = config.repeat || 2;

  const make = () => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return { c, ctx: c.getContext('2d') };
  };
  const color = make();
  const bump = make();
  const rough = make();

  color.ctx.fillStyle = base;
  color.ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = '#8a8a8a';
  bump.ctx.fillRect(0, 0, size, size);
  rough.ctx.fillStyle = '#9c9c9c'; // satin base (~0.61)
  rough.ctx.fillRect(0, 0, size, size);

  // Broad vertical tonal bands (heartwood/sapwood figure)
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * size;
    const w = 12 + Math.random() * 46;
    color.ctx.fillStyle = hexA(grain, Math.random() * 0.12);
    color.ctx.fillRect(x, 0, w, size);
  }

  // A wavy vertical streak (constant U, running down V = along the piece)
  const streak = (ctx, x, style, alpha, lw, amp) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = style;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, -4);
    for (let y = 0; y <= size + 4; y += 22) {
      const px = x + Math.sin(y * 0.018 + x * 0.5) * amp + (Math.random() - 0.5) * 1.6;
      ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Dense fine grain streaks — the dominant wood look
  for (let i = 0; i < 320; i++) {
    const x = Math.random() * size;
    const a = 0.08 + Math.random() * 0.28;
    const lw = 0.5 + Math.random() * 1.7;
    const amp = 1 + Math.random() * 5;
    streak(color.ctx, x, grain, a, lw, amp);
    streak(bump.ctx, x, '#2f2f2f', a * 0.9, lw, amp); // grain lines sit recessed
    streak(rough.ctx, x, '#ececec', a * 0.6, lw, amp); // and are a touch rougher
  }

  // A few bolder figure lines
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * size;
    streak(color.ctx, x, grain, 0.3 + Math.random() * 0.25, 1.4 + Math.random() * 1.6, 3 + Math.random() * 6);
    streak(bump.ctx, x, '#2c2c2c', 0.5, 1.6, 3 + Math.random() * 6);
  }

  // Fine speckle so it isn't perfectly uniform
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = 0.5 + Math.random() * 1.6;
    const d = Math.random() * 0.12;
    color.ctx.fillStyle = hexA(grain, d);
    color.ctx.fillRect(x, y, s, s);
    bump.ctx.fillStyle = `rgba(70,70,70,${d * 0.6})`;
    bump.ctx.fillRect(x, y, s, s);
  }

  // Aging: soft dark patina blotches (uneven darkening from age & handling)
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 45 + Math.random() * 150;
    const g = color.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(grain, 0.1 + Math.random() * 0.18));
    g.addColorStop(1, hexA(grain, 0));
    color.ctx.fillStyle = g;
    color.ctx.fillRect(0, 0, size, size);
  }

  // Wear scratches & dings — mostly along the grain, light and dark
  for (let i = 0; i < 28; i++) {
    const vert = Math.random() < 0.72;
    const len = 18 + Math.random() * 95;
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const ex = vert ? sx + (Math.random() - 0.5) * 8 : sx + len;
    const ey = vert ? sy + len : sy + (Math.random() - 0.5) * 8;
    const light = Math.random() < 0.45;
    color.ctx.save();
    color.ctx.globalAlpha = 0.1 + Math.random() * 0.18;
    color.ctx.strokeStyle = light ? '#ffffff' : '#000000';
    color.ctx.lineWidth = 0.5 + Math.random();
    color.ctx.beginPath();
    color.ctx.moveTo(sx, sy);
    color.ctx.lineTo(ex, ey);
    color.ctx.stroke();
    color.ctx.restore();
    bump.ctx.save();
    bump.ctx.globalAlpha = 0.3;
    bump.ctx.strokeStyle = light ? '#c8c8c8' : '#2c2c2c';
    bump.ctx.lineWidth = 0.9;
    bump.ctx.beginPath();
    bump.ctx.moveTo(sx, sy);
    bump.ctx.lineTo(ex, ey);
    bump.ctx.stroke();
    bump.ctx.restore();
  }

  const tex = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    return t;
  };

  return { map: tex(color.c), bumpMap: tex(bump.c), roughnessMap: tex(rough.c) };
}

/**
 * Aged / stained wood tile. Each `variant` (0-3) is a different kind of wear so the
 * board squares read as an old, used wooden board rather than a fresh stamp:
 *   0 = lightly worn   1 = dark spill stains   2 = water rings   3 = heavy scuffing
 *
 * config: { base, grain, variant }
 */
export function createWoodTileTexture(config) {
  if (typeof window === 'undefined') {
    return { map: null, bumpMap: null, roughnessMap: null };
  }

  const size = 256;
  const { base, grain, variant = 0 } = config;

  const make = () => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return { c, ctx: c.getContext('2d') };
  };
  const color = make();
  const bump = make();
  const rough = make();

  color.ctx.fillStyle = base;
  color.ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = '#8a8a8a';
  bump.ctx.fillRect(0, 0, size, size);
  rough.ctx.fillStyle = '#a0a0a0';
  rough.ctx.fillRect(0, 0, size, size);

  // Broad tonal banding
  for (let i = 0; i < 8; i++) {
    const y = Math.random() * size;
    color.ctx.fillStyle = hexA(grain, Math.random() * 0.1);
    color.ctx.fillRect(0, y, size, 6 + Math.random() * 28);
  }

  // Horizontal wavy grain (the plank grain of the square)
  const grainLine = (ctx, y, style, alpha, lw, amp) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = style;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-4, y);
    for (let x = 0; x <= size + 4; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.03 + y) * amp + (Math.random() - 0.5) * 1.4);
    }
    ctx.stroke();
    ctx.restore();
  };
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * size;
    const a = 0.06 + Math.random() * 0.2;
    const lw = 0.5 + Math.random() * 1.4;
    const amp = 1 + Math.random() * 4;
    grainLine(color.ctx, y, grain, a, lw, amp);
    grainLine(bump.ctx, y, '#323232', a * 0.8, lw, amp);
    grainLine(rough.ctx, y, '#e6e6e6', a * 0.5, lw, amp);
  }

  // Stain / wear helpers
  const darkStain = (x, y, r, op) => {
    const g = color.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(22, 13, 6, ${op})`);
    g.addColorStop(0.7, `rgba(22, 13, 6, ${op * 0.4})`);
    g.addColorStop(1, 'rgba(22, 13, 6, 0)');
    color.ctx.fillStyle = g;
    color.ctx.fillRect(0, 0, size, size);
    const rg = rough.ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(255,255,255,${op * 0.5})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    rough.ctx.fillStyle = rg;
    rough.ctx.fillRect(0, 0, size, size);
  };
  const waterRing = (x, y, r) => {
    color.ctx.save();
    color.ctx.strokeStyle = 'rgba(28, 16, 7, 1)';
    color.ctx.globalAlpha = 0.2;
    color.ctx.lineWidth = 2.2;
    color.ctx.beginPath();
    color.ctx.arc(x, y, r, 0, Math.PI * 2);
    color.ctx.stroke();
    color.ctx.globalAlpha = 0.1;
    color.ctx.lineWidth = 1.4;
    color.ctx.beginPath();
    color.ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
    color.ctx.stroke();
    color.ctx.restore();
  };
  const scratch = (light) => {
    const x0 = Math.random() * size;
    const y0 = Math.random() * size;
    const len = 15 + Math.random() * 70;
    const ang = Math.random() * Math.PI;
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    color.ctx.save();
    color.ctx.globalAlpha = 0.08 + Math.random() * 0.15;
    color.ctx.strokeStyle = light ? '#ffffff' : '#000000';
    color.ctx.lineWidth = 0.5 + Math.random();
    color.ctx.beginPath();
    color.ctx.moveTo(x0, y0);
    color.ctx.lineTo(x1, y1);
    color.ctx.stroke();
    color.ctx.restore();
    bump.ctx.save();
    bump.ctx.globalAlpha = 0.3;
    bump.ctx.strokeStyle = light ? '#c8c8c8' : '#2a2a2a';
    bump.ctx.lineWidth = 0.8;
    bump.ctx.beginPath();
    bump.ctx.moveTo(x0, y0);
    bump.ctx.lineTo(x1, y1);
    bump.ctx.stroke();
    bump.ctx.restore();
  };
  const rnd = () => Math.random() * size;

  if (variant === 0) {
    for (let i = 0; i < 2; i++) darkStain(rnd(), rnd(), 30 + Math.random() * 40, 0.1);
    for (let i = 0; i < 7; i++) scratch(Math.random() < 0.5);
  } else if (variant === 1) {
    darkStain(size * 0.3 + Math.random() * size * 0.4, size * 0.3 + Math.random() * size * 0.4, 65 + Math.random() * 55, 0.32);
    for (let i = 0; i < 3; i++) darkStain(rnd(), rnd(), 25 + Math.random() * 40, 0.16);
    for (let i = 0; i < 5; i++) scratch(false);
  } else if (variant === 2) {
    waterRing(size * 0.4 + Math.random() * size * 0.25, size * 0.4 + Math.random() * size * 0.25, 26 + Math.random() * 28);
    if (Math.random() < 0.6) waterRing(rnd(), rnd(), 20 + Math.random() * 24);
    for (let i = 0; i < 4; i++) scratch(Math.random() < 0.5);
    darkStain(rnd(), rnd(), 32, 0.12);
  } else {
    for (let i = 0; i < 18; i++) scratch(Math.random() < 0.4);
    for (let i = 0; i < 2; i++) darkStain(rnd(), rnd(), 35 + Math.random() * 30, 0.15);
  }

  // Fine speckle grime
  for (let i = 0; i < 1100; i++) {
    const x = rnd();
    const y = rnd();
    const s = 0.5 + Math.random() * 1.2;
    color.ctx.fillStyle = hexA(grain, Math.random() * 0.1);
    color.ctx.fillRect(x, y, s, s);
  }

  // Gentle worn-edge grime (mild, so tiles don't read as framed boxes)
  const eg = color.ctx.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size * 0.72);
  eg.addColorStop(0, 'rgba(0,0,0,0)');
  eg.addColorStop(1, 'rgba(0,0,0,0.15)');
  color.ctx.fillStyle = eg;
  color.ctx.fillRect(0, 0, size, size);

  const tex = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 4;
    return t;
  };
  return { map: tex(color.c), bumpMap: tex(bump.c), roughnessMap: tex(rough.c) };
}

// Helper: hex colour + alpha → rgba() string
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
