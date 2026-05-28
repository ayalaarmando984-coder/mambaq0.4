// ═══════════════════════════════════════════════════════════════════════════
//  MAMBAQ Filters — Transformaciones artísticas con canvas
//  Manipulación de píxeles específica por artista (sin API externa).
// ═══════════════════════════════════════════════════════════════════════════

function _clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

function _rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0, s = 0, l = (max+min)/2;
  if (max !== min) {
    const d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;}
    h /= 6;
  }
  return [h, s, l];
}

function _hslToRgb(h, s, l) {
  if (!s) { const v = Math.round(l*255); return [v,v,v]; }
  const q = l<0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
  const f = t => { if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p; };
  return [Math.round(f(h+1/3)*255), Math.round(f(h)*255), Math.round(f(h-1/3)*255)];
}

function _blurH(s,d,w,h,r){for(let y=0;y<h;y++){let sr=0,sg=0,sb=0;for(let x=-r;x<=r;x++){const i=(y*w+Math.max(0,x))*4;sr+=s[i];sg+=s[i+1];sb+=s[i+2];}for(let x=0;x<w;x++){const o=(y*w+x)*4;d[o]=sr/(2*r+1);d[o+1]=sg/(2*r+1);d[o+2]=sb/(2*r+1);d[o+3]=s[o+3];const a=Math.min(w-1,x+r+1),rm=Math.max(0,x-r);const ia=(y*w+a)*4,ir=(y*w+rm)*4;sr+=s[ia]-s[ir];sg+=s[ia+1]-s[ir+1];sb+=s[ia+2]-s[ir+2];}}}
function _blurV(s,d,w,h,r){for(let x=0;x<w;x++){let sr=0,sg=0,sb=0;for(let y=-r;y<=r;y++){const i=(Math.max(0,y)*w+x)*4;sr+=s[i];sg+=s[i+1];sb+=s[i+2];}for(let y=0;y<h;y++){const o=(y*w+x)*4;d[o]=sr/(2*r+1);d[o+1]=sg/(2*r+1);d[o+2]=sb/(2*r+1);d[o+3]=s[o+3];const ay=Math.min(h-1,y+r+1),ry=Math.max(0,y-r);const ia=(ay*w+x)*4,ir=(ry*w+x)*4;sr+=s[ia]-s[ir];sg+=s[ia+1]-s[ir+1];sb+=s[ia+2]-s[ir+2];}}}
function _boxBlur(d,w,h,r){const t=new Uint8ClampedArray(d.length);_blurH(d,t,w,h,r);_blurV(t,d,w,h,r);}

function _sobel(d,w,h){
  const o=new Uint8ClampedArray(d.length);
  const kx=[-1,0,1,-2,0,2,-1,0,1], ky=[-1,-2,-1,0,0,0,1,2,1];
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    let gx=0,gy=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const i=((y+dy)*w+(x+dx))*4;
      const g=d[i]*.299+d[i+1]*.587+d[i+2]*.114;
      const ki=(dy+1)*3+(dx+1);
      gx+=g*kx[ki]; gy+=g*ky[ki];
    }
    const m=Math.min(255,Math.sqrt(gx*gx+gy*gy));
    const oi=(y*w+x)*4;
    o[oi]=o[oi+1]=o[oi+2]=m; o[oi+3]=255;
  }
  return o;
}

// ── Van Gogh ─────────────────────────────────────────────────────────────
function _vanGogh(d,w,h){
  for(let i=0;i<d.length;i+=4){
    let[hh,s,l]=_rgbToHsl(d[i],d[i+1],d[i+2]);
    s=Math.min(1,s*2.8);
    if(hh>.13&&hh<.22)hh+=.04;
    if(hh>.55&&hh<.72)hh-=.05;
    l=l<.5?l*.88:Math.min(1,l*1.12);
    const[r,g,b]=_hslToRgb(hh,s,l);
    d[i]=r;d[i+1]=g;d[i+2]=b;
  }
  const t1=new Uint8ClampedArray(d.length),t2=new Uint8ClampedArray(d.length);
  _blurH(d,t1,w,h,4); _blurV(t1,t2,w,h,2);
  for(let i=0;i<d.length;i+=4){
    d[i]=_clamp(d[i]*.55+t2[i]*.45);
    d[i+1]=_clamp(d[i+1]*.55+t2[i+1]*.45);
    d[i+2]=_clamp(d[i+2]*.55+t2[i+2]*.45);
  }
  const e=_sobel(d,w,h);
  for(let i=0;i<d.length;i+=4){
    const ev=e[i]/255;
    d[i]=_clamp(d[i]*(1-ev*.7));
    d[i+1]=_clamp(d[i+1]*(1-ev*.6));
    d[i+2]=_clamp(d[i+2]*(1-ev*.4));
  }
}

