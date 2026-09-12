// ==========================================================
// CREATE: AERONAUTICS & SABLE — FLIGHT CEILING COMPUTATION SUITE
// Formulas & Physical Logic : Lili & Sable Physics Engine
// Drafted by                : CHATDOO
// ==========================================================

let currentVesselPhoto = null;
let userEditedGravityManually = false;

// --- DOM ELEMENTS ---
const shipNameInput = document.getElementById('shipName');
const massInput = document.getElementById('massInput');
const gravityInput = document.getElementById('gravityInput');
const balloonVolInput = document.getElementById('balloonVolInput');
const levitationInput = document.getElementById('levitationInput');
const dimensionSelect = document.getElementById('dimensionSelect');

const mismatchBanner = document.getElementById('mismatchBanner');
const errEnteredGrav = document.getElementById('errEnteredGrav');
const errExpectedGrav = document.getElementById('errExpectedGrav');
const btnHelpModal = document.getElementById('btnHelpModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const helpModal = document.getElementById('helpModal');
const btnSyncInline = document.getElementById('btnSyncInline');
const btnModalSync = document.getElementById('btnModalSync');

const valGravity = document.getElementById('valGravity');
const valBalloonLift = document.getElementById('valBalloonLift');
const valLevitation = document.getElementById('valLevitation');
const valCombinedLift = document.getElementById('valCombinedLift');
const valReqPressure = document.getElementById('valReqPressure');
const valCeilingY = document.getElementById('valCeilingY');
const valCeilingSub = document.getElementById('valCeilingSub');
const flightStatusText = document.getElementById('flightStatusText');
const flightStamp = document.getElementById('flightStamp');

const photoDropzone = document.getElementById('photoDropzone');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const photoPlaceholder = document.getElementById('photoPlaceholder');
const photoControls = document.getElementById('photoControls');
const btnRemovePhoto = document.getElementById('btnRemovePhoto');

const btnShareLink = document.getElementById('btnShareLink');
const btnExportCard = document.getElementById('btnExportCard');
const btnToggleDiagram = document.getElementById('btnToggleDiagram');
const toggleDiagramText = document.getElementById('toggleDiagramText');
const diagramSection = document.getElementById('diagramSection');
const ceilingCanvas = document.getElementById('ceilingCanvas');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeText = document.getElementById('themeText');
const toastMsg = document.getElementById('toastMsg');

// --- PHYSICAL LAW MODAL EVENT HANDLERS ---
if (btnHelpModal) {
  btnHelpModal.addEventListener('click', () => {
    if (helpModal) helpModal.style.display = 'flex';
  });
}
if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => {
    if (helpModal) helpModal.style.display = 'none';
  });
}
if (helpModal) {
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.style.display = 'none';
  });
}

function syncGravityToMass() {
  const m = parseFloat(massInput.value) || 0;
  gravityInput.value = parseFloat((m * 11).toFixed(4));
  userEditedGravityManually = false;
  if (helpModal) helpModal.style.display = 'none';
  recompute();
  updateUrlHash();
  showToast("GRAVITATIONAL FORCE SYNCHRONIZED TO MASS × 11");
}

if (btnSyncInline) btnSyncInline.addEventListener('click', syncGravityToMass);
if (btnModalSync) btnModalSync.addEventListener('click', syncGravityToMass);

// --- 3-THEME CYCLING ENGINE (VELLUM -> DARK CAD -> BLUEPRINT) ---
const availableThemes = [
  { id: 'vellum', label: 'VELLUM' },
  { id: 'dark', label: 'DARK CAD' },
  { id: 'blueprint', label: 'BLUEPRINT' }
];
let currentThemeIndex = 0;

themeToggleBtn.addEventListener('click', () => {
  currentThemeIndex = (currentThemeIndex + 1) % availableThemes.length;
  const nextTheme = availableThemes[currentThemeIndex];
  document.documentElement.setAttribute('data-theme', nextTheme.id);
  themeText.textContent = nextTheme.label;
  recompute();
});

