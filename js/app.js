import { CANVAS_WIDTH, CANVAS_HEIGHT, FRAME_CATEGORIES, FRAMES, FILTERS } from './frames-data.js';

const STORAGE_MODE_KEY = 'maya_photobooth_biodata_mode';
const STORAGE_LOCAL_LEADS_KEY = 'maya_photobooth_local_leads';

// ==================== APP STATE ====================
const state = {
  step: 'frames', // 'frames' | 'camera' | 'result'
  category: 'all',
  search: '',
  selectedFrame: FRAMES[0],
  duplicateStrip: true,
  rotate90Enabled: true,
  filterId: 'none',
  timerSec: 3,
  mirrored: true,
  soundEnabled: true,
  facingMode: 'user',
  photos: [], // array of HTMLImageElement
  activeSlotIndex: 0,
  isShooting: false,
  abortShoot: false,
  stream: null,
  videoDevices: [],
  frameImgCache: new Map(), // frame.id -> HTMLImageElement
  gallery: [], // { thumbUrl, fullUrl, frameName, time }
  // Biodata & Admin state
  biodataMode: localStorage.getItem(STORAGE_MODE_KEY) || 'after', // 'after' | 'before' | 'off'
  sessionLead: null, // lead submitted for current session
  addingFriendBio: false,
  adminPin: '',
  adminLeads: [],
};

// ==================== DOM ELEMENTS ====================
const $ = (sel) => document.querySelector(sel);
const el = {
  views: {
    frames: $('#view-frames'),
    camera: $('#view-camera'),
    result: $('#view-result'),
  },
  stepPills: document.querySelectorAll('.step-pill'),
  stepResultBtn: $('#step-result-btn'),
  btnBrandHome: $('#btn-brand-home'),
  btnOpenGallery: $('#btn-open-gallery'),
  btnOpenAdmin: $('#btn-open-admin'),
  galleryCount: $('#gallery-count'),
  // Step 1
  frameSearch: $('#frame-search'),
  categoryTabs: $('#category-tabs'),
  framesGrid: $('#frames-grid'),
  selectedFrameImg: $('#selected-frame-img'),
  selectedFrameName: $('#selected-frame-name'),
  selectedFrameBadge: $('#selected-frame-badge'),
  selectedFrameDesc: $('#selected-frame-desc'),
  stripModeBox: $('#strip-mode-box'),
  toggleDuplicateStrip: $('#toggle-duplicate-strip'),
  btnStartSession: $('#btn-start-session'),
  // Step 2
  btnBackFrames: $('#btn-back-frames'),
  cameraFrameLabel: $('#camera-frame-label'),
  timerSelector: $('#timer-selector'),
  btnMirror: $('#btn-mirror'),
  btnSwitchCam: $('#btn-switch-cam'),
  btnSound: $('#btn-sound'),
  cameraStage: $('#camera-stage'),
  cameraVideo: $('#camera-video'),
  cropFrame: $('#crop-frame'),
  cropLabel: $('#crop-label'),
  shotCurrent: $('#shot-current'),
  shotTotal: $('#shot-total'),
  countdownOverlay: $('#countdown-overlay'),
  countdownNumber: $('#countdown-number'),
  flashOverlay: $('#flash-overlay'),
  cameraFallback: $('#camera-fallback'),
  cameraErrorMsg: $('#camera-error-msg'),
  btnRetryCamera: $('#btn-retry-camera'),
  btnFallbackUpload: $('#btn-fallback-upload'),
  cameraFilterBar: $('#camera-filter-bar'),
  btnUploadPhotos: $('#btn-upload-photos'),
  fileUploadInput: $('#file-upload-input'),
  singleSlotUpload: $('#single-slot-upload'),
  btnAutoShoot: $('#btn-auto-shoot'),
  shutterCaption: $('#shutter-caption'),
  btnSingleSnap: $('#btn-single-snap'),
  btnGoResult: $('#btn-go-result'),
  btnResetShots: $('#btn-reset-shots'),
  livePreviewCanvas: $('#live-preview-canvas'),
  slotThumbs: $('#slot-thumbs'),
  // Step 3
  resultCanvas: $('#result-canvas'),
  previewLockBanner: $('#preview-lock-banner'),
  resultHeading: $('#result-heading'),
  resultFrameSubtitle: $('#result-frame-subtitle'),
  resultBiodataBox: $('#result-biodata-box'),
  resultBiodataForm: $('#result-biodata-form'),
  resultBiodataError: $('#result-biodata-error'),
  btnSubmitBiodata: $('#btn-submit-biodata'),
  resultUnlockedArea: $('#result-unlocked-area'),
  unlockedBanner: $('#unlocked-banner'),
  unlockedUserSummary: $('#unlocked-user-summary'),
  btnAddFriendBio: $('#btn-add-friend-bio'),
  btnDownloadPng: $('#btn-download-png'),
  btnDownloadJpg: $('#btn-download-jpg'),
  btnPrint4r: $('#btn-print-4r'),
  singleStripDownloads: $('#single-strip-downloads'),
  btnDownloadLeftStrip: $('#btn-download-left-strip'),
  btnDownloadRightStrip: $('#btn-download-right-strip'),
  resultFilterBar: $('#result-filter-bar'),
  rotateOptionBox: $('#rotate-option-box'),
  toggleRotate90: $('#toggle-rotate-90'),
  resultQuickFrames: $('#result-quick-frames'),
  resultSlotThumbs: $('#result-slot-thumbs'),
  btnBackCamera: $('#btn-back-camera'),
  btnNewSession: $('#btn-new-session'),
  printImage: $('#print-image'),
  // Pre-session Biodata Modal
  preBiodataModal: $('#pre-biodata-modal'),
  preBiodataForm: $('#pre-biodata-form'),
  preBiodataError: $('#pre-biodata-error'),
  // Admin Modal
  adminModal: $('#admin-modal'),
  btnCloseAdmin: $('#btn-close-admin'),
  adminPinGate: $('#admin-pin-gate'),
  adminPinForm: $('#admin-pin-form'),
  adminPinInput: $('#admin-pin-input'),
  adminPinError: $('#admin-pin-error'),
  adminContent: $('#admin-content'),
  biodataModeSelector: $('#biodata-mode-selector'),
  statTotalLeads: $('#stat-total-leads'),
  statUniqueSchools: $('#stat-unique-schools'),
  statTopProdi: $('#stat-top-prodi'),
  adminSearch: $('#admin-search'),
  btnRefreshLeads: $('#btn-refresh-leads'),
  btnExportCsv: $('#btn-export-csv'),
  btnClearLeads: $('#btn-clear-leads'),
  adminLeadsTbody: $('#admin-leads-tbody'),
  // Gallery Modal & Toast
  galleryModal: $('#gallery-modal'),
  btnCloseGallery: $('#btn-close-gallery'),
  galleryGrid: $('#gallery-grid'),
  toast: $('#toast'),
};

