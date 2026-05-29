function _esc(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Obras de muestra (semillas locales — no se persisten en Supabase) ───────
const SAMPLE_ARTWORKS = [
  {
    id: "sample_101", name: "La Naturaleza", author: "David Perez", age: 8,
    style: "Van Gogh", styleKey: "vangogh", color: "#2a5298",
    filter: "saturate(2.2) hue-rotate(10deg) contrast(1.1)",
    emoji: "🌿", imgSrc: "assets/naturaleza.png",
    likes: 12, isSample: true,
    createdAt: new Date(Date.now() - 1000*60*60*2).toISOString(),
  },
  {
    id: "sample_102", name: "Pato", author: "Sofia Ayala", age: 6,
    style: "Pablo Picasso", styleKey: "picasso", color: "#8b2252",
    filter: "saturate(1.8) hue-rotate(200deg) contrast(1.4)",
    emoji: "🦆", imgSrc: "assets/pato.png",
    likes: 8, isSample: true,
    createdAt: new Date(Date.now() - 1000*60*60*5).toISOString(),
  },
  {
    id: "sample_103", name: "El Reloj", author: "Juan Montoya", age: 9,
    style: "Leonardo da Vinci", styleKey: "davinci", color: "#8b6914",
    filter: "sepia(0.8) contrast(1.1)",
    emoji: "⏰", imgSrc: "assets/reloj.png",
    likes: 5, isSample: true,
    createdAt: new Date(Date.now() - 1000*60*60*24).toISOString(),
  },
  {
    id: "sample_104", name: "Familia", author: "Ricardo Lora", age: 7,
    style: "Claude Monet", styleKey: "monet", color: "#5b9e8f",
    filter: "saturate(0.9) brightness(1.15) blur(1px)",
    emoji: "👨‍👩‍👧", imgSrc: "assets/familia.png",
    likes: 10, isSample: true,
    createdAt: new Date(Date.now() - 1000*60*60*30).toISOString(),
  },
  {
    id: "sample_105", name: "Mi Casa", author: "Camila Torres", age: 5,
    style: "Frida Kahlo", styleKey: "frida", color: "#c0392b",
    filter: "saturate(2.8) hue-rotate(320deg)",
    emoji: "🏠", imgSrc: "assets/casa.png",
    likes: 7, isSample: true,
    createdAt: new Date(Date.now() - 1000*60*60*48).toISOString(),
  },
  {
    id: "sample_106", name: "El Submarino", author: "Andrés Ríos", age: 8,
    style: "Van Gogh", styleKey: "vangogh", color: "#2a5298",
    filter: "saturate(2.2) hue-rotate(10deg) contrast(1.1)",
    emoji: "🌊", imgSrc: "assets/submarino.png",
    likes: 14, isSample: true,
    createdAt: new Date(Date.now() - 1000*60*60*72).toISOString(),
  },
];

// ── Tab activo ──────────────────────────────────────────────────────────────
let currentTab = "todas";

async function setTab(tab) {
  currentTab = tab;
  ["todas", "recientes", "populares"].forEach(t => {
    const btn = document.getElementById("tab-" + t);
    if (btn) btn.classList.toggle("active", t === tab);
  });
  await renderMuseo();
}

// ── Render galería ──────────────────────────────────────────────────────────
async function renderMuseo() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  showLoader("Cargando museo…");
  let persisted = [];
  try { persisted = await db.artworks.list(); }
  catch (e) { console.warn(e); }
  finally { hideLoader(); }

  const all = [...persisted, ...SAMPLE_ARTWORKS];

  let sorted;
  if (currentTab === "recientes") {
    sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (currentTab === "populares") {
    sorted = [...all].sort((a, b) => (b.likes || 0) - (a.likes || 0));
  } else {
    sorted = all;
  }

  grid.innerHTML = "";
  sorted.forEach(art => grid.appendChild(createArtworkCard(art)));
}

function createArtworkCard(art) {
  const card = document.createElement("div");
  card.className = "artwork-card";
  card.onclick = () => openArtwork(art);

  const thumbWrap = document.createElement("div");
  thumbWrap.className = "artwork-thumb-wrap";
  thumbWrap.style.background = `linear-gradient(135deg, ${art.color}55, ${art.color}cc)`;

  if (art.imgSrc) {
    const img = document.createElement("img");
    img.src = art.imgSrc;
    img.alt = art.name;
    img.style.filter = art.filter || "";
    img.onerror = () => { thumbWrap.innerHTML = ""; thumbWrap.textContent = art.emoji; };
    thumbWrap.appendChild(img);
  } else {
    thumbWrap.textContent = art.emoji;
  }

  const info = document.createElement("div");
  info.className = "artwork-info";
  info.innerHTML = `
    <div class="a-name">${_esc(art.name)}</div>
    <div class="a-author">${_esc(art.author)}</div>
    ${art.age ? `<div class="a-age">${_esc(String(art.age))} años</div>` : ""}
    <div class="a-row">
      <span class="a-style">${_esc(art.style)}</span>
      <span class="a-likes">❤️ ${art.likes || 0}</span>
    </div>
  `;

  card.appendChild(thumbWrap);
  card.appendChild(info);
  return card;
}

// ── Detalle de obra ─────────────────────────────────────────────────────────
async function openArtwork(art) {
  state.selectedArtwork = art;
  await renderArtworkDetail(art);
  await go("artwork");
}

async function renderArtworkDetail(art) {
  const thumbBig = document.getElementById("artwork-thumb-big");

  if (art.imgSrc) {
    const img = document.createElement("img");
    img.src   = art.imgSrc;
    img.alt   = _esc(art.name);
    img.style.cssText = `width:100%;height:100%;object-fit:cover;filter:${art.filter || ""}`;
    img.onerror = () => {
      thumbBig.innerHTML = "";
      thumbBig.textContent = art.emoji || "✨";
    };
    thumbBig.innerHTML = "";
    thumbBig.appendChild(img);
    thumbBig.style.fontSize = "";
    thumbBig.style.display  = "block";
  } else {
    thumbBig.style.background     = `linear-gradient(135deg, ${art.color}55, ${art.color}cc)`;
    thumbBig.style.display        = "flex";
    thumbBig.style.alignItems     = "center";
    thumbBig.style.justifyContent = "center";
    thumbBig.style.fontSize       = "90px";
    thumbBig.textContent          = art.emoji;
  }

  document.getElementById("artwork-detail-name").textContent   = art.name;
  document.getElementById("artwork-detail-author").textContent = art.author;

  const ageWrap = document.getElementById("artwork-detail-age-wrap");
  const ageEl   = document.getElementById("artwork-detail-age");
  if (art.age) {
    ageEl.textContent     = art.age + " años";
    ageWrap.style.display = "block";
  } else {
    ageWrap.style.display = "none";
  }

  const badge = document.getElementById("artwork-detail-style");
  badge.textContent      = art.style;
  badge.style.background = art.color;

  const likeBtn   = document.getElementById("artwork-like-btn");
  const likeCount = document.getElementById("artwork-like-count");
  if (likeCount) likeCount.textContent = art.likes || 0;

  if (likeBtn) {
    let liked = false;
    if (state.currentUser && !art.isSample) {
      try { liked = await db.likes.has(state.currentUser.id, art.id); }
      catch (e) { console.warn(e); }
    }
    likeBtn.classList.toggle("liked", liked);
  }

  const deleteBtn = document.getElementById("artwork-delete-btn");
  if (deleteBtn) {
    const isOwner = state.currentUser && !art.isSample && art.childId === state.currentUser.id;
    deleteBtn.style.display = isOwner ? "flex" : "none";
  }
}

let _likeInProgress = false;

async function toggleArtworkLike() {
  if (_likeInProgress) return;
  const art = state.selectedArtwork;
  if (!art) return;
  if (!state.currentUser) { alert("Primero entra como pequeño artista 💛"); return; }

  const likeBtn   = document.getElementById("artwork-like-btn");
  const likeCount = document.getElementById("artwork-like-count");

  if (art.isSample) {
    const isLiked = likeBtn.classList.contains("liked");
    art.likes = Math.max(0, (art.likes || 0) + (isLiked ? -1 : +1));
    likeCount.textContent = art.likes;
    likeBtn.classList.toggle("liked", !isLiked);
    return;
  }

  _likeInProgress = true;
  if (likeBtn) likeBtn.disabled = true;

  try {
    const nowLiked = await db.likes.toggle(state.currentUser.id, art.id);
    art.likes = Math.max(0, (art.likes || 0) + (nowLiked ? +1 : -1));
    likeCount.textContent = art.likes;
    likeBtn.classList.toggle("liked", nowLiked);
  } catch (e) {
    console.error(e);
    alert("No se pudo guardar el me gusta.");
  } finally {
    _likeInProgress = false;
    if (likeBtn) likeBtn.disabled = false;
  }
}