// ==========================================================
// EXACT SABLE ATMOSPHERIC PHYSICS ENGINE (FROM SABLE SOURCE)
// dev.ryanhcode.sable.physics.config.dimension_physics:
// - DimensionPhysics.java (createDefault Overworld)
// - BezierResourceFunction.java (Hermite cubic piecewise spline)
// Control Points:
// Point 1: Y = 63.0   -> P = 1.0,                 Slope = -0.004
// Point 2: Y = 263.0  -> P = 0.44932896411722156, Slope = -0.0017973158564688863
// Point 3: Y = 280.0  -> P = 0.4197862776378877,  Slope = -0.0016791451105515507
// Point 4: Y = 320.0  -> P = 0.0,                 Slope = -0.020989313881894386
// ==========================================================
const SABLE_OVERWORLD_POINTS = [
  { altitude: 63.0,  value: 1.0,                 slope: -0.004 },
  { altitude: 263.0, value: 0.44932896411722156, slope: -0.0017973158564688863 },
  { altitude: 280.0, value: 0.4197862776378877,  slope: -0.0016791451105515507 },
  { altitude: 320.0, value: 0.0,                 slope: -0.020989313881894386 }
];

// Evaluates atmospheric air pressure P at altitude Y
function getOverworldPressureAtY(y) {
  if (y <= 63.0) return 1.0;
  if (y >= 320.0) return 0.0;
  
  for (let i = 0; i < SABLE_OVERWORLD_POINTS.length - 1; i++) {
    const p1 = SABLE_OVERWORLD_POINTS[i];
    const p2 = SABLE_OVERWORLD_POINTS[i + 1];
    if (y <= p2.altitude) {
      const relX = p2.altitude - p1.altitude;
      const relY = p2.value - p1.value;
      const t = (y - p1.altitude) / relX;
      
      const cubic = (p1.slope + p2.slope) * relX - 2.0 * relY;
      const quad = 3.0 * relY - (2.0 * p1.slope + p2.slope) * relX;
      const lin = relX * p1.slope;
      
      return Math.max(((cubic * t + quad) * t + lin) * t + p1.value, 0.0);
    }
  }
  return 0.0;
}

// Exact Newton-Raphson inverse solver for required target pressure P
// Yields precise decimal altitudes like Y = 302.2
function solveAltitudeForPressure(targetPressure) {
  if (targetPressure >= 1.0) return 63.0;
  if (targetPressure <= 0.0) return 320.0;

  let index = 0;
  if (targetPressure < 0.4197862776378877) {
    index = 2; // [280 to 320]
  } else if (targetPressure < 0.44932896411722156) {
    index = 1; // [263 to 280]
  } else {
    index = 0; // [63 to 263]
  }

  const p1 = SABLE_OVERWORLD_POINTS[index];
  const p2 = SABLE_OVERWORLD_POINTS[index + 1];

  const relX = p2.altitude - p1.altitude;
  const relY = p2.value - p1.value;
  const s1 = p1.slope;
  const s2 = p2.slope;

  const a = (s1 + s2) * relX - 2.0 * relY;
  const b = 3.0 * relY - (2.0 * s1 + s2) * relX;
  const c = relX * s1;
  const d = p1.value - targetPressure;

  // Newton-Raphson solver for t in [0, 1]
  let t = 0.5;
  for (let iter = 0; iter < 16; iter++) {
    const f = ((a * t + b) * t + c) * t + d;
    const df = (3.0 * a * t + 2.0 * b) * t + c;
    if (Math.abs(df) < 1e-12) break;
    const dt = f / df;
    t -= dt;
    if (Math.abs(dt) < 1e-9) break;
  }

  t = Math.max(0.0, Math.min(1.0, t));
  return p1.altitude + t * relX;
}

// Number formatting preserving decimal precision (no forced rounding)
function formatNumber(num, maxDecimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: maxDecimals });
}

// Altitude display formatting (exact 1 decimal place like 302.2)
function formatAltitude(y) {
  if (y >= 320.0) return "320";
  if (y <= 63.0) return "63";
  return y.toFixed(1);
}

