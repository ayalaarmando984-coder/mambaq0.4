// ── Estilos artísticos disponibles ──────────────────────────────────────────
const STYLES = {
  vangogh: { label: "Van Gogh",          color: "#2a5298", filter: "saturate(2.2) hue-rotate(10deg) contrast(1.1) brightness(1.05)" },
  picasso: { label: "Pablo Picasso",     color: "#8b2252", filter: "saturate(1.8) hue-rotate(200deg) contrast(1.4) brightness(0.95)" },
  monet:   { label: "Claude Monet",      color: "#5b9e8f", filter: "saturate(0.9) brightness(1.15) blur(1.2px) contrast(0.9)" },
  frida:   { label: "Frida Kahlo",       color: "#c0392b", filter: "saturate(2.8) hue-rotate(320deg) contrast(1.2)" },
  davinci: { label: "Leonardo da Vinci", color: "#8b6914", filter: "sepia(0.8) contrast(1.1) brightness(0.95)" },
};

// ── Avatares disponibles ────────────────────────────────────────────────────
const AVATARS = ["🐱","🐶","🦄","🐸","🐼","🦊","🐙","🐯","🦖","🐧","🐵","🦁"];

// ── Estado global ───────────────────────────────────────────────────────────
const state = {
  currentUser: null,
  selectedAvatar: "🦄",
  captureDataUrl: null,
  form: { name: "", author: "", age: "", styleKey: "vangogh" },
  selectedArtwork: null,
};

// ── Loader helper ───────────────────────────────────────────────────────────
function showLoader(text) {
  const el = document.getElementById("mambaq-loader");
  const tx = document.getElementById("mambaq-loader-text");
  if (tx && text) tx.textContent = text;
  if (el) el.hidden = false;
}
function hideLoader() {
  const el = document.getElementById("mambaq-loader");
  if (el) el.hidden = true;
}