// ==================== AUDIO FEEDBACK (Web Audio API) ====================
let audioCtx = null;
function playTone(freq, duration = 0.09, type = 'sine', vol = 0.14) {
  if (!state.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // ignore audio block
  }
}

function playShutterSound() {
  if (!state.soundEnabled) return;
  playTone(1040, 0.05, 'triangle', 0.18);
  setTimeout(() => playTone(620, 0.08, 'sine', 0.12), 45);
}

// ==================== HELPERS ====================
let toastTimer = null;
function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2800);
}

function getRequiredPhotoCount(frame = state.selectedFrame) {
  if (frame.layout === 'double-strip' && !state.duplicateStrip) {
    return frame.slots.length;
  }
  return frame.uniquePhotos;
}

function getSlotPhotoIndex(slot, slotIdx, frame = state.selectedFrame) {
  if (frame.layout === 'double-strip' && !state.duplicateStrip) {
    return slotIdx;
  }
  return slot.photoIndex;
}

function getCurrentFilterCSS() {
  return (FILTERS.find((f) => f.id === state.filterId) || FILTERS[0]).css;
}

function loadFrameImage(frame) {
  if (state.frameImgCache.has(frame.id)) {
    return Promise.resolve(state.frameImgCache.get(frame.id));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      state.frameImgCache.set(frame.id, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = frame.src;
  });
}

function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==================== BIODATA API & VALIDATION ====================
function validateLeadPayload(payload) {
  if (!payload.nama) return 'Nama lengkap wajib diisi.';
  if (!payload.asalSekolah) return 'Asal SMA / SMK / MA wajib diisi.';
  if (!payload.email) return 'Email wajib diisi.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return 'Format email belum valid (contoh: nama@gmail.com).';
  }
  const digits = payload.noHp.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    return 'Nomor HP / WhatsApp harus 9–15 digit angka (contoh: 081234567890).';
  }
  return null;
}

function readLocalFallbackLeads() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_LOCAL_LEADS_KEY) || '[]');
  } catch {
    return [];
  }
}

async function submitLeadToServer(payload) {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Gagal menyimpan biodata.');
    }
    return data.lead;
  } catch (err) {
    // Graceful fallback if opened via static file server without Node API
    if (err.message && /wajib|valid|digit/i.test(err.message)) throw err;
    const localList = readLocalFallbackLeads();
    const entry = {
      id: `local-${Date.now()}`,
      waktu: new Date().toLocaleString('id-ID'),
      ...payload,
      noHp: payload.noHp.replace(/\D/g, ''),
    };
    localList.unshift(entry);
    localStorage.setItem(STORAGE_LOCAL_LEADS_KEY, JSON.stringify(localList));
    return entry;
  }
}

function isResultLocked() {
  if (state.biodataMode === 'off') return false;
  if (state.addingFriendBio) return true;
  return !state.sessionLead;
}

function updateResultGateUI() {
  const locked = isResultLocked();
  el.resultBiodataBox.hidden = !locked;
  el.resultUnlockedArea.hidden = locked;
  el.previewLockBanner.hidden = !locked;

  if (locked) {
    el.resultHeading.textContent = state.addingFriendBio
      ? 'Tambah Biodata Teman'
      : 'Keren Banget Hasilnya!';
  } else {
    el.resultHeading.textContent = 'Siap Disimpan & Dicetak!';
  }

  if (!locked && state.sessionLead && state.biodataMode !== 'off') {
    el.unlockedBanner.hidden = false;
    el.unlockedUserSummary.textContent = `${state.sessionLead.nama} • ${state.sessionLead.asalSekolah}`;
  } else {
    el.unlockedBanner.hidden = true;
  }
}

function checkPreBiodataGate() {
  if (state.biodataMode === 'before' && !state.sessionLead) {
    el.preBiodataForm.reset();
    el.preBiodataError.hidden = true;
    el.preBiodataModal.hidden = false;
  } else {
    el.preBiodataModal.hidden = true;
  }
}