// --- SYNCHRONIZATION OF INPUTS ---
massInput.addEventListener('input', () => {
  if (!userEditedGravityManually) {
    const rawM = massInput.value.trim();
    if (rawM !== '') {
      const m = parseFloat(rawM);
      if (!isNaN(m)) {
        gravityInput.value = parseFloat((m * 11).toFixed(4));
      }
    } else {
      gravityInput.value = '';
    }
  }
  recompute();
  updateUrlHash();
});

gravityInput.addEventListener('input', () => {
  userEditedGravityManually = true;
  recompute();
  updateUrlHash();
});

balloonVolInput.addEventListener('input', () => { recompute(); updateUrlHash(); });
levitationInput.addEventListener('input', () => { recompute(); updateUrlHash(); });
dimensionSelect.addEventListener('change', () => { recompute(); updateUrlHash(); });
shipNameInput.addEventListener('input', () => { updateUrlHash(); });

// --- PRIMARY CALCULATION ENGINE ---
function recompute() {
  const rawMass = massInput.value.trim();
  const rawGravity = gravityInput.value.trim();
  const mass = parseFloat(rawMass) || 0;
  const gravity = parseFloat(rawGravity) || 0;
  const balloonVol = parseFloat(balloonVolInput.value) || 0;
  const levitation = parseFloat(levitationInput.value) || 0;
  const dimension = dimensionSelect.value;

  // Lili's Mismatch Rule: Gravitational force (pN) = Mass (kpg) * 11
  const expectedGravity = mass * 11;
  const mathMismatch = (rawMass !== '' && rawGravity !== '' && Math.abs(gravity - expectedGravity) > 0.5);

  // 1 m³ balloon volume lifts 1.5 kpg * 11 = 16.5 pN lift force
  const balloonLift = balloonVol * 16.5;
  const combinedLift = balloonLift + levitation;

  valGravity.textContent = formatNumber(gravity) + " pN";
  valBalloonLift.textContent = formatNumber(balloonLift) + " pN";
  valLevitation.textContent = formatNumber(levitation) + " pN";
  valCombinedLift.textContent = formatNumber(combinedLift) + " pN";

  if (mathMismatch) {
    if (mismatchBanner) {
      mismatchBanner.style.display = 'block';
      errEnteredGrav.textContent = formatNumber(gravity) + " pN";
      errExpectedGrav.textContent = formatNumber(expectedGravity) + " pN";
    }

    flightStatusText.textContent = 'STATUS: "ship mass and gravitational force don\'t math!"';
    flightStatusText.className = "status-tag grounded";
    flightStamp.textContent = "MISMATCH";
    flightStamp.className = "stamp-box";
    valReqPressure.textContent = "MISMATCH";
    valCeilingY.textContent = "ERR";
    valCeilingSub.textContent = `Expected Grav Force = Mass × 11 = ${formatNumber(expectedGravity)} pN (Differ by ${formatNumber(Math.abs(gravity - expectedGravity))} pN)`;
    drawDiagram(null, null);
    return;
  }

  if (mismatchBanner) {
    mismatchBanner.style.display = 'none';
  }

  if (combinedLift <= 0 || gravity <= 0) {
    valReqPressure.textContent = "INVALID";
    valCeilingY.textContent = "N/A";
    valCeilingSub.textContent = "Zero lift force or weight";
    setFlightStatus(false);
    drawDiagram(null, null);
    return;
  }

  // Required atmospheric pressure fraction
  const reqPressure = gravity / combinedLift;
  const reqPressurePercent = (reqPressure * 100).toFixed(2) + " %";
  valReqPressure.textContent = reqPressurePercent;

  if (reqPressure >= 1.0) {
    valCeilingY.textContent = "GROUNDED";
    valCeilingSub.textContent = "THE SHIP DOES NOT HAVE ENOUGH LIFT TO FLY";
    setFlightStatus(false);
    drawDiagram(null, null);
    return;
  }

  setFlightStatus(true);

  if (dimension === 'nether') {
    valCeilingY.textContent = "Y ≈ 128";
    valCeilingSub.textContent = "Dense uniform Nether atmosphere (Bedrock ceiling limit)";
    drawDiagram(null, null);
  } else if (dimension === 'end') {
    valCeilingY.textContent = "Y ≈ 256";
    valCeilingSub.textContent = "Near-vacuum End void (Negligible atmospheric decay)";
    drawDiagram(null, null);
  } else {
    // Overworld: Exact Sable Piecewise Hermite Spline calculation
    if (reqPressure <= 0.0) {
      valCeilingY.textContent = "Y = 320";
      valCeilingSub.textContent = "Maximum world ceiling reached (Atmosphere ends at Y=320)";
      drawDiagram(0.0, 320);
    } else {
      const ceilingY = solveAltitudeForPressure(reqPressure);
      valCeilingY.textContent = "Y = " + formatAltitude(ceilingY);
      valCeilingSub.textContent = "Required ambient pressure: " + reqPressurePercent;
      drawDiagram(reqPressure, ceilingY);
    }
  }
}