// ── Navegación ──────────────────────────────────────────────────────────────
async function go(screenId) {
  if (screenId !== "camera" && typeof stopCamera === "function") stopCamera();
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById("screen-" + screenId);
  if (!target) return console.warn("Pantalla no encontrada:", screenId);
  target.classList.add("active");

  if (screenId === "preview")    renderPreview();
  if (screenId === "processing") startProcessing();
  if (screenId === "result")     renderResult();
  if (screenId === "success")    renderSuccess();
  if (screenId === "museo")      await renderMuseo();
  if (screenId === "home")       await renderHome();
  if (screenId === "login")      await renderLogin();
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  updateStyleDot();

  if (!window.db?.isReady) {
    alert("⚠️  Supabase no está configurado.\n\nEdita js/config.js con tu Project URL y anon key.\nLuego recarga la página.");
    await go("login");
    return;
  }

  showLoader("Cargando…");
  try {
    const user = await db.session.currentUser();
    if (user) {
      state.currentUser = user;
      await go("home");
    } else {
      await go("login");
    }
  } finally {
    hideLoader();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  LOGIN INFANTIL
// ═══════════════════════════════════════════════════════════════════════════

async function renderLogin() {
  const grid = document.getElementById("avatar-grid");
  grid.innerHTML = "";
  AVATARS.forEach(av => {
    const btn = document.createElement("button");
    btn.className   = "avatar-option" + (av === state.selectedAvatar ? " selected" : "");
    btn.textContent = av;
    btn.type        = "button";
    btn.onclick     = () => selectAvatar(av);
    grid.appendChild(btn);
  });

  const existing = await db.users.list();
  const wrap = document.getElementById("login-existing");
  const list = document.getElementById("existing-users-list");
  if (!existing.length) { wrap.style.display = "none"; return; }
  wrap.style.display = "block";
  list.innerHTML = "";
  existing.slice(0, 6).forEach(u => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "existing-user-chip";
    chip.innerHTML = `<span class="eu-av">${u.avatar}</span><span class="eu-name">${u.name}</span>`;
    chip.onclick = () => loginAsExisting(u.id);
    list.appendChild(chip);
  });
}

function selectAvatar(av) {
  state.selectedAvatar = av;
  document.querySelectorAll(".avatar-option").forEach(el => {
    el.classList.toggle("selected", el.textContent === av);
  });
}

async function loginSubmit() {
  const name = document.getElementById("login-name").value.trim();
  if (!name) { alert("Escribe tu nombre, peque artista 💛"); return; }

  showLoader("Creando tu perfil…");
  try {
    const user = await db.users.create({ name, avatar: state.selectedAvatar });
    db.session.set(user.id);
    state.currentUser = user;
    await go("home");
  } catch (e) {
    console.error(e);
    alert("No se pudo crear el perfil. Revisa la conexión.");
  } finally {
    hideLoader();
  }
}

async function loginAsExisting(userId) {
  showLoader("Entrando…");
  try {
    const user = await db.users.get(userId);
    if (!user) return;
    db.session.set(user.id);
    state.currentUser = user;
    await go("home");
  } finally {
    hideLoader();
  }
}

async function openProfileMenu() {
  if (!confirm("¿Cambiar de pequeño artista?")) return;
  db.session.clear();
  state.currentUser = null;
  await go("login");
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════════════════════════════════════

async function renderHome() {
  const chip  = document.getElementById("profile-chip");
  const avEl  = document.getElementById("profile-chip-avatar");
  const nmEl  = document.getElementById("profile-chip-name");
  const greet = document.getElementById("home-greeting");

  if (state.currentUser) {
    chip.style.display = "flex";
    avEl.textContent   = state.currentUser.avatar;
    nmEl.textContent   = state.currentUser.name;
    greet.textContent  = "¡Hola, " + state.currentUser.name + "!";
  } else {
    chip.style.display = "none";
    greet.textContent  = "¡Hola!";
  }

  await renderHomeRecents();
}

async function renderHomeRecents() {
  const wrap  = document.getElementById("home-recents");
  const list  = document.getElementById("home-recents-list");
  const title = document.getElementById("home-recents-title");

  if (!state.currentUser) { wrap.style.display = "none"; return; }

  const mine = await db.artworks.byChild(state.currentUser.id);
  if (!mine.length) { wrap.style.display = "none"; return; }

  wrap.style.display = "block";
  if (title) title.textContent = "Mis obras 🌟";
  list.innerHTML = "";
  mine.slice(0, 6).forEach(art => {
    const div = document.createElement("div");
    div.className = "recent-thumb";
    div.onclick = () => { state.selectedArtwork = art; go("artwork"); };
    div.innerHTML = art.imgSrc
      ? `<img class="recent-thumb-img" src="${art.imgSrc}" style="filter:${art.filter}" alt="${art.name}"/>
         <div class="recent-label">${art.name}</div>`
      : `<div class="recent-thumb-placeholder" style="background:${art.color}44">${art.emoji}</div>
         <div class="recent-label">${art.name}</div>`;
    list.appendChild(div);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

function updateStyleDot() {
  const sel = document.getElementById("input-style");
  const dot = document.getElementById("style-dot");
  if (!sel || !dot) return;
  const key = sel.value || "vangogh";
  dot.style.background = STYLES[key]?.color || "#2a5298";
}

function submitForm() {
  const name = document.getElementById("input-name").value.trim();
  const age  = document.getElementById("input-age").value.trim();
  const key  = document.getElementById("input-style").value;

  if (!name) { alert("Ponle un nombre a tu obra 🎨"); return; }
  if (!age || isNaN(age) || +age < 3 || +age > 12) {
    alert("Por favor escribe una edad entre 3 y 12 🎈");
    return;
  }

  state.form = {
    name,
    author: state.currentUser?.name || "Anónimo",
    age: +age,
    styleKey: key,
  };
  go("preview");
}

// ═══════════════════════════════════════════════════════════════════════════
//  PREVIEW / RESULT / SUCCESS
// ═══════════════════════════════════════════════════════════════════════════

function renderPreview() {
  const { name, author, age, styleKey } = state.form;
  const style = STYLES[styleKey] || STYLES.vangogh;

  document.getElementById("preview-img").src            = state.captureDataUrl || "";
  document.getElementById("preview-name").textContent   = name   || "—";
  document.getElementById("preview-author").textContent = author || "—";
  document.getElementById("preview-age").textContent    = age ? age + " años" : "—";

  const badge = document.getElementById("preview-style-badge");
  badge.textContent      = style.label;
  badge.style.background = style.color;
}

function renderResult() {
  const { styleKey } = state.form;
  const style = STYLES[styleKey] || STYLES.vangogh;

  const img = document.getElementById("result-img");
  img.src          = state.captureDataUrl || "";
  img.style.filter = style.filter;

  document.getElementById("result-style-circle").style.background = style.color;
  document.getElementById("result-style-name").textContent        = style.label;
}

function renderSuccess() {
  const { name, author, age, styleKey } = state.form;
  const style = STYLES[styleKey] || STYLES.vangogh;

  document.getElementById("success-name").textContent   = name   || "—";
  document.getElementById("success-author").textContent = author || "—";
  document.getElementById("success-age").textContent    = age ? age + " años" : "—";

  const badge = document.getElementById("success-style-badge");
  badge.textContent      = style.label;
  badge.style.background = style.color;
}

// ═══════════════════════════════════════════════════════════════════════════
//  REGISTRAR OBRA
// ═══════════════════════════════════════════════════════════════════════════

async function registerArtwork() {
  if (!state.currentUser) { await go("login"); return; }
  const { name, author, age, styleKey } = state.form;
  const style = STYLES[styleKey] || STYLES.vangogh;

  showLoader("Guardando tu obra…");
  try {
    await db.artworks.create({
      childId:  state.currentUser.id,
      name,
      author,
      age,
      styleKey,
      style:    style.label,
      color:    style.color,
      filter:   style.filter,
      imgSrc:   state.captureDataUrl,
      emoji:    "✨",
    });
    await go("success");
  } catch (e) {
    console.error(e);
    alert("No pudimos guardar tu obra. Inténtalo de nuevo.");
  } finally {
    hideLoader();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  GUARDAR / COMPARTIR IMAGEN (resultado con filtro)
// ═══════════════════════════════════════════════════════════════════════════

async function _renderFilteredCanvas() {
  const style = STYLES[state.form.styleKey] || STYLES.vangogh;
  if (!state.captureDataUrl) return null;

  const img = new Image();
  img.src = state.captureDataUrl;
  await new Promise(res => { if (img.complete) res(); else img.onload = res; });

  const canvas = document.createElement("canvas");
  canvas.width  = img.naturalWidth  || 600;
  canvas.height = img.naturalHeight || 600;
  const ctx = canvas.getContext("2d");
  ctx.filter = style.filter;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function downloadResult() {
  const canvas = await _renderFilteredCanvas();
  if (!canvas) { alert("Aún no hay imagen para guardar."); return; }
  const safe = (state.form.name || "mi-obra").replace(/[^a-z0-9\-_]+/gi, "_");
  const a = document.createElement("a");
  a.href     = canvas.toDataURL("image/png");
  a.download = `mambaq_${safe}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function shareResult() {
  const canvas = await _renderFilteredCanvas();
  if (!canvas) { alert("Aún no hay imagen para compartir."); return; }
  const title = state.form.name || "Mi obra MAMBAQ";
  const text  = `¡Mira mi obra "${title}" hecha en MAMBAQ! 🎨`;

  if (navigator.canShare && navigator.share) {
    try {
      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "mambaq.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return;
      }
      await navigator.share({ title, text });
      return;
    } catch (e) { /* canceló o falló — caemos al fallback */ }
  }
  downloadResult();
}

function shareArtwork() {
  const art = state.selectedArtwork;
  if (!art) return;
  const title = art.name;
  const text  = `Obra "${art.name}" por ${art.author} en MAMBAQ 🎨`;
  if (navigator.share) {
    navigator.share({ title, text }).catch(() => {});
  } else {
    alert("Compartir no está disponible en este dispositivo.");
  }
}