// ==================== COMPOSITOR (HD 1200x1800) ====================
function drawImageCover(ctx, img, x, y, w, h, rotateDeg = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.translate(cx, cy);

  const rad = (rotateDeg * Math.PI) / 180;
  if (rad !== 0) ctx.rotate(rad);

  const isRightAngle = Math.abs(rotateDeg % 180) === 90;
  const targetW = isRightAngle ? h : w;
  const targetH = isRightAngle ? w : h;

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = targetW / targetH;
  let drawW, drawH;
  if (imgRatio > boxRatio) {
    drawH = targetH;
    drawW = targetH * imgRatio;
  } else {
    drawW = targetW;
    drawH = targetW / imgRatio;
  }

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

async function renderComposite(canvas, { showPlaceholders = false } = {}) {
  const frame = state.selectedFrame;
  const frameImg = await loadFrameImage(frame);

  const ctx = canvas.getContext('2d');
  const scaleX = canvas.width / CANVAS_WIDTH;
  const scaleY = canvas.height / CANVAS_HEIGHT;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#182421';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const filterCSS = getCurrentFilterCSS();
  const bleed = frame.bleed ?? 4;

  frame.slots.forEach((slot, idx) => {
    const pIdx = getSlotPhotoIndex(slot, idx, frame);
    const photo = state.photos[pIdx];

    const sx = (slot.x - bleed) * scaleX;
    const sy = (slot.y - bleed) * scaleY;
    const sw = (slot.w + bleed * 2) * scaleX;
    const sh = (slot.h + bleed * 2) * scaleY;

    if (photo) {
      const rot = slot.rotate && state.rotate90Enabled ? slot.rotate : 0;
      ctx.save();
      ctx.filter = filterCSS;
      drawImageCover(ctx, photo, sx, sy, sw, sh, rot);
      ctx.restore();
    } else if (showPlaceholders) {
      const rx = slot.x * scaleX;
      const ry = slot.y * scaleY;
      const rw = slot.w * scaleX;
      const rh = slot.h * scaleY;
      ctx.fillStyle = pIdx === state.activeSlotIndex ? '#1E4A40' : '#243531';
      ctx.fillRect(rx, ry, rw, rh);

      ctx.fillStyle = pIdx === state.activeSlotIndex ? '#A7F3D0' : 'rgba(255,255,255,0.45)';
      ctx.font = `700 ${Math.round(44 * scaleX)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${pIdx + 1}`, rx + rw / 2, ry + rh / 2);
    }
  });

  ctx.filter = 'none';
  ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ==================== STEP NAVIGATION ====================
async function goToStep(step) {
  if (state.isShooting) {
    state.abortShoot = true;
    state.isShooting = false;
  }

  state.step = step;
  Object.entries(el.views).forEach(([k, node]) => {
    node.classList.toggle('active', k === step);
  });

  el.stepPills.forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.step === step);
  });

  if (step === 'camera') {
    prepareCameraStep();
    await startCamera();
  } else {
    stopCamera();
  }

  if (step === 'result') {
    await prepareResultStep();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== STEP 1: FRAMES CATALOG ====================
function renderCategories() {
  el.categoryTabs.innerHTML = '';
  FRAME_CATEGORIES.forEach((cat) => {
    const count = cat.id === 'all'
      ? FRAMES.length
      : FRAMES.filter((f) => f.category === cat.id).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cat-btn${state.category === cat.id ? ' active' : ''}`;
    btn.textContent = `${cat.label} (${count})`;
    btn.addEventListener('click', () => {
      state.category = cat.id;
      renderCategories();
      renderFramesGrid();
    });
    el.categoryTabs.appendChild(btn);
  });
}

function getFilteredFrames() {
  const q = state.search.trim().toLowerCase();
  return FRAMES.filter((f) => {
    const matchCat = state.category === 'all' || f.category === state.category;
    const matchQ = !q || f.name.toLowerCase().includes(q) || f.badge.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

function renderFramesGrid() {
  const list = getFilteredFrames();
  el.framesGrid.innerHTML = '';

  if (list.length === 0) {
    el.framesGrid.innerHTML = `<div class="gallery-empty">Tidak ada frame yang cocok dengan pencarian "<strong>${escapeHtml(state.search)}</strong>".</div>`;
    return;
  }

  list.forEach((frame) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `frame-card${state.selectedFrame.id === frame.id ? ' selected' : ''}`;
    card.innerHTML = `
      <div class="frame-thumb-wrap">
        <img src="${frame.src}" alt="${frame.name}" loading="lazy" />
      </div>
      <div class="frame-card-meta">
        <span class="frame-card-name">${frame.name}</span>
        <span class="frame-card-badge">${frame.badge}</span>
      </div>
    `;
    card.addEventListener('click', () => selectFrame(frame));
    el.framesGrid.appendChild(card);
  });
}

function selectFrame(frame) {
  state.selectedFrame = frame;
  state.rotate90Enabled = Boolean(frame.defaultRotate90);

  el.selectedFrameImg.src = frame.src;
  el.selectedFrameName.textContent = frame.name;
  el.selectedFrameBadge.textContent = frame.badge;

  const isDouble = frame.layout === 'double-strip';
  el.stripModeBox.hidden = !isDouble;
  updateSelectedFrameDesc();

  el.framesGrid.querySelectorAll('.frame-card').forEach((card) => {
    const name = card.querySelector('.frame-card-name')?.textContent;
    card.classList.toggle('selected', name === frame.name);
  });

  loadFrameImage(frame).catch(() => {});
}

function updateSelectedFrameDesc() {
  const f = state.selectedFrame;
  const req = getRequiredPhotoCount(f);
  if (f.layout === 'double-strip') {
    el.selectedFrameDesc.textContent = state.duplicateStrip
      ? `Mengambil ${req} foto lalu otomatis diduplikat ke strip kiri & kanan pada kertas 4R. Kamu juga bisa download 1 strip saja.`
      : `Mode semua slot berbeda: mengambil ${req} foto unik untuk mengisi strip kiri dan kanan secara terpisah.`;
  } else {
    el.selectedFrameDesc.textContent = `Frame 4R penuh dengan ${req} slot foto unik, siap langsung disimpan atau dicetak ukuran 4×6 inci.`;
  }
}

// ==================== STEP 2: CAMERA STUDIO ====================
function renderFilterBars() {
  [el.cameraFilterBar, el.resultFilterBar].forEach((bar) => {
    bar.innerHTML = '';
    FILTERS.forEach((f) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `filter-pill${state.filterId === f.id ? ' active' : ''}`;
      btn.textContent = f.name;
      btn.addEventListener('click', () => {
        state.filterId = f.id;
        el.cameraVideo.style.filter = f.css;
        renderFilterBars();
        if (state.step === 'camera') renderComposite(el.livePreviewCanvas, { showPlaceholders: true });
        if (state.step === 'result') renderResultCanvas();
      });
      bar.appendChild(btn);
    });
  });
}

function prepareCameraStep() {
  const req = getRequiredPhotoCount();
  state.photos = state.photos.slice(0, req);
  while (state.photos.length < req) state.photos.push(null);

  const firstEmpty = state.photos.findIndex((p) => !p);
  state.activeSlotIndex = firstEmpty === -1 ? 0 : firstEmpty;

  el.cameraFrameLabel.textContent = state.selectedFrame.name;
  el.cameraVideo.style.filter = getCurrentFilterCSS();
  el.cameraVideo.classList.toggle('mirrored', state.mirrored);
  el.btnMirror.classList.toggle('active', state.mirrored);

  updateCameraUI();
  renderComposite(el.livePreviewCanvas, { showPlaceholders: true });
}

function updateCropGuide() {
  const frame = state.selectedFrame;
  const targetSlot = frame.slots.find((s, i) => getSlotPhotoIndex(s, i, frame) === state.activeSlotIndex) || frame.slots[0];
  const isRot90 = Boolean(targetSlot.rotate && state.rotate90Enabled);
  const slotRatio = isRot90 ? (targetSlot.h / targetSlot.w) : (targetSlot.w / targetSlot.h);

  const stageRect = el.cameraStage.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height) return;

  const maxW = stageRect.width * 0.86;
  const maxH = stageRect.height * 0.86;
  let w, h;
  if (maxW / maxH > slotRatio) {
    h = maxH;
    w = h * slotRatio;
  } else {
    w = maxW;
    h = w / slotRatio;
  }
  el.cropFrame.style.width = `${Math.round(w)}px`;
  el.cropFrame.style.height = `${Math.round(h)}px`;
  el.cropLabel.textContent = `Area Foto #${state.activeSlotIndex + 1}`;
}

function updateCameraUI() {
  const req = getRequiredPhotoCount();
  const filledCount = state.photos.filter(Boolean).length;
  const allFilled = filledCount >= req;

  el.shotCurrent.textContent = String(Math.min(state.activeSlotIndex + 1, req));
  el.shotTotal.textContent = String(req);
  el.btnGoResult.disabled = filledCount === 0;
  el.stepResultBtn.disabled = filledCount === 0;

  if (state.isShooting) {
    el.btnAutoShoot.classList.add('shooting');
    el.shutterCaption.textContent = 'Stop';
  } else {
    el.btnAutoShoot.classList.remove('shooting');
    el.shutterCaption.textContent = allFilled ? 'Foto Ulang Semua' : (filledCount > 0 ? 'Lanjutkan Foto' : 'Mulai Foto');
  }

  renderSlotThumbnails(el.slotThumbs, 'camera');
  requestAnimationFrame(updateCropGuide);
}

function renderSlotThumbnails(container, mode) {
  const req = getRequiredPhotoCount();
  container.innerHTML = '';
  for (let i = 0; i < req; i++) {
    const photo = state.photos[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `slot-thumb${mode === 'camera' && i === state.activeSlotIndex ? ' active-slot' : ''}`;
    btn.title = photo ? `Klik untuk foto ulang slot #${i + 1}` : `Pilih slot #${i + 1}`;

    if (photo) {
      btn.innerHTML = `
        <img src="${photo.src}" alt="Foto ${i + 1}" />
        <span class="slot-thumb-num">${i + 1}</span>
        <span class="slot-thumb-hover">Ulang</span>
      `;
    } else {
      btn.innerHTML = `
        <span class="slot-thumb-num">${i + 1}</span>
        <span class="slot-thumb-empty">+</span>
      `;
    }

    btn.addEventListener('click', () => {
      state.activeSlotIndex = i;
      if (mode === 'result') {
        goToStep('camera').then(() => {
          state.activeSlotIndex = i;
          updateCameraUI();
          renderComposite(el.livePreviewCanvas, { showPlaceholders: true });
          showToast(`Siap foto ulang untuk Slot #${i + 1}`);
        });
      } else {
        updateCameraUI();
        renderComposite(el.livePreviewCanvas, { showPlaceholders: true });
        showToast(`Slot #${i + 1} dipilih — klik Jepret 1× atau Upload`);
      }
    });
    container.appendChild(btn);
  }
}

async function startCamera() {
  stopCamera();
  el.cameraFallback.hidden = true;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCameraError('Browser tidak mendukung akses kamera. Gunakan tombol Upload Foto.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: state.facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    state.stream = stream;
    el.cameraVideo.srcObject = stream;
    await el.cameraVideo.play();

    const devices = await navigator.mediaDevices.enumerateDevices();
    state.videoDevices = devices.filter((d) => d.kind === 'videoinput');
    el.btnSwitchCam.hidden = state.videoDevices.length < 2;

    updateCropGuide();
  } catch (err) {
    console.warn('Camera error:', err);
    showCameraError('Akses kamera ditolak atau webcam tidak ditemukan. Kamu tetap bisa menggunakan fitur Upload Foto dari galeri!');
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }
  el.cameraVideo.srcObject = null;
}

function showCameraError(msg) {
  el.cameraErrorMsg.textContent = msg;
  el.cameraFallback.hidden = false;
}

async function runCountdown(seconds) {
  if (seconds <= 0) return true;
  el.countdownOverlay.hidden = false;
  for (let s = seconds; s >= 1; s--) {
    if (state.abortShoot) {
      el.countdownOverlay.hidden = true;
      return false;
    }
    el.countdownNumber.textContent = String(s);
    el.countdownNumber.style.animation = 'none';
    el.countdownNumber.offsetHeight;
    el.countdownNumber.style.animation = '';
    playTone(s === 1 ? 880 : 580, 0.1, 'sine', 0.15);
    await sleep(920);
  }
  el.countdownOverlay.hidden = true;
  return !state.abortShoot;
}

function triggerFlash() {
  el.flashOverlay.classList.add('flash');
  requestAnimationFrame(() => {
    setTimeout(() => el.flashOverlay.classList.remove('flash'), 60);
  });
}

async function captureVideoFrame() {
  const video = el.cameraVideo;
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('Kamera belum siap');
  }
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  const ctx = c.getContext('2d');
  if (state.mirrored) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', 0.94);
  return imageFromDataUrl(dataUrl);
}

async function snapCurrentSlot() {
  if (!state.stream) {
    showToast('Kamera belum aktif — gunakan Upload Foto atau aktifkan kamera');
    return false;
  }
  const ok = await runCountdown(state.timerSec);
  if (!ok) return false;

  triggerFlash();
  playShutterSound();
  const img = await captureVideoFrame();
  state.photos[state.activeSlotIndex] = img;

  const req = getRequiredPhotoCount();
  const nextEmpty = state.photos.findIndex((p) => !p);
  if (nextEmpty !== -1) {
    state.activeSlotIndex = nextEmpty;
  } else {
    state.activeSlotIndex = Math.min(state.activeSlotIndex + 1, req - 1);
  }

  updateCameraUI();
  await renderComposite(el.livePreviewCanvas, { showPlaceholders: true });
  return true;
}

async function startAutoShoot() {
  if (state.isShooting) {
    state.abortShoot = true;
    state.isShooting = false;
    el.countdownOverlay.hidden = true;
    updateCameraUI();
    return;
  }

  if (!state.stream) {
    showToast('Kamera belum aktif — kamu bisa pakai tombol Upload Foto!');
    return;
  }

  const req = getRequiredPhotoCount();
  if (state.photos.every(Boolean)) {
    state.photos = Array(req).fill(null);
    state.activeSlotIndex = 0;
  }

  state.isShooting = true;
  state.abortShoot = false;
  updateCameraUI();

  for (let i = 0; i < req; i++) {
    if (state.abortShoot) break;
    if (state.photos[i]) continue;
    state.activeSlotIndex = i;
    updateCameraUI();
    await renderComposite(el.livePreviewCanvas, { showPlaceholders: true });

    const ok = await snapCurrentSlot();
    if (!ok) break;
    if (i < req - 1 && !state.abortShoot) {
      await sleep(750);
    }
  }

  state.isShooting = false;
  updateCameraUI();

  if (!state.abortShoot && state.photos.every(Boolean)) {
    showToast('Semua foto selesai! Menyiapkan hasil HD...');
    await sleep(600);
    await goToStep('result');
  }
}

async function handleUploadedFiles(fileList, targetSingleIndex = null) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;

  const req = getRequiredPhotoCount();
  for (let fIdx = 0; fIdx < files.length; fIdx++) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(files[fIdx]);
    });
    const img = await imageFromDataUrl(dataUrl);

    if (targetSingleIndex !== null) {
      state.photos[targetSingleIndex] = img;
      break;
    } else {
      const slotIdx = state.photos.findIndex((p) => !p);
      const insertAt = slotIdx !== -1 ? slotIdx : (state.activeSlotIndex % req);
      state.photos[insertAt] = img;
      state.activeSlotIndex = (insertAt + 1) % req;
    }
  }

  updateCameraUI();
  await renderComposite(el.livePreviewCanvas, { showPlaceholders: true });

  if (state.photos.every(Boolean)) {
    showToast('Semua slot foto sudah terisi! Klik "Lanjut Hasil" untuk simpan.');
  } else {
    showToast(`${files.length} foto ditambahkan ke frame.`);
  }
}

