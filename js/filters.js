// ═══════════════════════════════════════════════════════════════════════════
//  MAMBAQ Filters — Transformaciones artísticas reales con canvas
//  Cada estilo aplica algoritmos de manipulación de píxeles específicos
//  del artista, no solo filtros CSS.
// ═══════════════════════════════════════════════════════════════════════════

// ── Utilidades de color ───────────────────────────────────────────────────

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h)       * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

// ── Blur separable (horizontal + vertical) — O(n·r) ──────────────────────

function blurH(src, dst, w, h, r) {
  for (let y = 0; y < h; y++) {
    let sr = 0, sg = 0, sb = 0;
    for (let x = -r; x <= r; x++) {
      const i = (y * w + Math.max(0, x)) * 4;
      sr += src[i]; sg += src[i+1]; sb += src[i+2];
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      dst[o]   = sr / (2*r+1);
      dst[o+1] = sg / (2*r+1);
      dst[o+2] = sb / (2*r+1);
      dst[o+3] = src[o+3];
      const add = Math.min(w-1, x+r+1), rem = Math.max(0, x-r);
      const ia = (y*w+add)*4, ir = (y*w+rem)*4;
      sr += src[ia]-src[ir]; sg += src[ia+1]-src[ir+1]; sb += src[ia+2]-src[ir+2];
    }
  }
}

function blurV(src, dst, w, h, r) {
  for (let x = 0; x < w; x++) {
    let sr = 0, sg = 0, sb = 0;
    for (let y = -r; y <= r; y++) {
      const i = (Math.max(0, y) * w + x) * 4;
      sr += src[i]; sg += src[i+1]; sb += src[i+2];
    }
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 4;
      dst[o]   = sr / (2*r+1);
      dst[o+1] = sg / (2*r+1);
      dst[o+2] = sb / (2*r+1);
      dst[o+3] = src[o+3];
      const ay = Math.min(h-1, y+r+1), ry = Math.max(0, y-r);
      const ia = (ay*w+x)*4, ir = (ry*w+x)*4;
      sr += src[ia]-src[ir]; sg += src[ia+1]-src[ir+1]; sb += src[ia+2]-src[ir+2];
    }
  }
}

function boxBlur(data, w, h, r) {
  const tmp = new Uint8ClampedArray(data.length);
  blurH(data, tmp, w, h, r);
  blurV(tmp, data, w, h, r);
}

// ── Detección de bordes Sobel ─────────────────────────────────────────────

function sobelEdges(data, w, h) {
  const edges = new Uint8ClampedArray(data.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0, gy = 0;
      const kx = [-1,0,1,-2,0,2,-1,0,1];
      const ky = [-1,-2,-1,0,0,0,1,2,1];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const i = ((y+dy)*w + (x+dx)) * 4;
          const g = data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114;
          const ki = (dy+1)*3 + (dx+1);
          gx += g * kx[ki]; gy += g * ky[ki];
        }
      }
      const mag = Math.min(255, Math.sqrt(gx*gx + gy*gy));
      const o = (y*w+x)*4;
      edges[o] = edges[o+1] = edges[o+2] = mag; edges[o+3] = 255;
    }
  }
  return edges;
}

// ── Posterización (reduce colores a N niveles) ────────────────────────────