function setFlightStatus(canFly) {
  if (canFly) {
    flightStatusText.textContent = "STATUS: AIRWORTHY / FLIGHT READY";
    flightStatusText.className = "status-tag airworthy";
    flightStamp.textContent = "AIRWORTHY";
    flightStamp.className = "stamp-box approved";
  } else {
    flightStatusText.textContent = "STATUS: GROUNDED / OVERWEIGHT";
    flightStatusText.className = "status-tag grounded";
    flightStamp.textContent = "OVERWEIGHT";
    flightStamp.className = "stamp-box";
  }
}

// --- ATMOSPHERE GRAPH CANVAS (FLIPPED HORIZONTAL AXIS: 100% LEFT -> 0% RIGHT) ---
function drawDiagram(currentP, currentY) {
  const ctx = ceilingCanvas.getContext('2d');
  const w = ceilingCanvas.width;
  const h = ceilingCanvas.height;

  ctx.clearRect(0, 0, w, h);

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'vellum';
  let gridColor, curveColor, textColor, accentColor;

  if (currentTheme === 'dark') {
    gridColor = 'rgba(255, 255, 255, 0.08)';
    curveColor = '#f2f3f5';
    textColor = '#8b92a0';
    accentColor = '#ef4444';
  } else if (currentTheme === 'blueprint') {
    gridColor = 'rgba(142, 202, 230, 0.12)';
    curveColor = '#90e0ef';
    textColor = '#8ecae6';
    accentColor = '#ff4d4f';
  } else {
    // Vellum
    gridColor = 'rgba(26, 30, 36, 0.08)';
    curveColor = '#1a1e24';
    textColor = '#5f6d7d';
    accentColor = '#a82020';
  }

  const padLeft = 45, padRight = 25, padTop = 15, padBottom = 25;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  // Vertical pressure grid lines (100% on left to 0% on right)
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let p = 0; p <= 1.0; p += 0.2) {
    const x = padLeft + (1.0 - p) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, h - padBottom);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '9px "Share Tech Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(p * 100) + '%', x, h - 10);
  }

  // Horizontal altitude grid lines (Y=63 to Y=320)
  for (let y = 63; y <= 320; y += 64) {
    const py = h - padBottom - ((y - 63) / (320 - 63)) * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, py);
    ctx.lineTo(w - padRight, py);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.fillText('Y=' + y, padLeft - 6, py + 3);
  }

  // Exact Sable Overworld atmosphere curve
  ctx.strokeStyle = curveColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let y = 63; y <= 320; y += 1) {
    const p = getOverworldPressureAtY(y);
    const x = padLeft + (1.0 - p) * plotW;
    const py = h - padBottom - ((y - 63) / (320 - 63)) * plotH;
    if (y === 63) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();

  // Operating equilibrium point of the vessel
  if (currentP !== null && currentY !== null) {
    const ptX = padLeft + (1.0 - currentP) * plotW;
    const ptY = h - padBottom - ((currentY - 63) / (320 - 63)) * plotH;

    // Guideline dashed crosshair
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(ptX, h - padBottom);
    ctx.lineTo(ptX, ptY);
    ctx.lineTo(padLeft, ptY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vessel target dot
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(ptX, ptY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 10px "Space Mono"';
    ctx.textAlign = ptX > w - 100 ? 'right' : 'left';
    ctx.fillText(`AIRSHIP (Y=${formatAltitude(currentY)})`, ptX + (ptX > w - 100 ? -8 : 8), ptY - 6);
  }
}

// --- VESSEL SCHEMATIC PHOTOGRAPH HANDLING (PLATE 1) ---
photoDropzone.addEventListener('click', (e) => {
  if (e.target !== btnRemovePhoto) {
    photoInput.click();
  }
});

photoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) loadVesselImage(file);
});

photoDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  photoDropzone.classList.add('dragover');
});

photoDropzone.addEventListener('dragleave', () => {
  photoDropzone.classList.remove('dragover');
});

photoDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  photoDropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    loadVesselImage(file);
  }
});

// Direct clipboard paste (Ctrl+V) anywhere on page
window.addEventListener('paste', (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      loadVesselImage(file);
      showToast("IMAGE PASTED INTO VESSEL PLATE!");
      break;
    }
  }
});

function loadVesselImage(file) {
  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      currentVesselPhoto = img;
      photoPreview.src = evt.target.result;
      photoPreview.style.display = 'block';
      photoPlaceholder.style.display = 'none';
      photoControls.style.display = 'flex';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

btnRemovePhoto.addEventListener('click', (e) => {
  e.stopPropagation();
  currentVesselPhoto = null;
  photoPreview.src = '';
  photoPreview.style.display = 'none';
  photoPlaceholder.style.display = 'flex';
  photoControls.style.display = 'none';
  photoInput.value = '';
});

// --- QUICK PRESETS (CLEAN LABELS, NO EMOJIS) ---
window.applyPreset = function(type) {
  userEditedGravityManually = false;
  if (type === 'skiff') {
    shipNameInput.value = 'SCOUT SKIFF - MK I';
    massInput.value = '450';
    gravityInput.value = '4950';
    balloonVolInput.value = '450';
    levitationInput.value = '0';
  } else if (type === 'corvette') {
    shipNameInput.value = 'RECON CORVETTE - MK II';
    massInput.value = '1200';
    gravityInput.value = '13200';
    balloonVolInput.value = '1200';
    levitationInput.value = '0';
  } else if (type === 'zeppelin') {
    shipNameInput.value = 'CARGO ZEPPELIN - TITAN';
    massInput.value = '3500';
    gravityInput.value = '38500';
    balloonVolInput.value = '3200';
    levitationInput.value = '5000';
  } else if (type === 'dreadnought') {
    shipNameInput.value = 'DREADNOUGHT LEVIATHAN';
    massInput.value = '8500';
    gravityInput.value = '93500';
    balloonVolInput.value = '7000';
    levitationInput.value = '25000';
  }
  recompute();
  updateUrlHash();
  showToast("PRESET APPLIED!");
};

// --- URL HASH SYNC & SHARING ---
function updateUrlHash() {
  const p = new URLSearchParams();
  p.set('name', shipNameInput.value);
  p.set('m', massInput.value);
  p.set('g', gravityInput.value);
  p.set('vol', balloonVolInput.value);
  p.set('lev', levitationInput.value);
  p.set('dim', dimensionSelect.value);
  window.history.replaceState(null, '', '#' + p.toString());
}

function loadFromUrlHash() {
  if (!window.location.hash || window.location.hash.length < 2) return;
  try {
    const p = new URLSearchParams(window.location.hash.substring(1));
    if (p.has('name')) shipNameInput.value = p.get('name');
    if (p.has('m')) massInput.value = p.get('m');
    if (p.has('g')) {
      gravityInput.value = p.get('g');
      userEditedGravityManually = true;
    }
    if (p.has('vol')) balloonVolInput.value = p.get('vol');
    if (p.has('lev')) levitationInput.value = p.get('lev');
    if (p.has('dim')) dimensionSelect.value = p.get('dim');
  } catch (err) {
    console.warn("Error reading URL hash:", err);
  }
}

btnShareLink.addEventListener('click', () => {
  updateUrlHash();
  const url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast("CONFIGURATION LINK COPIED TO CLIPBOARD!");
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast("CONFIGURATION LINK COPIED TO CLIPBOARD!");
  }
});