// ==================== STEP 3: RESULT & EXPORT ====================
async function prepareResultStep() {
  const frame = state.selectedFrame;
  state.addingFriendBio = false;
  el.resultFrameSubtitle.textContent = `${frame.name} • ${frame.badge}`;
  el.singleStripDownloads.hidden = frame.layout !== 'double-strip';
  el.rotateOptionBox.hidden = !frame.defaultRotate90;
  el.toggleRotate90.checked = state.rotate90Enabled;
  el.resultBiodataError.hidden = true;

  renderFilterBars();
  renderQuickFrames();
  renderSlotThumbnails(el.resultSlotThumbs, 'result');
  updateResultGateUI();
  await renderResultCanvas();
  saveToSessionGallery();
}

async function renderResultCanvas() {
  await renderComposite(el.resultCanvas, { showPlaceholders: false });
}

function renderQuickFrames() {
  el.resultQuickFrames.innerHTML = '';
  FRAMES.forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `quick-frame-item${f.id === state.selectedFrame.id ? ' active' : ''}`;
    btn.title = `${f.name} (${f.badge})`;
    btn.innerHTML = `<img src="${f.src}" alt="${f.name}" loading="lazy" />`;
    btn.addEventListener('click', async () => {
      state.selectedFrame = f;
      state.rotate90Enabled = Boolean(f.defaultRotate90);
      el.resultFrameSubtitle.textContent = `${f.name} • ${f.badge}`;
      el.singleStripDownloads.hidden = f.layout !== 'double-strip';
      el.rotateOptionBox.hidden = !f.defaultRotate90;
      el.toggleRotate90.checked = state.rotate90Enabled;

      const req = getRequiredPhotoCount(f);
      const validPhotos = state.photos.filter(Boolean);
      const expanded = [];
      for (let i = 0; i < req; i++) {
        expanded.push(state.photos[i] || validPhotos[i % validPhotos.length] || null);
      }
      state.photos = expanded;

      renderQuickFrames();
      renderSlotThumbnails(el.resultSlotThumbs, 'result');
      await renderResultCanvas();
      showToast(`Frame diganti ke ${f.name}`);
    });
    el.resultQuickFrames.appendChild(btn);
  });
}

