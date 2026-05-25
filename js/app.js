// ── Estilos artísticos disponibles ──────────────────────────────────────────
const STYLES = {
  vangogh: { label: "Van Gogh",          color: "#2a5298", filter: "saturate(2.2) hue-rotate(10deg) contrast(1.1) brightness(1.05)" },
  picasso: { label: "Pablo Picasso",     color: "#8b2252", filter: "saturate(1.8) hue-rotate(200deg) contrast(1.4) brightness(0.95)" },
  monet:   { label: "Claude Monet",      color: "#5b9e8f", filter: "saturate(0.9) brightness(1.15) blur(1.2px) contrast(0.9)" },
  frida:   { label: "Frida Kahlo",       color: "#c0392b", filter: "saturate(2.8) hue-rotate(320deg) contrast(1.2)" },
  davinci: { label: "Leonardo da Vinci", color: "#8b6914", filter: "sepia(0.8) contrast(1.1) brightness(0.95)" },
};

// ── Estado global ────────────────────────────────────────────────────────────
const state = {
  captureDataUrl: null,
  form: { name: "", author: "", age: "", styleKey: "vangogh" },
  artworks: [],
  selectedArtwork: null,
};

// ── Navegación ───────────────────────────────────────────────────────────────
function go(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById("screen-" + screenId);
  if (!target) return console.warn("Pantalla no encontrada:", screenId);
  target.classList.add("active");

  if (screenId === "preview")    renderPreview();
  if (screenId === "processing") startProcessing();
  if (screenId === "result")     renderResult();
  if (screenId === "success")    renderSuccess();
  if (screenId === "museo")      renderMuseo();
  if (screenId === "home")       renderHomeRecents();
}

// ── Inicialización ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateStyleDot();
});

// ── Formulario ───────────────────────────────────────────────────────────────
function updateStyleDot() {
  const sel = document.getElementById("input-style");
  const dot = document.getElementById("style-dot");
  const key = sel ? sel.value : "vangogh";
  dot.style.background = STYLES[key]?.color || "#2a5298";
}

function submitForm() {
  const name   = document.getElementById("input-name").value.trim();
  const author = document.getElementById("input-author").value.trim();
  const age    = document.getElementById("input-age").value.trim();
  const key    = document.getElementById("input-style").value;

  if (!name || !author) {
    alert("Por favor completa el nombre de la obra y el autor 🎨");
    return;
  }
  if (!age || isNaN(age) || +age < 1 || +age > 17) {
    alert("Por favor ingresa una edad válida (1 a 17 años) 🎈");
    return;
  }

  state.form = { name, author, age: +age, styleKey: key };
  go("preview");
}

// ── Preview ──────────────────────────────────────────────────────────────────
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

// ── Result ───────────────────────────────────────────────────────────────────
function renderResult() {
  const { styleKey } = state.form;
  const style = STYLES[styleKey] || STYLES.vangogh;

  const img = document.getElementById("result-img");
  img.src          = state.captureDataUrl || "";
  img.style.filter = style.filter;

  document.getElementById("result-style-circle").style.background = style.color;
  document.getElementById("result-style-name").textContent        = style.label;
}

// ── Registrar obra ───────────────────────────────────────────────────────────
function registerArtwork() {
  const { name, author, age, styleKey } = state.form;
  const style = STYLES[styleKey] || STYLES.vangogh;

  state.artworks.unshift({
    id:       Date.now(),
    name,
    author,
    age,
    style:    style.label,
    styleKey,
    color:    style.color,
    filter:   style.filter,
    imgSrc:   state.captureDataUrl,
    emoji:    "✨",
    date:     new Date(),
  });

  go("success");
}

// ── Success ──────────────────────────────────────────────────────────────────
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

// ── Home recents ─────────────────────────────────────────────────────────────
function renderHomeRecents() {
  const wrap = document.getElementById("home-recents");
  const list = document.getElementById("home-recents-list");
  if (state.artworks.length === 0) { wrap.style.display = "none"; return; }

  wrap.style.display = "block";
  list.innerHTML = "";
  state.artworks.slice(0, 5).forEach(art => {
    const div = document.createElement("div");
    div.className = "recent-thumb";
    div.onclick = () => { state.selectedArtwork = art; go("artwork"); };

    if (art.imgSrc) {
      div.innerHTML = `
        <img class="recent-thumb-img" src="${art.imgSrc}" style="filter:${art.filter}" alt="${art.name}"/>
        <div class="recent-label">${art.name}</div>`;
    } else {
      div.innerHTML = `
        <div class="recent-thumb-placeholder" style="background:${art.color}44">${art.emoji}</div>
        <div class="recent-label">${art.name}</div>`;
    }
    list.appendChild(div);
  });
}
