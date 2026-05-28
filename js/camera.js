// ── Teachable Machine: carga desde carpeta model/ ────────────────────────────
const TM_MODEL_PATH = "model/";
let tmModel = null;

async function loadTMModel() {
  if (tmModel) return tmModel;
  try {
    tmModel = await tmImage.load(
      TM_MODEL_PATH + "model.json",
      TM_MODEL_PATH + "metadata.json"
    );
    console.log("✅ Modelo TM cargado");
    return tmModel;
  } catch (e) {
    console.warn("❌ No se pudo cargar el modelo TM:", e);
    return null;
  }
}

async function classifyImage(imgElement) {
  const model = await loadTMModel();
  if (!model) return null;
  try {
    const predictions = await model.predict(imgElement);
    const best = predictions.reduce((a, b) => a.probability > b.probability ? a : b);
    return { label: best.className, confidence: best.probability };
  } catch (e) {
    console.warn("Error al clasificar:", e);
    return null;
  }
}

// ── UI del banner ─────────────────────────────────────────────────────────────
function showAIBanner(result) {
  const banner  = document.getElementById("ai-detection-banner");
  const icon    = document.getElementById("ai-icon");
  const label   = document.getElementById("ai-label");
  const conf    = document.getElementById("ai-confidence");
  const warn    = document.getElementById("ai-warning");
  const contBtn = document.getElementById("ai-continue-btn");
  const bar     = document.getElementById("conf-bar");
  if (!banner) return;

  const isDrawing = result.label === "Dibujo";
  const pct       = Math.round(result.confidence * 100);

  banner.className  = "ai-banner " + (isDrawing ? "ai-drawing" : "ai-photo");
  icon.textContent  = isDrawing ? "🖍️" : "📷";
  label.textContent = isDrawing ? "¡Es un dibujo!" : "¡Eso es una foto!";
  conf.textContent  = pct + "% de confianza";

  if (!isDrawing) {
    warn.textContent   = "✏️ Solo se permiten dibujos. ¡Toma papel, dibuja algo y vuelve!";
    warn.style.display = "block";
  } else if (result.confidence < 0.70) {
    warn.textContent   = "🤔 No estamos muy seguros. ¡Puedes continuar igual!";
    warn.style.display = "block";
  } else {
    warn.style.display = "none";
  }

  banner.style.display = "flex";
  if (bar) { bar.style.width = "0%"; setTimeout(() => { bar.style.width = pct + "%"; }, 50); }

  if (isDrawing) {
    state.aiVerified = true;
    if (contBtn) {
      contBtn.style.display = "block";
      contBtn.textContent   = "🎨 ¡Transformar mi dibujo!";
      contBtn.className     = "btn-primary";
    }
  } else {
    // ❌ Foto: ocultar botón continuar y resetear preview tras 2s
    if (contBtn) contBtn.style.display = "none";

    setTimeout(() => {
      hideAIBanner();
      state.captureDataUrl = null;
      const placeholder = document.getElementById("camera-placeholder");
      const img         = document.getElementById("camera-preview-img");
      if (placeholder) placeholder.style.display = "";
      if (img)         { img.src = ""; img.style.display = "none"; }
      document.getElementById("file-input-camera").value  = "";
      document.getElementById("file-input-gallery").value = "";
    }, 2500);
  }
}

function hideAIBanner() {
  const banner  = document.getElementById("ai-detection-banner");
  const contBtn = document.getElementById("ai-continue-btn");
  const warn    = document.getElementById("ai-warning");
  if (banner)  banner.style.display  = "none";
  if (contBtn) contBtn.style.display = "none";
  if (warn)    warn.style.display    = "none";
}

// ── Cámara en vivo (getUserMedia) ────────────────────────────────────────────
let _cameraStream = null;

async function startCamera() {
  const video       = document.getElementById("camera-video");
  const placeholder = document.getElementById("camera-placeholder");
  const img         = document.getElementById("camera-preview-img");
  const shutter     = document.getElementById("btn-shutter");
  const takeBtn     = document.getElementById("btn-take-photo");
  const galleryBtn  = document.getElementById("btn-gallery");
  const liveDot     = document.getElementById("camera-live-dot");

  // Si getUserMedia no está disponible, caer al file input
  if (!navigator.mediaDevices?.getUserMedia) {
    document.getElementById("file-input-camera").click();
    return;
  }

  try {
    _cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });

    video.srcObject = _cameraStream;
    if (placeholder) placeholder.style.display = "none";
    if (img)         img.style.display         = "none";
    video.style.display = "block";
    if (liveDot)    liveDot.style.display      = "block";
    if (shutter)    shutter.style.display      = "flex";
    if (takeBtn)  { takeBtn.textContent = "✕ Cancelar"; takeBtn.onclick = stopCamera; }
    if (galleryBtn) galleryBtn.style.display   = "none";

    hideAIBanner();
  } catch (e) {
    console.warn("Cámara no disponible:", e.message);
    // Fallback: file input con capture
    document.getElementById("file-input-camera").click();
  }
}