function sanitizeFilename(name) {
  return String(name || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '');
}

function buildDownloadFilename(ext, suffix = '', overrideName = '') {
  const rawName = overrideName || state.sessionLead?.nama || '';
  const safeName = sanitizeFilename(rawName);
  if (safeName) {
    return `${safeName}${suffix ? ` - ${suffix}` : ''}.${ext}`;
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `maya-photobooth-${state.selectedFrame.id}${suffix ? `-${suffix.toLowerCase().replace(/\s+/g, '-')}` : ''}-${stamp}.${ext}`;
}

function downloadCanvas(canvas, filename, mime = 'image/png', quality = 0.95) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL(mime, quality);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadHalfStrip(side) {
  const half = document.createElement('canvas');
  half.width = CANVAS_WIDTH / 2;
  half.height = CANVAS_HEIGHT;
  const ctx = half.getContext('2d');
  const sx = side === 'left' ? 0 : CANVAS_WIDTH / 2;
  ctx.drawImage(el.resultCanvas, sx, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT, 0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT);
  const label = side === 'left' ? 'Strip Kiri' : 'Strip Kanan';
  downloadCanvas(half, buildDownloadFilename('png', label), 'image/png');
  showToast(`Strip ${side === 'left' ? 'kiri' : 'kanan'} berhasil didownload!`);
}

function saveToSessionGallery() {
  if (!state.photos.some(Boolean)) return;
  const thumb = document.createElement('canvas');
  thumb.width = 400;
  thumb.height = 600;
  thumb.getContext('2d').drawImage(el.resultCanvas, 0, 0, 400, 600);
  const fullDataUrl = el.resultCanvas.toDataURL('image/jpeg', 0.92);

  state.gallery.unshift({
    thumbUrl: thumb.toDataURL('image/jpeg', 0.82),
    fullUrl: fullDataUrl,
    frameName: state.selectedFrame.name,
    userName: state.sessionLead?.nama || '',
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  });
  if (state.gallery.length > 20) state.gallery.pop();
  el.galleryCount.textContent = String(state.gallery.length);
}

function renderGalleryModal() {
  el.galleryGrid.innerHTML = '';
  if (state.gallery.length === 0) {
    el.galleryGrid.innerHTML = `<div class="gallery-empty">Belum ada hasil foto di sesi ini. Yuk mulai berfoto dulu!</div>`;
    return;
  }
  state.gallery.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    card.innerHTML = `
      <img src="${item.thumbUrl}" alt="${escapeHtml(item.frameName)}" />
      <div class="gallery-item-meta">
        <span>${escapeHtml(item.userName || item.time)}</span>
        <button class="btn btn-primary btn-sm" type="button">Download</button>
      </div>
    `;
    card.querySelector('button').addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = item.userName
        ? buildDownloadFilename('jpg', '', item.userName)
        : `maya-photobooth-${idx + 1}.jpg`;
      a.href = item.fullUrl;
      a.click();
    });
    el.galleryGrid.appendChild(card);
  });
}

