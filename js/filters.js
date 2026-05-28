// ═══════════════════════════════════════════════════════════════════════════
//  MAMBAQ Filters — Transformación artística con IA (Hugging Face)
//
//  Flujo principal:
//    1. Envía el dibujo del niño a la API de Hugging Face
//    2. El modelo InstructPix2Pix genera una versión "pintada" por el artista
//    3. Si la API no está disponible → fallback a filtros de canvas
//
//  Modelo usado: timbrooks/instruct-pix2pix
//  - Entiende instrucciones en texto + imagen de entrada
//  - Genera imágenes en el estilo pedido manteniendo el contenido original
// ═══════════════════════════════════════════════════════════════════════════

// ── Prompts por artista ───────────────────────────────────────────────────
// Cada prompt le indica a la IA cómo debe pintar la imagen del niño,
// describiendo la técnica, paleta y características del artista real.

const AI_PROMPTS = {
  vangogh: [
    "oil painting in the style of Vincent van Gogh,",
    "swirling expressive brushstrokes, vivid cobalt blue and cadmium yellow,",
    "post-impressionist texture, thick impasto paint, starry night palette,",
    "emotional and dynamic composition",
  ].join(" "),

  picasso: [
    "cubist painting in the style of Pablo Picasso,",
    "geometric fragmented shapes, multiple perspectives simultaneously,",
    "bold black outlines, muted earth tones with pops of primary colors,",
    "analytical cubism, abstract angular composition",
  ].join(" "),

  monet: [
    "impressionist painting in the style of Claude Monet,",
    "soft loose brushstrokes, delicate pastel colors, dappled light,",
    "water reflections, lilac and sage green palette, dreamy atmosphere,",
    "plein air painting, hazy edges",
  ].join(" "),

  frida: [
    "painting in the style of Frida Kahlo,",
    "vivid saturated colors, Mexican folk art details, surrealist elements,",
    "crimson and jade green palette, floral decorations, symbolic imagery,",
    "flat graphic style with emotional intensity",
  ].join(" "),

  davinci: [
    "Renaissance drawing in the style of Leonardo da Vinci,",
    "sfumato technique with soft smoky edges, sepia and ochre tones,",
    "detailed hatching and cross-hatching, chiaroscuro light and shadow,",
    "anatomical precision, aged parchment texture",
  ].join(" "),
};

// ── Parámetros de generación ──────────────────────────────────────────────
const AI_PARAMS = {
  num_inference_steps: 25,   // más pasos = más calidad (máx ~50 en free tier)
  image_guidance_scale: 1.4, // qué tanto conserva el contenido original (1-2)
  guidance_scale: 7.5,       // fidelidad al prompt (7-12 recomendado)
};

// ── Convertir dataURL a Blob ───────────────────────────────────────────────
function _dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ── Redimensionar para la API (max 512px, ahorra cuota y tiempo) ──────────
async function _resizeForAI(dataUrl, maxPx = 512) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      // InstructPix2Pix funciona mejor con dimensiones múltiplo de 8
      const w8 = Math.floor(w / 8) * 8;
      const h8 = Math.floor(h / 8) * 8;
      const c = document.createElement("canvas");
      c.width = w8; c.height = h8;
      c.getContext("2d").drawImage(img, 0, 0, w8, h8);
      resolve(c.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

// ── Llamada a la API de Hugging Face ──────────────────────────────────────
async function _callHuggingFace(imageDataUrl, styleKey) {
  const token = window.MAMBAQ_CONFIG?.hfToken;
  if (!token || token.startsWith("PEGA")) throw new Error("NO_TOKEN");

  const resized  = await _resizeForAI(imageDataUrl);
  const prompt   = AI_PROMPTS[styleKey] || AI_PROMPTS.vangogh;
  const imgBlob  = _dataUrlToBlob(resized);

  // InstructPix2Pix acepta la imagen como binario en el body
  // y el prompt + parámetros como JSON en el header
  const params = JSON.stringify({ prompt, ...AI_PARAMS });

  const response = await fetch(
    "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  imgBlob.type,
        "X-HuggingFace-Parameters": params,
      },
      body: imgBlob,
      signal: AbortSignal.timeout(90000), // 90s timeout (modelos grandes tardan)
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => response.status);
    // 503 = modelo cargando (normal en free tier, reintenta)
    if (response.status === 503) throw new Error("MODEL_LOADING");
    throw new Error(`HF_API_ERROR: ${err}`);
  }

  const blob = await response.blob();
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  FALLBACK — Filtros de canvas (si la API no está disponible)
// ═══════════════════════════════════════════════════════════════════════════

function _clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