function showToast(msg) {
  toastMsg.textContent = msg;
  toastMsg.classList.add('show');
  setTimeout(() => { toastMsg.classList.remove('show'); }, 2600);
}

// --- TOGGLE ATMOSPHERE GRAPH ---
btnToggleDiagram.addEventListener('click', () => {
  const isExpanded = diagramSection.classList.toggle('expanded');
  toggleDiagramText.textContent = isExpanded 
    ? "[ HIDE ATMOSPHERE GRAPH ]" 
    : "[ SHOW ATMOSPHERE GRAPH ]";
  if (isExpanded) {
    recompute();
  }
});

// --- EXPORT BLUEPRINT CARD IMAGE (PNG FOR DISCORD) ---
btnExportCard.addEventListener('click', () => {
  const c = document.getElementById('exportCanvas');
  const ctx = c.getContext('2d');
  const w = 1200, h = 800;
  c.width = w;
  c.height = h;

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'vellum';
  let bg, cardBg, gridLine, ink, inkLight, stampGreen, stampRed;

  if (currentTheme === 'dark') {
    bg = '#101114';
    cardBg = '#17181c';
    gridLine = 'rgba(255, 255, 255, 0.05)';
    ink = '#f2f3f5';
    inkLight = '#8b92a0';
    stampGreen = '#22c55e';
    stampRed = '#ef4444';
  } else if (currentTheme === 'blueprint') {
    bg = '#0a192f';
    cardBg = '#0f243e';
    gridLine = 'rgba(142, 202, 230, 0.08)';
    ink = '#e0fbfc';
    inkLight = '#90e0ef';
    stampGreen = '#52c41a';
    stampRed = '#ff4d4f';
  } else {
    // Vellum
    bg = '#f5f1e8';
    cardBg = '#ece5d6';
    gridLine = 'rgba(30, 35, 42, 0.06)';
    ink = '#1a1e24';
    inkLight = '#5f6d7d';
    stampGreen = '#1a6b35';
    stampRed = '#a82020';
  }

  // Base background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Drafting grid
  ctx.strokeStyle = gridLine;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Double sheet border
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, w - 60, h - 60);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(38, 38, w - 76, h - 76);

  // Corner crosshairs
  drawCross(ctx, 30, 30, ink);
  drawCross(ctx, w - 30, 30, ink);
  drawCross(ctx, 30, h - 30, ink);
  drawCross(ctx, w - 30, h - 30, ink);

  // TITLE BLOCK HEADER
  ctx.fillStyle = cardBg;
  ctx.fillRect(40, 40, w - 80, 80);
  ctx.strokeRect(40, 40, w - 80, 80);

  ctx.fillStyle = inkLight;
  ctx.font = '10px "Space Mono"';
  ctx.textAlign = 'left';
  ctx.fillText("CREATE: AERONAUTICS • SABLE ATMOSPHERIC METROLOGY // BLUEPRINT SPECIFICATION", 60, 65);

  ctx.fillStyle = ink;
  ctx.font = 'bold 24px "Space Mono"';
  ctx.fillText("VESSEL // " + (shipNameInput.value.toUpperCase() || "UNNAMED VESSEL"), 60, 98);

  ctx.textAlign = 'right';
  ctx.fillStyle = inkLight;
  ctx.font = '11px "Space Mono"';
  ctx.fillText("DWG NO. AERO-1904-B  |  SCALE 1:100 METRIC", w - 60, 75);
  ctx.fillText("ATMOSPHERE : " + dimensionSelect.value.toUpperCase(), w - 60, 95);

  // LEFT ZONE: VESSEL PHOTOGRAPH / WIREFRAME
  const photoX = 60, photoY = 145, photoW = 500, photoH = 550;
  ctx.fillStyle = cardBg;
  ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  ctx.fillStyle = inkLight;
  ctx.font = '11px "Space Mono"';
  ctx.textAlign = 'left';
  ctx.fillText("[ PLATE 1 : VESSEL PROFILE & SCHEMATIC ]", photoX + 15, photoY + 25);

  if (currentVesselPhoto) {
    const imgRatio = currentVesselPhoto.width / currentVesselPhoto.height;
    const boxW = photoW - 30;
    const boxH = photoH - 60;
    let drawW = boxW;
    let drawH = boxW / imgRatio;
    if (drawH > boxH) {
      drawH = boxH;
      drawW = boxH * imgRatio;
    }
    const drawX = photoX + 15 + (boxW - drawW) / 2;
    const drawY = photoY + 40 + (boxH - drawH) / 2;

    ctx.drawImage(currentVesselPhoto, drawX, drawY, drawW, drawH);
    ctx.strokeStyle = inkLight;
    ctx.strokeRect(drawX, drawY, drawW, drawH);
  } else {
    drawWireframeAirship(ctx, photoX + 250, photoY + 275, inkLight, ink);
    ctx.fillStyle = inkLight;
    ctx.font = '12px "Space Mono"';
    ctx.textAlign = 'center';
    ctx.fillText("[ NO PHOTOGRAPH ATTACHED ]", photoX + 250, photoY + 440);
  }

  // RIGHT ZONE: SPECIFICATIONS & FORCES
  const statsX = 590, statsY = 145, statsW = 550;

  // Airworthiness Banner
  const isMismatch = valCeilingY.textContent === "ERR";
  const canFly = valCeilingY.textContent !== "GROUNDED" && valCeilingY.textContent !== "N/A" && !isMismatch;
  ctx.fillStyle = cardBg;
  ctx.fillRect(statsX, statsY, statsW, 70);
  ctx.strokeStyle = ink;
  ctx.strokeRect(statsX, statsY, statsW, 70);

  ctx.fillStyle = inkLight;
  ctx.font = '10px "Space Mono"';
  ctx.textAlign = 'left';
  ctx.fillText("AIRWORTHINESS CERTIFICATION REPORT:", statsX + 20, statsY + 25);

  ctx.font = 'bold 16px "Space Mono"';
  ctx.fillStyle = isMismatch ? stampRed : (canFly ? stampGreen : stampRed);
  const statusExportText = isMismatch 
    ? 'STATUS: "ship mass and gravitational force don\'t math!"' 
    : (canFly ? "STATUS: AIRWORTHY / FLIGHT READY" : "STATUS: GROUNDED / OVERWEIGHT");
  ctx.fillText(statusExportText, statsX + 20, statsY + 52);

  // Certification Stamp
  const stampExportText = isMismatch ? "MISMATCH" : (canFly ? "AIRWORTHY" : "OVERWEIGHT");
  drawStamp(ctx, statsX + statsW - 130, statsY + 35, stampExportText, canFly && !isMismatch ? stampGreen : stampRed);

  // Forces Breakdown Table
  ctx.fillStyle = cardBg;
  ctx.fillRect(statsX, statsY + 90, statsW, 230);
  ctx.strokeRect(statsX, statsY + 90, statsW, 230);

  ctx.fillStyle = ink;
  ctx.font = 'bold 12px "Space Mono"';
  ctx.textAlign = 'left';
  ctx.fillText("VECTOR FORCES BREAKDOWN:", statsX + 20, statsY + 115);

  const rows = [
    ["Ship mass:", formatNumber(massInput.value, 2) + " kpg"],
    ["Gravitational force:", valGravity.textContent],
    ["Balloon volume:", formatNumber(balloonVolInput.value, 2) + " m³"],
    ["Balloon lift force:", valBalloonLift.textContent],
    ["Levitation force:", valLevitation.textContent],
    ["Combined lift force:", valCombinedLift.textContent],
    ["Minimum required air pressure:", valReqPressure.textContent]
  ];

  let currentY = statsY + 145;
  ctx.font = '12px "Space Mono"';
  rows.forEach(([label, val], idx) => {
    ctx.fillStyle = (idx === 5) ? ink : inkLight;
    ctx.textAlign = 'left';
    ctx.fillText(label, statsX + 20, currentY);

    ctx.fillStyle = ink;
    ctx.textAlign = 'right';
    if (idx === 5) ctx.font = 'bold 13px "Space Mono"';
    ctx.fillText(val, statsX + statsW - 20, currentY);
    ctx.font = '12px "Space Mono"';

    currentY += 24;
  });

  // Maximum Flight Ceiling Display
  ctx.fillStyle = cardBg;
  ctx.fillRect(statsX, statsY + 340, statsW, 175);
  ctx.strokeStyle = ink;
  ctx.strokeRect(statsX, statsY + 340, statsW, 175);

  ctx.fillStyle = inkLight;
  ctx.font = '11px "Space Mono"';
  ctx.textAlign = 'center';
  ctx.fillText("CALCULATED MAXIMUM FLIGHT CEILING", statsX + statsW / 2, statsY + 375);

  ctx.fillStyle = ink;
  ctx.font = 'bold 56px "Share Tech Mono"';
  ctx.fillText(valCeilingY.textContent, statsX + statsW / 2, statsY + 440);

  ctx.fillStyle = inkLight;
  ctx.font = '12px "Space Mono"';
  ctx.fillText(valCeilingSub.textContent, statsX + statsW / 2, statsY + 480);

  // Sheet Footer & Credits
  ctx.fillStyle = cardBg;
  ctx.fillRect(40, 720, w - 80, 40);
  ctx.strokeStyle = ink;
  ctx.strokeRect(40, 720, w - 80, 40);

  ctx.fillStyle = inkLight;
  ctx.font = '11px "Space Mono"';
  ctx.textAlign = 'left';
  ctx.fillText("FORMULAS & LOGIC : LILI   •   DRAFTED BY : CHATDOO", 60, 745);

  ctx.textAlign = 'right';
  ctx.fillText("CREATE: AERONAUTICS SUITE // OFFICIAL DRAFTING SHEET", w - 60, 745);

  // Automatic file download
  const filename = "blueprint-" + (shipNameInput.value.toLowerCase().replace(/[^a-z0-9]/g, '-') || "airship") + ".png";
  const link = document.createElement('a');
  link.download = filename;
  link.href = c.toDataURL('image/png');
  link.click();

  showToast("BLUEPRINT CARD (PNG) EXPORTED SUCCESSFULLY!");
});