function posterize(data, levels) {
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = Math.round(Math.round(data[i]   / step) * step);
    data[i+1] = Math.round(Math.round(data[i+1] / step) * step);
    data[i+2] = Math.round(Math.round(data[i+2] / step) * step);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ESTILOS ARTÍSTICOS
// ═══════════════════════════════════════════════════════════════════════════

// ── Van Gogh: Saturación extrema + trazos direccionales + temperatura ─────
function filterVanGogh(data, w, h) {
  // 1. Manipulación HSL: subir saturación, torcer tono cálido/frío
  for (let i = 0; i < data.length; i += 4) {
    let [hh, s, l] = rgbToHsl(data[i], data[i+1], data[i+2]);
    s = Math.min(1, s * 2.8);
    // Azules más fríos, amarillos más cálidos
    if (hh > 0.13 && hh < 0.22) hh += 0.04; // amarillos → más naranja
    if (hh > 0.55 && hh < 0.72) hh -= 0.05; // azules → más cían
    l = l < 0.5 ? l * 0.88 : Math.min(1, l * 1.12); // contraste
    const [r, g, b] = hslToRgb(hh, s, l);
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
  // 2. Blur diagonal (simula pinceladas en una dirección)
  const tmp1 = new Uint8ClampedArray(data.length);
  const tmp2 = new Uint8ClampedArray(data.length);
  blurH(data, tmp1, w, h, 4);
  blurV(tmp1, tmp2, w, h, 2);
  // 3. Mezcla del original saturado con el blur (textura de pincel)
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = clamp(data[i]   * 0.55 + tmp2[i]   * 0.45);
    data[i+1] = clamp(data[i+1] * 0.55 + tmp2[i+1] * 0.45);
    data[i+2] = clamp(data[i+2] * 0.55 + tmp2[i+2] * 0.45);
  }
  // 4. Bordes coloreados (Van Gogh usa contornos negros/azul oscuro)
  const edges = sobelEdges(data, w, h);
  for (let i = 0; i < data.length; i += 4) {
    const e = edges[i] / 255;
    data[i]   = clamp(data[i]   * (1 - e * 0.7));
    data[i+1] = clamp(data[i+1] * (1 - e * 0.6));
    data[i+2] = clamp(data[i+2] * (1 - e * 0.4));
  }
}

// ── Picasso: Posterización + bordes negros gruesos + tono cubista ─────────
function filterPicasso(data, w, h) {
  // 1. Posterizar a pocos colores (efecto cubista)
  posterize(data, 5);
  // 2. Rotar tono hacia fríos (morados, azules, verdes)
  for (let i = 0; i < data.length; i += 4) {
    let [hh, s, l] = rgbToHsl(data[i], data[i+1], data[i+2]);
    hh = (hh + 0.52) % 1;
    s  = Math.min(1, s * 2.2);
    l  = l < 0.5 ? l * 0.75 : Math.min(1, l * 1.1);
    const [r, g, b] = hslToRgb(hh, s, l);
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
  // 3. Bordes negros muy gruesos (cubismo usa contornos marcados)
  const edges = sobelEdges(data, w, h);
  const tmpE = new Uint8ClampedArray(edges.length);
  blurH(edges, tmpE, w, h, 1);
  blurV(tmpE, edges, w, h, 1);
  for (let i = 0; i < data.length; i += 4) {
    const e = Math.min(1, edges[i] / 120);
    data[i]   = clamp(data[i]   * (1 - e));
    data[i+1] = clamp(data[i+1] * (1 - e));
    data[i+2] = clamp(data[i+2] * (1 - e));
  }
}

// ── Monet: Múltiples capas de blur + paleta pastel + luz difusa ───────────
function filterMonet(data, w, h) {
  // 1. Blur suave (impresionismo = bordes difusos)
  boxBlur(data, w, h, 5);
  boxBlur(data, w, h, 3);
  // 2. HSL: desaturar, aclarar, tono cálido suave
  for (let i = 0; i < data.length; i += 4) {
    let [hh, s, l] = rgbToHsl(data[i], data[i+1], data[i+2]);
    s  = s * 0.55;
    l  = Math.min(1, l * 1.22 + 0.08);
    // Suave tono cálido (lirios de agua = azules/morados suaves)
    hh = (hh + 0.02) % 1;
    const [r, g, b] = hslToRgb(hh, s, l);
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
  // 3. Segunda capa de blur muy suave (luz difusa final)
  const glow = new Uint8ClampedArray(data.length);
  blurH(data, glow, w, h, 8);
  blurV(glow, glow, w, h, 8);
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = clamp(data[i]   * 0.7 + glow[i]   * 0.3);
    data[i+1] = clamp(data[i+1] * 0.7 + glow[i+1] * 0.3);
    data[i+2] = clamp(data[i+2] * 0.7 + glow[i+2] * 0.3);
  }
}

// ── Frida Kahlo: Colores vivos + rojos intensos + viñeta dramática ────────
function filterFrida(data, w, h) {
  // 1. Saturación extrema + shift a rojos/cálidos
  for (let i = 0; i < data.length; i += 4) {
    let [hh, s, l] = rgbToHsl(data[i], data[i+1], data[i+2]);
    s  = Math.min(1, s * 3.8);
    // Calentar: empujar hacia rojos/naranjas en sombras
    if (l < 0.5) hh = (hh + 0.92) % 1; // sombras → rojos
    l  = l < 0.4 ? l * 0.72 : Math.min(1, l * 1.05);
    const [r, g, b] = hslToRgb(hh, s, l);
    data[i] = r; data[i+1] = g; data[i+2] = b;
  }
  // 2. Contraste fuerte (multiplicar alrededor de 128)
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = clamp((data[i]   - 128) * 1.6 + 128);
    data[i+1] = clamp((data[i+1] - 128) * 1.5 + 128);
    data[i+2] = clamp((data[i+2] - 128) * 1.4 + 128);
  }
  // 3. Viñeta (oscurecer bordes como en sus autorretratos)
  const cx = w / 2, cy = h / 2;
  const maxDist = Math.sqrt(cx*cx + cy*cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.sqrt((x-cx)**2 + (y-cy)**2) / maxDist;
      const dark = Math.max(0, 1 - (d > 0.55 ? (d - 0.55) * 2.2 : 0));
      const i = (y*w+x)*4;
      data[i]   = clamp(data[i]   * dark);
      data[i+1] = clamp(data[i+1] * dark);
      data[i+2] = clamp(data[i+2] * dark);
    }
  }
}