// ── Picasso ───────────────────────────────────────────────────────────────
function _picasso(d,w,h){
  const st=255/(5-1);
  for(let i=0;i<d.length;i+=4){
    d[i]=Math.round(Math.round(d[i]/st)*st);
    d[i+1]=Math.round(Math.round(d[i+1]/st)*st);
    d[i+2]=Math.round(Math.round(d[i+2]/st)*st);
  }
  for(let i=0;i<d.length;i+=4){
    let[hh,s,l]=_rgbToHsl(d[i],d[i+1],d[i+2]);
    hh=(hh+.52)%1; s=Math.min(1,s*2.2);
    l=l<.5?l*.75:Math.min(1,l*1.1);
    const[r,g,b]=_hslToRgb(hh,s,l);
    d[i]=r;d[i+1]=g;d[i+2]=b;
  }
  const e=_sobel(d,w,h), te=new Uint8ClampedArray(e.length);
  _blurH(e,te,w,h,1); _blurV(te,e,w,h,1);
  for(let i=0;i<d.length;i+=4){
    const ev=Math.min(1,e[i]/120);
    d[i]=_clamp(d[i]*(1-ev));
    d[i+1]=_clamp(d[i+1]*(1-ev));
    d[i+2]=_clamp(d[i+2]*(1-ev));
  }
}

// ── Monet ─────────────────────────────────────────────────────────────────
function _monet(d,w,h){
  _boxBlur(d,w,h,5); _boxBlur(d,w,h,3);
  for(let i=0;i<d.length;i+=4){
    let[hh,s,l]=_rgbToHsl(d[i],d[i+1],d[i+2]);
    s*=.55; l=Math.min(1,l*1.22+.08); hh=(hh+.02)%1;
    const[r,g,b]=_hslToRgb(hh,s,l);
    d[i]=r;d[i+1]=g;d[i+2]=b;
  }
  const gw=new Uint8ClampedArray(d.length);
  _blurH(d,gw,w,h,8); _blurV(gw,gw,w,h,8);
  for(let i=0;i<d.length;i+=4){
    d[i]=_clamp(d[i]*.7+gw[i]*.3);
    d[i+1]=_clamp(d[i+1]*.7+gw[i+1]*.3);
    d[i+2]=_clamp(d[i+2]*.7+gw[i+2]*.3);
  }
}

// ── Frida ─────────────────────────────────────────────────────────────────
function _frida(d,w,h){
  for(let i=0;i<d.length;i+=4){
    let[hh,s,l]=_rgbToHsl(d[i],d[i+1],d[i+2]);
    s=Math.min(1,s*3.8);
    if(l<.5)hh=(hh+.92)%1;
    l=l<.4?l*.72:Math.min(1,l*1.05);
    const[r,g,b]=_hslToRgb(hh,s,l);
    d[i]=r;d[i+1]=g;d[i+2]=b;
  }
  for(let i=0;i<d.length;i+=4){
    d[i]=_clamp((d[i]-128)*1.6+128);
    d[i+1]=_clamp((d[i+1]-128)*1.5+128);
    d[i+2]=_clamp((d[i+2]-128)*1.4+128);
  }
  const cx=w/2,cy=h/2,md=Math.sqrt(cx*cx+cy*cy);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const dist=Math.sqrt((x-cx)**2+(y-cy)**2)/md;
    const dk=Math.max(0,1-(dist>.55?(dist-.55)*2.2:0));
    const i=(y*w+x)*4;
    d[i]=_clamp(d[i]*dk);d[i+1]=_clamp(d[i+1]*dk);d[i+2]=_clamp(d[i+2]*dk);
  }
}

// ── Da Vinci ──────────────────────────────────────────────────────────────
function _davinci(d,w,h){
  for(let i=0;i<d.length;i+=4){
    const g=d[i]*.299+d[i+1]*.587+d[i+2]*.114;
    d[i]=d[i+1]=d[i+2]=g;
  }
  for(let i=0;i<d.length;i+=4){
    const v=d[i];
    d[i]=d[i+1]=d[i+2]=v<128?v*.65:Math.min(255,v*1.15+10);
  }
  _boxBlur(d,w,h,2);
  const e=_sobel(d,w,h);
  for(let i=0;i<d.length;i+=4){
    const ev=e[i]/255;
    d[i]=_clamp(d[i]-ev*180);d[i+1]=_clamp(d[i+1]-ev*180);d[i+2]=_clamp(d[i+2]-ev*180);
  }
  for(let i=0;i<d.length;i+=4){
    const g=d[i];
    d[i]=_clamp(g*1.08+18);d[i+1]=_clamp(g*.95+8);d[i+2]=_clamp(g*.72-5);
  }
}

// ── Exportar ──────────────────────────────────────────────────────────────
const _FN = { vangogh:_vanGogh, picasso:_picasso, monet:_monet, frida:_frida, davinci:_davinci };

window.applyArtisticFilter = async function(dataUrl, styleKey) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, 500 / Math.max(img.width, img.height));
        const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const id = ctx.getImageData(0, 0, w, h);
        (_FN[styleKey] || _vanGogh)(id.data, w, h);
        ctx.putImageData(id, 0, 0);
        resolve(c.toDataURL("image/jpeg", 0.90));
      } catch(e) { reject(e); }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};