function stopCamera() {
  if (_cameraStream) {
    _cameraStream.getTracks().forEach(t => t.stop());
    _cameraStream = null;
  }

  const video      = document.getElementById("camera-video");
  const shutter    = document.getElementById("btn-shutter");
  const takeBtn    = document.getElementById("btn-take-photo");
  const galleryBtn = document.getElementById("btn-gallery");
  const placeholder= document.getElementById("camera-placeholder");
  const liveDot    = document.getElementById("camera-live-dot");

  if (video)      video.style.display      = "none";
  if (liveDot)    liveDot.style.display    = "none";
  if (shutter)    shutter.style.display    = "none";
  if (galleryBtn) galleryBtn.style.display = "";

  if (takeBtn) {
    takeBtn.innerHTML = "📷 Tomar foto";
    takeBtn.onclick   = startCamera;
  }

  // Mostrar placeholder solo si no hay imagen capturada
  if (!state.captureDataUrl && placeholder) placeholder.style.display = "";
}

function captureFromCamera() {
  const video = document.getElementById("camera-video");
  if (!video || !_cameraStream) return;

  const canvas  = document.createElement("canvas");
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  stopCamera();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  _processImage(dataUrl);
}

// ── Carga desde archivo (galería / file input) ────────────────────────────────
function triggerCamera()  { document.getElementById("file-input-camera").click(); }
function triggerGallery() { document.getElementById("file-input-gallery").click(); }

function handleImageFile(file) {
  if (!file) return;
  stopCamera();
  hideAIBanner();

  const reader = new FileReader();
  reader.onload = e => _processImage(e.target.result);
  reader.readAsDataURL(file);
}

// ── Redimensionar imagen si supera 1200px (reduce peso antes de subir) ───────
async function _resizeIfNeeded(dataUrl, maxPx = 1200) {
  return new Promise(resolve => {
    const tmp = new Image();
    tmp.onload = () => {
      if (tmp.width <= maxPx && tmp.height <= maxPx) { resolve(dataUrl); return; }
      const scale  = maxPx / Math.max(tmp.width, tmp.height);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(tmp.width  * scale);
      canvas.height = Math.round(tmp.height * scale);
      canvas.getContext("2d").drawImage(tmp, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    tmp.src = dataUrl;
  });
}

// ── Lógica común: redimensionar, mostrar imagen y clasificar ──────────────────
async function _processImage(dataUrl) {
  state.aiVerified = false;

  const resized = await _resizeIfNeeded(dataUrl);
  state.captureDataUrl = resized;

  const placeholder = document.getElementById("camera-placeholder");
  const img         = document.getElementById("camera-preview-img");
  const spinner     = document.getElementById("ai-spinner");

  if (placeholder) placeholder.style.display = "none";
  if (img) { img.src = resized; img.style.display = "block"; }
  if (spinner) spinner.style.display = "flex";

  img.onload = async () => {
    const result = await classifyImage(img);
    if (spinner) spinner.style.display = "none";
    if (result) showAIBanner(result);
    else { state.aiVerified = true; setTimeout(() => go("form"), 400); }
  };
  if (img.complete) img.onload();
}

function continueToForm() { stopCamera(); hideAIBanner(); go("form"); }

// ── Event listeners ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const cam     = document.getElementById("file-input-camera");
  const gallery = document.getElementById("file-input-gallery");
  if (cam)     cam.addEventListener("change",    e => handleImageFile(e.target.files[0]));
  if (gallery) gallery.addEventListener("change", e => handleImageFile(e.target.files[0]));
  loadTMModel();
});

// ── Procesamiento ─────────────────────────────────────────────────────────────
let processingInterval = null;

async function startProcessing() {
  const { styleKey } = state.form;
  const style = STYLES[styleKey] || STYLES.vangogh;

  const loading = document.getElementById("proc-loading");
  const done    = document.getElementById("proc-done");
  const bar     = document.getElementById("progress-bar");
  const before  = document.getElementById("proc-img-before");
  const after   = document.getElementById("proc-img-after");
  const lbl     = document.getElementById("proc-style-label");

  loading.classList.remove("hidden");
  done.classList.add("hidden");
  bar.style.width = "0%";

  if (state.captureDataUrl) {
    before.src = state.captureDataUrl;
    before.style.filter = "";
    before.classList.remove("hidden");
    after.classList.add("hidden");
  }
  lbl.textContent = `Aplicando estilo ${style.label}…`;

  let filterDone = false;
  state.filteredDataUrl = null;

  applyArtisticFilter(state.captureDataUrl, styleKey).then(result => {
    state.filteredDataUrl = result;
    filterDone = true;
    if (after) { after.src = result; after.style.filter = ""; }
  }).catch(() => {
    filterDone = true;
    if (after) { after.src = state.captureDataUrl; after.style.filter = style.filter; }
  });

  let progress = 0;
  if (processingInterval) clearInterval(processingInterval);
  processingInterval = setInterval(() => {
    const cap = filterDone ? 100 : 85;
    progress = Math.min(progress + 3, cap);
    bar.style.width = progress + "%";
    if (progress >= 50) { before.classList.add("hidden"); after.classList.remove("hidden"); }
    if (progress >= 100) {
      clearInterval(processingInterval); processingInterval = null;
      setTimeout(() => { loading.classList.add("hidden"); done.classList.remove("hidden"); }, 300);
    }
  }, 80);
}

function finishProcessing() { go("result"); }