// ── Da Vinci: Dibujo en sepia + técnica sfumato + bordes de boceto ────────
function filterDaVinci(data, w, h) {
  // 1. Convertir a escala de grises (técnica de boceto)
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114;
    data[i] = data[i+1] = data[i+2] = gray;
  }
  // 2. Alto contraste en las sombras (chiaroscuro)
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    const c = v < 128 ? v * 0.65 : Math.min(255, v * 1.15 + 10);
    data[i] = data[i+1] = data[i+2] = c;
  }
  // 3. Sfumato: blur suave que funde los bordes
  boxBlur(data, w, h, 2);
  // 4. Detección de bordes → líneas de boceto
  const edges = sobelEdges(data, w, h);
  for (let i = 0; i < data.length; i += 4) {
    const e = edges[i] / 255;
    // Restar bordes del original (líneas negras finas de boceto)
    data[i]   = clamp(data[i]   - e * 180);
    data[i+1] = clamp(data[i+1] - e * 180);
    data[i+2] = clamp(data[i+2] - e * 180);
  }
  // 5. Tono sepia (pergamino renacentista)
  for (let i = 0; i < data.length; i += 4) {
    const g = data[i];
    data[i]   = clamp(g * 1.08 + 18); // R cálido
    data[i+1] = clamp(g * 0.95 +  8); // G neutro
    data[i+2] = clamp(g * 0.72 -  5); // B frío → amarillo-marrón
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  API PÚBLICA
// ═══════════════════════════════════════════════════════════════════════════

const FILTER_FN = {
  vangogh: filterVanGogh,
  picasso: filterPicasso,
  monet:   filterMonet,
  frida:   filterFrida,
  davinci: filterDaVinci,
};

// Aplica el filtro artístico a un dataURL y devuelve el nuevo dataURL.
// Trabaja sobre una copia redimensionada a maxPx para rendimiento en móvil.
window.applyArtisticFilter = async function(sourceDataUrl, styleKey, maxPx = 500) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const fn = FILTER_FN[styleKey] || filterVanGogh;
        fn(imageData.data, w, h);
        ctx.putImageData(imageData, 0, 0);

        resolve(canvas.toDataURL("image/jpeg", 0.90));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = sourceDataUrl;
  });
};