function _rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0, l = (max+min)/2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;}
    h/=6;
  }
  return [h, s, l];
}
function _hslToRgb(h, s, l) {
  if (!s) { const v=Math.round(l*255); return [v,v,v]; }
  const q = l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
  const f = (t) => { if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p; };
  return [Math.round(f(h+1/3)*255), Math.round(f(h)*255), Math.round(f(h-1/3)*255)];
}
function _blurH(s,d,w,h,r){for(let y=0;y<h;y++){let sr=0,sg=0,sb=0;for(let x=-r;x<=r;x++){const i=(y*w+Math.max(0,x))*4;sr+=s[i];sg+=s[i+1];sb+=s[i+2];}for(let x=0;x<w;x++){const o=(y*w+x)*4;d[o]=sr/(2*r+1);d[o+1]=sg/(2*r+1);d[o+2]=sb/(2*r+1);d[o+3]=s[o+3];const a=Math.min(w-1,x+r+1),rm=Math.max(0,x-r);const ia=(y*w+a)*4,ir=(y*w+rm)*4;sr+=s[ia]-s[ir];sg+=s[ia+1]-s[ir+1];sb+=s[ia+2]-s[ir+2];}}}
function _blurV(s,d,w,h,r){for(let x=0;x<w;x++){let sr=0,sg=0,sb=0;for(let y=-r;y<=r;y++){const i=(Math.max(0,y)*w+x)*4;sr+=s[i];sg+=s[i+1];sb+=s[i+2];}for(let y=0;y<h;y++){const o=(y*w+x)*4;d[o]=sr/(2*r+1);d[o+1]=sg/(2*r+1);d[o+2]=sb/(2*r+1);d[o+3]=s[o+3];const ay=Math.min(h-1,y+r+1),ry=Math.max(0,y-r);const ia=(ay*w+x)*4,ir=(ry*w+x)*4;sr+=s[ia]-s[ir];sg+=s[ia+1]-s[ir+1];sb+=s[ia+2]-s[ir+2];}}}
function _boxBlur(d,w,h,r){const t=new Uint8ClampedArray(d.length);_blurH(d,t,w,h,r);_blurV(t,d,w,h,r);}
function _sobel(d,w,h){const o=new Uint8ClampedArray(d.length);const kx=[-1,0,1,-2,0,2,-1,0,1],ky=[-1,-2,-1,0,0,0,1,2,1];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let gx=0,gy=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const i=((y+dy)*w+(x+dx))*4;const g=d[i]*.299+d[i+1]*.587+d[i+2]*.114;const ki=(dy+1)*3+(dx+1);gx+=g*kx[ki];gy+=g*ky[ki];}const m=Math.min(255,Math.sqrt(gx*gx+gy*gy));const oi=(y*w+x)*4;o[oi]=o[oi+1]=o[oi+2]=m;o[oi+3]=255;}return o;}

