// ── Captura de imagen ────────────────────────────────────────────────────────

function triggerCamera() {
  document.getElementById("file-input-camera").click();
}

function triggerGallery() {
  document.getElementById("file-input-gallery").click();
}

function handleImageFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    state.captureDataUrl = e.target.result;
    showCameraPreview(e.target.result);
    // Pausa breve para que el usuario vea la preview antes de continuar
    setTimeout(() => go("form"), 600);
  };
  reader.readAsDataURL(file);
}

function showCameraPreview(dataUrl) {
  const placeholder = document.getElementById("camera-placeholder");
  const img         = document.getElementById("camera-preview-img");
  if (placeholder) placeholder.style.display = "none";
  if (img) {
    img.src           = dataUrl;
    img.style.display = "block";
  }
}

// ── Event listeners para inputs ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const cam     = document.getElementById("file-input-camera");
  const gallery = document.getElementById("file-input-gallery");

  if (cam)     cam.addEventListener("change",     e => handleImageFile(e.target.files[0]));
  if (gallery) gallery.addEventListener("change",  e => handleImageFile(e.target.files[0]));
});

// ── Pantalla de procesamiento ─────────────────────────────────────────────────
let processingInterval = null;

function startProcessing() {
  const { styleKey } = state.form;
  const style = STYLES[styleKey] || STYLES.vangogh;

  // Reset UI
  const loading  = document.getElementById("proc-loading");
  const done     = document.getElementById("proc-done");
  const bar      = document.getElementById("progress-bar");
  const before   = document.getElementById("proc-img-before");
  const after    = document.getElementById("proc-img-after");
  const lbl      = document.getElementById("proc-style-label");

  loading.classList.remove("hidden");
  done.classList.add("hidden");
  bar.style.width = "0%";

  // Imágenes
  if (state.captureDataUrl) {
    before.src            = state.captureDataUrl;
    before.style.filter   = "";
    before.classList.remove("hidden");

    after.src             = state.captureDataUrl;
    after.style.filter    = style.filter;
    after.classList.add("hidden");
  }

  lbl.textContent = `Aplicando estilo ${style.label}…`;

  // Barra de progreso
  let progress = 0;
  if (processingInterval) clearInterval(processingInterval);

  processingInterval = setInterval(() => {
    progress += 3;
    bar.style.width = Math.min(progress, 100) + "%";

    // A mitad del proceso se ve la imagen transformada
    if (progress >= 50) {
      before.classList.add("hidden");
      after.classList.remove("hidden");
    }

    if (progress >= 100) {
      clearInterval(processingInterval);
      processingInterval = null;
      setTimeout(() => {
        loading.classList.add("hidden");
        done.classList.remove("hidden");
      }, 300);
    }
  }, 80);
}

function finishProcessing() {
  go("result");
}