// Corner crosshair helper
function drawCross(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
  ctx.stroke();
}

// Certification stamp helper
function drawStamp(ctx, x, y, text, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-4 * Math.PI / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-60, -16, 120, 32);

  ctx.fillStyle = color;
  ctx.font = 'bold 12px "Space Mono"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Wireframe airship schematic helper when no photo is attached
function drawWireframeAirship(ctx, cx, cy, color, accentColor) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.ellipse(cx, cy - 30, 140, 55, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy - 30, 140, 25, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 140, cy - 30);
  ctx.lineTo(cx + 140, cy - 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 70, cy + 20); ctx.lineTo(cx - 50, cy + 50);
  ctx.moveTo(cx + 70, cy + 20); ctx.lineTo(cx + 50, cy + 50);
  ctx.moveTo(cx, cy + 25); ctx.lineTo(cx, cy + 50);
  ctx.stroke();

  ctx.strokeStyle = accentColor;
  ctx.strokeRect(cx - 60, cy + 50, 120, 30);

  ctx.beginPath();
  ctx.moveTo(cx - 75, cy + 55); ctx.lineTo(cx - 75, cy + 75);
  ctx.stroke();
}

// Initialization on load
window.addEventListener('DOMContentLoaded', () => {
  loadFromUrlHash();
  recompute();
});