// ==================== ADMIN / PANITIA PANEL ====================
function updateBiodataModeButtons() {
  el.biodataModeSelector.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.biodataMode);
  });
}

async function fetchAdminLeads() {
  const res = await fetch('/api/leads', {
    headers: { 'x-admin-pin': state.adminPin },
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'PIN Panitia salah.');
  }
  state.adminLeads = data.leads || [];
  renderAdminDashboard();
}

function renderAdminDashboard() {
  const all = state.adminLeads;
  el.statTotalLeads.textContent = String(all.length);

  const schools = new Set(all.map((x) => (x.asalSekolah || '').trim().toLowerCase()).filter(Boolean));
  el.statUniqueSchools.textContent = String(schools.size);

  const prodiCounts = {};
  all.forEach((x) => {
    const p = (x.minatProdi || '').trim();
    if (p && p !== '-' && p !== 'Belum Menentukan') {
      prodiCounts[p] = (prodiCounts[p] || 0) + 1;
    }
  });
  const topProdi = Object.entries(prodiCounts).sort((a, b) => b[1] - a[1])[0];
  el.statTopProdi.textContent = topProdi ? `${topProdi[0]} (${topProdi[1]})` : '-';

  const q = el.adminSearch.value.trim().toLowerCase();
  const filtered = all.filter((item) => {
    if (!q) return true;
    return [item.nama, item.asalSekolah, item.email, item.noHp, item.minatProdi, item.frameName]
      .some((v) => String(v || '').toLowerCase().includes(q));
  });

  el.adminLeadsTbody.innerHTML = '';
  if (!filtered.length) {
    el.adminLeadsTbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--ink-muted);">Belum ada data biodata tersimpan.</td></tr>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(item.waktu || '-')}</td>
      <td><strong>${escapeHtml(item.nama)}</strong></td>
      <td>${escapeHtml(item.asalSekolah)}</td>
      <td>${escapeHtml(item.kelas || '-')}<small>${escapeHtml(item.minatProdi || '-')}</small></td>
      <td>${escapeHtml(item.email)}</td>
      <td>${escapeHtml(item.noHp)}</td>
      <td>${escapeHtml(item.frameName || '-')}</td>
      <td><button class="lead-del-btn" type="button" title="Hapus baris ini">✕</button></td>
    `;
    tr.querySelector('.lead-del-btn').addEventListener('click', async () => {
      if (!confirm(`Hapus data biodata "${item.nama}"?`)) return;
      await fetch(`/api/leads/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': state.adminPin },
      });
      await fetchAdminLeads();
      showToast('Data dihapus');
    });
    el.adminLeadsTbody.appendChild(tr);
  });
}