function _canvasVanGogh(d,w,h){for(let i=0;i<d.length;i+=4){let[hh,s,l]=_rgbToHsl(d[i],d[i+1],d[i+2]);s=Math.min(1,s*2.8);if(hh>.13&&hh<.22)hh+=.04;if(hh>.55&&hh<.72)hh-=.05;l=l<.5?l*.88:Math.min(1,l*1.12);const[r,g,b]=_hslToRgb(hh,s,l);d[i]=r;d[i+1]=g;d[i+2]=b;}const t1=new Uint8ClampedArray(d.length),t2=new Uint8ClampedArray(d.length);_blurH(d,t1,w,h,4);_blurV(t1,t2,w,h,2);for(let i=0;i<d.length;i+=4){d[i]=_clamp(d[i]*.55+t2[i]*.45);d[i+1]=_clamp(d[i+1]*.55+t2[i+1]*.45);d[i+2]=_clamp(d[i+2]*.55+t2[i+2]*.45);}const e=_sobel(d,w,h);for(let i=0;i<d.length;i+=4){const ev=e[i]/255;d[i]=_clamp(d[i]*(1-ev*.7));d[i+1]=_clamp(d[i+1]*(1-ev*.6));d[i+2]=_clamp(d[i+2]*(1-ev*.4));}}
function _canvasPicasso(d,w,h){const st=255/(5-1);for(let i=0;i<d.length;i+=4){d[i]=Math.round(Math.round(d[i]/st)*st);d[i+1]=Math.round(Math.round(d[i+1]/st)*st);d[i+2]=Math.round(Math.round(d[i+2]/st)*st);}for(let i=0;i<d.length;i+=4){let[hh,s,l]=_rgbToHsl(d[i],d[i+1],d[i+2]);hh=(hh+.52)%1;s=Math.min(1,s*2.2);l=l<.5?l*.75:Math.min(1,l*1.1);const[r,g,b]=_hslToRgb(hh,s,l);d[i]=r;d[i+1]=g;d[i+2]=b;}const e=_sobel(d,w,h);const te=new Uint8ClampedArray(e.length);_blurH(e,te,w,h,1);_blurV(te,e,w,h,1);for(let i=0;i<d.length;i+=4){const ev=Math.min(1,e[i]/120);d[i]=_clamp(d[i]*(1-ev));d[i+1]=_clamp(d[i+1]*(1-ev));d[i+2]=_clamp(d[i+2]*(1-ev));}}
function _canvasMonet(d,w,h){_boxBlur(d,w,h,5);_boxBlur(d,w,h,3);for(let i=0;i<d.length;i+=4){let[hh,s,l]=_rgbToHsl(d[i],d[i+1],d[i+2]);s*=.55;l=Math.min(1,l*1.22+.08);hh=(hh+.02)%1;const[r,g,b]=_hslToRgb(hh,s,l);d[i]=r;d[i+1]=g;d[i+2]=b;}const gw=new Uint8ClampedArray(d.length);_blurH(d,gw,w,h,8);_blurV(gw,gw,w,h,8);for(let i=0;i<d.length;i+=4){d[i]=_clamp(d[i]*.7+gw[i]*.3);d[i+1]=_clamp(d[i+1]*.7+gw[i+1]*.3);d[i+2]=_clamp(d[i+2]*.7+gw[i+2]*.3);}}
function _canvasFrida(d,w,h){for(let i=0;i<d.length;i+=4){let[hh,s,l]=_rgbToHsl(d[i],d[i+1],d[i+2]);s=Math.min(1,s*3.8);if(l<.5)hh=(hh+.92)%1;l=l<.4?l*.72:Math.min(1,l*1.05);const[r,g,b]=_hslToRgb(hh,s,l);d[i]=r;d[i+1]=g;d[i+2]=b;}for(let i=0;i<d.length;i+=4){d[i]=_clamp((d[i]-128)*1.6+128);d[i+1]=_clamp((d[i+1]-128)*1.5+128);d[i+2]=_clamp((d[i+2]-128)*1.4+128);}const cx=w/2,cy=h/2,md=Math.sqrt(cx*cx+cy*cy);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dist=Math.sqrt((x-cx)**2+(y-cy)**2)/md;const dk=Math.max(0,1-(dist>.55?(dist-.55)*2.2:0));const i=(y*w+x)*4;d[i]=_clamp(d[i]*dk);d[i+1]=_clamp(d[i+1]*dk);d[i+2]=_clamp(d[i+2]*dk);}}
function _canvasDavinci(d,w,h){for(let i=0;i<d.length;i+=4){const g=d[i]*.299+d[i+1]*.587+d[i+2]*.114;d[i]=d[i+1]=d[i+2]=g;}_boxBlur(d,w,h,2);const e=_sobel(d,w,h);for(let i=0;i<d.length;i+=4){const ev=e[i]/255;d[i]=_clamp(d[i]*(1-ev*.85));d[i+1]=_clamp(d[i+1]*(1-ev*.85));d[i+2]=_clamp(d[i+2]*(1-ev*.85));}for(let i=0;i<d.length;i+=4){const g=d[i];d[i]=_clamp(g*1.08+18);d[i+1]=_clamp(g*.95+8);d[i+2]=_clamp(g*.72-5);}}

const _CANVAS_FILTERS = {
  vangogh: _canvasVanGogh,
  picasso: _canvasPicasso,
  monet:   _canvasMonet,
  frida:   _canvasFrida,
  davinci: _canvasDavinci,
};

async function _applyCanvasFallback(dataUrl, styleKey) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, 500 / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const id = ctx.getImageData(0, 0, w, h);
        (_CANVAS_FILTERS[styleKey] || _canvasVanGogh)(id.data, w, h);
        ctx.putImageData(id, 0, 0);
        resolve(c.toDataURL("image/jpeg", 0.90));
      } catch(e) { reject(e); }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  API PÚBLICA — applyArtisticFilter(dataUrl, styleKey, onProgress?)
//
//  Intenta IA → si falla, usa canvas.
//  onProgress(pct, message) se llama con el estado del proceso.
// ═══════════════════════════════════════════════════════════════════════════

window.applyArtisticFilter = async function(dataUrl, styleKey, onProgress) {
  const progress = onProgress || (() => {});
  const token = window.MAMBAQ_CONFIG?.hfToken;
  const hasToken = token && !token.startsWith("PEGA");

  if (hasToken) {
    try {
      progress(10, `Enviando a la IA…`);
      const result = await _callHuggingFace(dataUrl, styleKey);
      progress(100, "¡Listo!");
      return { result, method: "ai" };
    } catch (e) {
      console.warn("HF API falló, usando filtro de canvas:", e.message);
      progress(30, "Aplicando filtro artístico…");
    }
  }

  // Fallback canvas
  progress(40, "Procesando con canvas…");
  const result = await _applyCanvasFallback(dataUrl, styleKey);
  progress(100, "¡Listo!");
  return { result, method: "canvas" };
};
