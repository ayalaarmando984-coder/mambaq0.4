// ── Obras de muestra con imágenes reales ─────────────────────────────────────
const SAMPLE_ARTWORKS = [
  {
    id: 101, name: "La Naturaleza", author: "David Perez", age: 8,
    style: "Van Gogh", color: "#2a5298",
    filter: "saturate(2.2) hue-rotate(10deg) contrast(1.1)",
    emoji: "🌿", imgSrc: "assets/naturaleza.png",
    date: new Date(Date.now() - 1000*60*60*2)
  },
  {
    id: 102, name: "Pato", author: "Sofia Ayala", age: 6,
    style: "Pablo Picasso", color: "#8b2252",
    filter: "saturate(1.8) hue-rotate(200deg) contrast(1.4)",
    emoji: "🦆", imgSrc: "assets/pato.png",
    date: new Date(Date.now() - 1000*60*60*5)
  },
  {
    id: 103, name: "El Reloj", author: "Juan Montoya", age: 9,
    style: "Leonardo da Vinci", color: "#8b6914",
    filter: "sepia(0.8) contrast(1.1)",
    emoji: "⏰", imgSrc: "assets/reloj.png",
    date: new Date(Date.now() - 1000*60*60*24)
  },
  {
    id: 104, name: "Familia", author: "Ricardo Lora", age: 7,
    style: "Claude Monet", color: "#5b9e8f",
    filter: "saturate(0.9) brightness(1.15) blur(1px)",
    emoji: "👨‍👩‍👧", imgSrc: "assets/familia.png",
    date: new Date(Date.now() - 1000*60*60*30)
  },
  {
    id: 105, name: "Mi Casa", author: "Camila Torres", age: 5,
    style: "Frida Kahlo", color: "#c0392b",
    filter: "saturate(2.8) hue-rotate(320deg)",
    emoji: "🏠", imgSrc: "assets/casa.png",
    date: new Date(Date.now() - 1000*60*60*48)
  },
  {
    id: 106, name: "El Submarino", author: "Andrés Ríos", age: 8,
    style: "Van Gogh", color: "#2a5298",
    filter: "saturate(2.2) hue-rotate(10deg) contrast(1.1)",
    emoji: "🌊", imgSrc: "assets/submarino.png",
    date: new Date(Date.now() - 1000*60*60*72)
  },
];

// ── Tab activo ───────────────────────────────────────────────────────────────
let currentTab = "todas";

function setTab(tab) {
  currentTab = tab;
  ["todas", "recientes", "populares"].forEach(t => {
    const btn = document.getElementById("tab-" + t);
    if (btn) btn.classList.toggle("active", t === tab);
  });
  renderMuseo();
}

// ── Render galería ────────────────────────────────────────────────────────────
function renderMuseo() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  const all = [...state.artworks, ...SAMPLE_ARTWORKS];

  let sorted;
  if (currentTab === "recientes") {
    sorted = [...all].sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (currentTab === "populares") {
    sorted = [...SAMPLE_ARTWORKS, ...state.artworks];
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
    <div class="a-name">${art.name}</div>
    <div class="a-author">${art.author}</div>
    ${art.age ? `<div class="a-age">${art.age} años</div>` : ""}
    <div class="a-style">${art.style}</div>
  `;

  card.appendChild(thumbWrap);
  card.appendChild(info);
  return card;
}

// ── Detalle de obra ───────────────────────────────────────────────────────────
function openArtwork(art) {
  state.selectedArtwork = art;
  renderArtworkDetail(art);
  go("artwork");
}

function renderArtworkDetail(art) {
  const thumbBig = document.getElementById("artwork-thumb-big");

  if (art.imgSrc) {
    thumbBig.innerHTML = `<img src="${art.imgSrc}" alt="${art.name}"
      style="width:100%;height:100%;object-fit:cover;filter:${art.filter || ''}"
      onerror="this.parentElement.textContent='${art.emoji}'"/>`;
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
}