// ==================== EVENT BINDINGS ====================
function bindEvents() {
  // Navigation
  el.btnBrandHome.addEventListener('click', () => goToStep('frames'));
  el.stepPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      if (!pill.disabled) goToStep(pill.dataset.step);
    });
  });

  // Step 1
  el.frameSearch.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderFramesGrid();
  });

  el.toggleDuplicateStrip.addEventListener('change', (e) => {
    state.duplicateStrip = e.target.checked;
    updateSelectedFrameDesc();
  });

  el.btnStartSession.addEventListener('click', () => {
    state.photos = [];
    goToStep('camera');
  });

  // Step 2
  el.btnBackFrames.addEventListener('click', () => goToStep('frames'));

  el.timerSelector.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.timerSec = Number(btn.dataset.timer);
      el.timerSelector.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  el.btnMirror.addEventListener('click', () => {
    state.mirrored = !state.mirrored;
    el.btnMirror.classList.toggle('active', state.mirrored);
    el.cameraVideo.classList.toggle('mirrored', state.mirrored);
  });

  el.btnSwitchCam.addEventListener('click', () => {
    state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
    state.mirrored = state.facingMode === 'user';
    el.btnMirror.classList.toggle('active', state.mirrored);
    el.cameraVideo.classList.toggle('mirrored', state.mirrored);
    startCamera();
  });

  el.btnSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    el.btnSound.classList.toggle('active', state.soundEnabled);
    showToast(state.soundEnabled ? 'Suara aktif' : 'Suara dimatikan');
  });

  el.btnRetryCamera.addEventListener('click', () => startCamera());
  el.btnFallbackUpload.addEventListener('click', () => el.fileUploadInput.click());
  el.btnUploadPhotos.addEventListener('click', () => el.fileUploadInput.click());

  el.fileUploadInput.addEventListener('change', async (e) => {
    await handleUploadedFiles(e.target.files);
    e.target.value = '';
  });

  el.btnAutoShoot.addEventListener('click', () => startAutoShoot());

  el.btnSingleSnap.addEventListener('click', async () => {
    if (state.isShooting) return;
    state.isShooting = true;
    state.abortShoot = false;
    updateCameraUI();
    await snapCurrentSlot();
    state.isShooting = false;
    updateCameraUI();
  });

  el.btnResetShots.addEventListener('click', async () => {
    const req = getRequiredPhotoCount();
    state.photos = Array(req).fill(null);
    state.activeSlotIndex = 0;
    updateCameraUI();
    await renderComposite(el.livePreviewCanvas, { showPlaceholders: true });
    showToast('Semua slot foto direset');
  });

  el.btnGoResult.addEventListener('click', () => goToStep('result'));

  // Step 3 — Biodata Form (After Photo)
  el.resultBiodataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.resultBiodataError.hidden = true;
    const fd = new FormData(el.resultBiodataForm);
    const payload = {
      nama: String(fd.get('nama') || '').trim(),
      asalSekolah: String(fd.get('asalSekolah') || '').trim(),
      kelas: String(fd.get('kelas') || '').trim(),
      minatProdi: String(fd.get('minatProdi') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      noHp: String(fd.get('noHp') || '').trim(),
      frameId: state.selectedFrame.id,
      frameName: state.selectedFrame.name,
    };

    const errMsg = validateLeadPayload(payload);
    if (errMsg) {
      el.resultBiodataError.textContent = errMsg;
      el.resultBiodataError.hidden = false;
      return;
    }

    el.btnSubmitBiodata.disabled = true;
    try {
      const saved = await submitLeadToServer(payload);
      state.sessionLead = saved;
      if (state.gallery.length > 0 && !state.gallery[0].userName) {
        state.gallery[0].userName = saved.nama;
      }
      state.addingFriendBio = false;
      el.resultBiodataForm.reset();
      updateResultGateUI();
      showToast(`Terima kasih, ${saved.nama}! Download & Cetak HD terbuka.`);
    } catch (err) {
      el.resultBiodataError.textContent = err.message || 'Gagal menyimpan biodata.';
      el.resultBiodataError.hidden = false;
    } finally {
      el.btnSubmitBiodata.disabled = false;
    }
  });

  el.btnAddFriendBio.addEventListener('click', () => {
    state.addingFriendBio = true;
    el.resultBiodataForm.reset();
    el.resultBiodataError.hidden = true;
    updateResultGateUI();
  });

  // Pre-session Biodata Form (Before Photo mode)
  el.preBiodataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.preBiodataError.hidden = true;
    const fd = new FormData(el.preBiodataForm);
    const payload = {
      nama: String(fd.get('nama') || '').trim(),
      asalSekolah: String(fd.get('asalSekolah') || '').trim(),
      kelas: String(fd.get('kelas') || '').trim(),
      minatProdi: String(fd.get('minatProdi') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      noHp: String(fd.get('noHp') || '').trim(),
      frameId: state.selectedFrame.id,
      frameName: '(Registrasi Awal)',
    };

    const errMsg = validateLeadPayload(payload);
    if (errMsg) {
      el.preBiodataError.textContent = errMsg;
      el.preBiodataError.hidden = false;
      return;
    }

    try {
      const saved = await submitLeadToServer(payload);
      state.sessionLead = saved;
      el.preBiodataModal.hidden = true;
      showToast(`Halo ${saved.nama}, selamat berfoto!`);
    } catch (err) {
      el.preBiodataError.textContent = err.message || 'Gagal menyimpan biodata.';
      el.preBiodataError.hidden = false;
    }
  });

  // Step 3 — Downloads & Print
  el.btnDownloadPng.addEventListener('click', () => {
    downloadCanvas(el.resultCanvas, buildDownloadFilename('png'), 'image/png');
    showToast('Foto HD 4R (PNG) berhasil didownload!');
  });

  el.btnDownloadJpg.addEventListener('click', () => {
    downloadCanvas(el.resultCanvas, buildDownloadFilename('jpg'), 'image/jpeg', 0.94);
    showToast('Foto JPG berhasil didownload!');
  });

  el.btnDownloadLeftStrip.addEventListener('click', () => downloadHalfStrip('left'));
  el.btnDownloadRightStrip.addEventListener('click', () => downloadHalfStrip('right'));

  el.btnPrint4r.addEventListener('click', () => {
    el.printImage.src = el.resultCanvas.toDataURL('image/png');
    el.printImage.onload = () => window.print();
  });

  el.toggleRotate90.addEventListener('change', (e) => {
    state.rotate90Enabled = e.target.checked;
    renderResultCanvas();
  });

  el.btnBackCamera.addEventListener('click', () => goToStep('camera'));

  el.btnNewSession.addEventListener('click', () => {
    state.photos = [];
    state.sessionLead = null;
    state.addingFriendBio = false;
    goToStep('frames').then(() => checkPreBiodataGate());
  });

  // Gallery modal
  el.btnOpenGallery.addEventListener('click', () => {
    renderGalleryModal();
    el.galleryModal.hidden = false;
  });
  el.btnCloseGallery.addEventListener('click', () => {
    el.galleryModal.hidden = true;
  });
  el.galleryModal.addEventListener('click', (e) => {
    if (e.target === el.galleryModal) el.galleryModal.hidden = true;
  });

  // Admin modal
  el.btnOpenAdmin.addEventListener('click', () => {
    el.adminModal.hidden = false;
    updateBiodataModeButtons();
    if (state.adminPin) {
      el.adminPinGate.hidden = true;
      el.adminContent.hidden = false;
      fetchAdminLeads().catch(() => {
        state.adminPin = '';
        el.adminPinGate.hidden = false;
        el.adminContent.hidden = true;
      });
    } else {
      el.adminPinGate.hidden = false;
      el.adminContent.hidden = true;
      el.adminPinError.hidden = true;
      el.adminPinInput.value = '';
      setTimeout(() => el.adminPinInput.focus(), 60);
    }
  });

  el.btnCloseAdmin.addEventListener('click', () => {
    el.adminModal.hidden = true;
  });
  el.adminModal.addEventListener('click', (e) => {
    if (e.target === el.adminModal) el.adminModal.hidden = true;
  });

  el.adminPinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.adminPinError.hidden = true;
    state.adminPin = el.adminPinInput.value.trim();
    try {
      await fetchAdminLeads();
      el.adminPinGate.hidden = true;
      el.adminContent.hidden = false;
    } catch (err) {
      state.adminPin = '';
      el.adminPinError.textContent = err.message || 'PIN Panitia salah.';
      el.adminPinError.hidden = false;
    }
  });

  el.biodataModeSelector.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.biodataMode = btn.dataset.mode;
      localStorage.setItem(STORAGE_MODE_KEY, state.biodataMode);
      updateBiodataModeButtons();
      if (state.step === 'result') updateResultGateUI();
      if (state.biodataMode === 'before' && !state.sessionLead && state.step === 'frames') {
        showToast('Mode diubah: Form biodata muncul di awal sesi baru.');
      } else if (state.biodataMode === 'after') {
        showToast('Mode diubah: Form biodata muncul sesudah foto.');
      } else {
        showToast('Mode diubah: Form biodata dinonaktifkan.');
      }
    });
  });

  el.adminSearch.addEventListener('input', () => renderAdminDashboard());
  el.btnRefreshLeads.addEventListener('click', () => {
    fetchAdminLeads().then(() => showToast('Data diperbarui'));
  });

  el.btnExportCsv.addEventListener('click', () => {
    window.location.href = `/api/leads/export.csv?pin=${encodeURIComponent(state.adminPin)}`;
    showToast('Mengunduh file Excel (CSV)...');
  });

  el.btnClearLeads.addEventListener('click', async () => {
    if (!confirm('Yakin ingin menghapus SEMUA data biodata tersimpan? Tindakan ini tidak bisa dibatalkan.')) return;
    await fetch('/api/leads', {
      method: 'DELETE',
      headers: { 'x-admin-pin': state.adminPin },
    });
    await fetchAdminLeads();
    showToast('Semua data biodata telah dikosongkan.');
  });

  window.addEventListener('resize', () => {
    if (state.step === 'camera') updateCropGuide();
  });
}

// ==================== INIT ====================
renderCategories();
renderFramesGrid();
renderFilterBars();
selectFrame(FRAMES[0]);
bindEvents();
checkPreBiodataGate();
