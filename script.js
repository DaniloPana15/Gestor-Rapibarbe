const INITIAL_DATA = { clients: [], movs: [], inv: [] };

const STORAGE_KEY = 'rapibarbe_db_v3';
const CONFIG_KEY = 'rapibarbe_config_v2';
const LAST_SYNC_KEY = 'rapibarbe_last_sync_v1';
const CONSUMIDOR_FINAL_BARBERIA = 'Venta Rápida / Consumidor Final';
const CONSUMIDOR_FINAL_BARBERO = '';
const CONSUMIDOR_FINAL_COMPOSITE = 'Venta Rápida / Consumidor Final';

let db = { clients: [], movs: [], inv: [], orders: [], tasks: [] };
let config = { pin: '1234', cloudKey: '', cloudBin: '', geminiKey: '' };
let activeRouteFilter = 'TODOS';
let activeOrderFilter = 'PENDIENTE';
let activeOrderViewMode = 'TABLE';
let activeOrderGroupBy = 'ZONA';
const collapsedOrderGroups = new Set();
let activeTaskFilter = 'PENDIENTES';
let activeReportZone = 'TODAS';
let returnNewClientToSaleForm = false;
let currentCart = [];
let editOpCart = [];
let lastDetectedOrder = null;
let lastQuickSingleOp = null;
let quickSingleDraft = null;
let pendingBatchOps = [];
let batchUidSeq = 1;
let newTaskImages = [];
let editTaskImages = [];
let isSyncingNow = false;
let cloudAutoSaveTimer = null;
let hasPendingCloudSave = false;
let cloudConnectionState = 'disconnected';
let lastSyncAt = '';
let cachedGeminiModel = '';

const fmtMoney = (n) => '$' + Math.max(0, Math.round(Number(n) || 0)).toLocaleString('es-AR');
const fmtSignedMoney = (n) => fmtMoney(n);
const todayISO = () => new Date().toISOString().split('T')[0];

function formatDateDMY(dateStr) {
  const raw = String(dateStr || '').trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const dmyMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3]}`;
  }
  return raw;
}

function normalizeOperationDateISO(rawDate) {
  const raw = String(rawDate || '').trim();
  if (!raw) return todayISO();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const dmyMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmyMatch) {
    const dd = Number(dmyMatch[1]);
    const mm = Number(dmyMatch[2]);
    const yyyy = Number(dmyMatch[3]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }
  return todayISO();
}

function extractDateISOFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const isoMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return normalizeOperationDateISO(isoMatch[1]);

  const dmyFullMatch = raw.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);
  if (dmyFullMatch) {
    const dd = Number(dmyFullMatch[1]);
    const mm = Number(dmyFullMatch[2]);
    let yyyy = Number(dmyFullMatch[3]);
    if (yyyy < 100) yyyy += 2000;
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }

  if (/\bayer\b/i.test(raw)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  return '';
}

function isAnonymousClientName(raw) {
  const clean = (raw || '').trim().toUpperCase();
  if (!clean) return true;
  return [
    'SIN NOMBRE',
    'CLIENTE SIN NOMBRE',
    'CONSUMIDOR FINAL',
    'VARIOS',
    'MOSTRADOR',
    'MOSTRADOR / VARIOS',
    'CONSUMIDOR FINAL | MOSTRADOR / VARIOS',
    'VENTA RÁPIDA',
    'VENTA RAPIDA',
    'VENTA RÁPIDA / CONSUMIDOR FINAL',
    'VENTA RAPIDA / CONSUMIDOR FINAL',
    'VENTA RÁPIDA | CONSUMIDOR FINAL',
    'VENTA RAPIDA | CONSUMIDOR FINAL',
    'VENTAS VARIAS',
    'NO ESPECIFICA'
  ].includes(clean);
}

/* Normaliza tipos antiguos ("VENTA FIADA") al nuevo estándar ("VENTA A CREDITO") */
function normalizeOpType(tipo) {
  const t = (tipo || '').trim().toUpperCase();
  if (t === 'VENTA FIADA' || t === 'VENTA A CRÉDITO' || t === 'VENTA A CREDITO') return 'VENTA A CREDITO';
  if (t === 'VENTA DE CONTADO' || t === 'VENTA CONTADO') return 'VENTA CONTADO';
  return t;
}

function getOpTypeLabel(tipo) {
  const norm = normalizeOpType(tipo);
  if (norm === 'VENTA A CREDITO') return 'VENTA A CRÉDITO';
  if (norm === 'VENTA CONTADO') return 'VENTA DE CONTADO';
  return tipo;
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  applyMagicLinkFromUrl();
  loadLocalData();
  document.getElementById('mov-fecha').value = todayISO();
  if (document.getElementById('report-start-date')) {
    document.getElementById('report-start-date').value = todayISO();
  }
  if (document.getElementById('report-end-date')) {
    document.getElementById('report-end-date').value = todayISO();
  }
  if (document.getElementById('task-fecha')) {
    document.getElementById('task-fecha').value = todayISO();
  }
  toggleProductPicker();
  setupAudioDropzone();
  renderCloudStatusPanel();

  if (sessionStorage.getItem('rapibarbe_unlocked') === '1') {
    showApp();
  }

  setInterval(() => {
    if (config.cloudKey && config.cloudBin && document.visibilityState === 'visible' && !isSyncingNow && !hasPendingCloudSave) {
      syncFromCloud(true);
    }
  }, 30000);
});

window.addEventListener('resize', () => {
  const dock = document.getElementById('mobile-dock');
  if (dock && sessionStorage.getItem('rapibarbe_unlocked') === '1') {
    dock.style.display = window.innerWidth <= 960 ? 'flex' : 'none';
  }
});

function loadConfig() {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    try { config = { ...config, ...JSON.parse(saved) }; } catch (e) {}
  }
  lastSyncAt = localStorage.getItem(LAST_SYNC_KEY) || '';
  cloudConnectionState = (config.cloudKey && config.cloudBin) ? 'connected' : 'disconnected';

  document.getElementById('cloud-key').value = config.cloudKey || '';
  document.getElementById('cloud-bin').value = config.cloudBin || '';
  if (document.getElementById('gemini-key')) {
    document.getElementById('gemini-key').value = config.geminiKey || '';
  }
  renderCloudStatusPanel();
}

function saveConfigLocal() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function ensureDbArrays() {
  if (!Array.isArray(db.clients)) db.clients = [];
  if (!Array.isArray(db.movs)) db.movs = [];
  if (!Array.isArray(db.inv)) db.inv = [];
  if (!Array.isArray(db.orders)) db.orders = [];
  if (!Array.isArray(db.tasks)) db.tasks = [];
}

function loadLocalData() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('rapibarbe_db_v2');
  if (saved) {
    try {
      db = JSON.parse(saved);
      ensureDbArrays();
    } catch (e) {
      db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [], tasks: [] };
    }
  } else {
    db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [], tasks: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}

function formatSyncTimestamp(isoStr) {
  if (!isoStr) return 'Sin sincronizaciones aún';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return 'Sin sincronizaciones aún';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function renderCloudStatusPanel() {
  const panel = document.getElementById('cloud-status-panel');
  const label = document.getElementById('cloud-conn-label');
  const autosavePill = document.getElementById('cloud-autosave-pill');
  const lastSyncEl = document.getElementById('cloud-last-sync-text');
  if (!panel || !label || !autosavePill || !lastSyncEl) return;

  const hasCreds = Boolean(config.cloudKey && config.cloudBin);
  panel.classList.remove('is-connected', 'is-disconnected', 'is-syncing');

  if (cloudConnectionState === 'syncing') {
    panel.classList.add('is-syncing');
    label.textContent = 'Sincronizando...';
    autosavePill.textContent = hasCreds ? 'Auto-guardado: Activo (2s)' : 'Auto-guardado: Inactivo';
  } else if (hasCreds && cloudConnectionState === 'connected') {
    panel.classList.add('is-connected');
    label.textContent = 'Conectado';
    autosavePill.textContent = 'Auto-guardado: Activo (2s)';
  } else {
    panel.classList.add('is-disconnected');
    label.textContent = 'Desconectado';
    autosavePill.textContent = hasCreds ? 'Auto-guardado: En espera' : 'Auto-guardado: Inactivo';
  }

  lastSyncEl.textContent = `Última sincronización: ${formatSyncTimestamp(lastSyncAt)}`;
}

function markSyncSuccess(statusMsg = 'Sincronizado en la nube ✓') {
  lastSyncAt = new Date().toISOString();
  localStorage.setItem(LAST_SYNC_KEY, lastSyncAt);
  cloudConnectionState = 'connected';
  setSyncStatus(statusMsg, true);
  renderCloudStatusPanel();
}

function toggleSecretVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (btn) {
    btn.classList.toggle('is-visible', show);
    btn.innerHTML = show
      ? '<svg class="icon-eye" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
      : '<svg class="icon-eye" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

function copyConfigField(inputId, label) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const value = input.value.trim();
  if (!value) {
    showToast(`El campo ${label} está vacío`);
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value)
      .then(() => showToast(`📋 ${label} copiado al portapapeles`))
      .catch(() => fallbackCopyText(value, label));
  } else {
    fallbackCopyText(value, label);
  }
}

function fallbackCopyText(value, label) {
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`📋 ${label} copiado al portapapeles`);
  } catch (e) {
    showToast(`No se pudo copiar ${label}`);
  }
  document.body.removeChild(ta);
}

function scheduleCloudAutoSave() {
  if (!config.cloudKey || !config.cloudBin) return;
  hasPendingCloudSave = true;
  if (cloudAutoSaveTimer) clearTimeout(cloudAutoSaveTimer);
  setSyncStatus('Guardado local · Sincronizando en 2s...', false);
  cloudAutoSaveTimer = setTimeout(() => {
    cloudAutoSaveTimer = null;
    pushToCloud(true);
  }, 2000);
}

async function pushToCloud(isAuto = true) {
  if (!config.cloudKey || !config.cloudBin) {
    cloudConnectionState = 'disconnected';
    renderCloudStatusPanel();
    return false;
  }
  if (isSyncingNow) {
    if (isAuto) scheduleCloudAutoSave();
    return false;
  }

  hasPendingCloudSave = false;
  isSyncingNow = true;
  cloudConnectionState = 'syncing';
  renderCloudStatusPanel();
  setSyncStatus('Subiendo a la nube...', false);

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${config.cloudBin}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': config.cloudKey },
      body: JSON.stringify(db)
    });
    if (res.ok) {
      markSyncSuccess('Sincronizado en la nube ✓');
      return true;
    } else {
      cloudConnectionState = 'disconnected';
      setSyncStatus('Error al subir (guardado local OK)', false);
      renderCloudStatusPanel();
      return false;
    }
  } catch (err) {
    cloudConnectionState = 'disconnected';
    setSyncStatus('Sin internet (guardado local)', false);
    renderCloudStatusPanel();
    return false;
  } finally {
    isSyncingNow = false;
  }
}

/* GUARDADO INSTANTÁNEO EN PANTALLA + GUARDADO AUTOMÁTICO EN NUBE (2 SEGUNDOS) */
async function persistData() {
  ensureDbArrays();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  renderAll();

  if (config.cloudKey && config.cloudBin) {
    scheduleCloudAutoSave();
  } else {
    cloudConnectionState = 'disconnected';
    setSyncStatus('Guardado en este dispositivo', false);
    renderCloudStatusPanel();
  }
}

async function syncFromCloud(silent = false) {
  if (!config.cloudKey || !config.cloudBin) {
    cloudConnectionState = 'disconnected';
    renderCloudStatusPanel();
    if (!silent) {
      showToast('Configurá X-Master-Key y Bin ID para descargar desde la nube.');
      switchTab('nube');
    }
    return;
  }
  if (silent && hasPendingCloudSave) return;
  if (isSyncingNow) return;

  if (!silent && cloudAutoSaveTimer) {
    clearTimeout(cloudAutoSaveTimer);
    cloudAutoSaveTimer = null;
    hasPendingCloudSave = false;
  }

  isSyncingNow = true;
  cloudConnectionState = 'syncing';
  renderCloudStatusPanel();
  if (!silent) setSyncStatus('Descargando de la nube...', false);

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${config.cloudBin}/latest`, {
      headers: { 'X-Master-Key': config.cloudKey }
    });
    if (!res.ok) throw new Error('Error');
    const json = await res.json();
    if (json.record && json.record.clients) {
      db = json.record;
      ensureDbArrays();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      renderAll();
      markSyncSuccess('Nube actualizada ✓');
      if (!silent) showToast('☁️ Datos descargados desde la nube');
    } else {
      throw new Error('Formato inválido');
    }
  } catch (e) {
    cloudConnectionState = 'disconnected';
    renderCloudStatusPanel();
    if (!silent) {
      setSyncStatus('No se pudo conectar a la nube', false);
      showToast('❌ Error al descargar desde la nube. Revisá tus claves.');
    }
  } finally {
    isSyncingNow = false;
  }
}

async function createCloudBin() {
  const key = document.getElementById('cloud-key').value.trim();
  if (!key) return showToast('Pegá primero tu X-Master-Key de JSONBin.io');

  const existingBin = document.getElementById('cloud-bin').value.trim() || config.cloudBin;
  const confirmMsg = existingBin
    ? '⚠️ ATENCIÓN: Ya tenés un Bin ID cargado.\n\nSi creás una nueva nube, se generará un Bin ID distinto con tus datos actuales y se reemplazará el Bin ID en este dispositivo.\n\n¿Estás seguro de que querés crear una nueva nube?'
    : '⚠️ ¿Confirmás crear una nueva nube privada en JSONBin.io con tus datos actuales?';

  if (!confirm(confirmMsg)) return;

  config.cloudKey = key;
  cloudConnectionState = 'syncing';
  renderCloudStatusPanel();
  showToast('Creando base de datos privada en la nube...');
  try {
    const res = await fetch('https://api.jsonbin.io/v3/b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': key,
        'X-Bin-Name': 'Rapibarbe_DB_Privada',
        'X-Bin-Private': 'true'
      },
      body: JSON.stringify(db)
    });
    const data = await res.json();
    if (data.metadata && data.metadata.id) {
      config.cloudBin = data.metadata.id;
      document.getElementById('cloud-bin').value = config.cloudBin;
      saveConfigLocal();
      markSyncSuccess('Nube privada conectada ✓');
      showToast('¡Nueva nube creada y conectada!');
    } else {
      cloudConnectionState = 'disconnected';
      renderCloudStatusPanel();
      showToast('No se pudo crear la nube. Verificá tu X-Master-Key.');
    }
  } catch (e) {
    cloudConnectionState = 'disconnected';
    renderCloudStatusPanel();
    showToast('Error de conexión con JSONBin.io');
  }
}

async function saveCloudConfig(e) {
  e.preventDefault();
  config.cloudKey = document.getElementById('cloud-key').value.trim();
  config.cloudBin = document.getElementById('cloud-bin').value.trim();
  config.geminiKey = document.getElementById('gemini-key').value.trim();
  cachedGeminiModel = '';
  saveConfigLocal();

  if (cloudAutoSaveTimer) {
    clearTimeout(cloudAutoSaveTimer);
    cloudAutoSaveTimer = null;
    hasPendingCloudSave = false;
  }

  if (config.cloudKey && config.cloudBin) {
    const isLocalEmpty = !db.clients.length && !db.movs.length && !db.inv.length && !(db.orders || []).length && !(db.tasks || []).length;
    if (isLocalEmpty) {
      await syncFromCloud(false);
    } else {
      const ok = await pushToCloud(false);
      showToast(ok ? '✅ Configuración guardada y nube sincronizada' : '⚠️ Config guardada, pero falló la conexión con la nube');
    }
  } else {
    cloudConnectionState = 'disconnected';
    setSyncStatus('Guardado en este dispositivo', false);
    renderCloudStatusPanel();
    showToast('Configuración guardada (faltan credenciales de nube)');
  }
}

function copyMagicAccessLink() {
  const payload = {
    cloudKey: document.getElementById('cloud-key').value.trim() || config.cloudKey,
    cloudBin: document.getElementById('cloud-bin').value.trim() || config.cloudBin,
    geminiKey: document.getElementById('gemini-key').value.trim() || config.geminiKey,
    pin: config.pin
  };

  if (!payload.cloudKey || !payload.cloudBin) {
    return showToast('Primero cargá o creá tu nube (Master Key y Bin ID).');
  }

  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
  const baseUrl = window.location.href.split('#')[0].split('?')[0];
  const magicUrl = `${baseUrl}#setup=${encoded}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(magicUrl)
      .then(() => showToast('📲 Link mágico copiado. Pegalo en WhatsApp para Freddy o tu celu.'))
      .catch(() => prompt('Copiá este link de acceso rápido:', magicUrl));
  } else {
    prompt('Copiá este link de acceso rápido:', magicUrl);
  }
}

function applyMagicLinkFromUrl() {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#setup=')) return;

  try {
    const encoded = hash.replace('#setup=', '');
    const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
    if (decoded.cloudKey) config.cloudKey = decoded.cloudKey;
    if (decoded.cloudBin) config.cloudBin = decoded.cloudBin;
    if (decoded.geminiKey) config.geminiKey = decoded.geminiKey;
    if (decoded.pin) config.pin = decoded.pin;

    saveConfigLocal();
    loadConfig();
    history.replaceState(null, '', window.location.pathname + window.location.search);
    setTimeout(() => showToast('☁️ ¡Nube, IA y PIN configurados automáticamente!'), 400);
  } catch (e) {
    console.error('Error leyendo link de configuración:', e);
  }
}

function setSyncStatus(text, isCloud) {
  document.getElementById('sync-status').innerHTML = `<span class="dot ${isCloud ? 'dot-cloud' : 'dot-local'}"></span> ${text}`;
}

function unlockApp(e) {
  e.preventDefault();
  if (document.getElementById('pin-input').value.trim() === config.pin) {
    sessionStorage.setItem('rapibarbe_unlocked', '1');
    showApp();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

function showApp() {
  document.getElementById('lock-screen').style.display = 'none';
  document.getElementById('app-shell').style.display = 'block';
  const dock = document.getElementById('mobile-dock');
  if (dock && window.innerWidth <= 960) dock.style.display = 'flex';
  renderAll();
  if (config.cloudKey && config.cloudBin) syncFromCloud(true);
}

function lockApp() {
  sessionStorage.removeItem('rapibarbe_unlocked');
  document.getElementById('pin-input').value = '';
  document.getElementById('lock-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display = 'none';
  const dock = document.getElementById('mobile-dock');
  if (dock) dock.style.display = 'none';
}

function updatePin(e) {
  e.preventDefault();
  const newPin = document.getElementById('new-pin').value.trim();
  if (newPin.length < 4) return showToast('Mínimo 4 dígitos');
  config.pin = newPin;
  saveConfigLocal();
  document.getElementById('new-pin').value = '';
  showToast('PIN actualizado');
}

function triggerQuickAction(tipoOperacion) {
  switchTab('movimientos');
  const selectTipo = document.getElementById('mov-tipo');
  selectTipo.value = normalizeOpType(tipoOperacion);
  toggleProductPicker();
  document.getElementById('mov-cliente-search').focus();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-pill, .dock-btn').forEach(b => b.classList.remove('active'));

  const targetTab = document.getElementById('tab-' + tabId);
  if (targetTab) targetTab.classList.add('active');

  document.querySelectorAll(`[data-tab="${tabId}"]`).forEach(btn => btn.classList.add('active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function computeClientBalanceWithBase(client, customDeudaBase = null) {
  let saldo = Math.max(0, Number(customDeudaBase !== null ? customDeudaBase : client.deudaBase) || 0);
  const b1 = (client.barberia || '').trim().toUpperCase();
  const b2 = (client.barbero || '').trim().toUpperCase();

  const clientMovs = (db.movs || [])
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) =>
      (m.barberia || '').trim().toUpperCase() === b1 &&
      (m.barbero || '').trim().toUpperCase() === b2
    )
    .sort((a, b) => {
      const cmp = (a.m.fecha || '').localeCompare(b.m.fecha || '');
      return cmp !== 0 ? cmp : a.idx - b.idx;
    });

  clientMovs.forEach(({ m }) => {
    const normTipo = normalizeOpType(m.tipo);
    const monto = Number(m.monto) || 0;
    if (normTipo === 'VENTA A CREDITO') saldo += monto;
    if (normTipo === 'ABONO / PAGO') saldo = Math.max(0, saldo - monto);
  });

  return Math.max(0, saldo);
}

function getClientMovementsNet(client) {
  return Math.max(0, computeClientBalanceWithBase(client, 0));
}

function getClientBalance(client) {
  return computeClientBalanceWithBase(client, null);
}

function renderAll() {
  renderKPIs();
  renderDashboard();
  renderAgenda();
  renderMovements();
  renderOrders();
  renderClients();
  renderInventory();
  populateDatalists();
}

function updateRedBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 99 ? '99+' : String(count);
    el.style.display = 'inline-flex';
  } else {
    el.style.display = 'none';
  }
}

function getOverdueCollectionsCount() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const sevenDaysAgo = d.toISOString().split('T')[0];

  return (db.clients || []).filter(c => {
    const saldo = getClientBalance(c);
    if (saldo <= 0) return false;
    const b1 = (c.barberia || '').trim().toUpperCase();
    const b2 = (c.barbero || '').trim().toUpperCase();
    const clientMovs = (db.movs || []).filter(m =>
      (m.barberia || '').trim().toUpperCase() === b1 && (m.barbero || '').trim().toUpperCase() === b2
    );
    if (!clientMovs.length) return true;
    const latestDate = clientMovs.reduce((max, m) => (m.fecha > max ? m.fecha : max), '');
    return latestDate < sevenDaysAgo;
  }).length;
}

function renderKPIs() {
  let totalDeuda = 0, deudoresCount = 0, totalCobrado = 0, ventasContado = 0, ventasCredito = 0;

  db.clients.forEach(c => {
    const saldo = getClientBalance(c);
    if (saldo > 0) { totalDeuda += saldo; deudoresCount++; }
  });

  db.movs.forEach(m => {
    const monto = Number(m.monto) || 0;
    const normTipo = normalizeOpType(m.tipo);
    if (normTipo === 'ABONO / PAGO') totalCobrado += monto;
    if (normTipo === 'VENTA CONTADO') ventasContado += monto;
    if (normTipo === 'VENTA A CREDITO') ventasCredito += monto;
  });

  const pendingOrdersCount = (db.orders || []).filter(o => (o.estado || 'PENDIENTE') !== 'ENTREGADO').length;
  const pendingTasksCount = (db.tasks || []).filter(t => !t.done).length;
  const overdueCollectionsCount = getOverdueCollectionsCount();

  document.getElementById('kpi-deuda').textContent = fmtMoney(totalDeuda);
  document.getElementById('kpi-deudores-count').textContent = `${deudoresCount} ${deudoresCount === 1 ? 'activo' : 'activos'}`;
  document.getElementById('kpi-cobrado').textContent = fmtMoney(totalCobrado);
  document.getElementById('kpi-ventas').textContent = fmtMoney(ventasContado + ventasCredito);
  document.getElementById('kpi-ventas-split').textContent = `Contado: ${fmtMoney(ventasContado)} · Crédito: ${fmtMoney(ventasCredito)}`;
  document.getElementById('kpi-stock-bajo').textContent = db.inv.filter(i => Number(i.stock) <= 3).length;

  updateRedBadge('badge-dashboard', overdueCollectionsCount);
  updateRedBadge('dock-badge-dashboard', overdueCollectionsCount);

  updateRedBadge('badge-agenda', pendingTasksCount);
  updateRedBadge('dock-badge-agenda', pendingTasksCount);
  updateRedBadge('qa-badge-agenda', pendingTasksCount);

  updateRedBadge('badge-pedidos', pendingOrdersCount);
  updateRedBadge('dock-badge-pedidos', pendingOrdersCount);
  updateRedBadge('qa-badge-pedidos', pendingOrdersCount);
}

function setRouteFilter(route, btn) {
  activeRouteFilter = route;
  document.querySelectorAll('#route-filters .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderDashboard();
}

function resetDashboardFilters() {
  const searchEl = document.getElementById('dash-search');
  if (searchEl) searchEl.value = '';
  activeRouteFilter = 'TODOS';
  const chips = document.querySelectorAll('#route-filters .chip');
  chips.forEach((c, idx) => c.classList.toggle('active', idx === 0));
  renderDashboard();
}

function buildWhatsAppLinkForClient(clientObj, customMode = 'PAGO') {
  if (!clientObj) return '';
  const cleanPhone = (clientObj.telefono || '').replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('54') ? cleanPhone : (cleanPhone ? '549' + cleanPhone : '');
  if (!waPhone) return '';

  const saldo = getClientBalance(clientObj);
  let text = '';

  if (customMode === 'GRABAR POLO') {
    text = `Hola ${clientObj.barbero}! Cómo va? Te escribo de Rapibarbe. Cuando pasemos por ${clientObj.zona || 'tu barbería'} te llevamos el polo de Rapibarbe para grabar un video rápido en el local, te copa?`;
  } else if (customMode === 'AVISO RUTA') {
    text = `Hola ${clientObj.barbero}! Cómo andás? Te aviso que mañana andamos haciendo recorrido por ${clientObj.zona || 'tu zona'}. Avisame si necesitás reponer algún insumo de Rapibarbe!`;
  } else {
    const saldoStr = saldo > 0 ? ` de ${fmtMoney(saldo)}` : '';
    text = `Hola ${clientObj.barbero}! Cómo va? Te escribo de Rapibarbe para recordarte el saldo pendiente${saldoStr}. Avisame cómo venís o cuando pase por ${clientObj.zona || 'tu local'}!`;
  }

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
}

function renderDashboard() {
  const q = (document.getElementById('dash-search').value || '').toLowerCase();
  const tbody = document.getElementById('dash-debtors-body');

  const debtors = db.clients
    .map(c => ({ ...c, saldoActual: getClientBalance(c) }))
    .filter(c => c.saldoActual > 0)
    .filter(c => activeRouteFilter === 'TODOS' || (c.ruta || '').toUpperCase().includes(activeRouteFilter))
    .filter(c =>
      (c.barberia || '').toLowerCase().includes(q) ||
      (c.barbero || '').toLowerCase().includes(q) ||
      (c.zona || '').toLowerCase().includes(q)
    )
    .sort((a, b) => b.saldoActual - a.saldoActual);

  tbody.innerHTML = debtors.length ? debtors.map(c => {
    const waUrl = buildWhatsAppLinkForClient(c, 'PAGO');
    const waBtn = waUrl ? `<a href="${waUrl}" target="_blank" class="btn-sm btn-wa">WhatsApp</a>` : '';

    return `
      <tr>
        <td><div class="font-bold">${escapeAttr(c.barberia)}</div><div class="muted">${escapeAttr(c.barbero)}</div></td>
        <td><div>${escapeAttr(c.zona || '-')}</div><div class="muted" style="font-size:11px;">${escapeAttr(c.ruta || 'A DEFINIR')}</div></td>
        <td class="text-right font-bold text-amber">${fmtMoney(c.saldoActual)}</td>
        <td class="text-right" style="white-space:nowrap;">
          ${waBtn}
          <button class="btn-sm btn-pay" onclick="quickPayment('${c.barberia.replace(/'/g, "\\'")}', '${c.barbero.replace(/'/g, "\\'")}', ${c.saldoActual})">+ Cobrar</button>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="4" class="text-center muted" style="padding:24px;">No hay deudas pendientes en este filtro.</td></tr>`;

  const today = todayISO();
  const pendingTasks = (db.tasks || [])
    .filter(t => !t.done)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
    .slice(0, 4);
  const dashTasksEl = document.getElementById('dash-today-tasks');
  if (dashTasksEl) {
    dashTasksEl.innerHTML = pendingTasks.length ? pendingTasks.map(t => {
      const cliObj = findClientByComposite(t.cliente);
      const waUrl = buildWhatsAppLinkForClient(cliObj, t.tipo);
      const thumbBadge = (t.images && t.images.length) ? ` · 📷 ${t.images.length}` : '';
      return `
        <div class="activity-item">
          <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
            <button class="task-check-btn" onclick="toggleTaskDone('${t.id}')" title="Completar">✔</button>
            <div style="min-width:0;">
              <div class="font-bold" style="font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeAttr(t.titulo)}</div>
              <div class="muted" style="font-size:11px;">${t.fecha < today ? '⚠️ ' : ''}${escapeAttr(formatDateDMY(t.fecha))}${t.cliente ? ' · ' + escapeAttr(t.cliente) : ''}${thumbBadge}</div>
            </div>
          </div>
          ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn-sm btn-wa" style="flex-shrink:0;">WA</a>` : ''}
        </div>
      `;
    }).join('') : '<p class="muted">Sin tareas pendientes.</p>';
  }

  const routeTotals = {};
  db.clients.forEach(c => {
    const s = getClientBalance(c);
    if (s > 0) {
      const r = c.ruta || 'A DEFINIR';
      routeTotals[r] = (routeTotals[r] || 0) + s;
    }
  });
  const maxRoute = Math.max(...Object.values(routeTotals), 1);
  document.getElementById('route-bars').innerHTML = Object.entries(routeTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([ruta, total]) => `
      <div class="bar-row">
        <div class="bar-labels"><span>${escapeAttr(ruta)}</span><span class="font-bold">${fmtMoney(total)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((total / maxRoute) * 100)}%"></div></div>
      </div>
    `).join('') || '<p class="muted">Sin deudas activas</p>';

  const unifiedRecent = getUnifiedOperationsList().slice(0, 6);
  document.getElementById('recent-movs-list').innerHTML = unifiedRecent.map(item => {
    const normTipo = normalizeOpType(item.tipo);
    const isPay = normTipo === 'ABONO / PAGO';
    const isOrder = item.isOrder;
    const valColor = isPay ? 'text-green' : (isOrder ? 'text-amber' : 'text-main');
    const prefix = isOrder ? '📦 ' : (isPay ? '+' : '');
    return `
      <div class="activity-item">
        <div style="min-width:0; flex:1;">
          <div class="font-bold" style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeAttr(item.barberia)}${item.barbero ? ' — ' + escapeAttr(item.barbero) : ''}</div>
          <div class="muted" style="font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeAttr(formatDateDMY(item.fecha))} · ${escapeAttr(item.detalle || getOpTypeLabel(item.tipo))}</div>
        </div>
        <div class="font-bold ${valColor}" style="flex-shrink:0;">${prefix}${fmtMoney(item.monto)}</div>
      </div>
    `;
  }).join('');
}

/* --- LISTA UNIFICADA DE OPERACIONES (VENTAS, COBROS Y PEDIDOS) --- */
function getUnifiedOperationsList() {
  const movEntries = (db.movs || []).map((m, idx) => ({
    ...m,
    tipo: normalizeOpType(m.tipo),
    zona: resolveOperationZona(m),
    isOrder: false,
    sortIndex: idx
  }));

  const orderEntries = (db.orders || []).map((o, idx) => {
    const parts = (o.cliente || '').split('|');
    const barberia = (parts[0] || '').trim().toUpperCase();
    const barbero = (parts[1] || '').trim().toUpperCase();
    const desc = (o.items && o.items.length)
      ? o.items.map(i => `${i.qty}x ${i.producto}`).join(', ')
      : (o.detalleManual || o.notas || 'Pedido encargado');

    const senaNum = Number(o.sena) || 0;
    const totalNum = Number(o.totalEstimado) || 0;
    const senaTag = senaNum > 0 ? ` · Seña: ${fmtMoney(senaNum)} (Resta: ${fmtMoney(Math.max(0, totalNum - senaNum))})` : '';
    const est = o.estado || 'PENDIENTE';
    const estadoTag = est === 'ENTREGADO' ? 'PEDIDO (ENTREGADO)' : (est === 'PREPARADO' ? 'PEDIDO (PREPARADO)' : 'PEDIDO');

    return {
      id: o.id,
      fecha: o.fecha || todayISO(),
      barberia,
      barbero,
      zona: resolveOperationZona({ ...o, barberia, barbero }),
      tipo: estadoTag,
      detalle: desc + senaTag + (o.notas ? ` (${o.notas})` : ''),
      medio: 'ENCARGO',
      monto: totalNum,
      isOrder: true,
      orderEstado: est,
      sortIndex: 100000 + idx
    };
  });

  return [...movEntries, ...orderEntries].sort((a, b) => {
    const cmpDate = (b.fecha || '').localeCompare(a.fecha || '');
    if (cmpDate !== 0) return cmpDate;
    return b.sortIndex - a.sortIndex;
  });
}

/* --- PRESETS DE FECHA INICIO Y FINAL --- */
function getPresetStartDateISO(preset) {
  const now = new Date();
  const endStr = todayISO();
  if (preset === 'WEEK') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  }
  if (preset === '30D') {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  }
  if (preset === 'MONTH') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().split('T')[0];
  }
  return endStr;
}

function setReportRangePreset(preset) {
  const startEl = document.getElementById('report-start-date');
  const endEl = document.getElementById('report-end-date');
  if (!startEl || !endEl) return;

  startEl.value = getPresetStartDateISO(preset);
  endEl.value = todayISO();
  renderMovements();
}

function applyHistoryDatePreset(preset) {
  const rangeChk = document.getElementById('filter-movs-by-range');
  const datePicker = document.getElementById('history-date-picker');
  if (preset === 'ALL') {
    if (rangeChk) rangeChk.checked = false;
    if (datePicker) datePicker.value = '';
    renderMovements();
    return;
  }

  if (rangeChk) rangeChk.checked = true;
  setReportRangePreset(preset);
}

function applyHistorySingleDate(dateStr) {
  const cleanDate = (dateStr || '').trim();
  const rangeChk = document.getElementById('filter-movs-by-range');
  const startEl = document.getElementById('report-start-date');
  const endEl = document.getElementById('report-end-date');

  if (!cleanDate) {
    if (rangeChk) rangeChk.checked = false;
    renderMovements();
    return;
  }

  if (startEl) startEl.value = cleanDate;
  if (endEl) endEl.value = cleanDate;
  if (rangeChk) rangeChk.checked = true;
  renderMovements();
}

/* --- EDICIÓN COMPLETA DE CUALQUIER OPERACIÓN (VENTA, COBRO O PEDIDO) --- */
function openEditOperationModal(id, isOrder) {
  editOpCart = [];
  document.getElementById('edit-op-id').value = id;
  document.getElementById('edit-op-was-order').value = isOrder ? '1' : '0';

  if (isOrder) {
    const ord = (db.orders || []).find(o => o.id === id);
    if (!ord) return;
    document.getElementById('edit-op-modal-title').textContent = '✏️ Editar Pedido / Encargo';
    document.getElementById('edit-op-fecha').value = ord.fecha || todayISO();
    document.getElementById('edit-op-tipo').value = 'PEDIDO';
    document.getElementById('edit-op-order-estado').value = ord.estado || 'PENDIENTE';
    document.getElementById('edit-op-cliente').value = ord.cliente || '';
    document.getElementById('edit-op-monto').value = Number(ord.totalEstimado) || 0;
    document.getElementById('edit-op-medio').value = 'ENCARGO';
    document.getElementById('edit-op-detalle').value = ord.detalleManual || '';
    document.getElementById('edit-op-obs').value = ord.notas || '';
    editOpCart = JSON.parse(JSON.stringify(ord.items || []));
  } else {
    const mov = (db.movs || []).find(m => m.id === id);
    if (!mov) return;
    document.getElementById('edit-op-modal-title').textContent = '✏️ Editar Operación';
    document.getElementById('edit-op-fecha').value = mov.fecha || todayISO();
    document.getElementById('edit-op-tipo').value = normalizeOpType(mov.tipo) || 'VENTA A CREDITO';
    document.getElementById('edit-op-order-estado').value = 'PENDIENTE';
    document.getElementById('edit-op-cliente').value = mov.barbero ? `${mov.barberia} | ${mov.barbero}` : (mov.barberia || '');
    document.getElementById('edit-op-monto').value = Number(mov.monto) || 0;
    document.getElementById('edit-op-medio').value = mov.medio || 'EFECTIVO';
    document.getElementById('edit-op-detalle').value = mov.detalle || '';
    document.getElementById('edit-op-obs').value = mov.obs || '';
    editOpCart = JSON.parse(JSON.stringify(mov.items || []));
  }

  toggleEditOpOrderStatus();
  renderEditOpCart(false);
  document.getElementById('edit-op-modal').style.display = 'flex';
}

function toggleEditOpOrderStatus() {
  const tipo = normalizeOpType(document.getElementById('edit-op-tipo').value);
  document.getElementById('edit-op-order-status-group').style.display = (tipo === 'PEDIDO') ? 'block' : 'none';
  document.getElementById('edit-op-picker-box').style.display = (tipo === 'ABONO / PAGO') ? 'none' : 'block';

  const cliInput = document.getElementById('edit-op-cliente');
  const cliLabel = document.getElementById('edit-op-cliente-label');
  if (cliInput && cliLabel) {
    cliInput.required = false;
    if (tipo === 'VENTA CONTADO') {
      cliLabel.textContent = 'Cliente (Opcional — vacío = Venta Rápida / Consumidor Final)';
    } else {
      cliLabel.textContent = 'Cliente (Barbería | Barbero) *';
    }
  }
}

function addEditOpCartItem() {
  const raw = document.getElementById('edit-op-prod-search').value.trim();
  const qty = Math.max(1, Number(document.getElementById('edit-op-prod-qty').value) || 1);
  if (!raw) return;

  const code = raw.split('|')[0].trim().toUpperCase();
  const prod = db.inv.find(p => p.codigo === code || p.producto.toUpperCase().includes(raw.toUpperCase()));
  if (!prod) return showToast('Seleccioná un producto válido de la lista');

  const existing = editOpCart.find(x => x.codigo === prod.codigo);
  if (existing) existing.qty += qty;
  else editOpCart.push({ codigo: prod.codigo, producto: prod.producto, qty, precio: Number(prod.venta) || 0 });

  document.getElementById('edit-op-prod-search').value = '';
  document.getElementById('edit-op-prod-qty').value = 1;
  renderEditOpCart(true);
}

function removeEditOpCartItem(idx) {
  editOpCart.splice(idx, 1);
  renderEditOpCart(true);
}

function renderEditOpCart(recalculateFields = true) {
  const list = document.getElementById('edit-op-cart-list');
  if (!list) return;
  if (!editOpCart.length) {
    list.innerHTML = '<div class="muted" style="font-size:11.5px; margin-top:4px;">Sin productos vinculados (monto manual).</div>';
    return;
  }

  let total = 0;
  const details = [];
  list.innerHTML = editOpCart.map((item, idx) => {
    const sub = Number(item.qty) * Number(item.precio || 0);
    total += sub;
    details.push(`${item.qty}x ${item.producto}`);
    return `
      <div class="cart-chip">
        <span><strong>${item.qty}x</strong> ${item.producto} (${fmtMoney(sub)})</span>
        <button type="button" class="btn-icon" onclick="removeEditOpCartItem(${idx})" style="font-size:13px;">✕</button>
      </div>
    `;
  }).join('');

  if (recalculateFields) {
    document.getElementById('edit-op-monto').value = total;
    document.getElementById('edit-op-detalle').value = details.join(', ');
  }
}

async function saveEditedOperation(e) {
  e.preventDefault();
  const id = document.getElementById('edit-op-id').value;
  const wasOrder = document.getElementById('edit-op-was-order').value === '1';

  const newFecha = document.getElementById('edit-op-fecha').value || todayISO();
  const newTipo = normalizeOpType(document.getElementById('edit-op-tipo').value);
  const newOrderEstado = document.getElementById('edit-op-order-estado').value;
  const rawCli = document.getElementById('edit-op-cliente').value.trim();
  if (newTipo === 'VENTA A CREDITO' && (!rawCli || isAnonymousClientName(rawCli))) {
    showToast('Las ventas a crédito requieren seleccionar o crear un cliente');
    document.getElementById('edit-op-cliente').focus();
    return;
  }
  if ((newTipo === 'ABONO / PAGO' || newTipo === 'PEDIDO') && (!rawCli || isAnonymousClientName(rawCli))) {
    showToast('Seleccioná un cliente para este tipo de operación');
    document.getElementById('edit-op-cliente').focus();
    return;
  }

  const newMonto = Number(document.getElementById('edit-op-monto').value) || 0;
  const newMedio = document.getElementById('edit-op-medio').value;
  const newDetalle = document.getElementById('edit-op-detalle').value.trim();
  const newObs = document.getElementById('edit-op-obs').value.trim();

  let barberia = rawCli, barbero = '';
  if (newTipo === 'VENTA CONTADO' && (!rawCli || isAnonymousClientName(rawCli))) {
    barberia = CONSUMIDOR_FINAL_BARBERIA;
    barbero = CONSUMIDOR_FINAL_BARBERO;
  } else if (rawCli.includes('|')) {
    const parts = rawCli.split('|');
    barberia = parts[0].trim();
    barbero = parts[1].trim();
  }
  const compositeCli = barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : (isAnonymousClientName(barberia) ? CONSUMIDOR_FINAL_BARBERIA : barberia.toUpperCase());
  const matchedCli = findClientByComposite(compositeCli);

  if (!wasOrder) {
    const oldMov = db.movs.find(m => m.id === id);
    if (oldMov && oldMov.items && oldMov.items.length && normalizeOpType(oldMov.tipo) !== 'ABONO / PAGO') {
      oldMov.items.forEach(it => {
        const invItem = db.inv.find(x => x.codigo === it.codigo);
        if (invItem) invItem.stock = Number(invItem.stock) + Number(it.qty);
      });
    }
  }

  if (newTipo === 'PEDIDO') {
    if (!wasOrder) {
      db.movs = db.movs.filter(m => m.id !== id);
      const willDeduct = newOrderEstado === 'ENTREGADO';
      if (willDeduct && editOpCart.length) {
        editOpCart.forEach(it => {
          const invItem = db.inv.find(x => x.codigo === it.codigo);
          if (invItem) invItem.stock = Number(invItem.stock) - Number(it.qty);
        });
      }
      db.orders.unshift({
        id: 'ORD-' + Date.now(),
        fecha: newFecha,
        cliente: compositeCli,
        zona: matchedCli ? (matchedCli.zona || '') : '',
        ruta: matchedCli ? (matchedCli.ruta || 'A DEFINIR') : 'A DEFINIR',
        items: [...editOpCart],
        detalleManual: editOpCart.length ? '' : newDetalle,
        totalEstimado: newMonto,
        sena: 0,
        estado: newOrderEstado,
        stockDeducted: willDeduct,
        notas: newObs
      });
    } else {
      const ord = db.orders.find(o => o.id === id);
      if (ord) {
        const wasDeducted = Boolean(ord.stockDeducted || ord.estado === 'ENTREGADO');
        if (wasDeducted && ord.items && ord.items.length) {
          ord.items.forEach(it => {
            const invItem = db.inv.find(x => x.codigo === it.codigo);
            if (invItem) invItem.stock = Number(invItem.stock) + Number(it.qty);
          });
        }
        const shouldDeduct = newOrderEstado === 'ENTREGADO';
        if (shouldDeduct && editOpCart.length) {
          editOpCart.forEach(it => {
            const invItem = db.inv.find(x => x.codigo === it.codigo);
            if (invItem) invItem.stock = Number(invItem.stock) - Number(it.qty);
          });
        }
        ord.fecha = newFecha;
        ord.cliente = compositeCli;
        if (matchedCli && matchedCli.zona) ord.zona = matchedCli.zona;
        ord.ruta = matchedCli ? (matchedCli.ruta || 'A DEFINIR') : (ord.ruta || 'A DEFINIR');
        ord.items = [...editOpCart];
        ord.detalleManual = editOpCart.length ? '' : newDetalle;
        ord.totalEstimado = newMonto;
        ord.estado = newOrderEstado;
        ord.stockDeducted = shouldDeduct;
        ord.notas = newObs;
      }
    }
  } else {
    if (editOpCart.length && newTipo !== 'ABONO / PAGO') {
      editOpCart.forEach(it => {
        const invItem = db.inv.find(x => x.codigo === it.codigo);
        if (invItem) invItem.stock = Number(invItem.stock) - Number(it.qty);
      });
    }

    const finalDetalle = newDetalle || (editOpCart.length ? editOpCart.map(i => `${i.qty}x ${i.producto}`).join(', ') : getOpTypeLabel(newTipo));

    if (wasOrder) {
      db.orders = db.orders.filter(o => o.id !== id);
      db.movs.push({
        id: 'MOV-' + Date.now(),
        fecha: newFecha,
        barberia: isAnonymousClientName(barberia) ? CONSUMIDOR_FINAL_BARBERIA : barberia.toUpperCase(),
        barbero: isAnonymousClientName(barberia) ? '' : barbero.toUpperCase(),
        tipo: newTipo,
        detalle: finalDetalle,
        medio: newMedio === 'ENCARGO' ? 'EFECTIVO' : newMedio,
        monto: newMonto,
        items: [...editOpCart],
        obs: newObs
      });
    } else {
      const mov = db.movs.find(m => m.id === id);
      if (mov) {
        mov.fecha = newFecha;
        mov.barberia = isAnonymousClientName(barberia) ? CONSUMIDOR_FINAL_BARBERIA : barberia.toUpperCase();
        mov.barbero = isAnonymousClientName(barberia) ? '' : barbero.toUpperCase();
        mov.tipo = newTipo;
        mov.detalle = finalDetalle;
        mov.medio = newMedio === 'ENCARGO' ? 'EFECTIVO' : newMedio;
        mov.monto = newMonto;
        mov.items = [...editOpCart];
        mov.obs = newObs;
      }
    }
  }

  resetEditOpModalForm();
  closeModal('edit-op-modal');
  await persistData();
  showToast('✅ Operación actualizada y saldos recalculados');
}

function resetEditOpModalForm() {
  editOpCart = [];
  const form = document.getElementById('edit-op-form');
  if (form) form.reset();
  if (document.getElementById('edit-op-id')) document.getElementById('edit-op-id').value = '';
  if (document.getElementById('edit-op-was-order')) document.getElementById('edit-op-was-order').value = '0';
  if (document.getElementById('edit-op-fecha')) document.getElementById('edit-op-fecha').value = todayISO();
  if (document.getElementById('edit-op-tipo')) document.getElementById('edit-op-tipo').value = 'VENTA A CREDITO';
  if (document.getElementById('edit-op-order-estado')) document.getElementById('edit-op-order-estado').value = 'PENDIENTE';
  if (document.getElementById('edit-op-cliente')) document.getElementById('edit-op-cliente').value = '';
  if (document.getElementById('edit-op-prod-search')) document.getElementById('edit-op-prod-search').value = '';
  if (document.getElementById('edit-op-prod-qty')) document.getElementById('edit-op-prod-qty').value = 1;
  if (document.getElementById('edit-op-monto')) document.getElementById('edit-op-monto').value = '';
  if (document.getElementById('edit-op-medio')) document.getElementById('edit-op-medio').value = 'EFECTIVO';
  if (document.getElementById('edit-op-detalle')) document.getElementById('edit-op-detalle').value = '';
  if (document.getElementById('edit-op-obs')) document.getElementById('edit-op-obs').value = '';
  renderEditOpCart(false);
}

function deleteFromEditOpModal() {
  const id = document.getElementById('edit-op-id').value;
  const wasOrder = document.getElementById('edit-op-was-order').value === '1';
  closeModal('edit-op-modal');
  if (wasOrder) deleteOrder(id);
  else deleteMovement(id);
}

/* --- GESTOR MINIMALISTA DE TAREAS CON DESCRIPCIÓN, FOTOS Y LIGHTBOX --- */
function findClientByComposite(rawCli) {
  if (!rawCli || isAnonymousClientName(rawCli)) return null;
  const parts = rawCli.split('|');
  const b1 = (parts[0] || '').trim().toUpperCase();
  const b2 = (parts[1] || '').trim().toUpperCase();
  return db.clients.find(c =>
    (c.barberia || '').toUpperCase() === b1 && (!b2 || (c.barbero || '').toUpperCase() === b2)
  ) || db.clients.find(c =>
    (c.barberia || '').toUpperCase() === b1 ||
    (c.barbero || '').toUpperCase() === b1 ||
    (b2 && (c.barbero || '').toUpperCase() === b2)
  );
}

function autoFillTaskTitle() {
  const tipo = document.getElementById('task-tipo').value;
  const cli = document.getElementById('task-cliente').value.trim();
  const titleInput = document.getElementById('task-titulo');
  if (!cli) return;

  const shortName = cli.includes('|') ? cli.split('|')[1].trim() : cli;
  if (tipo === 'AVISO PAGO') {
    titleInput.value = `Avisar a ${shortName} sobre saldo pendiente`;
  } else if (tipo === 'GRABAR POLO') {
    titleInput.value = `Grabar polo barbero en local de ${shortName}`;
  } else if (tipo === 'AVISO RUTA') {
    titleInput.value = `Avisar a ${shortName} visita en su zona`;
  }
}

function compressTaskImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 900;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleTaskImagesSelect(event, mode) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const targetArr = mode === 'edit' ? editTaskImages : newTaskImages;

  for (const file of files) {
    if (targetArr.length >= 6) {
      showToast('Máximo 6 fotos por tarea');
      break;
    }
    try {
      const dataUrl = await compressTaskImage(file);
      targetArr.push(dataUrl);
    } catch (err) {
      console.error('Error procesando imagen:', err);
    }
  }
  event.target.value = '';
  renderTaskImagePreviews(mode);
}

function removeTaskImage(mode, idx) {
  if (mode === 'edit') editTaskImages.splice(idx, 1);
  else newTaskImages.splice(idx, 1);
  renderTaskImagePreviews(mode);
}

function renderTaskImagePreviews(mode) {
  const containerId = mode === 'edit' ? 'edit-task-images-preview' : 'task-images-preview';
  const container = document.getElementById(containerId);
  if (!container) return;
  const arr = mode === 'edit' ? editTaskImages : newTaskImages;

  container.innerHTML = arr.map((src, idx) => `
    <div class="task-thumb-edit-item">
      <img src="${src}" alt="Adjunto" onclick="openLightbox('${src}')" />
      <button type="button" class="task-thumb-remove" onclick="removeTaskImage('${mode}', ${idx})" title="Quitar">✕</button>
    </div>
  `).join('');
}

function openLightbox(src) {
  const lb = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lb || !img) return;
  img.src = src;
  lb.style.display = 'flex';
}

function closeLightbox(event) {
  if (!event || event.target.id === 'image-lightbox') {
    const lb = document.getElementById('image-lightbox');
    if (lb) lb.style.display = 'none';
  }
}

function setTaskFilter(filter, btn) {
  activeTaskFilter = filter;
  document.querySelectorAll('#task-filters .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAgenda();
}

function resetTaskFilters() {
  const searchEl = document.getElementById('task-search');
  if (searchEl) searchEl.value = '';
  activeTaskFilter = 'TODAS';
  const chips = document.querySelectorAll('#task-filters .chip');
  chips.forEach(c => {
    const isAll = (c.getAttribute('onclick') || '').includes("'TODAS'");
    c.classList.toggle('active', isAll);
  });
  renderAgenda();
}

function resetTaskForm() {
  const form = document.getElementById('task-form');
  if (form) form.reset();
  if (document.getElementById('task-titulo')) document.getElementById('task-titulo').value = '';
  if (document.getElementById('task-desc')) document.getElementById('task-desc').value = '';
  if (document.getElementById('task-fecha')) document.getElementById('task-fecha').value = todayISO();
  if (document.getElementById('task-tipo')) document.getElementById('task-tipo').value = 'GENERAL';
  if (document.getElementById('task-cliente')) document.getElementById('task-cliente').value = '';
  if (document.getElementById('task-images-input')) document.getElementById('task-images-input').value = '';
  newTaskImages = [];
  renderTaskImagePreviews('new');
}

function resetEditTaskForm() {
  const form = document.getElementById('edit-task-form');
  if (form) form.reset();
  if (document.getElementById('edit-task-id')) document.getElementById('edit-task-id').value = '';
  if (document.getElementById('edit-task-titulo')) document.getElementById('edit-task-titulo').value = '';
  if (document.getElementById('edit-task-desc')) document.getElementById('edit-task-desc').value = '';
  if (document.getElementById('edit-task-fecha')) document.getElementById('edit-task-fecha').value = todayISO();
  if (document.getElementById('edit-task-tipo')) document.getElementById('edit-task-tipo').value = 'GENERAL';
  if (document.getElementById('edit-task-cliente')) document.getElementById('edit-task-cliente').value = '';
  if (document.getElementById('edit-task-images-input')) document.getElementById('edit-task-images-input').value = '';
  editTaskImages = [];
  renderTaskImagePreviews('edit');
}

async function saveScheduledTask(e) {
  e.preventDefault();
  const fecha = document.getElementById('task-fecha').value || todayISO();
  const tipo = document.getElementById('task-tipo').value;
  const cliente = document.getElementById('task-cliente').value.trim().toUpperCase();
  const titulo = document.getElementById('task-titulo').value.trim();
  const desc = (document.getElementById('task-desc')?.value || '').trim();

  db.tasks.unshift({
    id: 'TSK-' + Date.now(),
    fecha,
    tipo,
    cliente,
    titulo,
    desc,
    images: [...newTaskImages],
    done: false
  });

  resetTaskForm();
  await persistData();
  showToast('✅ Tarea guardada');
}

function openEditTaskModal(id) {
  const t = (db.tasks || []).find(x => x.id === id);
  if (!t) return;
  document.getElementById('edit-task-id').value = t.id;
  document.getElementById('edit-task-fecha').value = t.fecha || todayISO();
  document.getElementById('edit-task-tipo').value = t.tipo || 'GENERAL';
  document.getElementById('edit-task-cliente').value = t.cliente || '';
  document.getElementById('edit-task-titulo').value = t.titulo || '';
  if (document.getElementById('edit-task-desc')) {
    document.getElementById('edit-task-desc').value = t.desc || '';
  }
  editTaskImages = Array.isArray(t.images) ? [...t.images] : [];
  renderTaskImagePreviews('edit');
  document.getElementById('task-modal').style.display = 'flex';
}

async function saveEditedTask(e) {
  e.preventDefault();
  const id = document.getElementById('edit-task-id').value;
  const t = (db.tasks || []).find(x => x.id === id);
  if (!t) return;

  t.fecha = document.getElementById('edit-task-fecha').value || todayISO();
  t.tipo = document.getElementById('edit-task-tipo').value;
  t.cliente = document.getElementById('edit-task-cliente').value.trim().toUpperCase();
  t.titulo = document.getElementById('edit-task-titulo').value.trim();
  t.desc = (document.getElementById('edit-task-desc')?.value || '').trim();
  t.images = [...editTaskImages];

  resetEditTaskForm();
  closeModal('task-modal');
  await persistData();
  showToast('✏️ Tarea actualizada');
}

async function toggleTaskDone(id) {
  const t = db.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  await persistData();
  showToast(t.done ? '✔ Tarea completada' : 'Tarea marcada como pendiente');
}

async function deleteScheduledTask(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  db.tasks = db.tasks.filter(x => x.id !== id);
  await persistData();
  showToast('Tarea eliminada');
}

function renderAgenda() {
  const listEl = document.getElementById('scheduled-tasks-list');
  if (!listEl) return;

  const today = todayISO();
  const q = (document.getElementById('task-search')?.value || '').trim().toLowerCase();
  let tasks = [...(db.tasks || [])].sort((a, b) => {
    if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
    return (a.fecha || '').localeCompare(b.fecha || '');
  });

  if (activeTaskFilter === 'PENDIENTES') tasks = tasks.filter(t => !t.done);
  else if (activeTaskFilter === 'HECHAS') tasks = tasks.filter(t => t.done);

  if (q) {
    tasks = tasks.filter(t =>
      (t.titulo || '').toLowerCase().includes(q) ||
      (t.desc || '').toLowerCase().includes(q) ||
      (t.cliente || '').toLowerCase().includes(q) ||
      (t.tipo || '').toLowerCase().includes(q) ||
      (t.fecha || '').toLowerCase().includes(q) ||
      formatDateDMY(t.fecha || '').toLowerCase().includes(q)
    );
  }

  listEl.innerHTML = tasks.length ? tasks.map(t => {
    const isOverdue = !t.done && t.fecha < today;
    const isToday = !t.done && t.fecha === today;
    const cardClass = t.done ? 'task-done' : (isOverdue ? 'task-overdue' : (isToday ? 'task-today' : ''));
    const cliObj = findClientByComposite(t.cliente);
    const waUrl = buildWhatsAppLinkForClient(cliObj, t.tipo);
    const imgs = Array.isArray(t.images) ? t.images : [];
    const thumbsHtml = imgs.length
      ? `<div class="task-thumbs-row">${imgs.map(src => `<img src="${src}" class="task-thumb-img" alt="Adjunto" onclick="openLightbox('${src}')" />`).join('')}</div>`
      : '';
    const metaParts = [formatDateDMY(t.fecha)];
    if (t.cliente) metaParts.push(t.cliente);

    return `
      <div class="task-card ${cardClass}">
        <div style="display:flex; align-items:flex-start; gap:12px; min-width:0; flex:1;">
          <button class="task-check-btn ${t.done ? 'checked' : ''}" onclick="toggleTaskDone('${t.id}')" title="${t.done ? 'Marcar pendiente' : 'Completar'}">✔</button>
          <div style="min-width:0; flex:1;">
            <div class="font-bold" style="font-size:14px; ${t.done ? 'text-decoration:line-through;' : ''}">${escapeAttr(t.titulo)}</div>
            ${t.desc ? `<div class="task-desc-text">${escapeAttr(t.desc)}</div>` : ''}
            <div class="muted" style="font-size:11.5px; margin-top:4px;">${isOverdue ? '⚠️ ' : ''}${escapeAttr(metaParts.join(' · '))}</div>
            ${thumbsHtml}
          </div>
        </div>
        <div class="action-icon-group" style="flex-shrink:0;">
          ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn-sm btn-wa">WA</a>` : ''}
          <button class="btn-icon" onclick="openEditTaskModal('${t.id}')" title="Editar">✏️</button>
          <button class="btn-icon btn-icon-del" onclick="deleteScheduledTask('${t.id}')" title="Eliminar">🗑</button>
        </div>
      </div>
    `;
  }).join('') : `<p class="muted" style="padding:18px; text-align:center;">No hay tareas en esta vista.</p>`;
}

function quickPayment(barberia, barbero, saldo) {
  switchTab('movimientos');
  document.getElementById('mov-tipo').value = 'ABONO / PAGO';
  toggleProductPicker();
  document.getElementById('mov-cliente-search').value = `${barberia} | ${barbero}`;
  document.getElementById('mov-monto').value = saldo > 0 ? saldo : '';
  document.getElementById('mov-detalle').value = 'Abono de saldo pendiente';
  hideMovClientAlert();
  hideMovLastFeedback();
  updateMovClientBalanceNotice();
  document.getElementById('mov-monto').focus();
}

function populateDatalists() {
  document.getElementById('clientes-datalist').innerHTML = db.clients
    .map(c => `<option value="${escapeAttr(c.barberia)} | ${escapeAttr(c.barbero)}">${escapeAttr(c.zona)} (${escapeAttr(c.ruta)})</option>`).join('');
  document.getElementById('productos-datalist').innerHTML = db.inv
    .map(p => `<option value="${escapeAttr(p.codigo)} | ${escapeAttr(p.producto)}">Stock: ${p.stock} · ${fmtMoney(p.venta)}</option>`).join('');
}

function showMovClientAlert(msg) {
  const el = document.getElementById('mov-client-alert');
  if (!el) return;
  el.textContent = `⚠️ ${msg}`;
  el.style.display = 'block';
}

function hideMovClientAlert() {
  const el = document.getElementById('mov-client-alert');
  if (el) {
    el.style.display = 'none';
    el.textContent = '';
  }
}

function showMovLastFeedback(msg) {
  const el = document.getElementById('mov-last-feedback');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideMovLastFeedback() {
  const el = document.getElementById('mov-last-feedback');
  if (el) {
    el.style.display = 'none';
    el.textContent = '';
  }
}

function onMovClientInput() {
  hideMovClientAlert();
  hideMovLastFeedback();
  updateAbonoParcialVisibility();
  updateMovClientBalanceNotice();
  renderMovClientSuggestions();
}

function cleanClientQueryText(raw) {
  return stripAccents(String(raw || ''))
    .toUpperCase()
    .replace(/\.{2,}|…/g, ' ')
    .replace(/[()[\],;/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeClientQuery(raw) {
  const stopWords = new Set(['DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'EN', 'A', 'POR', 'AL']);
  const cleaned = cleanClientQueryText(raw).replace(/\|/g, ' ');
  const rawTokens = cleaned.split(/\s+/).filter(Boolean);
  const meaningful = rawTokens.filter(t => t.length >= 2 && !stopWords.has(t));
  return meaningful.length ? meaningful : rawTokens;
}

function findClientSuggestions(rawQuery, limit = 6) {
  const raw = String(rawQuery || '').trim();
  if (!raw || isAnonymousClientName(raw)) return [];

  const normFullQuery = cleanClientQueryText(raw);
  if (normFullQuery.length < 2) return [];

  const hasPipe = raw.includes('|');
  const pipeParts = hasPipe ? raw.split('|') : [raw, ''];
  const qLeft = cleanClientQueryText(pipeParts[0] || '');
  const qRight = cleanClientQueryText(pipeParts.slice(1).join(' ') || '');
  const qNoPipe = cleanClientQueryText(raw.replace(/\|/g, ' '));
  const queryTokens = tokenizeClientQuery(raw);
  const leftTokens = qLeft ? tokenizeClientQuery(qLeft) : [];
  const rightTokens = qRight ? tokenizeClientQuery(qRight) : [];

  const scored = [];

  (db.clients || []).forEach(c => {
    const b1 = cleanClientQueryText(c.barberia || '');
    const b2 = cleanClientQueryText(c.barbero || '');
    const z = cleanClientQueryText(c.zona || '');
    const r = cleanClientQueryText(c.ruta || '');
    const n = cleanClientQueryText(c.notas || '');
    const compositeNorm = b2 ? `${b1} | ${b2}` : b1;
    const compositeSpaced = `${b1} ${b2}`.trim();
    const allFields = `${b1} ${b2} ${z} ${r} ${n}`.trim();
    const fieldWords = allFields.split(/\s+/).filter(Boolean);

    let score = 0;
    let isExact = false;

    if (hasPipe && b1 === qLeft && (!qRight || b2 === qRight)) {
      score = 1200;
      isExact = true;
    } else if (compositeNorm === normFullQuery || compositeSpaced === qNoPipe) {
      score = 1150;
      isExact = true;
    } else if ((b1 && b1 === qNoPipe) || (b2 && b2 === qNoPipe)) {
      score = 920;
    } else if (hasPipe && qLeft && ((b1.includes(qLeft) || qLeft.includes(b1)) && b1.length >= 2)) {
      let pipeScore = 520;
      if (b1 === qLeft) pipeScore += 180;
      else if (b1.startsWith(qLeft)) pipeScore += 110;
      if (qRight) {
        let rightMatched = 0;
        rightTokens.forEach(rt => {
          if (b2 === rt) { pipeScore += 220; rightMatched++; }
          else if (b2.startsWith(rt) || b2.includes(rt)) { pipeScore += 140; rightMatched++; }
          else if (z.startsWith(rt) || z.includes(rt)) { pipeScore += 90; rightMatched++; }
          else if (n.includes(rt)) { pipeScore += 75; rightMatched++; }
        });
        if (rightMatched > 0) pipeScore += 80;
        else if (qRight.length >= 2) pipeScore -= 180;
      }
      if (pipeScore > 400) score = Math.max(score, pipeScore);
    }

    if (!score) {
      if (b1.startsWith(qNoPipe) || b2.startsWith(qNoPipe) || compositeNorm.startsWith(normFullQuery)) {
        score = 620;
      } else if (b1.includes(qNoPipe) || b2.includes(qNoPipe) || n.includes(qNoPipe)) {
        score = 480;
      }
    }

    if (!score && queryTokens.length) {
      let matchedTokens = 0;
      let tokenScore = 0;
      let matchedNameToken = false;

      queryTokens.forEach(tok => {
        if (tok.length < 2) return;
        const inB1Exact = b1.split(/\s+/).includes(tok);
        const inB2Exact = b2.split(/\s+/).includes(tok);
        const inNameStarts = b1.split(/\s+/).some(w => w.startsWith(tok)) || b2.split(/\s+/).some(w => w.startsWith(tok));
        const inNameInc = b1.includes(tok) || b2.includes(tok);
        const inAlias = n.includes(tok);
        const inZone = z.includes(tok) || r.includes(tok);

        if (inB2Exact || inB1Exact) {
          matchedTokens++;
          matchedNameToken = true;
          tokenScore += 180;
        } else if (inNameStarts) {
          matchedTokens++;
          matchedNameToken = true;
          tokenScore += 140;
        } else if (inNameInc) {
          matchedTokens++;
          matchedNameToken = true;
          tokenScore += 105;
        } else if (inAlias) {
          matchedTokens++;
          matchedNameToken = true;
          tokenScore += 95;
        } else if (inZone) {
          matchedTokens++;
          tokenScore += 65;
        } else if (fieldWords.some(w => tok.length >= 4 && w.length >= 4 && (w.startsWith(tok.slice(0, 4)) || tok.startsWith(w.slice(0, 4))))) {
          matchedTokens++;
          tokenScore += 45;
        }
      });

      const minRequired = queryTokens.length === 1 ? 1 : Math.min(2, queryTokens.length);
      if (matchedTokens >= minRequired && (matchedNameToken || (queryTokens.length === 1 && matchedTokens === 1))) {
        const coverageBonus = Math.round((matchedTokens / queryTokens.length) * 140);
        const missedPenalty = (queryTokens.length - matchedTokens) * 35;
        score = tokenScore + coverageBonus - missedPenalty;
      }
    }

    if (hasPipe && leftTokens.length && rightTokens.length && score > 0 && score < 1100) {
      const leftHit = leftTokens.some(t => b1.includes(t) || b2.includes(t));
      const rightHit = rightTokens.some(t => b2.includes(t) || z.includes(t) || n.includes(t));
      if (leftHit && rightHit) score += 120;
    }

    if (score > 0) {
      scored.push({
        client: c,
        composite: c.barbero ? `${c.barberia} | ${c.barbero}` : c.barberia,
        zona: normalizeZoneName(c.zona || ''),
        deuda: getClientBalance(c),
        score,
        isExact
      });
    }
  });

  scored.sort((a, b) => b.score - a.score || a.composite.localeCompare(b.composite));
  return scored.slice(0, limit);
}

function findLiveClientMatchInfo(rawCli) {
  const clean = (rawCli || '').trim();
  if (!clean || isAnonymousClientName(clean)) return { matched: null, matchCount: 0, exact: false, suggestions: [] };

  const exact = findClientByComposite(clean);
  const suggestions = findClientSuggestions(clean, 6);

  if (exact) {
    const exactComp = (exact.barbero ? `${exact.barberia} | ${exact.barbero}` : exact.barberia).toUpperCase();
    const isExactComposite = clean.toUpperCase() === exactComp ||
      clean.toUpperCase() === (exact.barbero || '').toUpperCase() ||
      clean.toUpperCase() === (exact.barberia || '').toUpperCase();
    if (isExactComposite || suggestions.length <= 1) {
      return { matched: exact, matchCount: 1, exact: true, suggestions };
    }
  }

  return {
    matched: suggestions[0]?.client || null,
    matchCount: suggestions.length,
    exact: Boolean(suggestions[0]?.isExact),
    suggestions
  };
}

function renderClientSuggestionsHtml(rawQuery, onSelectFnName, prefixArg = '') {
  const raw = String(rawQuery || '').trim();
  if (!raw || isAnonymousClientName(raw)) return '';
  const suggestions = findClientSuggestions(raw, 5);
  if (!suggestions.length) return '';

  const exactTop = suggestions[0];
  if (exactTop && exactTop.isExact && cleanClientQueryText(raw) === cleanClientQueryText(exactTop.composite)) {
    return '';
  }

  return suggestions.map(s => {
    const metaParts = [];
    if (s.zona && s.zona !== 'SIN ZONA') metaParts.push(s.zona);
    metaParts.push(s.deuda > 0 ? `Deuda ${fmtMoney(s.deuda)}` : '$0');
    const safeArg = s.composite.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const argsStr = prefixArg ? `'${prefixArg}', '${safeArg}'` : `'${safeArg}'`;
    return `<button type="button" class="cli-suggest-chip" onclick="${onSelectFnName}(${argsStr})">${escapeAttr(s.composite)} <span class="cli-suggest-chip-meta">· ${escapeAttr(metaParts.join(' · '))}</span></button>`;
  }).join('');
}

function renderMovClientSuggestions() {
  const box = document.getElementById('mov-client-suggestions');
  const cliInput = document.getElementById('mov-cliente-search');
  if (!box || !cliInput) return;
  const html = renderClientSuggestionsHtml(cliInput.value, 'selectMovFormClient');
  if (!html) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.innerHTML = html;
  box.style.display = 'flex';
}

function selectMovFormClient(composite) {
  const cliInput = document.getElementById('mov-cliente-search');
  if (cliInput) cliInput.value = composite;
  hideMovClientAlert();
  updateAbonoParcialVisibility();
  updateMovClientBalanceNotice();
  renderMovClientSuggestions();
}

function computeOpBalanceSummary({ tipo, cliente, monto = 0, abonoParcial = 0 }) {
  const normTipo = normalizeOpType(tipo);
  const rawCli = (cliente || '').trim();
  const isAnon = !rawCli || isAnonymousClientName(rawCli);
  const { matched, matchCount } = isAnon ? { matched: null, matchCount: 0 } : findLiveClientMatchInfo(rawCli);
  const deudaPrevia = matched ? getClientBalance(matched) : 0;
  const montoOp = Math.max(0, Number(monto) || 0);
  const abonoInput = Math.max(0, Number(abonoParcial) || 0);

  let abonoSolicitado = 0;
  let abonoAplicado = 0;
  let saldoRestante = deudaPrevia;
  let sobrante = 0;
  let subtotal = deudaPrevia;

  if (normTipo === 'ABONO / PAGO') {
    abonoSolicitado = montoOp;
    abonoAplicado = Math.min(montoOp, deudaPrevia);
    sobrante = Math.max(0, montoOp - deudaPrevia);
    saldoRestante = Math.max(0, deudaPrevia - abonoAplicado);
  } else if (normTipo === 'VENTA A CREDITO') {
    subtotal = deudaPrevia + montoOp;
    abonoSolicitado = abonoInput;
    abonoAplicado = Math.min(abonoInput, subtotal);
    sobrante = Math.max(0, abonoInput - subtotal);
    saldoRestante = Math.max(0, subtotal - abonoAplicado);
  } else if (normTipo === 'VENTA CONTADO') {
    abonoSolicitado = abonoInput;
    abonoAplicado = Math.min(abonoInput, deudaPrevia);
    sobrante = Math.max(0, abonoInput - deudaPrevia);
    saldoRestante = Math.max(0, deudaPrevia - abonoAplicado);
  }

  return {
    normTipo,
    isAnon,
    hasClient: !isAnon,
    matched,
    matchCount,
    clientLabel: matched ? `${matched.barberia} | ${matched.barbero}` : rawCli.toUpperCase(),
    deudaPrevia,
    montoOp,
    subtotal,
    abonoSolicitado,
    abonoAplicado,
    saldoRestante,
    sobrante
  };
}

function fillClientPendingDebtIntoAbono() {
  const cliInput = document.getElementById('mov-cliente-search');
  const abonoInput = document.getElementById('mov-abono-parcial');
  if (!cliInput || !abonoInput) return;
  const { matched } = findLiveClientMatchInfo(cliInput.value.trim());
  if (!matched) return;
  const deuda = getClientBalance(matched);
  abonoInput.value = deuda > 0 ? deuda : 0;
  updateMovClientBalanceNotice();
}

function updateAbonoParcialVisibility() {
  const tipoEl = document.getElementById('mov-tipo');
  const abonoParcialGroup = document.getElementById('abono-parcial-group');
  const abonoLabel = document.getElementById('mov-abono-parcial-label');
  const fillBtn = document.getElementById('btn-fill-deuda-previa');
  if (!tipoEl || !abonoParcialGroup) return;

  const tipo = normalizeOpType(tipoEl.value);
  const rawCli = (document.getElementById('mov-cliente-search')?.value || '').trim();
  const { matched } = (!rawCli || isAnonymousClientName(rawCli)) ? { matched: null } : findLiveClientMatchInfo(rawCli);
  const deudaActual = matched ? getClientBalance(matched) : 0;
  const hasRealClient = Boolean(rawCli && !isAnonymousClientName(rawCli));

  if (tipo === 'VENTA A CREDITO') {
    abonoParcialGroup.style.display = 'block';
    if (abonoLabel) abonoLabel.textContent = 'Abono / Entrega simultánea ($ - opcional)';
    if (fillBtn) {
      if (deudaActual > 0) {
        fillBtn.style.display = 'inline-block';
        fillBtn.textContent = `⚡ Saldar deuda (${fmtMoney(deudaActual)})`;
      } else {
        fillBtn.style.display = 'none';
      }
    }
  } else if (tipo === 'VENTA CONTADO' && hasRealClient) {
    abonoParcialGroup.style.display = 'block';
    if (abonoLabel) abonoLabel.textContent = 'Abono a deuda previa ($ - opcional)';
    if (fillBtn) {
      if (deudaActual > 0) {
        fillBtn.style.display = 'inline-block';
        fillBtn.textContent = `⚡ Saldar deuda (${fmtMoney(deudaActual)})`;
      } else {
        fillBtn.style.display = 'none';
      }
    }
  } else {
    abonoParcialGroup.style.display = 'none';
    if (fillBtn) fillBtn.style.display = 'none';
  }
}

function updateMovClientBalanceNotice() {
  const noticeEl = document.getElementById('mov-abono-notice');
  if (!noticeEl) return;

  const tipoEl = document.getElementById('mov-tipo');
  const cliInput = document.getElementById('mov-cliente-search');
  if (!tipoEl || !cliInput) {
    noticeEl.style.display = 'none';
    return;
  }

  const rawCli = cliInput.value.trim();
  if (!rawCli || isAnonymousClientName(rawCli)) {
    noticeEl.style.display = 'none';
    noticeEl.textContent = '';
    return;
  }

  const monto = Number(document.getElementById('mov-monto')?.value) || 0;
  const abonoParcial = Number(document.getElementById('mov-abono-parcial')?.value) || 0;
  const s = computeOpBalanceSummary({
    tipo: tipoEl.value,
    cliente: rawCli,
    monto,
    abonoParcial
  });

  if (!s.matched) {
    let msg = `ℹ️ Cliente sin registro previo en el directorio (deuda actual: $0).`;
    if (s.normTipo === 'VENTA A CREDITO' && (s.montoOp > 0 || s.abonoSolicitado > 0)) {
      msg = `ℹ️ Cliente nuevo (deuda previa: $0) · Venta crédito: ${fmtMoney(s.montoOp)} · Abono aplicado: ${fmtMoney(s.abonoAplicado)} → Saldo restante: ${fmtMoney(s.saldoRestante)}.`;
      if (s.sobrante > 0) msg += ` Deuda saldada en $0. Sobrante de ${fmtMoney(s.sobrante)}.`;
    }
    noticeEl.className = 'inline-alert inline-alert-warn';
    noticeEl.textContent = msg;
    noticeEl.style.display = 'block';
    return;
  }

  const multiHint = s.matchCount > 1 ? ` (Hay ${s.matchCount} coincidencias: elegí de la lista)` : '';
  let msg = '';

  if (s.normTipo === 'PEDIDO') {
    msg = s.deudaPrevia > 0
      ? `📦 ${s.clientLabel} — Deuda actual: ${fmtMoney(s.deudaPrevia)}${s.montoOp > 0 ? ` · Pedido estimado: ${fmtMoney(s.montoOp)}` : ''}.${multiHint}`
      : `✅ ${s.clientLabel} — Sin deuda actual ($0)${s.montoOp > 0 ? ` · Pedido estimado: ${fmtMoney(s.montoOp)}` : ''}.${multiHint}`;
    noticeEl.className = s.deudaPrevia === 0 ? 'inline-alert inline-alert-success' : 'inline-alert inline-alert-warn';
    noticeEl.textContent = msg;
    noticeEl.style.display = 'block';
    return;
  }

  if (s.normTipo === 'ABONO / PAGO') {
    if (s.montoOp === 0) {
      msg = s.deudaPrevia === 0
        ? `✅ ${s.clientLabel} — Sin deuda actual ($0, al día).${multiHint}`
        : `💳 ${s.clientLabel} — Deuda actual: ${fmtMoney(s.deudaPrevia)}.${multiHint}`;
    } else if (s.sobrante > 0) {
      msg = `✅ ${s.clientLabel} — Deuda anterior: ${fmtMoney(s.deudaPrevia)} · Abono ingresado: ${fmtMoney(s.montoOp)} (aplicado: ${fmtMoney(s.abonoAplicado)}) → Deuda saldada en $0. Sobrante de ${fmtMoney(s.sobrante)}.${multiHint}`;
    } else {
      msg = `💳 ${s.clientLabel} — Deuda anterior: ${fmtMoney(s.deudaPrevia)} · Abono aplicado: ${fmtMoney(s.abonoAplicado)} → Saldo restante: ${fmtMoney(s.saldoRestante)}.${multiHint}`;
    }
  } else if (s.normTipo === 'VENTA CONTADO') {
    if (s.montoOp === 0 && s.abonoSolicitado === 0) {
      msg = s.deudaPrevia === 0
        ? `✅ ${s.clientLabel} — Sin deuda actual ($0, al día).${multiHint}`
        : `💳 ${s.clientLabel} — Deuda actual: ${fmtMoney(s.deudaPrevia)}.${multiHint}`;
    } else {
      const totalHoy = s.montoOp + s.abonoAplicado;
      msg = `💳 ${s.clientLabel} — Deuda anterior: ${fmtMoney(s.deudaPrevia)} · Compra contado: ${fmtMoney(s.montoOp)} · Abono aplicado: ${fmtMoney(s.abonoAplicado)} → Saldo restante: ${fmtMoney(s.saldoRestante)} (Total entregado hoy: ${fmtMoney(totalHoy)}).`;
      if (s.sobrante > 0) msg += ` Deuda saldada en $0. Sobrante de ${fmtMoney(s.sobrante)}.`;
      msg += multiHint;
    }
  } else if (s.normTipo === 'VENTA A CREDITO') {
    if (s.montoOp === 0 && s.abonoSolicitado === 0) {
      msg = s.deudaPrevia === 0
        ? `✅ ${s.clientLabel} — Sin deuda actual ($0, al día).${multiHint}`
        : `💳 ${s.clientLabel} — Deuda actual: ${fmtMoney(s.deudaPrevia)}.${multiHint}`;
    } else {
      msg = `💳 ${s.clientLabel} — Deuda anterior: ${fmtMoney(s.deudaPrevia)} + Venta crédito: ${fmtMoney(s.montoOp)} = ${fmtMoney(s.subtotal)} · Abono aplicado: ${fmtMoney(s.abonoAplicado)} → Saldo restante: ${fmtMoney(s.saldoRestante)}.`;
      if (s.sobrante > 0) msg += ` Deuda saldada en $0. Sobrante de ${fmtMoney(s.sobrante)}.`;
      msg += multiHint;
    }
  }

  noticeEl.className = (s.saldoRestante === 0 && s.sobrante === 0)
    ? 'inline-alert inline-alert-success'
    : 'inline-alert inline-alert-warn';
  noticeEl.textContent = msg;
  noticeEl.style.display = 'block';
}

function openClientModalFromSale() {
  returnNewClientToSaleForm = true;
  openClientModal(null);
  const rawTyped = (document.getElementById('mov-cliente-search')?.value || '').trim();
  if (rawTyped && !isAnonymousClientName(rawTyped)) {
    if (rawTyped.includes('|')) {
      const parts = rawTyped.split('|');
      document.getElementById('cli-barberia').value = (parts[0] || '').trim();
      document.getElementById('cli-barbero').value = (parts[1] || '').trim();
    } else {
      document.getElementById('cli-barberia').value = rawTyped;
    }
  }
}

function resetMovementForm() {
  const form = document.getElementById('mov-form');
  if (form) form.reset();
  currentCart = [];
  renderCart();
  lastDetectedOrder = null;
  if (document.getElementById('mov-fecha')) document.getElementById('mov-fecha').value = todayISO();
  if (document.getElementById('mov-tipo')) document.getElementById('mov-tipo').value = 'VENTA A CREDITO';
  if (document.getElementById('mov-cliente-search')) document.getElementById('mov-cliente-search').value = '';
  if (document.getElementById('prod-pick-search')) document.getElementById('prod-pick-search').value = '';
  if (document.getElementById('prod-pick-qty')) document.getElementById('prod-pick-qty').value = 1;
  if (document.getElementById('mov-monto')) document.getElementById('mov-monto').value = '';
  if (document.getElementById('mov-medio')) document.getElementById('mov-medio').value = 'EFECTIVO';
  if (document.getElementById('mov-abono-parcial')) document.getElementById('mov-abono-parcial').value = '';
  if (document.getElementById('mov-detalle')) document.getElementById('mov-detalle').value = '';
  if (document.getElementById('mov-obs')) document.getElementById('mov-obs').value = '';
  if (document.getElementById('voice-input')) document.getElementById('voice-input').value = '';
  const banner = document.getElementById('detected-order-banner');
  if (banner) banner.style.display = 'none';
  dismissQuickSinglePreview();
  toggleProductPicker();
  hideMovClientAlert();
  updateMovClientBalanceNotice();
  renderMovClientSuggestions();
}

/* --- CARRITO DE PRODUCTOS Y DESCUENTO AUTOMÁTICO DE STOCK --- */
function toggleProductPicker() {
  const tipo = normalizeOpType(document.getElementById('mov-tipo').value);
  const isAbono = tipo === 'ABONO / PAGO';
  const isContado = tipo === 'VENTA CONTADO';

  document.getElementById('product-picker-box').style.display = isAbono ? 'none' : 'block';
  updateAbonoParcialVisibility();

  const cliInput = document.getElementById('mov-cliente-search');
  const cliLabel = document.getElementById('mov-cliente-label');
  if (cliInput && cliLabel) {
    cliInput.required = false;
    if (isContado) {
      cliLabel.textContent = 'Cliente (Opcional — vacío = Venta Rápida / Consumidor Final)';
      cliInput.placeholder = 'Opcional: dejá vacío o elegí un cliente...';
    } else {
      cliLabel.textContent = 'Cliente (Barbería — Barbero) *';
      cliInput.placeholder = 'Seleccioná o creá un cliente...';
    }
  }
  hideMovClientAlert();
  updateMovClientBalanceNotice();
}

function fillConsumidorFinal() {
  const tipoEl = document.getElementById('mov-tipo');
  if (tipoEl && normalizeOpType(tipoEl.value) !== 'VENTA CONTADO') {
    tipoEl.value = 'VENTA CONTADO';
    toggleProductPicker();
  }
  const cliInput = document.getElementById('mov-cliente-search');
  if (cliInput) {
    cliInput.value = CONSUMIDOR_FINAL_COMPOSITE;
  }
  hideMovClientAlert();
  updateAbonoParcialVisibility();
  updateMovClientBalanceNotice();
  showToast('⚡ Listo: Venta Rápida / Consumidor Final');
}

function addCartItem() {
  const raw = document.getElementById('prod-pick-search').value.trim();
  const qty = Math.max(1, Number(document.getElementById('prod-pick-qty').value) || 1);
  if (!raw) return;

  const code = raw.split('|')[0].trim().toUpperCase();
  const prod = db.inv.find(p => p.codigo === code || p.producto.toUpperCase().includes(raw.toUpperCase()));
  if (!prod) return showToast('Seleccioná un producto válido de la lista');

  const existing = currentCart.find(x => x.codigo === prod.codigo);
  if (existing) existing.qty += qty;
  else currentCart.push({ codigo: prod.codigo, producto: prod.producto, qty, precio: Number(prod.venta) || 0 });

  document.getElementById('prod-pick-search').value = '';
  document.getElementById('prod-pick-qty').value = 1;
  renderCart();
}

function removeCartItem(idx) {
  currentCart.splice(idx, 1);
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cart-items-list');
  if (!currentCart.length) {
    list.innerHTML = '';
    return;
  }
  let total = 0;
  const details = [];
  list.innerHTML = currentCart.map((item, idx) => {
    const sub = item.qty * item.precio;
    total += sub;
    details.push(`${item.qty}x ${item.producto}`);
    return `
      <div class="cart-chip">
        <span><strong>${item.qty}x</strong> ${item.producto} (${fmtMoney(sub)})</span>
        <button type="button" class="btn-icon" onclick="removeCartItem(${idx})" style="font-size:14px;">✕</button>
      </div>
    `;
  }).join('');

  document.getElementById('mov-monto').value = total;
  document.getElementById('mov-detalle').value = details.join(', ');
  updateMovClientBalanceNotice();
}

/* --- PROCESAMIENTO DE AUDIOS DE WHATSAPP Y TEXTO CON GEMINI + PARSER LOCAL --- */
function setupAudioDropzone() {
  const zone = document.getElementById('audio-dropzone');
  if (!zone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evtName => {
    zone.addEventListener(evtName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  zone.addEventListener('dragover', () => zone.classList.add('drag-over'));
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    zone.classList.remove('drag-over');
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) {
      processWhatsAppAudioFile(files[0]);
    }
  });
}

function handleAudioFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (file) {
    processWhatsAppAudioFile(file);
    e.target.value = '';
  }
}

function getAudioMimeType(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.ogg') || name.endsWith('.opus')) return 'audio/ogg';
  if (name.endsWith('.mp3')) return 'audio/mp3';
  if (name.endsWith('.m4a') || name.endsWith('.mp4')) return 'audio/mp4';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.aac')) return 'audio/aac';
  if (name.endsWith('.webm')) return 'audio/webm';
  return file.type || 'audio/ogg';
}

function buildSmartExtractionPrompt(extraText = '') {
  const cliList = db.clients.map(c => {
    const alias = (c.notas || '').trim();
    const aliasTag = alias ? ` [Ref/Apodo: ${alias.slice(0, 40)}]` : '';
    return `${c.barberia} | ${c.barbero} (${c.zona || 'Sin zona'})${aliasTag} — Deuda actual: $${getClientBalance(c)}`;
  }).join('; ');
  const invList = db.inv.map(p => `${p.codigo}: ${p.producto} ($${p.venta})`).join('; ');

  return `Sos el asistente administrativo de Rapibarbe (insumos de barbería en Argentina). Fecha de hoy: ${todayISO()}.
Analizá este audio o listado estructurado de ventas a crédito, ventas de contado, cobros, pedidos y tareas de Freddy y convertilo en una lista plana de operaciones individuales:
${extraText ? `"""\n${extraText}\n"""` : ''}

Clientes existentes (con su deuda actual): [${cliList}]
Productos en stock: [${invList}]

REGLAS CRÍTICAS DE DESGLOSE:
1. IDENTIFICACIÓN DE CLIENTE, DEUDA ACTUAL Y FECHA:
   - Buscá coincidencia en "Clientes existentes" por barbería, barbero, apodo o zona (ej: si dice "PATRICIA | NELLY LINIER..." o solo "Nelly de Liniers", devolvé exactamente "BARBERIA | BARBERO" de la lista). Tené en cuenta su deuda actual para distinguir entre pagos a cuenta, cancelación de saldo y compras nuevas.
   - Si se menciona una fecha específica (ej: "ayer", "el 25/11", "2026-11-25"), convertila a formato ISO "YYYY-MM-DD" en el campo "fecha" (y en "fechaProgramada" si es TAREA). Si no se menciona fecha, usá "${todayISO()}".
2. VENTAS SIN NOMBRE DE CLIENTE (LISTADOS AL CONTADO):
   - Si en el audio o listado se mencionan artículos vendidos SIN decir a qué cliente/barbero se los vendió (ej: "se vendieron 3 capas a 15 mil, 2 cuchillas a 24 mil", o un listado suelto de artículos sin nombre), poné:
     "tipo": "VENTA CONTADO"
     "cliente": "${CONSUMIDOR_FINAL_COMPOSITE}"
   - Si son varios artículos sueltos sin cliente en un mismo listado de ventas de contado, podés generar una operación por ítem o agruparlos, vinculando el código ART-XXX en "items" si coincide con el stock para que descuente inventario automáticamente.
3. VENTAS CON ENTREGA PARCIAL / ABONO SIMULTÁNEO:
   - Si en una VENTA A CREDITO o VENTA CONTADO el cliente entrega o abona una parte en el acto (ej: "llevó $30.000 a crédito y entregó $10.000" o "compró $15.000 contado y además abonó $5.000 de su deuda anterior"), poné el monto total de la compra en "montoManual" y el monto entregado/abonado por separado en "abonoParcial".
   - Si en cambio hace solo un pago o abono puro de deuda anterior (sin compra nueva), usá tipo "ABONO / PAGO" con el monto en "montoManual" y "abonoParcial": 0.
4. Si un cliente deja SEÑA por un PEDIDO pendiente, generá:
   - Operación A: tipo "PEDIDO", montoManual: total, sena: seña.
   - Operación B: tipo "ABONO / PAGO" por el monto de la seña SOLO si no figura ya aparte como cobro del día.
5. Ignorá las líneas de resumen global como "TOTALES DEL DÍA", "Total cobrado hoy" o "Mercadería entregada hoy".
6. Si pide agendar un aviso de pago, grabar polo barbero o recordatorio para una fecha, usá tipo "TAREA".
7. Si el producto no coincide con un código ART-XXX del stock, dejá "items": [] y poné el total en "montoManual" y el detalle en "notas".

Devolvé ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "transcripcion": "resumen breve",
  "operaciones": [
    {
      "tipo": "VENTA CONTADO",
      "fecha": "${todayISO()}",
      "subtipoTarea": "AVISO PAGO",
      "fechaProgramada": "${todayISO()}",
      "cliente": "${CONSUMIDOR_FINAL_COMPOSITE}",
      "zona": "",
      "items": [],
      "montoManual": 0,
      "sena": 0,
      "abonoParcial": 0,
      "medio": "EFECTIVO",
      "notas": "detalle exacto de productos o concepto"
    }
  ]
}`;
}

async function getAvailableGeminiModels(apiKey) {
  if (cachedGeminiModel) return [cachedGeminiModel];
  const preferred = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-2.5-flash', 'gemini-flash-latest'];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) return preferred;
    const data = await res.json();
    const valid = (data.models || [])
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .filter(name => name.includes('flash') && !name.includes('image') && !name.includes('audio') && !name.includes('tts'));

    if (!valid.length) return preferred;

    const ordered = [];
    preferred.forEach(p => { if (valid.includes(p)) ordered.push(p); });
    valid.forEach(v => { if (!ordered.includes(v)) ordered.push(v); });
    return ordered;
  } catch (e) {
    return preferred;
  }
}

async function callGeminiWithFallback(partsArray) {
  const apiKey = (config.geminiKey || '').trim();
  if (!apiKey) throw new Error('Falta configurar la Gemini API Key en Nube & IA.');

  const models = await getAvailableGeminiModels(apiKey);
  let lastError = 'Error desconocido';

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: partsArray }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        cachedGeminiModel = '';
        lastError = (data.error && data.error.message) ? data.error.message : `HTTP ${res.status}`;
        continue;
      }

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!rawText) {
        lastError = 'Respuesta vacía de Gemini';
        continue;
      }

      cachedGeminiModel = model;
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const firstBracket = cleaned.indexOf('[');
      const firstBrace = cleaned.indexOf('{');

      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        const lastBracket = cleaned.lastIndexOf(']');
        const arr = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
        return { operaciones: arr };
      }

      const lastBrace = cleaned.lastIndexOf('}');
      const jsonStr = (firstBrace !== -1 && lastBrace !== -1) ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
      return JSON.parse(jsonStr);
    } catch (err) {
      cachedGeminiModel = '';
      lastError = err.message || String(err);
    }
  }

  throw new Error(lastError);
}

/* BUSCA SI EL TEXTO DE UN ÍTEM COINCIDE CON UN ARTÍCULO DEL INVENTARIO PARA DESCONTAR STOCK */
function stripAccents(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseArsAmount(str) {
  if (!str) return 0;
  const s = String(str).trim().toLowerCase();
  const milOrK = s.match(/([\d.,]+)\s*(?:mil|k)\b/i);
  if (milOrK) {
    const base = parseFloat(milOrK[1].replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(base) ? Math.round(base * 1000) : 0;
  }
  const clean = s.replace(/\$\s*/g, '').replace(/\./g, '').replace(/,/g, '.');
  const m = clean.match(/\d+(?:\.\d+)?/);
  return m ? Math.round(Number(m[0])) : 0;
}

function matchInventoryItemsFromLine(descLine) {
  const cleanLine = (descLine || '')
    .replace(/\$\s*[\d.,]+(?:\s*(?:mil|k))?/gi, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mil|k)\b/gi, '')
    .replace(/\b(?:contado|cr[eé]dito|fiado|efectivo|transferencia|mp|mercado\s*pago|abono|pagado|completo|pedido|encargo|cta\s*cte|cuenta\s*corriente)\b/gi, '')
    .trim();

  if (!cleanLine) return [];

  const chunks = cleanLine.split(/\s*(?:,|\+|\sy\s)\s*/i).map(c => c.trim()).filter(Boolean);
  const foundMap = new Map();

  for (const chunk of chunks) {
    const qtyMatch = chunk.match(/^(\d+)\s*(?:x\s*)?(.+)$/i);
    const qty = qtyMatch ? Math.max(1, Number(qtyMatch[1])) : 1;
    const prodName = stripAccents((qtyMatch ? qtyMatch[2] : chunk).replace(/[-–=:|]/g, ' ').trim()).toUpperCase();

    if (prodName.length < 3) continue;
    const words = prodName.split(/\s+/).filter(w => w.length >= 3);
    if (!words.length) continue;

    const found = db.inv.find(p => {
      const invUpper = stripAccents((p.producto || '').toUpperCase());
      return invUpper.includes(prodName) || words.every(w => {
        if (invUpper.includes(w)) return true;
        if (w.endsWith('ES') && w.length > 4 && invUpper.includes(w.slice(0, -2))) return true;
        if (w.endsWith('S') && w.length > 3 && invUpper.includes(w.slice(0, -1))) return true;
        return false;
      });
    });

    if (found) {
      const prev = foundMap.get(found.codigo);
      if (prev) prev.qty += qty;
      else {
        foundMap.set(found.codigo, {
          codigo: found.codigo,
          producto: found.producto,
          qty,
          precio: Number(found.venta) || 0
        });
      }
    }
  }

  return Array.from(foundMap.values());
}

function normalizeZoneName(raw) {
  const z = stripAccents((raw || '').trim()).toUpperCase();
  if (!z) return '';
  if (z.includes('CELINA')) return 'VILLA CELINA';
  if (z.includes('LINIERS')) return 'LINIERS';
  if (z.includes('VIRREYES')) return 'VIRREYES';
  if (z.includes('FLORES') && z.includes('POMPEYA')) return 'FLORES / POMPEYA';
  if (z.includes('POMPEYA')) return 'POMPEYA';
  if (z.includes('FLORES')) return 'FLORES';
  return (raw || '').trim().toUpperCase();
}

function resolveOperationZona(op) {
  if (op && op.zona && op.zona.trim()) return normalizeZoneName(op.zona);
  const b1 = (op?.barberia || '').trim().toUpperCase();
  const b2 = (op?.barbero || '').trim().toUpperCase();
  const composite = op?.cliente || (b2 ? `${b1} | ${b2}` : b1);

  if (isAnonymousClientName(b1) || isAnonymousClientName(composite)) {
    return 'MOSTRADOR / SIN ZONA';
  }

  const matched = findClientByComposite(composite);
  if (matched) {
    if (matched.zona && matched.zona.trim()) return normalizeZoneName(matched.zona);
    if (matched.ruta && matched.ruta.trim() && matched.ruta !== 'A DEFINIR') return matched.ruta.toUpperCase();
  }
  return 'SIN ZONA';
}

function resolveClientCandidate(rawWho, explicitZone = '') {
  const cleanWho = (rawWho || '').replace(/^\d+[.)]\s*/, '').replace(/^[-•*]\s*/, '').replace(/\.{2,}|…/g, '').trim();
  if (!cleanWho || isAnonymousClientName(cleanWho)) {
    return { cliente: CONSUMIDOR_FINAL_COMPOSITE, zona: normalizeZoneName(explicitZone) };
  }

  let baseName = cleanWho;
  let zonaFmt = normalizeZoneName(explicitZone);

  const parenMatch = cleanWho.match(/^([^(]+)\(([^)]+)\)/);
  if (parenMatch) {
    baseName = parenMatch[1].trim();
    if (!zonaFmt) zonaFmt = normalizeZoneName(parenMatch[2].trim());
  }

  const normBase = stripAccents(baseName).toUpperCase();
  const normZone = stripAccents(zonaFmt).toUpperCase();

  let matched = null;
  if (baseName.includes('|')) {
    const parts = baseName.split('|');
    const b1 = (parts[0] || '').trim().toUpperCase();
    const b2 = (parts[1] || '').trim().toUpperCase();
    matched = (db.clients || []).find(c =>
      stripAccents((c.barberia || '').toUpperCase()) === stripAccents(b1) &&
      (!b2 || stripAccents((c.barbero || '').toUpperCase()) === stripAccents(b2))
    ) || null;
  }

  if (!matched) {
    const queryWithZone = zonaFmt && !normBase.includes(normZone) ? `${baseName} ${zonaFmt}` : baseName;
    const ranked = findClientSuggestions(queryWithZone, 5);
    if (ranked.length === 1 && ranked[0].score >= 220) {
      matched = ranked[0].client;
    } else if (ranked.length > 1) {
      if (normZone) {
        const zoneHit = ranked.find(r => stripAccents(r.zona || '').includes(normZone) && r.score >= 220);
        if (zoneHit) matched = zoneHit.client;
      }
      if (!matched && ranked[0].score >= 450 && ranked[0].score >= ranked[1].score + 120) {
        matched = ranked[0].client;
      } else if (!matched && ranked[0].score >= 520) {
        matched = ranked[0].client;
      }
    }
  }

  if (matched) {
    return {
      cliente: matched.barbero ? `${matched.barberia} | ${matched.barbero}` : matched.barberia,
      zona: zonaFmt || normalizeZoneName(matched.zona || '')
    };
  }

  const upperName = baseName.toUpperCase();
  if (upperName.includes('|')) {
    return { cliente: upperName, zona: zonaFmt };
  }
  if (zonaFmt) {
    return { cliente: `${zonaFmt} | ${upperName}`, zona: zonaFmt };
  }
  return { cliente: upperName, zona: '' };
}

/* ANALIZADOR LOCAL INSTANTÁNEO DE 2 MODOS (MODO RÁPIDO 1 CLIENTE vs MODO LOTE AISLADO) */
function parseKeyValueStructuredOps(rawText) {
  const src = String(rawText || '').trim();
  if (!src) return [];

  const keyPattern = /(?=(?:TIPO|CLIENTE|MONTO\s+TOTAL|MONTO|ABONO\s*\/\s*ENTREGA|ABONO|ENTREGA|FECHA|DETALLE|NOTAS?|MEDIO|ZONA|SE[ÑN]A)\s*:)/gi;
  const expanded = src
    .replace(/\r?\n/g, '\n')
    .replace(/^\s*(?:[o◦•*-]|\d+[.)])\s+(?=(?:TIPO|CLIENTE|MONTO|ABONO|ENTREGA|FECHA|DETALLE|NOTAS?|MEDIO|ZONA|SE[ÑN]A)\s*:)/gim, '')
    .replace(keyPattern, '\n');

  const lines = expanded
    .split('\n')
    .map(l => l.replace(/^\s*(?:[o◦•*-]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

  const tipoCount = lines.filter(l => /^TIPO\s*:/i.test(l)).length;
  const hasClienteAndMontoOrDetalle = lines.some(l => /^CLIENTE\s*:/i.test(l)) &&
    lines.some(l => /^(?:MONTO(?:\s+TOTAL)?|ABONO(?:\s*\/\s*ENTREGA)?|DETALLE)\s*:/i.test(l));

  if (tipoCount === 0 && !hasClienteAndMontoOrDetalle) return [];

  const groups = [];
  let cur = null;
  const pushCur = () => {
    if (cur && (cur.tipo || cur.cliente || cur.montoRaw || cur.abonoRaw || cur.detalle)) {
      groups.push(cur);
    }
    cur = null;
  };

  for (const line of lines) {
    const m = line.match(/^(TIPO|CLIENTE|MONTO\s+TOTAL|MONTO|ABONO\s*\/\s*ENTREGA|ABONO|ENTREGA|FECHA|DETALLE|NOTAS?|MEDIO|ZONA|SE[ÑN]A)\s*:\s*(.*)$/i);
    if (!m) {
      if (cur && cur.lastField === 'detalle') {
        cur.detalle = (cur.detalle + ' ' + line).trim();
      }
      continue;
    }

    const key = m[1].toUpperCase().replace(/\s+/g, ' ').trim();
    const val = (m[2] || '').trim();

    if (key === 'TIPO') {
      pushCur();
      cur = { tipo: val, cliente: '', montoRaw: '', abonoRaw: '', fechaRaw: '', detalle: '', medioRaw: '', zonaRaw: '', senaRaw: '', lastField: 'tipo' };
      continue;
    }

    if (!cur) {
      cur = { tipo: '', cliente: '', montoRaw: '', abonoRaw: '', fechaRaw: '', detalle: '', medioRaw: '', zonaRaw: '', senaRaw: '', lastField: '' };
    }

    if (key === 'CLIENTE') {
      if (cur.cliente && (cur.montoRaw || cur.detalle)) {
        pushCur();
        cur = { tipo: '', cliente: '', montoRaw: '', abonoRaw: '', fechaRaw: '', detalle: '', medioRaw: '', zonaRaw: '', senaRaw: '', lastField: '' };
      }
      cur.cliente = val;
      cur.lastField = 'cliente';
    } else if (key === 'MONTO TOTAL' || key === 'MONTO') {
      cur.montoRaw = val;
      cur.lastField = 'monto';
    } else if (key === 'ABONO / ENTREGA' || key === 'ABONO' || key === 'ENTREGA') {
      cur.abonoRaw = val;
      cur.lastField = 'abono';
    } else if (key === 'FECHA') {
      cur.fechaRaw = val;
      cur.lastField = 'fecha';
    } else if (key === 'DETALLE' || key === 'NOTA' || key === 'NOTAS') {
      cur.detalle = cur.detalle ? `${cur.detalle} · ${val}` : val;
      cur.lastField = 'detalle';
    } else if (key === 'MEDIO') {
      cur.medioRaw = val;
      cur.lastField = 'medio';
    } else if (key === 'ZONA') {
      cur.zonaRaw = val;
      cur.lastField = 'zona';
    } else if (key === 'SEÑA' || key === 'SENA') {
      cur.senaRaw = val;
      cur.lastField = 'sena';
    }
  }
  pushCur();

  return groups.map(g => {
    const rawDet = (g.detalle || '').trim();
    const normTipo = normalizeOpType(g.tipo || (/\bpedido|encargo\b/i.test(rawDet) ? 'PEDIDO' : (/\babono|pag[oó]|cobr/i.test(rawDet) ? 'ABONO / PAGO' : (/\bcontado|efectivo|transfer/i.test(rawDet) ? 'VENTA CONTADO' : 'VENTA A CREDITO'))));

    let cleanCli = (g.cliente || '').trim();
    const revMatch = cleanCli.match(/\[REVISAR\s+NOMBRE\s*:\s*([^\]]+)\]/i);
    if (revMatch) cleanCli = revMatch[1].trim();
    cleanCli = cleanCli.replace(/^\[|\]$/g, '').trim();

    let resolvedCli = CONSUMIDOR_FINAL_COMPOSITE;
    let resolvedZona = normalizeZoneName(g.zonaRaw || '');
    if (!cleanCli || /^A\s+DEFINIR$/i.test(cleanCli)) {
      resolvedCli = normTipo === 'VENTA CONTADO' ? CONSUMIDOR_FINAL_COMPOSITE : (cleanCli ? 'A DEFINIR' : '');
    } else if (!isAnonymousClientName(cleanCli)) {
      const res = resolveClientCandidate(cleanCli, resolvedZona);
      resolvedCli = res.cliente;
      resolvedZona = res.zona || resolvedZona;
    }

    const parseAmountField = (txt) => {
      const t = String(txt || '').trim();
      if (!t || /A\s+DEFINIR/i.test(t)) return 0;
      const m = t.match(/\$?\s*([\d.,]+(?:\s*(?:mil|k))?)/i);
      return m ? parseArsAmount(m[1]) : 0;
    };

    let montoVal = parseAmountField(g.montoRaw);
    const abonoFieldVal = parseAmountField(g.abonoRaw);
    const senaFieldVal = parseAmountField(g.senaRaw);
    const matchedItems = normTipo === 'ABONO / PAGO' ? [] : matchInventoryItemsFromLine(rawDet);
    if (!montoVal && matchedItems.length) {
      montoVal = matchedItems.reduce((acc, it) => acc + (it.qty * it.precio), 0);
    }

    let abonoParcial = 0;
    let sena = senaFieldVal;
    if (normTipo === 'ABONO / PAGO') {
      if (!montoVal && abonoFieldVal > 0) montoVal = abonoFieldVal;
    } else if (normTipo === 'VENTA A CREDITO') {
      abonoParcial = abonoFieldVal;
    } else if (normTipo === 'VENTA CONTADO') {
      if (abonoFieldVal > montoVal && montoVal > 0) {
        abonoParcial = abonoFieldVal - montoVal;
      } else if (abonoFieldVal > 0 && abonoFieldVal < montoVal && /\b(?:deuda\s+anterior|saldo\s+pendiente|abon[oóa]\s+deuda)\b/i.test(rawDet)) {
        abonoParcial = abonoFieldVal;
      }
    } else if (normTipo === 'PEDIDO') {
      if (!sena && abonoFieldVal > 0) sena = abonoFieldVal;
    }

    let opFecha = todayISO();
    const fRaw = (g.fechaRaw || '').trim();
    if (fRaw && !/^HOY$/i.test(fRaw)) {
      opFecha = extractDateISOFromText(fRaw) || normalizeOperationDateISO(fRaw);
    } else if (!fRaw && rawDet) {
      opFecha = extractDateISOFromText(rawDet) || todayISO();
    }

    const medioSrc = `${g.medioRaw} ${rawDet}`;
    const medio = /transfer|mp\b|mercado\s*pago|alias/i.test(medioSrc)
      ? 'TRANSFERENCIA'
      : (normTipo === 'VENTA A CREDITO' ? 'CUENTA CORRIENTE' : (normTipo === 'PEDIDO' ? 'ENCARGO' : 'EFECTIVO'));

    return {
      tipo: normTipo,
      fecha: opFecha,
      cliente: resolvedCli,
      zona: resolvedZona,
      items: matchedItems,
      resolvedItems: matchedItems,
      montoManual: montoVal,
      abonoParcial: isAnonymousClientName(resolvedCli) ? 0 : abonoParcial,
      sena,
      medio,
      notas: rawDet || getOpTypeLabel(normTipo)
    };
  });
}

function splitIntoIsolatedBlocks(rawText) {
  let normalizedText = String(rawText || '');
  if (!/\r?\n/.test(normalizedText)) {
    normalizedText = normalizedText.replace(/\s+(?=[-•*]\s+[^:]{2,55}:)/g, '\n');
  }
  const lines = normalizedText.split(/\r?\n/);
  const blocks = [];
  let inOrdersSection = false;
  let currentGroup = [];

  const hasExplicitBulletsOrColons = lines.some(l => /^[-•*]\s+/.test(l.trim()) || /^\d+[.)]\s+/.test(l.trim()));

  const flushGroup = () => {
    if (!currentGroup.length) return;
    blocks.push({ text: currentGroup.join(' | '), rawLines: [...currentGroup], inOrdersSection });
    currentGroup = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushGroup();
      continue;
    }

    const upper = trimmed.toUpperCase();
    if (upper.includes('PEDIDOS PENDIENTES') || upper.startsWith('2. PEDIDOS')) {
      flushGroup();
      inOrdersSection = true;
      continue;
    }
    if (upper.includes('VENTAS Y COBROS') || upper.startsWith('1. VENTAS')) {
      flushGroup();
      inOrdersSection = false;
      continue;
    }
    if (upper.includes('TOTALES DEL DÍA') || upper.includes('TOTALES DEL DIA') || /^TOTAL\s+(DEL\s+D[IÍ]A|COBRADO|VENDIDO)/i.test(trimmed)) {
      flushGroup();
      continue;
    }

    const isNewItemLine = /^[-•*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed) || /^[^:]{2,45}:\s*/.test(trimmed);
    if (isNewItemLine && currentGroup.length) {
      flushGroup();
    }

    currentGroup.push(trimmed);

    if (hasExplicitBulletsOrColons && (/^[-•*]/.test(trimmed) || /^\d+[.)]/.test(trimmed))) {
      flushGroup();
    }
  }
  flushGroup();

  // Si hubo bloques de 2 líneas tipo "Lucas (Liniers)" + "2 capas $10000 contado", unirlos en un único bloque de cliente
  const merged = [];
  for (let i = 0; i < blocks.length; i++) {
    const blk = blocks[i];
    const next = blocks[i + 1];
    const hasAmountOrProd = /\$\s*[\d.,]+|\b\d+\s*(?:mil|k)\b|\b(?:abono|pago|contado|cr[eé]dito|fiado|pedido)\b/i.test(blk.text);
    if (blk.rawLines.length === 1 && !hasAmountOrProd && !blk.text.includes(':') && next) {
      merged.push({
        text: `${blk.rawLines[0]}: ${next.text}`,
        rawLines: [blk.rawLines[0], ...next.rawLines],
        inOrdersSection: blk.inOrdersSection || next.inOrdersSection
      });
      i++;
    } else {
      merged.push(blk);
    }
  }

  return merged;
}

function parseSingleBlockIsolated(block) {
  const ops = [];
  const rawLine = block.text.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
  if (!rawLine) return ops;

  const detectedFecha = extractDateISOFromText(rawLine) || todayISO();
  const upper = rawLine.toUpperCase();
  const inOrdersSection = Boolean(block.inOrdersSection);

  // Detectar separador entre cliente y operación: ":", " - " o primera línea sin colon si empieza con "Nombre (Zona) ..."
  let rawWho = '';
  let rest = rawLine;

  const colonIdx = rawLine.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 64) {
    rawWho = rawLine.slice(0, colonIdx).trim();
    rest = rawLine.slice(colonIdx + 1).trim();
  } else {
    const dashMatch = rawLine.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s.|()]{2,36}?)\s+[-–]\s+(.+)$/);
    const parenFront = rawLine.match(/^([^(]{2,32}\([^)]+\))\s+(.+)$/);
    if (parenFront) {
      rawWho = parenFront[1].trim();
      rest = parenFront[2].trim();
    } else if (dashMatch && !/^\d/.test(dashMatch[1].trim())) {
      rawWho = dashMatch[1].trim();
      rest = dashMatch[2].trim();
    } else {
      // Buscar coincidencia de cliente conocido al inicio (ej: "Lucas 2 capas 10000 contado")
      const firstWord = stripAccents(rawLine.split(/\s+/)[0] || '').toUpperCase();
      const twoWords = stripAccents(rawLine.split(/\s+/).slice(0, 2).join(' ')).toUpperCase();
      const matchedCli = (db.clients || []).find(c => {
        const b1 = stripAccents((c.barberia || '').toUpperCase());
        const b2 = stripAccents((c.barbero || '').toUpperCase());
        return (twoWords.length >= 4 && (b1 === twoWords || b2 === twoWords)) ||
               (firstWord.length >= 3 && (b1 === firstWord || b2 === firstWord));
      });
      if (matchedCli) {
        const usedLen = (stripAccents(matchedCli.barbero || '').toUpperCase() === twoWords || stripAccents(matchedCli.barberia || '').toUpperCase() === twoWords)
          ? rawLine.split(/\s+/).slice(0, 2).join(' ').length
          : (rawLine.split(/\s+/)[0] || '').length;
        rawWho = rawLine.slice(0, usedLen).trim();
        rest = rawLine.slice(usedLen).trim();
      }
    }
  }

  const medio = /transfer|mp\b|mercado\s*pago|alias/i.test(rest) ? 'TRANSFERENCIA' : 'EFECTIVO';

  // Caso sin cliente identificable -> Venta de Contado Mostrador
  if (!rawWho) {
    const amountM = rest.match(/(?:=\s*)?\$\s*([\d.,]+(?:\s*(?:mil|k))?)/i) ||
                    rest.match(/\b(\d+(?:[.,]\d+)?\s*(?:mil|k))\b/i) ||
                    rest.match(/\b(\d{4,})\b(?:\s*(?:contado|efectivo|transferencia|cr[eé]dito|fiado))?$/i);
    const matchedItems = matchInventoryItemsFromLine(rest);
    let amount = amountM ? parseArsAmount(amountM[1]) : 0;
    if (!amount && matchedItems.length) {
      amount = matchedItems.reduce((acc, it) => acc + (it.qty * it.precio), 0);
    }

    if (amount > 0 || matchedItems.length > 0) {
      const isOrder = inOrdersSection || /\b(?:pedido|encargo)\b/i.test(rest);
      const isCredit = /\b(?:cr[eé]dito|fiado|debe|cta\s*cte|cuenta\s*corriente)\b/i.test(rest);
      const cleanDetail = rest
        .replace(/(?:=\s*)?\$\s*[\d.,]+(?:\s*(?:mil|k))?/gi, '')
        .replace(/\b\d+(?:[.,]\d+)?\s*(?:mil|k)\b/gi, '')
        .replace(/\b(?:contado|cr[eé]dito|fiado|efectivo|transferencia|mp|mercado\s*pago)\b/gi, '')
        .trim() || rest;

      ops.push({
        tipo: isOrder ? 'PEDIDO' : (isCredit ? 'VENTA A CREDITO' : 'VENTA CONTADO'),
        fecha: detectedFecha,
        cliente: CONSUMIDOR_FINAL_COMPOSITE,
        zona: '',
        items: matchedItems,
        resolvedItems: matchedItems,
        montoManual: amount,
        medio: isCredit ? 'CUENTA CORRIENTE' : medio,
        notas: cleanDetail
      });
    }
    return ops;
  }

  const { cliente: clienteFmt, zona: zonaFmt } = resolveClientCandidate(rawWho);
  const segments = rest.split('|').map(s => s.trim()).filter(Boolean);
  const mainDesc = segments[0] || rest;
  const paySeg = segments[1] || '';

  if (inOrdersSection || /^(?:pedido|encargo)\b/i.test(mainDesc)) {
    const totalM = rest.match(/Total(?:\s+pedido)?:\s*\$?\s*([\d.,]+(?:\s*(?:mil|k))?)/i) ||
                   rest.match(/\$\s*([\d.,]+(?:\s*(?:mil|k))?)/i) ||
                   rest.match(/\b(\d+(?:[.,]\d+)?\s*(?:mil|k)|\d{4,})\b/i);
    const senaM = rest.match(/Seña:\s*\$?\s*([\d.,]+(?:\s*(?:mil|k))?)/i);
    const cleanItemsText = mainDesc.replace(/^(?:pedido|encargo)\s*:?\s*/i, '');
    const matchedItems = matchInventoryItemsFromLine(cleanItemsText);
    let totalVal = totalM ? parseArsAmount(totalM[1]) : 0;
    if (!totalVal && matchedItems.length) {
      totalVal = matchedItems.reduce((acc, it) => acc + (it.qty * it.precio), 0);
    }
    const senaVal = senaM ? parseArsAmount(senaM[1]) : 0;

    ops.push({
      tipo: 'PEDIDO',
      fecha: detectedFecha,
      cliente: clienteFmt,
      zona: zonaFmt,
      items: matchedItems,
      resolvedItems: matchedItems,
      montoManual: totalVal,
      sena: senaVal,
      medio: 'ENCARGO',
      notas: cleanItemsText
    });
    return ops;
  }

  const abonoPlusSale = mainDesc.match(/Abono\s+(?:deuda\s*)?\(?\$\s*([\d.,]+)\)?\s*\+\s*(.+)/i);
  if (abonoPlusSale) {
    const abonoVal = parseArsAmount(abonoPlusSale[1]);
    const prodPart = abonoPlusSale[2].trim();
    const prodPriceM = prodPart.match(/\$?\s*([\d.,]+(?:\s*(?:mil|k))?)/i);
    const matchedItems = matchInventoryItemsFromLine(prodPart);
    let prodVal = prodPriceM ? parseArsAmount(prodPriceM[1]) : 0;
    if (!prodVal && matchedItems.length) prodVal = matchedItems.reduce((acc, it) => acc + (it.qty * it.precio), 0);

    if (abonoVal > 0) {
      ops.push({
        tipo: 'ABONO / PAGO',
        fecha: detectedFecha,
        cliente: clienteFmt,
        zona: zonaFmt,
        items: [],
        resolvedItems: [],
        montoManual: abonoVal,
        medio,
        notas: 'Abono deuda anterior'
      });
    }
    if (prodVal > 0 || matchedItems.length) {
      ops.push({
        tipo: 'VENTA A CREDITO',
        fecha: detectedFecha,
        cliente: clienteFmt,
        zona: zonaFmt,
        items: matchedItems,
        resolvedItems: matchedItems,
        montoManual: prodVal,
        medio: 'CUENTA CORRIENTE',
        notas: prodPart
      });
    }
    return ops;
  }

  const deudaPlusProd = mainDesc.match(/Ten[ií]a deuda de\s*\$\s*([\d.,]+)\s*\+\s*(.+)/i);
  if (deudaPlusProd) {
    const prodPart = deudaPlusProd[2].trim();
    const prodPriceM = prodPart.match(/\(\$\s*([\d.,]+)\)/);
    const matchedItems = matchInventoryItemsFromLine(prodPart);
    let prodVal = prodPriceM ? parseArsAmount(prodPriceM[1]) : 0;
    if (!prodVal && matchedItems.length) prodVal = matchedItems.reduce((acc, it) => acc + (it.qty * it.precio), 0);
    const abonoM = paySeg.match(/Abon[oó]:\s*\$\s*([\d.,]+)/i);
    const abonoVal = abonoM ? parseArsAmount(abonoM[1]) : 0;

    if (prodVal > 0 || matchedItems.length) {
      ops.push({
        tipo: 'VENTA A CREDITO',
        fecha: detectedFecha,
        cliente: clienteFmt,
        zona: zonaFmt,
        items: matchedItems,
        resolvedItems: matchedItems,
        montoManual: prodVal,
        medio: 'CUENTA CORRIENTE',
        notas: prodPart
      });
    }
    if (abonoVal > 0) {
      ops.push({
        tipo: 'ABONO / PAGO',
        fecha: detectedFecha,
        cliente: clienteFmt,
        zona: zonaFmt,
        items: [],
        resolvedItems: [],
        montoManual: abonoVal,
        medio,
        notas: 'Abono en ruta'
      });
    }
    return ops;
  }

  // Abono / Cobro / Pago puro
  if (/^(?:abono|abona|abon[oó]|cobro|cobr[eé]|pag[oó]|paga|seña|entrega)\b/i.test(mainDesc)) {
    const amountM = rest.match(/(?:Abon[oó]|Pag[oó]|Cobr[eé]):\s*\$?\s*([\d.,]+(?:\s*(?:mil|k))?)/i) ||
                    rest.match(/\$\s*([\d.,]+(?:\s*(?:mil|k))?)/i) ||
                    rest.match(/\b(\d+(?:[.,]\d+)?\s*(?:mil|k)|\d{3,})\b/i);
    const val = amountM ? parseArsAmount(amountM[1]) : 0;
    ops.push({
      tipo: 'ABONO / PAGO',
      fecha: detectedFecha,
      cliente: clienteFmt,
      zona: zonaFmt,
      items: [],
      resolvedItems: [],
      montoManual: val,
      medio,
      notas: rest
    });
    return ops;
  }

  // Venta (Contado o Crédito)
  const matchedItems = matchInventoryItemsFromLine(mainDesc);
  const priceMatch = mainDesc.match(/(?:=\s*)?\$\s*([\d.,]+(?:\s*(?:mil|k))?)/i) ||
                     mainDesc.match(/\b(\d+(?:[.,]\d+)?\s*(?:mil|k))\b/i) ||
                     mainDesc.match(/\b(\d{4,})\b/);
  let saleVal = priceMatch ? parseArsAmount(priceMatch[1]) : 0;
  if (!saleVal && matchedItems.length) {
    saleVal = matchedItems.reduce((acc, it) => acc + (it.qty * it.precio), 0);
  }

  const abonoParcialM = rest.match(/(?:entreg[oóa]|abon[oóa]|dej[oóa])\s*\$?\s*([\d.,]+(?:\s*(?:mil|k))?)/i);
  const abonoParcial = abonoParcialM ? parseArsAmount(abonoParcialM[1]) : 0;

  const isAnon = isAnonymousClientName(clienteFmt);
  const explicitCredit = /\b(?:cr[eé]dito|fiado|cta\s*cte|cuenta\s*corriente|debe|pendiente)\b/i.test(rest);
  const explicitContado = /\b(?:contado|pagado\s*completo|efectivo|transferencia|mp|mercado\s*pago)\b/i.test(rest) && !explicitCredit;
  const isContado = isAnon || explicitContado;

  const cleanNotes = mainDesc
    .replace(/(?:=\s*)?\$\s*[\d.,]+(?:\s*(?:mil|k))?/gi, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mil|k)\b/gi, '')
    .replace(/\b(?:contado|cr[eé]dito|fiado|efectivo|transferencia|mp|mercado\s*pago)\b/gi, '')
    .trim() || mainDesc;

  ops.push({
    tipo: isContado ? 'VENTA CONTADO' : 'VENTA A CREDITO',
    fecha: detectedFecha,
    cliente: clienteFmt,
    zona: zonaFmt,
    items: matchedItems,
    resolvedItems: matchedItems,
    montoManual: saleVal,
    abonoParcial: isAnon ? 0 : abonoParcial,
    medio: isContado ? medio : 'CUENTA CORRIENTE',
    notas: cleanNotes
  });

  return ops;
}

function parseStructuredSummaryLocally(rawText) {
  const kvOps = parseKeyValueStructuredOps(rawText);
  if (kvOps.length) return kvOps;

  const blocks = splitIntoIsolatedBlocks(rawText);
  if (!blocks.length) return [];
  const allOps = [];
  blocks.forEach(blk => {
    const blkOps = parseSingleBlockIsolated(blk);
    blkOps.forEach(op => allOps.push(op));
  });
  return allOps;
}

function createBatchUid() {
  return 'BOP-' + (batchUidSeq++);
}

function getQuickSingleBalanceHtml(draft) {
  if (!draft) return '';
  const normTipo = normalizeOpType(draft.tipo);
  if (normTipo === 'PEDIDO') {
    const cli = (draft.cliente || '').trim();
    if (!cli || isAnonymousClientName(cli)) return '';
    const bal = computeOpBalanceSummary({ tipo: normTipo, cliente: cli, monto: draft.montoManual, abonoParcial: 0 });
    return `<div class="quick-preview-balance">${bal.matched ? (bal.deudaPrevia > 0 ? `Deuda actual: <strong>${fmtMoney(bal.deudaPrevia)}</strong>` : '<span class="text-green">Sin deuda actual ($0)</span>') : 'Cliente sin registro previo (deuda $0)'}</div>`;
  }
  const cli = (draft.cliente || '').trim();
  const bal = computeOpBalanceSummary({
    tipo: normTipo,
    cliente: cli,
    monto: draft.montoManual,
    abonoParcial: draft.abonoParcial
  });
  if (!bal.hasClient) {
    return '<div class="quick-preview-balance">Venta rápida / Consumidor Final (no genera deuda ni crea cliente).</div>';
  }
  const parts = [`<span>Deuda actual: <strong>${fmtMoney(bal.deudaPrevia)}</strong></span>`];
  if (normTipo === 'VENTA A CREDITO') parts.push(`<span>+ Venta: <strong>${fmtMoney(bal.montoOp)}</strong></span>`);
  else if (normTipo === 'VENTA CONTADO') parts.push(`<span>Contado: <strong>${fmtMoney(bal.montoOp)}</strong></span>`);
  if (bal.abonoSolicitado > 0) parts.push(`<span>Abono aplicado: <strong class="text-green">${fmtMoney(bal.abonoAplicado)}</strong></span>`);
  if (bal.sobrante > 0) {
    parts.push(`<span class="text-green"><strong>Deuda saldada en $0</strong> · Sobrante: <strong>${fmtMoney(bal.sobrante)}</strong></span>`);
  } else {
    parts.push(`<span>Saldo restante: <strong class="${bal.saldoRestante > 0 ? 'text-amber' : 'text-green'}">${fmtMoney(bal.saldoRestante)}</strong></span>`);
  }
  if (!bal.matched) {
    parts.push('<span style="color:#93c5fd;">(Cliente nuevo si se guarda así)</span>');
  }
  return `<div class="quick-preview-balance">${parts.join(' · ')}</div>`;
}

function syncQuickPreviewDate(val) {
  const iso = normalizeOperationDateISO(val);
  const movFechaEl = document.getElementById('mov-fecha');
  if (movFechaEl) movFechaEl.value = iso;
  if (lastQuickSingleOp) lastQuickSingleOp.fecha = iso;
  if (quickSingleDraft) quickSingleDraft.fecha = iso;
  const dmyEl = document.getElementById('quick-preview-fecha-dmy');
  if (dmyEl) dmyEl.textContent = formatDateDMY(iso);
}

function showQuickSinglePreview(op) {
  const box = document.getElementById('quick-single-preview');
  if (!box) return;

  const normTipo = normalizeOpType(op.tipo);
  const resolvedItems = Array.isArray(op.resolvedItems) ? [...op.resolvedItems] : [];
  if (!resolvedItems.length && Array.isArray(op.items) && op.items.length) {
    op.items.forEach(it => {
      const prod = db.inv.find(p => p.codigo === it.codigo);
      if (prod) {
        resolvedItems.push({ codigo: prod.codigo, producto: prod.producto, qty: Number(it.qty) || 1, precio: Number(prod.venta) || 0 });
      }
    });
  }

  let monto = Number(op.montoManual ?? op.totalCalculado) || 0;
  if (!monto && resolvedItems.length) {
    monto = resolvedItems.reduce((acc, it) => acc + (it.qty * it.precio), 0);
  }
  const abonoParcial = Math.max(0, Number(op.abonoParcial) || 0);
  const rawCli = (op.cliente || '').trim();
  const cli = (!rawCli || isAnonymousClientName(rawCli)) ? CONSUMIDOR_FINAL_COMPOSITE : rawCli;
  const zona = resolveOperationZona({ ...op, cliente: cli });
  const fechaISO = normalizeOperationDateISO(op.fecha || op.fechaProgramada || document.getElementById('mov-fecha')?.value || todayISO());
  const medio = op.medio || (normTipo === 'VENTA A CREDITO' ? 'CUENTA CORRIENTE' : (normTipo === 'PEDIDO' ? 'ENCARGO' : 'EFECTIVO'));
  const detalle = (op.notas || op.detalle || (resolvedItems.length ? resolvedItems.map(i => `${i.qty}x ${i.producto}`).join(', ') : '') || '').trim();

  if (document.getElementById('mov-fecha')) document.getElementById('mov-fecha').value = fechaISO;

  quickSingleDraft = {
    ...op,
    tipo: normTipo,
    medio,
    cliente: cli,
    zona,
    fecha: fechaISO,
    montoManual: monto,
    abonoParcial,
    sena: Number(op.sena) || 0,
    notas: detalle,
    resolvedItems
  };
  lastQuickSingleOp = { ...quickSingleDraft };

  const isAnon = isAnonymousClientName(cli);
  const showAbonoRow = (normTipo === 'VENTA A CREDITO' || (normTipo === 'VENTA CONTADO' && !isAnon));
  const { matched } = isAnon ? { matched: null } : findLiveClientMatchInfo(cli);
  const deudaActual = matched ? getClientBalance(matched) : 0;
  const suggestionsHtml = renderClientSuggestionsHtml(cli, 'selectQuickPreviewClient');

  box.style.display = 'flex';
  box.innerHTML = `
    <div class="quick-preview-top">
      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <span class="kpi-badge badge-green">⚡ Modo Rápido (Edición Directa)</span>
        <span id="quick-preview-zona-badge" class="kpi-badge badge-purple" style="${zona && zona !== 'MOSTRADOR / SIN ZONA' && zona !== 'SIN ZONA' ? '' : 'display:none;'}">📍 ${escapeAttr(zona)}</span>
      </div>
      <button type="button" class="btn-icon" onclick="dismissQuickSinglePreview()" title="Cerrar vista rápida">✕</button>
    </div>

    <div id="quick-preview-alert" class="inline-alert inline-alert-error" style="display:none;"></div>

    <div class="quick-preview-grid">
      <div class="quick-preview-field">
        <label for="quick-preview-tipo">Tipo</label>
        <select id="quick-preview-tipo" onchange="updateQuickSingleField('tipo', this.value)">
          <option value="VENTA A CREDITO" ${normTipo === 'VENTA A CREDITO' ? 'selected' : ''}>📝 Venta a Crédito</option>
          <option value="VENTA CONTADO" ${normTipo === 'VENTA CONTADO' ? 'selected' : ''}>✅ Venta de Contado</option>
          <option value="ABONO / PAGO" ${normTipo === 'ABONO / PAGO' ? 'selected' : ''}>💵 Abono / Cobro</option>
          <option value="PEDIDO" ${normTipo === 'PEDIDO' ? 'selected' : ''}>📦 Pedido</option>
        </select>
      </div>

      <div class="quick-preview-field" id="quick-preview-medio-wrap" style="${normTipo === 'PEDIDO' ? 'display:none;' : ''}">
        <label for="quick-preview-medio">Medio / Condición</label>
        <select id="quick-preview-medio" onchange="updateQuickSingleField('medio', this.value)">
          <option value="EFECTIVO" ${medio === 'EFECTIVO' ? 'selected' : ''}>Efectivo</option>
          <option value="TRANSFERENCIA" ${medio === 'TRANSFERENCIA' ? 'selected' : ''}>Transferencia / MP</option>
          <option value="CUENTA CORRIENTE" ${medio === 'CUENTA CORRIENTE' ? 'selected' : ''}>Cuenta Corriente</option>
        </select>
      </div>

      <div class="quick-preview-field quick-preview-field-full">
        <label for="quick-preview-cliente">
          <span>Cliente</span>
          <button type="button" class="btn-sm btn-pay" style="padding:2px 8px; font-size:10.5px;" onclick="fillQuickPreviewConsumidorFinal()">⚡ Mostrador</button>
        </label>
        <input type="text" id="quick-preview-cliente" list="clientes-datalist" value="${escapeAttr(isAnon && normTipo === 'VENTA CONTADO' ? '' : cli)}" placeholder="Escribí nombre, barbería, apodo o elegí..." oninput="updateQuickSingleField('cliente', this.value)" onchange="updateQuickSingleField('cliente', this.value)" />
        <div id="quick-preview-client-suggestions" class="cli-suggest-list" style="${suggestionsHtml ? 'display:flex;' : 'display:none;'}">${suggestionsHtml}</div>
      </div>

      <div class="quick-preview-field">
        <label for="quick-preview-fecha">📅 Fecha</label>
        <div class="date-input-with-dmy">
          <input type="date" id="quick-preview-fecha" value="${escapeAttr(fechaISO)}" onchange="syncQuickPreviewDate(this.value)" />
          <span id="quick-preview-fecha-dmy" class="date-dmy-chip">${escapeAttr(formatDateDMY(fechaISO))}</span>
        </div>
      </div>

      <div class="quick-preview-field">
        <label for="quick-preview-monto">Total ($)</label>
        <input type="number" id="quick-preview-monto" class="quick-preview-amount-big" min="0" step="any" value="${monto}" oninput="updateQuickSingleField('montoManual', this.value)" />
      </div>

      <div class="quick-preview-field quick-preview-field-full" id="quick-preview-abono-wrap" style="${showAbonoRow ? '' : 'display:none;'}">
        <label for="quick-preview-abono">
          <span id="quick-preview-abono-label">${normTipo === 'VENTA CONTADO' ? 'Abono a deuda previa ($)' : 'Abono / Entrega simultánea ($)'}</span>
          <button type="button" id="quick-preview-fill-debt-btn" class="btn-sm btn-pay" style="padding:2px 8px; font-size:10.5px; ${deudaActual > 0 ? 'display:inline-block;' : 'display:none;'}" onclick="fillQuickPreviewPendingDebt()">⚡ Saldar (${fmtMoney(deudaActual)})</button>
        </label>
        <input type="number" id="quick-preview-abono" min="0" step="any" value="${abonoParcial || ''}" placeholder="0" oninput="updateQuickSingleField('abonoParcial', this.value)" />
      </div>

      <div class="quick-preview-field quick-preview-field-full">
        <label for="quick-preview-detalle">Detalle / Notas</label>
        <input type="text" id="quick-preview-detalle" value="${escapeAttr(detalle)}" placeholder="Productos o concepto..." oninput="updateQuickSingleField('notas', this.value)" />
      </div>
    </div>

    <div id="quick-preview-balance-wrap">${getQuickSingleBalanceHtml(quickSingleDraft)}</div>

    <div class="quick-preview-actions">
      <button type="button" id="btn-confirm-quick-preview" class="btn-primary" style="padding:9px 14px; font-size:12.5px; flex:1;" onclick="confirmQuickSinglePreview()">✅ Confirmar y Guardar</button>
      <button type="button" class="btn-ghost" style="padding:9px 12px; font-size:12px;" onclick="transferQuickSingleToForm()">📋 Pasar al form</button>
    </div>
  `;
}

function updateQuickSingleField(field, value) {
  if (!quickSingleDraft) return;
  const alertEl = document.getElementById('quick-preview-alert');
  if (alertEl) { alertEl.style.display = 'none'; alertEl.textContent = ''; }

  if (field === 'tipo') {
    quickSingleDraft.tipo = normalizeOpType(value);
  } else if (field === 'medio') {
    quickSingleDraft.medio = value;
  } else if (field === 'cliente') {
    const clean = String(value || '').trim();
    quickSingleDraft.cliente = clean || CONSUMIDOR_FINAL_COMPOSITE;
    quickSingleDraft.zona = resolveOperationZona({ cliente: quickSingleDraft.cliente });
  } else if (field === 'montoManual') {
    quickSingleDraft.montoManual = Math.max(0, Number(value) || 0);
  } else if (field === 'abonoParcial') {
    quickSingleDraft.abonoParcial = Math.max(0, Number(value) || 0);
  } else if (field === 'notas') {
    quickSingleDraft.notas = String(value || '');
  }

  lastQuickSingleOp = { ...quickSingleDraft };
  updateQuickSingleCardUI();
}

function selectQuickPreviewClient(composite) {
  if (!quickSingleDraft) return;
  quickSingleDraft.cliente = composite;
  quickSingleDraft.zona = resolveOperationZona({ cliente: composite });
  lastQuickSingleOp = { ...quickSingleDraft };
  const cliInput = document.getElementById('quick-preview-cliente');
  if (cliInput) cliInput.value = composite;
  updateQuickSingleCardUI();
}

function fillQuickPreviewConsumidorFinal() {
  if (!quickSingleDraft) return;
  quickSingleDraft.tipo = 'VENTA CONTADO';
  quickSingleDraft.cliente = CONSUMIDOR_FINAL_COMPOSITE;
  quickSingleDraft.zona = '';
  lastQuickSingleOp = { ...quickSingleDraft };
  const tipoEl = document.getElementById('quick-preview-tipo');
  if (tipoEl) tipoEl.value = 'VENTA CONTADO';
  const cliEl = document.getElementById('quick-preview-cliente');
  if (cliEl) cliEl.value = CONSUMIDOR_FINAL_COMPOSITE;
  updateQuickSingleCardUI();
}

function fillQuickPreviewPendingDebt() {
  if (!quickSingleDraft) return;
  const { matched } = findLiveClientMatchInfo(quickSingleDraft.cliente);
  if (!matched) return;
  const deuda = getClientBalance(matched);
  quickSingleDraft.abonoParcial = deuda > 0 ? deuda : 0;
  lastQuickSingleOp = { ...quickSingleDraft };
  const abonoEl = document.getElementById('quick-preview-abono');
  if (abonoEl) abonoEl.value = quickSingleDraft.abonoParcial;
  updateQuickSingleCardUI();
}

function updateQuickSingleCardUI() {
  if (!quickSingleDraft) return;
  const normTipo = normalizeOpType(quickSingleDraft.tipo);
  const cli = (quickSingleDraft.cliente || '').trim();
  const isAnon = !cli || isAnonymousClientName(cli);
  const zona = quickSingleDraft.zona || resolveOperationZona({ cliente: cli });

  const zonaBadge = document.getElementById('quick-preview-zona-badge');
  if (zonaBadge) {
    if (zona && zona !== 'MOSTRADOR / SIN ZONA' && zona !== 'SIN ZONA') {
      zonaBadge.textContent = `📍 ${zona}`;
      zonaBadge.style.display = 'inline-flex';
    } else {
      zonaBadge.style.display = 'none';
    }
  }

  const medioWrap = document.getElementById('quick-preview-medio-wrap');
  if (medioWrap) medioWrap.style.display = normTipo === 'PEDIDO' ? 'none' : 'flex';

  const abonoWrap = document.getElementById('quick-preview-abono-wrap');
  const abonoLabel = document.getElementById('quick-preview-abono-label');
  const fillDebtBtn = document.getElementById('quick-preview-fill-debt-btn');
  const showAbono = (normTipo === 'VENTA A CREDITO' || (normTipo === 'VENTA CONTADO' && !isAnon));
  if (abonoWrap) abonoWrap.style.display = showAbono ? 'flex' : 'none';
  if (abonoLabel) abonoLabel.textContent = normTipo === 'VENTA CONTADO' ? 'Abono a deuda previa ($)' : 'Abono / Entrega simultánea ($)';

  const { matched } = isAnon ? { matched: null } : findLiveClientMatchInfo(cli);
  const deudaActual = matched ? getClientBalance(matched) : 0;
  if (fillDebtBtn) {
    if (deudaActual > 0 && showAbono) {
      fillDebtBtn.textContent = `⚡ Saldar (${fmtMoney(deudaActual)})`;
      fillDebtBtn.style.display = 'inline-block';
    } else {
      fillDebtBtn.style.display = 'none';
    }
  }

  const suggestBox = document.getElementById('quick-preview-client-suggestions');
  if (suggestBox) {
    const cliEl = document.getElementById('quick-preview-cliente');
    const typedCli = cliEl ? cliEl.value : cli;
    const html = renderClientSuggestionsHtml(typedCli, 'selectQuickPreviewClient');
    suggestBox.innerHTML = html;
    suggestBox.style.display = html ? 'flex' : 'none';
  }

  const balWrap = document.getElementById('quick-preview-balance-wrap');
  if (balWrap) balWrap.innerHTML = getQuickSingleBalanceHtml(quickSingleDraft);
}

function transferQuickSingleToForm() {
  if (!quickSingleDraft) return;
  applyParsedCommandToForm(quickSingleDraft);
  dismissQuickSinglePreview();
  showToast('📋 Operación cargada en el formulario sin perder datos');
}

function dismissQuickSinglePreview() {
  lastQuickSingleOp = null;
  quickSingleDraft = null;
  const box = document.getElementById('quick-single-preview');
  if (box) box.style.display = 'none';
}

async function confirmQuickSinglePreview() {
  if (!quickSingleDraft) return;

  const quickFechaEl = document.getElementById('quick-preview-fecha');
  if (quickFechaEl && quickFechaEl.value) {
    syncQuickPreviewDate(quickFechaEl.value);
  }

  const tipo = normalizeOpType(quickSingleDraft.tipo);
  const cliInputEl = document.getElementById('quick-preview-cliente');
  const rawCli = (cliInputEl ? cliInputEl.value : quickSingleDraft.cliente || '').trim();
  const alertEl = document.getElementById('quick-preview-alert');

  if (tipo === 'VENTA A CREDITO' && (!rawCli || isAnonymousClientName(rawCli))) {
    const msg = 'Las ventas a crédito requieren seleccionar o escribir un cliente';
    if (alertEl) { alertEl.textContent = msg; alertEl.style.display = 'block'; }
    showToast(msg);
    return;
  }

  if ((tipo === 'ABONO / PAGO' || tipo === 'PEDIDO') && (!rawCli || isAnonymousClientName(rawCli))) {
    const msg = 'Seleccioná o escribí un cliente para este tipo de operación';
    if (alertEl) { alertEl.textContent = msg; alertEl.style.display = 'block'; }
    showToast(msg);
    return;
  }

  const btn = document.getElementById('btn-confirm-quick-preview');
  const origBtnText = btn ? btn.textContent : '✅ Confirmar y Guardar';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';
  }

  try {
    let barberia = rawCli, barbero = '';
    const isAnonContado = tipo === 'VENTA CONTADO' && (!rawCli || isAnonymousClientName(rawCli));

    if (isAnonContado) {
      barberia = CONSUMIDOR_FINAL_BARBERIA;
      barbero = CONSUMIDOR_FINAL_BARBERO;
    } else if (rawCli.includes('|')) {
      const parts = rawCli.split('|');
      barberia = parts[0].trim();
      barbero = parts[1].trim();
    } else {
      const liveInfo = findLiveClientMatchInfo(rawCli);
      if (liveInfo.matched && liveInfo.matchCount === 1) {
        barberia = liveInfo.matched.barberia;
        barbero = liveInfo.matched.barbero;
      }
    }

    if (!isAnonContado) {
      ensureClientExists(barberia, barbero, quickSingleDraft.zona || '');
    }

    const resolvedZona = normalizeZoneName(quickSingleDraft.zona || resolveOperationZona({ barberia, barbero, cliente: rawCli }));
    const monto = Math.max(0, Number(quickSingleDraft.montoManual) || 0);
    const abonoParcial = Math.max(0, Number(quickSingleDraft.abonoParcial) || 0);
    const fecha = normalizeOperationDateISO(quickSingleDraft.fecha || todayISO());
    const medio = quickSingleDraft.medio || 'EFECTIVO';
    const detalleInput = (quickSingleDraft.notas || '').trim();
    const resolvedItems = Array.isArray(quickSingleDraft.resolvedItems) ? quickSingleDraft.resolvedItems : [];

    if (tipo === 'PEDIDO') {
      const matched = findClientByComposite(barbero ? `${barberia} | ${barbero}` : rawCli);
      db.orders.unshift({
        id: 'ORD-' + Date.now(),
        fecha,
        cliente: barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : barberia.toUpperCase(),
        zona: resolvedZona,
        ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
        items: [...resolvedItems],
        detalleManual: resolvedItems.length ? '' : (detalleInput || 'Pedido rápido'),
        totalEstimado: monto,
        sena: Number(quickSingleDraft.sena) || 0,
        estado: 'PENDIENTE',
        stockDeducted: false,
        notas: detalleInput
      });

      dismissQuickSinglePreview();
      resetMovementForm();
      showMovLastFeedback('📦 Pedido guardado correctamente.');
      await persistData();
      showToast('📦 Pedido guardado');
      return;
    }

    const storedBarberia = isAnonContado ? CONSUMIDOR_FINAL_BARBERIA : barberia.toUpperCase();
    const storedBarbero = isAnonContado ? '' : barbero.toUpperCase();
    const matchedClient = !isAnonContado
      ? findClientByComposite(storedBarbero ? `${storedBarberia} | ${storedBarbero}` : storedBarberia)
      : null;
    const deudaPrevia = matchedClient ? getClientBalance(matchedClient) : 0;

    let feedbackMsg = '✅ Operación guardada correctamente.';
    let toastMsg = '✅ Operación guardada';

    if (tipo === 'ABONO / PAGO') {
      const appliedAbono = Math.min(monto, deudaPrevia);
      const sobrante = Math.max(0, monto - deudaPrevia);
      if (appliedAbono > 0) {
        db.movs.push({
          id: 'MOV-' + Date.now(),
          fecha,
          barberia: storedBarberia,
          barbero: storedBarbero,
          zona: resolvedZona,
          tipo: 'ABONO / PAGO',
          detalle: detalleInput || 'Abono de saldo pendiente',
          medio,
          monto: appliedAbono,
          items: [],
          obs: sobrante > 0 ? `Pago recibido: ${fmtMoney(monto)} · Sobrante: ${fmtMoney(sobrante)}` : ''
        });
      }
      if (sobrante > 0) {
        feedbackMsg = `✅ Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}.`;
        toastMsg = `Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}`;
      } else {
        const nuevoSaldo = Math.max(0, deudaPrevia - appliedAbono);
        feedbackMsg = `✅ Abono registrado (${fmtMoney(appliedAbono)}). Nuevo saldo: ${fmtMoney(nuevoSaldo)}.`;
        toastMsg = `✅ Abono guardado · Saldo: ${fmtMoney(nuevoSaldo)}`;
      }
    } else {
      if (resolvedItems.length) {
        resolvedItems.forEach(item => {
          const invItem = db.inv.find(x => x.codigo === item.codigo);
          if (invItem) invItem.stock = Number(invItem.stock) - item.qty;
        });
      }

      db.movs.push({
        id: 'MOV-' + Date.now(),
        fecha,
        barberia: storedBarberia,
        barbero: storedBarbero,
        zona: resolvedZona,
        tipo,
        detalle: detalleInput || (resolvedItems.length ? resolvedItems.map(i => `${i.qty}x ${i.producto}`).join(', ') : getOpTypeLabel(tipo)),
        medio,
        monto,
        items: [...resolvedItems],
        obs: ''
      });

      if (tipo === 'VENTA CONTADO') {
        if (abonoParcial > 0 && !isAnonContado) {
          const appliedAbono = Math.min(abonoParcial, deudaPrevia);
          const sobrante = Math.max(0, abonoParcial - deudaPrevia);
          if (appliedAbono > 0) {
            db.movs.push({
              id: 'MOV-' + (Date.now() + 1),
              fecha,
              barberia: storedBarberia,
              barbero: storedBarbero,
              zona: resolvedZona,
              tipo: 'ABONO / PAGO',
              detalle: 'Abono a deuda previa (junto con compra de contado)',
              medio: medio === 'CUENTA CORRIENTE' ? 'EFECTIVO' : medio,
              monto: appliedAbono,
              items: [],
              obs: sobrante > 0 ? `Sobrante: ${fmtMoney(sobrante)}` : ''
            });
          }
          const nuevoSaldo = Math.max(0, deudaPrevia - appliedAbono);
          if (sobrante > 0) {
            feedbackMsg = `✅ Compra de contado (${fmtMoney(monto)}) registrada. Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}.`;
            toastMsg = `Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}`;
          } else {
            feedbackMsg = `✅ Compra de contado (${fmtMoney(monto)}) + abono (${fmtMoney(appliedAbono)}) registrados. Nuevo saldo: ${fmtMoney(nuevoSaldo)}.`;
            toastMsg = `✅ Venta + abono guardados · Saldo: ${fmtMoney(nuevoSaldo)}`;
          }
        } else {
          feedbackMsg = `✅ Venta de contado (${fmtMoney(monto)}) registrada.`;
        }
      } else if (tipo === 'VENTA A CREDITO') {
        const saldoTrasVenta = deudaPrevia + monto;
        if (abonoParcial > 0) {
          const appliedAbono = Math.min(abonoParcial, saldoTrasVenta);
          const sobrante = Math.max(0, abonoParcial - saldoTrasVenta);
          if (appliedAbono > 0) {
            db.movs.push({
              id: 'MOV-' + (Date.now() + 1),
              fecha,
              barberia: storedBarberia,
              barbero: storedBarbero,
              zona: resolvedZona,
              tipo: 'ABONO / PAGO',
              detalle: 'Entrega inicial / Abono simultáneo',
              medio: medio === 'CUENTA CORRIENTE' ? 'EFECTIVO' : medio,
              monto: appliedAbono,
              items: [],
              obs: sobrante > 0 ? `Sobrante: ${fmtMoney(sobrante)}` : ''
            });
          }
          const nuevoSaldo = Math.max(0, saldoTrasVenta - appliedAbono);
          if (sobrante > 0) {
            feedbackMsg = `✅ Venta a crédito (${fmtMoney(monto)}) y abono registrados. Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}.`;
            toastMsg = `Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}`;
          } else {
            feedbackMsg = `✅ Venta a crédito (${fmtMoney(monto)}) + entrega (${fmtMoney(appliedAbono)}) registrados. Nuevo saldo: ${fmtMoney(nuevoSaldo)}.`;
            toastMsg = `✅ Venta + entrega guardados · Saldo: ${fmtMoney(nuevoSaldo)}`;
          }
        } else {
          feedbackMsg = `✅ Venta a crédito (${fmtMoney(monto)}) registrada. Nuevo saldo: ${fmtMoney(saldoTrasVenta)}.`;
        }
      }
    }

    dismissQuickSinglePreview();
    resetMovementForm();
    const dropHint = document.getElementById('drop-hint-text');
    if (dropHint) dropHint.innerHTML = '1 cliente = carga instantánea · Varios = lista editable';
    showMovLastFeedback(feedbackMsg);
    await persistData();
    showToast(toastMsg);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origBtnText;
    }
  }
}

function processWhatsAppAudioFile(file) {
  if (!config.geminiKey) {
    showToast('Configurá tu Gemini API Key en "Nube & IA" para leer audios de WhatsApp.');
    switchTab('nube');
    return;
  }

  const dropHint = document.getElementById('drop-hint-text');
  if (dropHint) dropHint.innerHTML = `⏳ Escuchando audio <strong>${escapeAttr(file.name)}</strong>...`;
  showToast('Analizando audio con Gemini...');

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const base64Data = reader.result.split(',')[1];
      const mimeType = getAudioMimeType(file);
      const prompt = buildSmartExtractionPrompt();

      const parsed = await callGeminiWithFallback([
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Data } }
      ]);

      if (parsed.transcripcion) {
        document.getElementById('voice-input').value = parsed.transcripcion;
      }

      const ops = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.operaciones) ? parsed.operaciones : [parsed]);

      if (ops.length === 1 && ops[0].tipo !== 'TAREA') {
        closeBatchReview();
        const banner = document.getElementById('detected-order-banner');
        if (banner) banner.style.display = 'none';
        showQuickSinglePreview(ops[0] || {});
      } else {
        dismissQuickSinglePreview();
        document.getElementById('detected-order-banner').style.display = 'none';
        renderBatchReview(ops);
      }

      if (dropHint) dropHint.innerHTML = `✅ Audio procesado (${ops.length} ${ops.length === 1 ? 'operación' : 'operaciones'})`;
    } catch (err) {
      console.error('Error Gemini Audio:', err);
      if (dropHint) dropHint.innerHTML = `❌ Error IA: ${escapeAttr(err.message)}`;
      showToast(`Error IA: ${err.message}`);
    }
  };
  reader.readAsDataURL(file);
}

function getBatchBalanceStripHtml(op) {
  const isTask = op.tipo === 'TAREA';
  const isOrder = op.tipo === 'PEDIDO';
  if (isTask || isOrder) return '';
  const bal = computeOpBalanceSummary({
    tipo: op.tipo,
    cliente: op.cliente,
    monto: op.totalCalculado,
    abonoParcial: op.abonoParcial
  });
  if (!bal.hasClient) return '';
  const parts = [`Deuda actual: <b>${fmtMoney(bal.deudaPrevia)}</b>`];
  if (op.tipo === 'VENTA A CREDITO') parts.push(`+ Venta: <b>${fmtMoney(bal.montoOp)}</b>`);
  else if (op.tipo === 'VENTA CONTADO') parts.push(`Contado: <b>${fmtMoney(bal.montoOp)}</b>`);
  if (bal.abonoSolicitado > 0) parts.push(`Abono: <b class="text-green">${fmtMoney(bal.abonoAplicado)}</b>`);
  if (bal.sobrante > 0) {
    parts.push(`<b class="text-green">Deuda saldada en $0 · Sobrante: ${fmtMoney(bal.sobrante)}</b>`);
  } else {
    parts.push(`Saldo restante: <b class="${bal.saldoRestante > 0 ? 'text-amber' : 'text-green'}">${fmtMoney(bal.saldoRestante)}</b>`);
  }
  return parts.join(' · ');
}

function updateBatchCardUI(uid) {
  const op = pendingBatchOps.find(x => x._uid === uid);
  if (!op) return;

  const isTask = op.tipo === 'TAREA';
  const isOrder = op.tipo === 'PEDIDO';
  const isSale = op.tipo === 'VENTA A CREDITO' || op.tipo === 'VENTA CONTADO';
  const isAnon = isAnonymousClientName(op.cliente);
  const showAbonoParcial = isSale && !isAnon;

  const zonaEl = document.getElementById(`batch-card-${uid}-zona`);
  if (zonaEl) {
    const z = op.zona && op.zona !== 'MOSTRADOR / SIN ZONA' && op.zona !== 'SIN ZONA' ? op.zona : '';
    if (z) {
      zonaEl.textContent = `📍 ${z}`;
      zonaEl.style.display = 'inline-flex';
    } else {
      zonaEl.style.display = 'none';
    }
  }

  const medioEl = document.getElementById(`batch-card-${uid}-medio`);
  if (medioEl) medioEl.style.display = (!isTask && !isOrder) ? 'inline-block' : 'none';

  const senaEl = document.getElementById(`batch-card-${uid}-sena-wrap`);
  if (senaEl) senaEl.style.display = isOrder ? 'inline-flex' : 'none';

  const montoEl = document.getElementById(`batch-card-${uid}-monto`);
  if (montoEl) montoEl.style.display = !isTask ? 'inline-block' : 'none';

  const abonoWrap = document.getElementById(`batch-card-${uid}-abono-wrap`);
  if (abonoWrap) abonoWrap.style.display = showAbonoParcial ? 'flex' : 'none';

  const fillDebtBtn = document.getElementById(`batch-card-${uid}-fill-debt`);
  if (fillDebtBtn) {
    const { matched } = isAnon ? { matched: null } : findLiveClientMatchInfo(op.cliente);
    const deuda = matched ? getClientBalance(matched) : 0;
    if (showAbonoParcial && deuda > 0) {
      fillDebtBtn.textContent = `⚡ ${fmtMoney(deuda)}`;
      fillDebtBtn.style.display = 'inline-block';
    } else {
      fillDebtBtn.style.display = 'none';
    }
  }

  const dmyEl = document.getElementById(`batch-card-${uid}-fecha-dmy`);
  if (dmyEl) dmyEl.textContent = formatDateDMY(op.fecha);

  const suggestEl = document.getElementById(`batch-card-${uid}-suggestions`);
  if (suggestEl) {
    const cliInput = document.getElementById(`batch-card-${uid}-cliente`);
    const q = cliInput ? cliInput.value : op.cliente;
    const html = renderClientSuggestionsHtml(q, 'selectBatchItemClient', uid);
    suggestEl.innerHTML = html;
    suggestEl.style.display = html ? 'flex' : 'none';
  }

  const balEl = document.getElementById(`batch-card-${uid}-balance`);
  if (balEl) {
    const html = getBatchBalanceStripHtml(op);
    balEl.innerHTML = html;
    balEl.style.display = html ? 'block' : 'none';
  }
}

function updateBatchItemField(uid, field, value) {
  const op = pendingBatchOps.find(x => x._uid === uid);
  if (!op) return;

  if (field === 'tipo') {
    op.tipo = normalizeOpType(value);
  } else if (field === 'medio') {
    op.medio = value;
  } else if (field === 'sena') {
    op.sena = Math.max(0, Number(value) || 0);
  } else if (field === 'cliente') {
    const clean = String(value || '').trim();
    op.cliente = clean || CONSUMIDOR_FINAL_COMPOSITE;
    op.zona = resolveOperationZona({ cliente: op.cliente });
  } else if (field === 'fecha') {
    op.fecha = normalizeOperationDateISO(value);
    op.fechaProgramada = op.fecha;
  } else if (field === 'totalCalculado') {
    op.totalCalculado = Math.max(0, Number(value) || 0);
  } else if (field === 'abonoParcial') {
    op.abonoParcial = Math.max(0, Number(value) || 0);
  } else if (field === 'notas') {
    op.notas = String(value || '');
    op.resolvedItems = [];
  }

  updateBatchCardUI(uid);
}

function selectBatchItemClient(uid, composite) {
  const op = pendingBatchOps.find(x => x._uid === uid);
  if (!op) return;
  op.cliente = composite;
  op.zona = resolveOperationZona({ cliente: composite });
  const cliInput = document.getElementById(`batch-card-${uid}-cliente`);
  if (cliInput) cliInput.value = composite;
  updateBatchCardUI(uid);
}

function fillBatchItemPendingDebt(uid) {
  const op = pendingBatchOps.find(x => x._uid === uid);
  if (!op) return;
  const { matched } = findLiveClientMatchInfo(op.cliente);
  if (!matched) return;
  const deuda = getClientBalance(matched);
  op.abonoParcial = deuda > 0 ? deuda : 0;
  const abonoInput = document.getElementById(`batch-card-${uid}-abono`);
  if (abonoInput) abonoInput.value = op.abonoParcial;
  updateBatchCardUI(uid);
}

function renderBatchReview(ops) {
  dismissQuickSinglePreview();
  pendingBatchOps = ops.map(op => {
    let total = Number(op.montoManual ?? op.totalCalculado) || 0;
    const resolvedItems = Array.isArray(op.resolvedItems) ? [...op.resolvedItems] : [];
    if (!resolvedItems.length && op.items && op.items.length) {
      op.items.forEach(it => {
        const prod = db.inv.find(p => p.codigo === it.codigo);
        if (prod) {
          const qty = Number(it.qty) || 1;
          const precio = Number(prod.venta) || 0;
          resolvedItems.push({ codigo: prod.codigo, producto: prod.producto, qty, precio });
        }
      });
      if (!total) {
        total = resolvedItems.reduce((acc, it) => acc + (it.qty * it.precio), 0);
      }
    }
    const normTipo = normalizeOpType(op.tipo);
    const rawCli = (op.cliente || '').trim();
    const finalCli = isAnonymousClientName(rawCli)
      ? CONSUMIDOR_FINAL_COMPOSITE
      : rawCli;
    const zona = op.zona ? normalizeZoneName(op.zona) : resolveOperationZona({ ...op, cliente: finalCli });
    const resolvedFecha = normalizeOperationDateISO(op.fecha || op.fechaProgramada || todayISO());

    return {
      ...op,
      _uid: op._uid || createBatchUid(),
      tipo: normTipo,
      cliente: finalCli,
      zona,
      sena: Number(op.sena) || 0,
      abonoParcial: Math.max(0, Number(op.abonoParcial) || 0),
      fecha: resolvedFecha,
      fechaProgramada: normalizeOperationDateISO(op.fechaProgramada || resolvedFecha),
      subtipoTarea: op.subtipoTarea || 'AVISO PAGO',
      resolvedItems,
      totalCalculado: total
    };
  });

  const box = document.getElementById('batch-review-container');
  box.style.display = 'block';
  box.innerHTML = `
    <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.45); border-radius:14px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <strong id="batch-review-title" style="color:#6ee7b7; font-size:13px;">📋 Modo Lote: ${pendingBatchOps.length} operaciones independientes</strong>
        <button type="button" class="btn-icon" onclick="closeBatchReview()" title="Cancelar lote">✕</button>
      </div>
      <div id="batch-cards-list" style="display:flex; flex-direction:column; gap:8px; max-height:460px; overflow-y:auto; padding-right:2px;">
        ${pendingBatchOps.map(op => {
          const uid = op._uid;
          const isTask = op.tipo === 'TAREA';
          const isOrder = op.tipo === 'PEDIDO';
          const isSale = op.tipo === 'VENTA A CREDITO' || op.tipo === 'VENTA CONTADO';
          const isAnon = isAnonymousClientName(op.cliente);
          const showAbonoParcial = isSale && !isAnon;
          const itemsDesc = op.resolvedItems.length
            ? op.resolvedItems.map(i => `${i.qty}x ${i.producto}`).join(', ')
            : (op.notas || 'Movimiento directo');
          const { matched } = isAnon ? { matched: null } : findLiveClientMatchInfo(op.cliente);
          const deuda = matched ? getClientBalance(matched) : 0;
          const balHtml = getBatchBalanceStripHtml(op);
          const suggestHtml = renderClientSuggestionsHtml(op.cliente, 'selectBatchItemClient', uid);

          return `
            <div class="batch-card" data-batch-uid="${uid}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
                <select onchange="updateBatchItemField('${uid}', 'tipo', this.value)" style="padding:5px 8px; font-size:11.5px; font-weight:700; width:auto;">
                  <option value="VENTA A CREDITO" ${op.tipo === 'VENTA A CREDITO' ? 'selected' : ''}>📝 VENTA A CRÉDITO</option>
                  <option value="VENTA CONTADO" ${op.tipo === 'VENTA CONTADO' ? 'selected' : ''}>✅ VENTA DE CONTADO</option>
                  <option value="ABONO / PAGO" ${op.tipo === 'ABONO / PAGO' ? 'selected' : ''}>💵 ABONO / PAGO</option>
                  <option value="PEDIDO" ${op.tipo === 'PEDIDO' ? 'selected' : ''}>📦 PEDIDO</option>
                  <option value="TAREA" ${op.tipo === 'TAREA' ? 'selected' : ''}>📌 TAREA</option>
                </select>
                <select id="batch-card-${uid}-medio" onchange="updateBatchItemField('${uid}', 'medio', this.value)" style="padding:5px 8px; font-size:11px; width:auto; ${!isTask && !isOrder ? '' : 'display:none;'}">
                  <option value="EFECTIVO" ${op.medio === 'EFECTIVO' ? 'selected' : ''}>Efectivo</option>
                  <option value="TRANSFERENCIA" ${op.medio === 'TRANSFERENCIA' ? 'selected' : ''}>Transferencia</option>
                  <option value="CUENTA CORRIENTE" ${op.medio === 'CUENTA CORRIENTE' ? 'selected' : ''}>Cta. Cte.</option>
                </select>
                <span id="batch-card-${uid}-sena-wrap" style="font-size:11px; color:#fcd34d; align-items:center; gap:4px; ${isOrder ? 'display:inline-flex;' : 'display:none;'}">Seña: $<input type="number" value="${op.sena || 0}" oninput="updateBatchItemField('${uid}', 'sena', this.value)" style="width:70px; padding:3px 6px; font-size:11px; display:inline-block;" /></span>
                <span id="batch-card-${uid}-zona" class="kpi-badge badge-purple" style="${op.zona && op.zona !== 'MOSTRADOR / SIN ZONA' && op.zona !== 'SIN ZONA' ? '' : 'display:none;'}">📍 ${escapeAttr(op.zona || '')}</span>
                <button type="button" class="btn-icon btn-icon-del" onclick="removeBatchItemByUid('${uid}')" style="font-size:14px; margin-left:auto;" title="Quitar">🗑</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                <input type="text" id="batch-card-${uid}-cliente" list="clientes-datalist" value="${escapeAttr(op.cliente)}" oninput="updateBatchItemField('${uid}', 'cliente', this.value)" onchange="updateBatchItemField('${uid}', 'cliente', this.value)" placeholder="Cliente (Mostrador / Varios)" style="padding:6px 9px; font-size:12.5px; font-weight:700; flex:1; min-width:160px;" />
                <div class="date-input-with-dmy">
                  <input type="date" value="${escapeAttr(op.fecha)}" title="Fecha de la operación" onchange="updateBatchItemField('${uid}', 'fecha', this.value)" />
                  <span id="batch-card-${uid}-fecha-dmy" class="date-dmy-chip">${escapeAttr(formatDateDMY(op.fecha))}</span>
                </div>
                <input type="number" id="batch-card-${uid}-monto" min="0" value="${op.totalCalculado}" oninput="updateBatchItemField('${uid}', 'totalCalculado', this.value)" style="width:105px; padding:6px 8px; text-align:right; font-weight:700; ${!isTask ? '' : 'display:none;'}" />
              </div>
              <div id="batch-card-${uid}-suggestions" class="cli-suggest-list" style="${suggestHtml ? 'display:flex;' : 'display:none;'}">${suggestHtml}</div>
              <div id="batch-card-${uid}-abono-wrap" style="align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; ${showAbonoParcial ? 'display:flex;' : 'display:none;'}">
                <label style="font-size:11.5px; color:#94a3b8; font-weight:600; display:flex; align-items:center; gap:6px;">
                  <span>Abono / entrega ($):</span>
                  <button type="button" id="batch-card-${uid}-fill-debt" class="btn-sm btn-pay" style="padding:2px 7px; font-size:10.5px; ${showAbonoParcial && deuda > 0 ? 'display:inline-block;' : 'display:none;'}" onclick="fillBatchItemPendingDebt('${uid}')">⚡ ${fmtMoney(deuda)}</button>
                </label>
                <input type="number" id="batch-card-${uid}-abono" min="0" value="${op.abonoParcial || 0}" oninput="updateBatchItemField('${uid}', 'abonoParcial', this.value)" style="width:120px; padding:5px 8px; text-align:right; font-size:12px;" />
              </div>
              <input type="text" value="${escapeAttr(itemsDesc)}" oninput="updateBatchItemField('${uid}', 'notas', this.value)" style="padding:5px 8px; font-size:11.5px;" />
              <div id="batch-card-${uid}-balance" class="batch-balance-strip" style="${balHtml ? 'display:block;' : 'display:none;'}">${balHtml}</div>
            </div>
          `;
        }).join('')}
      </div>
      <button type="button" id="btn-save-batch" class="btn-primary btn-full" style="margin-top:12px;" onclick="saveAllBatchOperations()">✅ Confirmar y Guardar Todas (${pendingBatchOps.length})</button>
    </div>
  `;
  showToast(`📋 Modo Lote: ${pendingBatchOps.length} operaciones listas`);
}

function removeBatchItemByUid(uid) {
  const idx = pendingBatchOps.findIndex(x => x._uid === uid);
  if (idx === -1) return;
  pendingBatchOps.splice(idx, 1);
  if (!pendingBatchOps.length) {
    closeBatchReview();
    return;
  }
  const cardEl = document.querySelector(`.batch-card[data-batch-uid="${uid}"]`);
  if (cardEl && cardEl.remove) cardEl.remove();
  const titleEl = document.getElementById('batch-review-title');
  if (titleEl) titleEl.textContent = `📋 Modo Lote: ${pendingBatchOps.length} operaciones independientes`;
  const saveBtn = document.getElementById('btn-save-batch');
  if (saveBtn) saveBtn.textContent = `✅ Confirmar y Guardar Todas (${pendingBatchOps.length})`;
}

function removeBatchItem(idx) {
  const item = pendingBatchOps[idx];
  if (item && item._uid) removeBatchItemByUid(item._uid);
}

function closeBatchReview() {
  pendingBatchOps = [];
  const box = document.getElementById('batch-review-container');
  if (box) box.style.display = 'none';
}

function ensureClientExists(barberiaStr, barberoStr, zonaStr = '') {
  const b1 = (barberiaStr || '').trim().toUpperCase();
  const b2 = (barberoStr || '').trim().toUpperCase();
  if (!b1 || isAnonymousClientName(b1) || (b2 && isAnonymousClientName(`${b1} | ${b2}`))) return;

  const exists = db.clients.some(c =>
    ((c.barberia || '').toUpperCase() === b1 && (c.barbero || '').toUpperCase() === (b2 || b1)) ||
    (!b2 && ((c.barbero || '').toUpperCase() === b1 || (c.barberia || '').toUpperCase() === b1))
  );

  if (!exists) {
    const inferredZone = normalizeZoneName(zonaStr || (b1.includes('CELINA') ? 'VILLA CELINA' : ''));
    db.clients.unshift({
      id: 'CLI-' + (Date.now() + Math.floor(Math.random() * 9999)),
      barberia: b1,
      barbero: b2 || b1,
      zona: inferredZone,
      ruta: (b1.includes('CELINA') || inferredZone.includes('CELINA')) ? 'LUNES / VIERNES' : 'A DEFINIR',
      telefono: '',
      categoria: 'PLATA',
      direccion: '',
      deudaBase: 0,
      notas: 'Creado automáticamente desde carga rápida'
    });
  }
}

async function saveAllBatchOperations() {
  if (!pendingBatchOps.length) return;

  for (let i = 0; i < pendingBatchOps.length; i++) {
    const op = pendingBatchOps[i];
    const normOpTipo = normalizeOpType(op.tipo);
    const rawCli = (op.cliente || '').trim();
    if (normOpTipo === 'VENTA A CREDITO' && (!rawCli || isAnonymousClientName(rawCli))) {
      showToast('Las ventas a crédito requieren seleccionar o crear un cliente');
      return;
    }
  }

  const btn = document.getElementById('btn-save-batch');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Guardando operaciones...';
  }

  const fallbackFecha = document.getElementById('mov-fecha').value || todayISO();
  let totalSobrante = 0;

  pendingBatchOps.forEach((op, index) => {
    const normOpTipo = normalizeOpType(op.tipo);
    const opFecha = normalizeOperationDateISO(op.fecha || op.fechaProgramada || fallbackFecha);
    const rawCli = (op.cliente || '').trim();
    let barberia = rawCli, barbero = '';

    if (isAnonymousClientName(rawCli)) {
      barberia = CONSUMIDOR_FINAL_BARBERIA;
      barbero = CONSUMIDOR_FINAL_BARBERO;
    } else if (rawCli.includes('|')) {
      const parts = rawCli.split('|');
      barberia = parts[0].trim();
      barbero = parts[1].trim();
    } else {
      const liveBatchInfo = findLiveClientMatchInfo(rawCli);
      if (liveBatchInfo.matched && liveBatchInfo.matchCount === 1) {
        barberia = liveBatchInfo.matched.barberia;
        barbero = liveBatchInfo.matched.barbero;
      }
    }

    ensureClientExists(barberia, barbero, op.zona);
    const resolvedZona = normalizeZoneName(op.zona || resolveOperationZona({ barberia, barbero, cliente: rawCli }));

    if (normOpTipo === 'TAREA') {
      db.tasks.unshift({
        id: 'TSK-' + (Date.now() + index * 10),
        fecha: normalizeOperationDateISO(op.fechaProgramada || opFecha),
        tipo: op.subtipoTarea || 'GENERAL',
        cliente: isAnonymousClientName(rawCli) ? '' : rawCli.toUpperCase(),
        titulo: op.notas || 'Tarea programada',
        desc: '',
        images: [],
        done: false
      });
    } else if (normOpTipo === 'PEDIDO') {
      const matched = findClientByComposite(barbero ? `${barberia} | ${barbero}` : rawCli);
      db.orders.unshift({
        id: 'ORD-' + (Date.now() + index * 10),
        fecha: opFecha,
        cliente: barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : (isAnonymousClientName(barberia) ? CONSUMIDOR_FINAL_BARBERIA : barberia.toUpperCase()),
        zona: resolvedZona,
        ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
        items: op.resolvedItems,
        detalleManual: op.resolvedItems.length ? '' : (op.notas || 'Pedido por lote'),
        totalEstimado: op.totalCalculado,
        sena: Number(op.sena) || 0,
        estado: 'PENDIENTE',
        stockDeducted: false,
        notas: op.notas || ''
      });
    } else {
      if (op.resolvedItems.length && normOpTipo !== 'ABONO / PAGO') {
        op.resolvedItems.forEach(item => {
          const invItem = db.inv.find(x => x.codigo === item.codigo);
          if (invItem) invItem.stock = Number(invItem.stock) - item.qty;
        });
      }

      const detalleText = op.resolvedItems.length
        ? op.resolvedItems.map(i => `${i.qty}x ${i.producto}`).join(', ')
        : (op.notas || getOpTypeLabel(normOpTipo));

      const finalBarberia = isAnonymousClientName(barberia) ? CONSUMIDOR_FINAL_BARBERIA : barberia.toUpperCase();
      const finalBarbero = isAnonymousClientName(barberia) ? '' : barbero.toUpperCase();
      const matchedBatchCli = (finalBarberia && !isAnonymousClientName(finalBarberia))
        ? findClientByComposite(finalBarbero ? `${finalBarberia} | ${finalBarbero}` : finalBarberia)
        : null;
      const prevDebt = matchedBatchCli ? getClientBalance(matchedBatchCli) : 0;

      if (normOpTipo === 'ABONO / PAGO') {
        const applied = Math.min(op.totalCalculado, prevDebt);
        const sobrante = Math.max(0, op.totalCalculado - prevDebt);
        totalSobrante += sobrante;
        if (applied > 0) {
          db.movs.push({
            id: 'MOV-' + (Date.now() + index * 10),
            fecha: opFecha,
            barberia: finalBarberia,
            barbero: finalBarbero,
            zona: resolvedZona,
            tipo: normOpTipo,
            detalle: detalleText,
            medio: op.medio || 'EFECTIVO',
            monto: applied,
            items: [],
            obs: sobrante > 0 ? `${op.notas ? op.notas + ' · ' : ''}Sobrante: ${fmtMoney(sobrante)}` : (op.notas || '')
          });
        }
      } else {
        db.movs.push({
          id: 'MOV-' + (Date.now() + index * 10),
          fecha: opFecha,
          barberia: finalBarberia,
          barbero: finalBarbero,
          zona: resolvedZona,
          tipo: normOpTipo,
          detalle: detalleText,
          medio: op.medio || 'EFECTIVO',
          monto: op.totalCalculado,
          items: op.resolvedItems,
          obs: op.notas || ''
        });

        const abonoParcialVal = Math.max(0, Number(op.abonoParcial) || 0);
        if ((normOpTipo === 'VENTA A CREDITO' || normOpTipo === 'VENTA CONTADO') && abonoParcialVal > 0 && !isAnonymousClientName(finalBarberia)) {
          const baseAvailable = normOpTipo === 'VENTA A CREDITO' ? (prevDebt + op.totalCalculado) : prevDebt;
          const appliedAbono = Math.min(abonoParcialVal, baseAvailable);
          const sobrante = Math.max(0, abonoParcialVal - baseAvailable);
          totalSobrante += sobrante;
          if (appliedAbono > 0) {
            db.movs.push({
              id: 'MOV-' + (Date.now() + index * 10 + 1),
              fecha: opFecha,
              barberia: finalBarberia,
              barbero: finalBarbero,
              zona: resolvedZona,
              tipo: 'ABONO / PAGO',
              detalle: normOpTipo === 'VENTA CONTADO' ? 'Abono a deuda previa' : 'Entrega a cuenta',
              medio: op.medio === 'CUENTA CORRIENTE' ? 'EFECTIVO' : (op.medio || 'EFECTIVO'),
              monto: appliedAbono,
              obs: sobrante > 0 ? `Sobrante: ${fmtMoney(sobrante)}` : ''
            });
          }
        }
      }
    }
  });

  const count = pendingBatchOps.length;
  closeBatchReview();
  resetMovementForm();
  if (totalSobrante > 0) {
    showMovLastFeedback(`✅ ¡${count} operaciones guardadas! Deuda(s) saldadas en $0. Sobrante total: ${fmtMoney(totalSobrante)}.`);
  } else {
    showMovLastFeedback(`✅ ¡${count} operaciones guardadas correctamente!`);
  }
  const dropHint = document.getElementById('drop-hint-text');
  if (dropHint) dropHint.innerHTML = '1 cliente = carga instantánea · Varios = lista editable';

  await persistData();
  showToast(totalSobrante > 0 ? `✅ ${count} ops · Sobrante ${fmtMoney(totalSobrante)}` : `✅ ¡${count} operaciones guardadas!`);
}

function applyParsedCommandToForm(parsed) {
  currentCart = [];
  renderCart();
  document.getElementById('mov-abono-parcial').value = '';
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-detalle').value = '';
  document.getElementById('mov-obs').value = parsed.notas || '';

  const parsedFecha = normalizeOperationDateISO(parsed.fecha || parsed.fechaProgramada || todayISO());
  if (document.getElementById('mov-fecha')) {
    document.getElementById('mov-fecha').value = parsedFecha;
  }

  const normTipo = normalizeOpType(parsed.tipo);
  if (normTipo) document.getElementById('mov-tipo').value = normTipo;
  toggleProductPicker();

  if (parsed.cliente && !isAnonymousClientName(parsed.cliente)) {
    document.getElementById('mov-cliente-search').value = parsed.cliente;
  } else if (normTipo === 'VENTA CONTADO') {
    document.getElementById('mov-cliente-search').value = '';
  }

  if (parsed.medio) document.getElementById('mov-medio').value = parsed.medio;
  if (Number(parsed.abonoParcial) > 0) {
    document.getElementById('mov-abono-parcial').value = Number(parsed.abonoParcial);
  }

  if (parsed.items && parsed.items.length) {
    parsed.items.forEach(it => {
      const prod = db.inv.find(p => p.codigo === it.codigo);
      if (prod) currentCart.push({ codigo: prod.codigo, producto: prod.producto, qty: Number(it.qty) || 1, precio: Number(prod.venta) || 0 });
    });
    renderCart();
    if (parsed.montoManual > 0) {
      document.getElementById('mov-monto').value = parsed.montoManual;
    }
  } else if (parsed.montoManual) {
    document.getElementById('mov-monto').value = parsed.montoManual;
    if (parsed.notas) document.getElementById('mov-detalle').value = parsed.notas;
  }

  updateAbonoParcialVisibility();
  updateMovClientBalanceNotice();

  const banner = document.getElementById('detected-order-banner');
  if (normTipo === 'PEDIDO') {
    lastDetectedOrder = parsed;
    const summaryItems = currentCart.length
      ? currentCart.map(i => `${i.qty}x ${i.producto}`).join(', ')
      : (parsed.notas || document.getElementById('voice-input').value);
    document.getElementById('detected-order-summary').textContent = `${parsed.cliente || 'Cliente'}: ${summaryItems}`;
    banner.style.display = 'flex';
  } else {
    lastDetectedOrder = null;
    banner.style.display = 'none';
  }
}

async function saveDetectedOrder() {
  if (!lastDetectedOrder) return;
  const rawCli = document.getElementById('mov-cliente-search').value.trim() || lastDetectedOrder.cliente || CONSUMIDOR_FINAL_COMPOSITE;
  const matched = findClientByComposite(rawCli);

  db.orders.unshift({
    id: 'ORD-' + Date.now(),
    fecha: document.getElementById('mov-fecha').value || todayISO(),
    cliente: rawCli.toUpperCase(),
    zona: normalizeZoneName(lastDetectedOrder.zona || (matched ? matched.zona : '')),
    ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
    items: [...currentCart],
    detalleManual: currentCart.length ? '' : (document.getElementById('mov-detalle').value.trim() || document.getElementById('voice-input').value.trim()),
    totalEstimado: Number(document.getElementById('mov-monto').value) || 0,
    sena: Number(lastDetectedOrder.sena) || 0,
    estado: 'PENDIENTE',
    stockDeducted: false,
    notas: document.getElementById('mov-obs').value.trim()
  });

  resetMovementForm();
  await persistData();
  showToast('📦 Pedido guardado');
}

/* --- DICTADO POR VOZ E INTERPRETACIÓN INTELIGENTE DE 2 MODOS --- */
function startDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return showToast('Tu navegador no soporta dictado; usá el micrófono del teclado o subí el audio');

  const btn = document.getElementById('btn-mic');
  const rec = new SpeechRecognition();
  rec.lang = 'es-AR';
  rec.interimResults = false;

  rec.onstart = () => { btn.classList.add('recording'); btn.textContent = '🔴 Escuchando...'; };
  rec.onend = () => { btn.classList.remove('recording'); btn.textContent = '🎙️ Dictar'; };
  rec.onresult = (e) => {
    document.getElementById('voice-input').value = e.results[0][0].transcript;
    parseSmartCommand();
  };
  rec.start();
}

async function parseSmartCommand() {
  const text = document.getElementById('voice-input').value.trim();
  if (!text) return showToast('Escribí, pegá una lista o subí un audio');

  const dropHint = document.getElementById('drop-hint-text');
  const instantLocalOps = parseStructuredSummaryLocally(text);

  // MODO RÁPIDO (1 solo cliente, 1 operación no-tarea) -> Edición directa en línea sin salto abajo
  if (instantLocalOps.length === 1 && instantLocalOps[0].tipo !== 'TAREA') {
    closeBatchReview();
    const banner = document.getElementById('detected-order-banner');
    if (banner) banner.style.display = 'none';
    showQuickSinglePreview(instantLocalOps[0]);
    if (dropHint) dropHint.innerHTML = '⚡ Modo Rápido: editá aquí mismo y confirmá';
    showToast('⚡ Modo Rápido: editá y confirmá aquí mismo');
    return;
  }

  // MODO LOTE (2+ operaciones o tareas) -> Lista editable aislada por cliente
  if (instantLocalOps.length >= 2 || (instantLocalOps.length === 1 && instantLocalOps[0].tipo === 'TAREA')) {
    document.getElementById('detected-order-banner').style.display = 'none';
    renderBatchReview(instantLocalOps);
    if (dropHint) dropHint.innerHTML = `📋 Modo Lote: ${instantLocalOps.length} acciones detectadas`;
    return;
  }

  // Respaldo con Gemini si el texto no sigue formato estructurado
  if (config.geminiKey) {
    const aiBtn = document.querySelector('button[onclick="parseSmartCommand()"]');
    const originalBtnText = aiBtn ? aiBtn.innerHTML : '✨ Interpretar';
    if (aiBtn) {
      aiBtn.disabled = true;
      aiBtn.innerHTML = '⏳ Analizando...';
    }
    if (dropHint) dropHint.innerHTML = '⏳ Interpretando con IA...';

    try {
      const prompt = buildSmartExtractionPrompt(text);
      const parsed = await callGeminiWithFallback([{ text: prompt }]);
      const ops = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.operaciones) ? parsed.operaciones : [parsed]);

      if (ops.length === 1 && ops[0].tipo !== 'TAREA') {
        closeBatchReview();
        const banner = document.getElementById('detected-order-banner');
        if (banner) banner.style.display = 'none';
        showQuickSinglePreview(ops[0] || {});
      } else if (ops.length > 0) {
        document.getElementById('detected-order-banner').style.display = 'none';
        renderBatchReview(ops);
      }
      if (dropHint) dropHint.innerHTML = `✅ ${ops.length} acciones listas`;
    } catch (err) {
      console.error('Error Gemini Texto:', err);
      if (dropHint) dropHint.innerHTML = `❌ Error IA: ${escapeAttr(err.message)}`;
      showToast(`Error IA: ${err.message}`);
    } finally {
      if (aiBtn) {
        aiBtn.disabled = false;
        aiBtn.innerHTML = originalBtnText;
      }
    }
  } else {
    showToast('Formato no reconocido. Probá: "Lucas (Liniers): 2 capas $10000 contado"');
  }
}

async function saveMovement(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const origText = submitBtn ? submitBtn.textContent : 'Guardar Operación';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Guardando...';
  }

  try {
    const tipo = normalizeOpType(document.getElementById('mov-tipo').value);
    const rawCli = document.getElementById('mov-cliente-search').value.trim();

    if (tipo === 'VENTA A CREDITO' && (!rawCli || isAnonymousClientName(rawCli))) {
      const msg = 'Las ventas a crédito requieren seleccionar o crear un cliente';
      showMovClientAlert(msg);
      showToast(msg);
      document.getElementById('mov-cliente-search').focus();
      return;
    }

    if ((tipo === 'ABONO / PAGO' || tipo === 'PEDIDO') && (!rawCli || isAnonymousClientName(rawCli))) {
      const msg = 'Seleccioná o creá un cliente para este tipo de operación';
      showMovClientAlert(msg);
      showToast(msg);
      document.getElementById('mov-cliente-search').focus();
      return;
    }

    hideMovClientAlert();

    let barberia = rawCli, barbero = '';
    const isAnonContado = tipo === 'VENTA CONTADO' && (!rawCli || isAnonymousClientName(rawCli));

    if (isAnonContado) {
      barberia = CONSUMIDOR_FINAL_BARBERIA;
      barbero = CONSUMIDOR_FINAL_BARBERO;
    } else if (rawCli.includes('|')) {
      const parts = rawCli.split('|');
      barberia = parts[0].trim();
      barbero = parts[1].trim();
    } else {
      const matchedExisting = findClientByComposite(rawCli);
      if (matchedExisting) {
        barberia = matchedExisting.barberia;
        barbero = matchedExisting.barbero;
      }
    }

    if (!isAnonContado) {
      ensureClientExists(barberia, barbero);
    }

    const resolvedZona = resolveOperationZona({ barberia, barbero, cliente: rawCli });

    const monto = Math.max(0, Number(document.getElementById('mov-monto').value) || 0);
    const abonoParcial = Math.max(0, Number(document.getElementById('mov-abono-parcial').value) || 0);
    const fecha = document.getElementById('mov-fecha').value || todayISO();
    const medio = document.getElementById('mov-medio').value;
    const detalleInput = document.getElementById('mov-detalle').value.trim();
    const obsInput = document.getElementById('mov-obs').value.trim();

    if (tipo === 'PEDIDO') {
      const matched = findClientByComposite(rawCli);
      db.orders.unshift({
        id: 'ORD-' + Date.now(),
        fecha,
        cliente: barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : barberia.toUpperCase(),
        zona: resolvedZona,
        ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
        items: [...currentCart],
        detalleManual: currentCart.length ? '' : detalleInput,
        totalEstimado: monto,
        sena: 0,
        estado: 'PENDIENTE',
        stockDeducted: false,
        notas: obsInput
      });

      resetMovementForm();
      showMovLastFeedback('📦 Pedido guardado correctamente.');
      await persistData();
      showToast('📦 Pedido guardado');
      return;
    }

    const storedBarberia = isAnonContado ? CONSUMIDOR_FINAL_BARBERIA : barberia.toUpperCase();
    const storedBarbero = isAnonContado ? '' : barbero.toUpperCase();
    const matchedClient = !isAnonContado
      ? findClientByComposite(storedBarbero ? `${storedBarberia} | ${storedBarbero}` : storedBarberia)
      : null;
    const deudaPrevia = matchedClient ? getClientBalance(matchedClient) : 0;

    let feedbackMsg = '✅ Operación guardada correctamente.';
    let toastMsg = '✅ Operación guardada';

    if (tipo === 'ABONO / PAGO') {
      const appliedAbono = Math.min(monto, deudaPrevia);
      const sobrante = Math.max(0, monto - deudaPrevia);

      if (appliedAbono > 0) {
        db.movs.push({
          id: 'MOV-' + Date.now(),
          fecha,
          barberia: storedBarberia,
          barbero: storedBarbero,
          zona: resolvedZona,
          tipo: 'ABONO / PAGO',
          detalle: detalleInput || 'Abono de saldo pendiente',
          medio,
          monto: appliedAbono,
          items: [],
          obs: sobrante > 0
            ? `${obsInput ? obsInput + ' · ' : ''}Pago recibido: ${fmtMoney(monto)} · Sobrante: ${fmtMoney(sobrante)}`
            : obsInput
        });
      }

      if (sobrante > 0) {
        feedbackMsg = `✅ Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}.`;
        toastMsg = `Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}`;
      } else {
        const nuevoSaldo = Math.max(0, deudaPrevia - appliedAbono);
        feedbackMsg = `✅ Abono registrado (${fmtMoney(appliedAbono)}). Nuevo saldo: ${fmtMoney(nuevoSaldo)}.`;
        toastMsg = `✅ Abono guardado · Saldo: ${fmtMoney(nuevoSaldo)}`;
      }
    } else {
      if (currentCart.length) {
        currentCart.forEach(item => {
          const invItem = db.inv.find(x => x.codigo === item.codigo);
          if (invItem) invItem.stock = Number(invItem.stock) - item.qty;
        });
      }

      db.movs.push({
        id: 'MOV-' + Date.now(),
        fecha,
        barberia: storedBarberia,
        barbero: storedBarbero,
        zona: resolvedZona,
        tipo,
        detalle: detalleInput || getOpTypeLabel(tipo),
        medio,
        monto,
        items: [...currentCart],
        obs: obsInput
      });

      if (tipo === 'VENTA CONTADO') {
        if (abonoParcial > 0 && !isAnonContado) {
          const appliedAbono = Math.min(abonoParcial, deudaPrevia);
          const sobrante = Math.max(0, abonoParcial - deudaPrevia);

          if (appliedAbono > 0) {
            db.movs.push({
              id: 'MOV-' + (Date.now() + 1),
              fecha,
              barberia: storedBarberia,
              barbero: storedBarbero,
              zona: resolvedZona,
              tipo: 'ABONO / PAGO',
              detalle: 'Abono a deuda previa (junto con compra de contado)',
              medio: medio === 'CUENTA CORRIENTE' ? 'EFECTIVO' : medio,
              monto: appliedAbono,
              items: [],
              obs: sobrante > 0 ? `Sobrante: ${fmtMoney(sobrante)}` : ''
            });
          }

          const nuevoSaldo = Math.max(0, deudaPrevia - appliedAbono);
          if (sobrante > 0) {
            feedbackMsg = `✅ Compra de contado (${fmtMoney(monto)}) registrada. Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}.`;
            toastMsg = `Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}`;
          } else {
            feedbackMsg = `✅ Compra de contado (${fmtMoney(monto)}) + abono (${fmtMoney(appliedAbono)}) registrados. Nuevo saldo: ${fmtMoney(nuevoSaldo)}.`;
            toastMsg = `✅ Venta + abono guardados · Saldo: ${fmtMoney(nuevoSaldo)}`;
          }
        } else {
          feedbackMsg = `✅ Venta de contado (${fmtMoney(monto)}) registrada.`;
        }
      } else if (tipo === 'VENTA A CREDITO') {
        const saldoTrasVenta = deudaPrevia + monto;
        if (abonoParcial > 0) {
          const appliedAbono = Math.min(abonoParcial, saldoTrasVenta);
          const sobrante = Math.max(0, abonoParcial - saldoTrasVenta);

          if (appliedAbono > 0) {
            db.movs.push({
              id: 'MOV-' + (Date.now() + 1),
              fecha,
              barberia: storedBarberia,
              barbero: storedBarbero,
              zona: resolvedZona,
              tipo: 'ABONO / PAGO',
              detalle: 'Entrega a cuenta',
              medio: medio === 'CUENTA CORRIENTE' ? 'EFECTIVO' : medio,
              monto: appliedAbono,
              items: [],
              obs: sobrante > 0 ? `Sobrante: ${fmtMoney(sobrante)}` : ''
            });
          }

          const nuevoSaldo = Math.max(0, saldoTrasVenta - appliedAbono);
          if (sobrante > 0) {
            feedbackMsg = `✅ Venta a crédito (${fmtMoney(monto)}) + abono registrados. Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}.`;
            toastMsg = `Deuda saldada en $0. Sobrante de ${fmtMoney(sobrante)}`;
          } else {
            feedbackMsg = `✅ Venta a crédito (${fmtMoney(monto)}) - abono (${fmtMoney(appliedAbono)}). Nuevo saldo pendiente: ${fmtMoney(nuevoSaldo)}.`;
            toastMsg = `✅ Crédito + abono guardados · Saldo: ${fmtMoney(nuevoSaldo)}`;
          }
        } else {
          feedbackMsg = `✅ Venta a crédito (${fmtMoney(monto)}) registrada. Nuevo saldo pendiente: ${fmtMoney(saldoTrasVenta)}.`;
        }
      }
    }

    resetMovementForm();
    showMovLastFeedback(feedbackMsg);
    await persistData();
    showToast(toastMsg);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
  }
}

function deleteMovement(id) {
  if (!confirm('¿Eliminar este movimiento? Se recalculará el saldo y se devolverá el stock si tenía productos.')) return;
  const mov = db.movs.find(m => m.id === id);
  if (mov && mov.items && mov.items.length && normalizeOpType(mov.tipo) !== 'ABONO / PAGO') {
    mov.items.forEach(it => {
      const invItem = db.inv.find(x => x.codigo === it.codigo);
      if (invItem) invItem.stock = Number(invItem.stock) + Number(it.qty);
    });
  }
  db.movs = db.movs.filter(m => m.id !== id);
  persistData();
  showToast('Movimiento eliminado y stock restaurado');
}

function setReportZoneFilter(zone) {
  const cleanZone = zone || 'TODAS';
  activeReportZone = (activeReportZone === cleanZone && cleanZone !== 'TODAS') ? 'TODAS' : cleanZone;
  const sel = document.getElementById('report-zone-filter');
  if (sel) sel.value = activeReportZone;
  renderMovements();
}

function toggleSearchClearBtn(inputId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById('clear-x-' + inputId);
  if (!btn) return;
  const hasVal = Boolean(inp && inp.value && inp.value.length > 0);
  btn.classList.toggle('is-visible', hasVal);
}

function clearSearchInput(inputId, renderFn) {
  const inp = document.getElementById(inputId);
  if (inp) {
    inp.value = '';
    inp.focus();
  }
  toggleSearchClearBtn(inputId);
  if (typeof renderFn === 'function') renderFn();
}

function resetMovementsFilters() {
  const searchEl = document.getElementById('movs-history-search');
  if (searchEl) searchEl.value = '';
  toggleSearchClearBtn('movs-history-search');
  const typeEl = document.getElementById('movs-type-filter');
  if (typeEl) typeEl.value = 'TODOS';
  const rangeChk = document.getElementById('filter-movs-by-range');
  if (rangeChk) rangeChk.checked = false;
  const datePicker = document.getElementById('history-date-picker');
  if (datePicker) datePicker.value = '';
  const startEl = document.getElementById('report-start-date');
  if (startEl) startEl.value = todayISO();
  const endEl = document.getElementById('report-end-date');
  if (endEl) endEl.value = todayISO();
  activeReportZone = 'TODAS';
  const zoneSel = document.getElementById('report-zone-filter');
  if (zoneSel) zoneSel.value = 'TODAS';
  renderMovements();
}

function populateReportZoneDropdown() {
  const sel = document.getElementById('report-zone-filter');
  if (!sel) return;
  const zonesSet = new Set();

  (db.clients || []).forEach(c => {
    const z = normalizeZoneName(c.zona || '');
    if (z) zonesSet.add(z);
  });
  (db.movs || []).forEach(m => {
    const z = resolveOperationZona(m);
    if (z) zonesSet.add(z);
  });
  (db.orders || []).forEach(o => {
    const z = resolveOperationZona(o);
    if (z) zonesSet.add(z);
  });

  const sortedZones = Array.from(zonesSet).sort((a, b) => a.localeCompare(b));
  if (activeReportZone !== 'TODAS' && !zonesSet.has(activeReportZone)) {
    zonesSet.add(activeReportZone);
  }

  sel.innerHTML = `<option value="TODAS">Todas las zonas</option>` +
    sortedZones.map(z => `<option value="${escapeAttr(z)}">${escapeAttr(z)}</option>`).join('');
  sel.value = activeReportZone;
}

function renderMovements() {
  const startInput = document.getElementById('report-start-date');
  const endInput = document.getElementById('report-end-date');
  let startDate = (startInput && startInput.value) ? startInput.value : todayISO();
  let endDate = (endInput && endInput.value) ? endInput.value : todayISO();

  if (startDate > endDate) {
    const tmp = startDate;
    startDate = endDate;
    endDate = tmp;
  }

  populateReportZoneDropdown();
  const selZoneEl = document.getElementById('report-zone-filter');
  activeReportZone = selZoneEl ? (selZoneEl.value || 'TODAS') : 'TODAS';

  const incContado = document.getElementById('chk-sum-contado')?.checked ?? true;
  const incCredito = document.getElementById('chk-sum-credito')?.checked ?? true;
  const incPedido = document.getElementById('chk-sum-pedido')?.checked ?? true;

  let rangeContado = 0, rangeContadoCount = 0;
  let rangeCredito = 0, rangeCreditoCount = 0;
  let rangePedido = 0, rangePedidoCount = 0;
  let rangeCobrado = 0;
  const zoneSalesMap = {};

  (db.movs || []).forEach(m => {
    if (m.fecha < startDate || m.fecha > endDate) return;
    const monto = Number(m.monto) || 0;
    const normTipo = normalizeOpType(m.tipo);
    const zona = resolveOperationZona(m);

    const includeInZoneChart = (normTipo === 'VENTA CONTADO' && incContado) || (normTipo === 'VENTA A CREDITO' && incCredito);
    if (includeInZoneChart && monto > 0) {
      if (!zoneSalesMap[zona]) zoneSalesMap[zona] = { total: 0, count: 0 };
      zoneSalesMap[zona].total += monto;
      zoneSalesMap[zona].count += 1;
    }

    if (activeReportZone !== 'TODAS' && zona !== activeReportZone) return;

    if (normTipo === 'VENTA CONTADO') { rangeContado += monto; rangeContadoCount++; }
    if (normTipo === 'VENTA A CREDITO') { rangeCredito += monto; rangeCreditoCount++; }
    if (normTipo === 'ABONO / PAGO') { rangeCobrado += monto; }
  });

  (db.orders || []).forEach(o => {
    if (o.fecha < startDate || o.fecha > endDate) return;
    const monto = Number(o.totalEstimado) || 0;
    const zona = resolveOperationZona(o);

    if (incPedido && monto > 0) {
      if (!zoneSalesMap[zona]) zoneSalesMap[zona] = { total: 0, count: 0 };
      zoneSalesMap[zona].total += monto;
      zoneSalesMap[zona].count += 1;
    }

    if (activeReportZone !== 'TODAS' && zona !== activeReportZone) return;

    rangePedido += monto;
    rangePedidoCount++;
  });

  let totalSeleccionado = 0;
  let countSeleccionado = 0;
  const activeLabels = [];

  if (incContado) {
    totalSeleccionado += rangeContado;
    countSeleccionado += rangeContadoCount;
    activeLabels.push('Contado');
  }
  if (incCredito) {
    totalSeleccionado += rangeCredito;
    countSeleccionado += rangeCreditoCount;
    activeLabels.push('Crédito');
  }
  if (incPedido) {
    totalSeleccionado += rangePedido;
    countSeleccionado += rangePedidoCount;
    activeLabels.push('Pedidos');
  }

  if (document.getElementById('report-total-seleccionado')) {
    document.getElementById('report-total-seleccionado').textContent = fmtMoney(totalSeleccionado);
    const zoneTag = activeReportZone !== 'TODAS' ? ` · ${activeReportZone}` : '';
    document.getElementById('report-selected-tags').textContent = (activeLabels.length ? activeLabels.join(' + ') : 'Ninguno') + zoneTag;
    document.getElementById('report-total-count').innerHTML = `${countSeleccionado} ops · Cobrado: <b class="text-green">${fmtMoney(rangeCobrado)}</b>`;

    document.getElementById('report-contado-monto').textContent = fmtMoney(rangeContado);
    document.getElementById('report-contado-count').textContent = `${rangeContadoCount} ${rangeContadoCount === 1 ? 'venta' : 'ventas'}`;

    document.getElementById('report-credito-monto').textContent = fmtMoney(rangeCredito);
    document.getElementById('report-credito-count').textContent = `${rangeCreditoCount} ${rangeCreditoCount === 1 ? 'venta' : 'ventas'}`;

    document.getElementById('report-pedido-monto').textContent = fmtMoney(rangePedido);
    document.getElementById('report-pedido-count').textContent = `${rangePedidoCount} ${rangePedidoCount === 1 ? 'pedido' : 'pedidos'}`;

    document.getElementById('report-range-label').textContent = startDate === endDate ? formatDateDMY(startDate) : `${formatDateDMY(startDate)} → ${formatDateDMY(endDate)}`;

    document.getElementById('card-chk-contado')?.classList.toggle('report-card-off', !incContado);
    document.getElementById('card-chk-credito')?.classList.toggle('report-card-off', !incCredito);
    document.getElementById('card-chk-pedido')?.classList.toggle('report-card-off', !incPedido);
  }

  const zoneListEl = document.getElementById('sales-by-zone-list');
  if (zoneListEl) {
    const zoneEntries = Object.entries(zoneSalesMap).sort((a, b) => b[1].total - a[1].total);
    const maxZone = Math.max(...zoneEntries.map(([, v]) => v.total), 1);
    zoneListEl.innerHTML = zoneEntries.length ? zoneEntries.map(([zona, stat]) => {
      const isActive = activeReportZone === zona;
      const pct = Math.max(4, Math.round((stat.total / maxZone) * 100));
      return `
        <div class="bar-row zone-bar-row ${isActive ? 'is-active' : ''}" onclick="setReportZoneFilter('${zona.replace(/'/g, "\\'")}')">
          <div class="bar-labels">
            <span><strong>${escapeAttr(zona)}</strong> <span class="muted">(${stat.count})</span></span>
            <span class="font-bold">${fmtMoney(stat.total)}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join('') : '<p class="muted" style="font-size:12px;">Sin ventas registradas en este período.</p>';
  }

  const tbody = document.getElementById('all-movs-body');
  if (!tbody) return;

  const q = (document.getElementById('movs-history-search')?.value || '').toLowerCase();
  toggleSearchClearBtn('movs-history-search');
  const typeFilter = document.getElementById('movs-type-filter')?.value || 'TODOS';
  const onlySelectedRange = document.getElementById('filter-movs-by-range')?.checked || false;

  const todayStr = todayISO();
  let activeHistoryPreset = 'ALL';
  if (onlySelectedRange) {
    if (startDate === todayStr && endDate === todayStr) activeHistoryPreset = 'TODAY';
    else if (startDate === getPresetStartDateISO('WEEK') && endDate === todayStr) activeHistoryPreset = 'WEEK';
    else if (startDate === getPresetStartDateISO('30D') && endDate === todayStr) activeHistoryPreset = '30D';
    else activeHistoryPreset = 'CUSTOM';
  }

  document.querySelectorAll('#history-date-presets .chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset?.preset === activeHistoryPreset);
  });

  const historyDatePicker = document.getElementById('history-date-picker');
  if (historyDatePicker) {
    historyDatePicker.value = (onlySelectedRange && startDate === endDate) ? startDate : '';
  }

  const unifiedList = getUnifiedOperationsList().filter(item => {
    const itemFecha = item.fecha || '';
    if (onlySelectedRange && (!itemFecha || itemFecha < startDate || itemFecha > endDate)) return false;
    if (activeReportZone !== 'TODAS' && item.zona !== activeReportZone) return false;

    const normTipo = normalizeOpType(item.tipo);
    if (typeFilter === 'VENTAS' && normTipo !== 'VENTA A CREDITO' && normTipo !== 'VENTA CONTADO') return false;
    if (typeFilter === 'VENTA CONTADO' && normTipo !== 'VENTA CONTADO') return false;
    if (typeFilter === 'VENTA A CREDITO' && normTipo !== 'VENTA A CREDITO') return false;
    if (typeFilter === 'PEDIDO' && !item.isOrder) return false;
    if (typeFilter === 'ABONO / PAGO' && normTipo !== 'ABONO / PAGO') return false;

    if (q) {
      const hay = `${item.barberia} ${item.barbero} ${item.zona || ''} ${item.detalle} ${getOpTypeLabel(item.tipo)} ${itemFecha} ${formatDateDMY(itemFecha)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const historyCountEl = document.getElementById('movs-history-count');
  if (historyCountEl) {
    const opsCountLabel = `${unifiedList.length} ${unifiedList.length === 1 ? 'operación' : 'operaciones'}`;
    let rangeTag = '';
    if (onlySelectedRange) {
      if (activeHistoryPreset === 'TODAY') rangeTag = `Hoy (${formatDateDMY(startDate)})`;
      else if (activeHistoryPreset === 'WEEK') rangeTag = 'Últimos 7 días';
      else if (activeHistoryPreset === '30D') rangeTag = 'Últimos 30 días';
      else if (startDate === endDate) rangeTag = formatDateDMY(startDate);
      else rangeTag = `${formatDateDMY(startDate)} → ${formatDateDMY(endDate)}`;
    }
    historyCountEl.textContent = rangeTag ? `${opsCountLabel} · ${rangeTag}` : opsCountLabel;
  }

  tbody.innerHTML = unifiedList.length ? unifiedList.map(m => {
    const normTipo = normalizeOpType(m.tipo);
    let badgeClass = 'badge-blue';
    if (normTipo === 'ABONO / PAGO') badgeClass = 'badge-green';
    else if (normTipo === 'VENTA A CREDITO') badgeClass = 'badge-amber';
    else if (m.isOrder) badgeClass = m.orderEstado === 'ENTREGADO' ? 'badge-green' : 'badge-purple';

    const delAction = m.isOrder ? `deleteOrder('${m.id}')` : `deleteMovement('${m.id}')`;
    const badgeText = m.isOrder ? '📦 ' + m.tipo : getOpTypeLabel(m.tipo);

    return `
      <tr>
        <td>${escapeAttr(formatDateDMY(m.fecha))}</td>
        <td>
          <div class="font-bold">${escapeAttr(m.barberia)}${m.barbero ? ' · ' + escapeAttr(m.barbero) : ''}</div>
          <div class="muted" style="font-size:11.5px;">${m.zona && m.zona !== 'MOSTRADOR / SIN ZONA' && m.zona !== 'SIN ZONA' ? escapeAttr(m.zona) + ' · ' : ''}${escapeAttr(m.detalle || '')}</div>
        </td>
        <td><span class="kpi-badge ${badgeClass}">${badgeText}</span></td>
        <td class="text-right font-bold">${fmtMoney(m.monto)}</td>
        <td class="text-right" style="white-space:nowrap;">
          <div class="action-icon-group">
            <button class="btn-icon" onclick="openEditOperationModal('${m.id}', ${m.isOrder})" title="Editar">✏️</button>
            <button class="btn-icon btn-icon-del" onclick="${delAction}" title="Eliminar">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="5" class="text-center muted" style="padding:24px;">No hay operaciones registradas con este filtro.</td></tr>`;
}

/* --- BANDEJA DE PEDIDOS SIMPLIFICADOS (PENDIENTE -> PREPARADO -> ENTREGADO) --- */
function resolveOrderMetadata(o) {
  const rawCli = (o?.cliente || '').trim();
  const matched = findClientByComposite(rawCli);

  let zona = resolveOperationZona(o);
  if ((!zona || zona === 'SIN ZONA' || zona === 'MOSTRADOR / SIN ZONA') && matched && matched.zona && matched.zona.trim()) {
    zona = normalizeZoneName(matched.zona);
  }
  if (!zona || zona === 'MOSTRADOR / SIN ZONA') {
    zona = 'SIN ZONA';
  }

  let barberia = '';
  let barbero = '';
  if (rawCli.includes('|')) {
    const parts = rawCli.split('|');
    barberia = (parts[0] || '').trim().toUpperCase();
    barbero = parts.slice(1).join('|').trim().toUpperCase();
  } else if (rawCli && !isAnonymousClientName(rawCli)) {
    if (matched) {
      barberia = (matched.barberia || '').trim().toUpperCase() || rawCli.toUpperCase();
      barbero = (matched.barbero || '').trim().toUpperCase();
    } else {
      barberia = rawCli.toUpperCase();
    }
  }

  if (!barberia && matched && matched.barberia) {
    barberia = matched.barberia.trim().toUpperCase();
  }
  if (!barbero && matched && matched.barbero) {
    barbero = matched.barbero.trim().toUpperCase();
  }

  return {
    zona: zona || 'SIN ZONA',
    barberia: barberia || 'SIN BARBERÍA',
    barbero: barbero || 'SIN BARBERO',
    matched
  };
}

function sortOrderTaxonomyValues(valuesSet, fallbackLast) {
  return Array.from(valuesSet).sort((a, b) => {
    if (a === fallbackLast && b !== fallbackLast) return 1;
    if (b === fallbackLast && a !== fallbackLast) return -1;
    return a.localeCompare(b);
  });
}

function populateOrderFilterSelects() {
  const zonaSel = document.getElementById('order-filter-zona');
  const barberiaSel = document.getElementById('order-filter-barberia');
  const barberoSel = document.getElementById('order-filter-barbero');
  if (!zonaSel || !barberiaSel || !barberoSel) return;

  const prevZona = zonaSel.value || 'TODAS';
  const prevBarberia = barberiaSel.value || 'TODAS';
  const prevBarbero = barberoSel.value || 'TODOS';

  const zonesSet = new Set();
  const barberiasSet = new Set();
  const barberosSet = new Set();

  (db.clients || []).forEach(c => {
    const z = normalizeZoneName(c.zona || '');
    if (z) zonesSet.add(z);
    const b1 = (c.barberia || '').trim().toUpperCase();
    if (b1) barberiasSet.add(b1);
    const b2 = (c.barbero || '').trim().toUpperCase();
    if (b2) barberosSet.add(b2);
  });

  (db.orders || []).forEach(o => {
    const meta = resolveOrderMetadata(o);
    if (meta.zona) zonesSet.add(meta.zona);
    if (meta.barberia) barberiasSet.add(meta.barberia);
    if (meta.barbero) barberosSet.add(meta.barbero);
  });

  const sortedZones = sortOrderTaxonomyValues(zonesSet, 'SIN ZONA');
  const sortedBarberias = sortOrderTaxonomyValues(barberiasSet, 'SIN BARBERÍA');
  const sortedBarberos = sortOrderTaxonomyValues(barberosSet, 'SIN BARBERO');

  zonaSel.innerHTML = `<option value="TODAS">Zona: Todas</option>` +
    sortedZones.map(z => `<option value="${escapeAttr(z)}">${escapeAttr(z)}</option>`).join('');

  barberiaSel.innerHTML = `<option value="TODAS">Barbería: Todas</option>` +
    sortedBarberias.map(b => `<option value="${escapeAttr(b)}">${escapeAttr(b)}</option>`).join('');

  barberoSel.innerHTML = `<option value="TODOS">Barbero: Todos</option>` +
    sortedBarberos.map(b => `<option value="${escapeAttr(b)}">${escapeAttr(b)}</option>`).join('');

  zonaSel.value = Array.from(zonaSel.options).some(opt => opt.value === prevZona) ? prevZona : 'TODAS';
  barberiaSel.value = Array.from(barberiaSel.options).some(opt => opt.value === prevBarberia) ? prevBarberia : 'TODAS';
  barberoSel.value = Array.from(barberoSel.options).some(opt => opt.value === prevBarbero) ? prevBarbero : 'TODOS';
}

function setOrderFilter(status, btn) {
  activeOrderFilter = status;
  document.querySelectorAll('#order-status-filters .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderOrders();
}

function setOrderViewMode(mode, btn) {
  activeOrderViewMode = mode === 'GROUPED' ? 'GROUPED' : 'TABLE';
  document.querySelectorAll('#order-view-mode-filters .chip').forEach(c => {
    const isMatch = c.dataset?.view === activeOrderViewMode || (c.getAttribute('onclick') || '').includes(`'${activeOrderViewMode}'`);
    c.classList.toggle('active', Boolean(btn ? c === btn : isMatch));
  });
  renderOrders();
}

function setOrderGroupBy(groupBy) {
  const valid = ['ZONA', 'BARBERIA', 'BARBERO'].includes(groupBy) ? groupBy : 'ZONA';
  activeOrderGroupBy = valid;
  if (activeOrderViewMode !== 'GROUPED') {
    setOrderViewMode('GROUPED');
    return;
  }
  renderOrders();
}

function toggleOrderGroupCollapse(storageKey, isOpen) {
  if (isOpen) collapsedOrderGroups.delete(storageKey);
  else collapsedOrderGroups.add(storageKey);
}

function resetOrderFilters() {
  const searchEl = document.getElementById('order-search');
  if (searchEl) searchEl.value = '';
  if (document.getElementById('order-filter-zona')) document.getElementById('order-filter-zona').value = 'TODAS';
  if (document.getElementById('order-filter-barberia')) document.getElementById('order-filter-barberia').value = 'TODAS';
  if (document.getElementById('order-filter-barbero')) document.getElementById('order-filter-barbero').value = 'TODOS';

  activeOrderFilter = 'TODOS';
  const chips = document.querySelectorAll('#order-status-filters .chip');
  chips.forEach(c => {
    const isAll = (c.getAttribute('onclick') || '').includes("'TODOS'");
    c.classList.toggle('active', isAll);
  });
  renderOrders();
}

function getOrderStatusBadgeHtml(est) {
  if (est === 'PREPARADO') return '<span class="kpi-badge badge-purple">📦 Comprado / Preparado</span>';
  if (est === 'ENTREGADO') return '<span class="kpi-badge badge-green">✓ Entregado</span>';
  return '<span class="kpi-badge badge-amber">⏳ Pendiente</span>';
}

function getOrderActionButtonsHtml(o) {
  const est = o.estado || 'PENDIENTE';
  let actionBtns = '';
  if (est === 'PENDIENTE') {
    actionBtns = `
      <button class="btn-sm btn-prep" onclick="setOrderStatus('${o.id}', 'PREPARADO')" title="Marcar Comprado / Preparado">✓ Preparado</button>
      <button class="btn-sm btn-deliver" onclick="setOrderStatus('${o.id}', 'ENTREGADO')" title="Marcar Entregado y descontar stock">🚚 Entregar</button>
    `;
  } else if (est === 'PREPARADO') {
    actionBtns = `
      <button class="btn-sm btn-deliver" onclick="setOrderStatus('${o.id}', 'ENTREGADO')" title="Marcar Entregado y descontar stock">🚚 Entregar</button>
    `;
  }
  return `
    <div class="action-icon-group">
      ${actionBtns}
      <button class="btn-icon" onclick="openEditOperationModal('${o.id}', true)" title="Editar pedido">✏️</button>
      <button class="btn-icon btn-icon-del" onclick="deleteOrder('${o.id}')" title="Eliminar">🗑</button>
    </div>
  `;
}

function renderOrders() {
  populateOrderFilterSelects();

  const q = (document.getElementById('order-search')?.value || '').trim().toLowerCase();
  toggleSearchClearBtn('order-search');
  const zonaFilter = document.getElementById('order-filter-zona')?.value || 'TODAS';
  const barberiaFilter = document.getElementById('order-filter-barberia')?.value || 'TODAS';
  const barberoFilter = document.getElementById('order-filter-barbero')?.value || 'TODOS';

  const enrichedOrders = (db.orders || []).map(o => {
    const meta = resolveOrderMetadata(o);
    return { order: o, meta };
  });

  const filtered = enrichedOrders.filter(({ order: o, meta }) => {
    const est = o.estado || 'PENDIENTE';
    if (activeOrderFilter !== 'TODOS' && est !== activeOrderFilter) return false;
    if (zonaFilter !== 'TODAS' && meta.zona !== zonaFilter) return false;
    if (barberiaFilter !== 'TODAS' && meta.barberia !== barberiaFilter) return false;
    if (barberoFilter !== 'TODOS' && meta.barbero !== barberoFilter) return false;

    if (q) {
      const itemsStr = (o.items || []).map(i => i.producto).join(' ').toLowerCase();
      const hay = `${o.cliente || ''} ${meta.zona} ${meta.barberia} ${meta.barbero} ${o.ruta || ''} ${o.fecha || ''} ${formatDateDMY(o.fecha || '')} ${itemsStr} ${o.detalleManual || ''} ${o.notas || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  let countTotal = 0;
  let countPendientes = 0;
  let countPreparados = 0;
  let countEntregados = 0;
  let totalMontoEstimado = 0;

  filtered.forEach(({ order: o }) => {
    const est = o.estado || 'PENDIENTE';
    countTotal++;
    if (est === 'PENDIENTE') countPendientes++;
    else if (est === 'PREPARADO') countPreparados++;
    else if (est === 'ENTREGADO') countEntregados++;
    totalMontoEstimado += Number(o.totalEstimado) || 0;
  });

  const metricTotalEl = document.getElementById('order-metric-total');
  const metricPendEl = document.getElementById('order-metric-pendientes');
  const metricPrepEl = document.getElementById('order-metric-preparados');
  const metricDelivEl = document.getElementById('order-metric-entregados');
  if (metricTotalEl) metricTotalEl.textContent = String(countTotal);
  if (metricPendEl) metricPendEl.textContent = `${countPendientes} ${countPendientes === 1 ? 'pendiente' : 'pendientes'}`;
  if (metricPrepEl) metricPrepEl.textContent = String(countPreparados);
  if (metricDelivEl) metricDelivEl.textContent = String(countEntregados);

  const summaryEl = document.getElementById('orders-filter-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <span>Mostrando <strong>${filtered.length}</strong> de <strong>${(db.orders || []).length}</strong> pedidos</span>
      <span>Monto estimado: <strong class="text-amber">${fmtMoney(totalMontoEstimado)}</strong></span>
    `;
  }

  const groupWrapEl = document.getElementById('order-group-by-wrap');
  const groupSelectEl = document.getElementById('order-group-by');
  if (groupSelectEl) groupSelectEl.value = activeOrderGroupBy;
  if (groupWrapEl) groupWrapEl.style.display = activeOrderViewMode === 'GROUPED' ? 'inline-flex' : 'none';

  const tableWrap = document.getElementById('orders-table-wrap');
  const groupedContainer = document.getElementById('orders-grouped-container');
  const tbody = document.getElementById('orders-body');

  if (tableWrap) tableWrap.style.display = activeOrderViewMode === 'TABLE' ? 'block' : 'none';
  if (groupedContainer) groupedContainer.style.display = activeOrderViewMode === 'GROUPED' ? 'flex' : 'none';

  if (tbody) {
    tbody.innerHTML = filtered.length ? filtered.map(({ order: o, meta }) => {
      const desc = (o.items && o.items.length)
        ? o.items.map(i => `${i.qty}x ${i.producto}`).join(', ')
        : (o.detalleManual || o.notas || 'Pedido sin detalle');
      const est = o.estado || 'PENDIENTE';
      const total = Number(o.totalEstimado) || 0;
      const sena = Number(o.sena) || 0;
      const zonaTag = `<span class="order-zone-tag ${meta.zona === 'SIN ZONA' ? 'is-empty' : ''}">${meta.zona === 'SIN ZONA' ? 'Sin zona' : '📍 ' + escapeAttr(meta.zona)}</span>`;
      const senaStr = sena > 0 ? `<div class="muted" style="font-size:11px;">Seña: ${fmtMoney(sena)} · Resta: ${fmtMoney(Math.max(0, total - sena))}</div>` : '';

      return `
        <tr>
          <td><div class="font-bold">${escapeAttr(formatDateDMY(o.fecha))}</div><div class="muted" style="font-size:11px;">${escapeAttr(o.ruta || 'A DEFINIR')}</div></td>
          <td>${zonaTag}</td>
          <td>
            <div class="font-bold">${escapeAttr(meta.barberia)}</div>
            <div class="muted" style="font-size:11.5px;">✂️ ${escapeAttr(meta.barbero)}</div>
            ${o.notas ? `<div class="muted" style="font-size:11px;">${escapeAttr(o.notas)}</div>` : ''}
          </td>
          <td><div>${escapeAttr(desc)}</div></td>
          <td class="text-right">
            <div class="font-bold">${fmtMoney(total)}</div>
            ${senaStr}
          </td>
          <td>${getOrderStatusBadgeHtml(est)}</td>
          <td class="text-right" style="white-space:nowrap;">${getOrderActionButtonsHtml(o)}</td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="7" class="text-center muted" style="padding:24px;">No hay pedidos con los filtros seleccionados.</td></tr>`;
  }

  if (groupedContainer) {
    if (!filtered.length) {
      groupedContainer.innerHTML = `<div class="muted text-center" style="padding:24px;">No hay pedidos con los filtros seleccionados.</div>`;
    } else {
      const groupsMap = new Map();
      const groupField = activeOrderGroupBy === 'BARBERIA' ? 'barberia' : (activeOrderGroupBy === 'BARBERO' ? 'barbero' : 'zona');
      const groupIcon = activeOrderGroupBy === 'BARBERIA' ? '💈' : (activeOrderGroupBy === 'BARBERO' ? '✂️' : '📍');
      const fallbackLast = activeOrderGroupBy === 'BARBERIA' ? 'SIN BARBERÍA' : (activeOrderGroupBy === 'BARBERO' ? 'SIN BARBERO' : 'SIN ZONA');

      filtered.forEach(entry => {
        const key = entry.meta[groupField] || fallbackLast;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, { key, entries: [], total: 0, pendientes: 0, preparados: 0, entregados: 0, monto: 0 });
        }
        const g = groupsMap.get(key);
        g.entries.push(entry);
        g.total++;
        const est = entry.order.estado || 'PENDIENTE';
        if (est === 'PENDIENTE') g.pendientes++;
        else if (est === 'PREPARADO') g.preparados++;
        else if (est === 'ENTREGADO') g.entregados++;
        g.monto += Number(entry.order.totalEstimado) || 0;
      });

      const sortedKeys = sortOrderTaxonomyValues(new Set(groupsMap.keys()), fallbackLast);
      groupedContainer.innerHTML = sortedKeys.map(key => {
        const g = groupsMap.get(key);
        const storageKey = `${activeOrderGroupBy}:${key}`;
        const isOpenAttr = collapsedOrderGroups.has(storageKey) ? '' : ' open';
        const safeStorageKey = storageKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        const itemsHtml = g.entries.map(({ order: o, meta }) => {
          const desc = (o.items && o.items.length)
            ? o.items.map(i => `${i.qty}x ${i.producto}`).join(', ')
            : (o.detalleManual || o.notas || 'Pedido sin detalle');
          const est = o.estado || 'PENDIENTE';
          const total = Number(o.totalEstimado) || 0;
          const sena = Number(o.sena) || 0;
          const senaStr = sena > 0 ? `<span class="muted" style="font-size:11px;">(Seña: ${fmtMoney(sena)} · Resta: ${fmtMoney(Math.max(0, total - sena))})</span>` : '';

          return `
            <div class="order-group-item">
              <div class="order-group-item-main">
                <div class="order-group-item-top">
                  <strong>${escapeAttr(meta.barberia)}</strong>
                  <span class="muted">· ✂️ ${escapeAttr(meta.barbero)}</span>
                  <span class="order-zone-tag ${meta.zona === 'SIN ZONA' ? 'is-empty' : ''}">${meta.zona === 'SIN ZONA' ? 'Sin zona' : '📍 ' + escapeAttr(meta.zona)}</span>
                  ${getOrderStatusBadgeHtml(est)}
                </div>
                <div style="font-size:13px;">${escapeAttr(desc)}</div>
                <div class="muted" style="font-size:11.5px;">
                  ${escapeAttr(formatDateDMY(o.fecha))} · ${escapeAttr(o.ruta || 'A DEFINIR')}${o.notas ? ' · Nota: ' + escapeAttr(o.notas) : ''}
                </div>
              </div>
              <div class="order-group-item-right">
                <div class="text-right">
                  <div class="font-bold">${fmtMoney(total)}</div>
                  ${senaStr}
                </div>
                ${getOrderActionButtonsHtml(o)}
              </div>
            </div>
          `;
        }).join('');

        return `
          <details class="order-group-card"${isOpenAttr} ontoggle="toggleOrderGroupCollapse('${safeStorageKey}', this.open)">
            <summary class="order-group-summary">
              <div class="order-group-title-wrap">
                <span class="order-group-chevron">▶</span>
                <span>${groupIcon} ${escapeAttr(key)}</span>
              </div>
              <div class="order-group-badges">
                <span class="order-group-stat">Pedidos: <strong>${g.total}</strong>${g.pendientes ? ` (${g.pendientes} pend.)` : ''}</span>
                <span class="order-group-stat stat-prep">Comprados: <strong>${g.preparados}</strong></span>
                <span class="order-group-stat stat-deliv">Entregados: <strong>${g.entregados}</strong></span>
                <span class="order-group-stat stat-amount">${fmtMoney(g.monto)}</span>
              </div>
            </summary>
            <div class="order-group-items">
              ${itemsHtml}
            </div>
          </details>
        `;
      }).join('');
    }
  }
}

function resetQuickOrderForm() {
  const form = document.getElementById('quick-order-form');
  if (form) form.reset();
  if (document.getElementById('quick-order-cli')) document.getElementById('quick-order-cli').value = '';
  if (document.getElementById('quick-order-detail')) document.getElementById('quick-order-detail').value = '';
  if (document.getElementById('quick-order-total')) document.getElementById('quick-order-total').value = 0;
  if (document.getElementById('quick-order-nota')) document.getElementById('quick-order-nota').value = '';
}

async function saveQuickOrder(e) {
  e.preventDefault();
  const rawCli = document.getElementById('quick-order-cli').value.trim();
  const detail = document.getElementById('quick-order-detail').value.trim();
  const total = Math.max(0, Number(document.getElementById('quick-order-total').value) || 0);
  const nota = document.getElementById('quick-order-nota').value.trim();
  const matched = findClientByComposite(rawCli);
  const matchedItems = matchInventoryItemsFromLine(detail);

  db.orders.unshift({
    id: 'ORD-' + Date.now(),
    fecha: todayISO(),
    cliente: rawCli.toUpperCase(),
    zona: matched ? normalizeZoneName(matched.zona || '') : '',
    ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
    items: matchedItems,
    detalleManual: matchedItems.length ? '' : detail,
    totalEstimado: total,
    sena: 0,
    estado: 'PENDIENTE',
    stockDeducted: false,
    notas: nota
  });

  resetQuickOrderForm();
  await persistData();
  showToast('📦 Pedido guardado');
}

async function setOrderStatus(orderId, targetStatus) {
  const ord = (db.orders || []).find(o => o.id === orderId);
  if (!ord) return;

  const prevStatus = ord.estado || 'PENDIENTE';
  const alreadyDeducted = Boolean(ord.stockDeducted || prevStatus === 'ENTREGADO');

  if (targetStatus === 'ENTREGADO' && !alreadyDeducted) {
    if (ord.items && ord.items.length) {
      ord.items.forEach(item => {
        const invItem = db.inv.find(x => x.codigo === item.codigo);
        if (invItem) invItem.stock = Number(invItem.stock) - Number(item.qty);
      });
    }
    ord.stockDeducted = true;
  } else if (targetStatus !== 'ENTREGADO' && alreadyDeducted) {
    if (ord.items && ord.items.length) {
      ord.items.forEach(item => {
        const invItem = db.inv.find(x => x.codigo === item.codigo);
        if (invItem) invItem.stock = Number(invItem.stock) + Number(item.qty);
      });
    }
    ord.stockDeducted = false;
  }

  ord.estado = targetStatus;
  await persistData();

  if (targetStatus === 'PREPARADO') showToast('📦 Pedido marcado como Comprado / Preparado');
  else if (targetStatus === 'ENTREGADO') showToast('✅ Pedido entregado y stock actualizado');
  else showToast('Estado de pedido actualizado');
}

function deleteOrder(id) {
  if (!confirm('¿Eliminar este pedido?')) return;
  const ord = (db.orders || []).find(o => o.id === id);
  if (ord && (ord.stockDeducted || ord.estado === 'ENTREGADO') && ord.items && ord.items.length) {
    ord.items.forEach(it => {
      const invItem = db.inv.find(x => x.codigo === it.codigo);
      if (invItem) invItem.stock = Number(invItem.stock) + Number(it.qty);
    });
  }
  db.orders = db.orders.filter(o => o.id !== id);
  persistData();
  showToast('Pedido eliminado');
}

/* --- CLIENTES (FILTRADO AVANZADO, CREAR, EDITAR, DEUDA BASE Y ELIMINAR) --- */
function populateClientFilterSelects() {
  const zonaSel = document.getElementById('cli-filter-zona');
  const barberoSel = document.getElementById('cli-filter-barbero');
  if (!zonaSel || !barberoSel) return;

  const prevZona = zonaSel.value || 'TODAS';
  const prevBarbero = barberoSel.value || 'TODOS';

  const zonesSet = new Set();
  const barberosSet = new Set();
  let hasEmptyZona = false;

  (db.clients || []).forEach(c => {
    const z = (c.zona || '').trim().toUpperCase();
    if (z) zonesSet.add(z);
    else hasEmptyZona = true;

    const b = (c.barbero || '').trim().toUpperCase();
    if (b) barberosSet.add(b);
  });

  const sortedZones = Array.from(zonesSet).sort((a, b) => a.localeCompare(b));
  const sortedBarberos = Array.from(barberosSet).sort((a, b) => a.localeCompare(b));

  zonaSel.innerHTML = `<option value="TODAS">Zona: Todas</option>` +
    sortedZones.map(z => `<option value="${escapeAttr(z)}">${escapeAttr(z)}</option>`).join('') +
    (hasEmptyZona ? `<option value="__SIN_ZONA__">Sin zona</option>` : '');

  barberoSel.innerHTML = `<option value="TODOS">Barber / Encargado: Todos</option>` +
    sortedBarberos.map(b => `<option value="${escapeAttr(b)}">${escapeAttr(b)}</option>`).join('');

  zonaSel.value = Array.from(zonaSel.options).some(o => o.value === prevZona) ? prevZona : 'TODAS';
  barberoSel.value = Array.from(barberoSel.options).some(o => o.value === prevBarbero) ? prevBarbero : 'TODOS';
}

function resetClientFilters() {
  if (document.getElementById('cli-search')) document.getElementById('cli-search').value = '';
  if (document.getElementById('cli-filter-estado')) document.getElementById('cli-filter-estado').value = 'TODOS';
  if (document.getElementById('cli-filter-zona')) document.getElementById('cli-filter-zona').value = 'TODAS';
  if (document.getElementById('cli-filter-barbero')) document.getElementById('cli-filter-barbero').value = 'TODOS';
  renderClients();
}

function renderClients() {
  populateClientFilterSelects();

  const q = (document.getElementById('cli-search')?.value || '').toLowerCase();
  toggleSearchClearBtn('cli-search');
  const estadoFilter = document.getElementById('cli-filter-estado')?.value || 'TODOS';
  const zonaFilter = document.getElementById('cli-filter-zona')?.value || 'TODAS';
  const barberoFilter = document.getElementById('cli-filter-barbero')?.value || 'TODOS';

  const withBalance = (db.clients || []).map(c => ({
    ...c,
    saldoActual: Math.max(0, getClientBalance(c))
  }));

  let conDeudaCount = 0;
  let sinDeudaCount = 0;
  withBalance.forEach(c => {
    if (c.saldoActual > 0) conDeudaCount++;
    else if (c.saldoActual === 0) sinDeudaCount++;
  });

  const conDeudaEl = document.getElementById('cli-count-con-deuda');
  const sinDeudaEl = document.getElementById('cli-count-sin-deuda');
  if (conDeudaEl) conDeudaEl.textContent = String(conDeudaCount);
  if (sinDeudaEl) sinDeudaEl.textContent = String(sinDeudaCount);

  const filtered = withBalance.filter(c => {
    const matchesText = !q ||
      (c.barberia || '').toLowerCase().includes(q) ||
      (c.barbero || '').toLowerCase().includes(q) ||
      (c.zona || '').toLowerCase().includes(q) ||
      (c.ruta || '').toLowerCase().includes(q) ||
      (c.direccion || '').toLowerCase().includes(q);
    if (!matchesText) return false;

    if (estadoFilter === 'CON_DEUDA' && c.saldoActual <= 0) return false;
    if (estadoFilter === 'SIN_DEUDA' && c.saldoActual > 0) return false;

    const cliZona = (c.zona || '').trim().toUpperCase();
    if (zonaFilter === '__SIN_ZONA__' && cliZona !== '') return false;
    if (zonaFilter !== 'TODAS' && zonaFilter !== '__SIN_ZONA__' && cliZona !== zonaFilter) return false;

    const cliBarbero = (c.barbero || '').trim().toUpperCase();
    if (barberoFilter !== 'TODOS' && cliBarbero !== barberoFilter) return false;

    return true;
  });

  let totalAdeudadoSeleccion = 0;
  filtered.forEach(c => {
    if (c.saldoActual > 0) totalAdeudadoSeleccion += c.saldoActual;
  });

  const summaryEl = document.getElementById('cli-filter-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <span>Mostrando <strong>${filtered.length}</strong> de <strong>${db.clients.length}</strong> clientes</span>
      <span>Total adeudado de la selección: <strong class="text-amber">${fmtMoney(totalAdeudadoSeleccion)}</strong></span>
    `;
  }

  const tbody = document.getElementById('clients-body');
  if (!tbody) return;

  tbody.innerHTML = filtered.length ? filtered.map(c => {
    const saldo = Math.max(0, c.saldoActual);
    const saldoCellHtml = saldo > 0
      ? `<td class="text-right font-bold text-amber">${fmtMoney(saldo)}</td>`
      : `<td class="text-right font-bold text-green">$0</td>`;

    return `
      <tr>
        <td class="font-bold">${escapeAttr(c.barberia)}</td>
        <td>${escapeAttr(c.barbero)}</td>
        <td><div>${escapeAttr(c.zona || '-')}</div><div class="muted" style="font-size:11.5px;">${escapeAttr(c.direccion || '')}</div></td>
        <td>${escapeAttr(c.ruta || '-')}</td>
        <td><span class="tag-tier tier-${escapeAttr(c.categoria)}">${escapeAttr(c.categoria)}</span></td>
        ${saldoCellHtml}
        <td class="text-right" style="white-space:nowrap;">
          <div class="action-icon-group">
            <button class="btn-icon" onclick="openDeudaBaseModal('${c.id}')" title="Editar deuda base / saldo">💳</button>
            <button class="btn-icon" onclick="openClientModal('${c.id}')" title="Editar cliente">✏️</button>
            <button class="btn-icon btn-icon-del" onclick="deleteClient('${c.id}')" title="Eliminar cliente">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="7" class="text-center muted" style="padding:24px;">No hay clientes que coincidan con los filtros seleccionados.</td></tr>`;
}

function updateClientModalDebtPreview() {
  const hintEl = document.getElementById('cli-deuda-prev-info');
  if (!hintEl) return;

  const id = document.getElementById('edit-cli-id')?.value || '';
  if (!id) {
    hintEl.style.display = 'none';
    return;
  }

  const c = db.clients.find(x => x.id === id);
  if (!c) {
    hintEl.style.display = 'none';
    return;
  }

  const prevSaldo = getClientBalance(c);
  const inputDeudaBase = Math.max(0, Number(document.getElementById('cli-deuda')?.value) || 0);
  const nuevoSaldo = computeClientBalanceWithBase(c, inputDeudaBase);

  const prevClass = prevSaldo > 0 ? 'text-amber' : 'text-green';
  const newClass = nuevoSaldo > 0 ? 'text-amber' : 'text-green';

  hintEl.innerHTML = `
    <div>Saldo previo total: <strong class="${prevClass}">${fmtMoney(prevSaldo)}</strong></div>
    <div>Nuevo saldo resultante: <strong class="${newClass}">${fmtMoney(nuevoSaldo)}</strong></div>
  `;
  hintEl.style.display = 'block';
}

function resetClientModalForm() {
  const form = document.getElementById('client-form');
  if (form) form.reset();
  ['edit-cli-id','cli-barberia','cli-barbero','cli-zona','cli-tel','cli-dir','cli-notas'].forEach(k => {
    const el = document.getElementById(k);
    if (el) el.value = '';
  });
  if (document.getElementById('cli-ruta')) document.getElementById('cli-ruta').value = 'LUNES / VIERNES';
  if (document.getElementById('cli-cat')) document.getElementById('cli-cat').value = 'DIAMOND';
  if (document.getElementById('cli-deuda')) document.getElementById('cli-deuda').value = 0;
  const hintEl = document.getElementById('cli-deuda-prev-info');
  if (hintEl) hintEl.style.display = 'none';
}

function openClientModal(id = null) {
  document.getElementById('client-modal').style.display = 'flex';
  if (id) {
    returnNewClientToSaleForm = false;
    const c = db.clients.find(x => x.id === id);
    document.getElementById('client-modal-title').textContent = '✏️ Editar Cliente';
    document.getElementById('edit-cli-id').value = c.id;
    document.getElementById('cli-barberia').value = c.barberia;
    document.getElementById('cli-barbero').value = c.barbero;
    document.getElementById('cli-zona').value = c.zona;
    document.getElementById('cli-ruta').value = c.ruta || 'A DEFINIR';
    document.getElementById('cli-tel').value = c.telefono;
    document.getElementById('cli-cat').value = c.categoria || 'PLATA';
    document.getElementById('cli-dir').value = c.direccion;
    document.getElementById('cli-deuda').value = Math.max(0, Number(c.deudaBase) || 0);
    document.getElementById('cli-notas').value = c.notas || '';
    updateClientModalDebtPreview();
  } else {
    document.getElementById('client-modal-title').textContent = 'Nuevo Cliente';
    resetClientModalForm();
  }
}

function openDeudaBaseModal(clientId = null) {
  if (!db.clients || !db.clients.length) {
    showToast('Primero agregá un cliente para editar su deuda base');
    return;
  }

  const sel = document.getElementById('db-client-select');
  if (!sel) return;

  const sortedClients = [...db.clients].sort((a, b) =>
    `${a.barberia} | ${a.barbero}`.localeCompare(`${b.barberia} | ${b.barbero}`)
  );

  sel.innerHTML = sortedClients.map(c => {
    const saldo = getClientBalance(c);
    return `<option value="${escapeAttr(c.id)}">${escapeAttr(c.barberia)} | ${escapeAttr(c.barbero)} (${fmtMoney(saldo)})</option>`;
  }).join('');

  if (clientId && sortedClients.some(c => c.id === clientId)) {
    sel.value = clientId;
  }

  onDeudaBaseClientChange();
  document.getElementById('deuda-base-modal').style.display = 'flex';
}

function onDeudaBaseClientChange() {
  const sel = document.getElementById('db-client-select');
  const montoInput = document.getElementById('db-client-monto');
  if (!sel || !montoInput) return;

  const c = db.clients.find(x => x.id === sel.value);
  if (!c) return;

  const saldoActual = getClientBalance(c);
  montoInput.value = saldoActual;
  updateDeudaBaseModalPreview();
}

function updateDeudaBaseModalPreview() {
  const sel = document.getElementById('db-client-select');
  const montoInput = document.getElementById('db-client-monto');
  const hintEl = document.getElementById('db-client-prev-info');
  if (!sel || !montoInput || !hintEl) return;

  const c = db.clients.find(x => x.id === sel.value);
  if (!c) {
    hintEl.style.display = 'none';
    return;
  }

  const saldoPrevio = getClientBalance(c);
  const nuevoSaldo = Math.max(0, Number(montoInput.value) || 0);
  const prevClass = saldoPrevio > 0 ? 'text-amber' : 'text-green';
  const newClass = nuevoSaldo > 0 ? 'text-amber' : 'text-green';

  hintEl.innerHTML = `
    <div>Saldo previo: <strong class="${prevClass}">${fmtMoney(saldoPrevio)}</strong></div>
    <div>Nuevo saldo al guardar: <strong class="${newClass}">${fmtMoney(nuevoSaldo)}</strong></div>
  `;
  hintEl.style.display = 'block';
}

function resetDeudaBaseModalForm() {
  const form = document.getElementById('deuda-base-form');
  if (form) form.reset();
  if (document.getElementById('db-client-monto')) document.getElementById('db-client-monto').value = '';
  const hintEl = document.getElementById('db-client-prev-info');
  if (hintEl) hintEl.style.display = 'none';
}

async function saveDeudaBaseModal(e) {
  e.preventDefault();
  const sel = document.getElementById('db-client-select');
  const montoInput = document.getElementById('db-client-monto');
  if (!sel || !montoInput) return;

  const c = db.clients.find(x => x.id === sel.value);
  if (!c) return;

  const targetSaldo = Math.max(0, Number(montoInput.value) || 0);
  const currentSaldo = getClientBalance(c);

  if (targetSaldo > currentSaldo) {
    const diff = targetSaldo - currentSaldo;
    const candidateBase = Math.max(0, Number(c.deudaBase) || 0) + diff;
    if (computeClientBalanceWithBase(c, candidateBase) === targetSaldo) {
      c.deudaBase = candidateBase;
    } else {
      c.deudaBase = candidateBase;
      const after = getClientBalance(c);
      if (after < targetSaldo) {
        db.movs.push({
          id: 'MOV-' + Date.now(),
          fecha: todayISO(),
          barberia: (c.barberia || '').trim().toUpperCase(),
          barbero: (c.barbero || '').trim().toUpperCase(),
          zona: normalizeZoneName(c.zona || ''),
          tipo: 'VENTA A CREDITO',
          detalle: 'Ajuste de Deuda Base',
          medio: 'CUENTA CORRIENTE',
          monto: targetSaldo - after,
          items: [],
          obs: 'Ajuste manual desde Deuda Base'
        });
      }
    }
  } else if (targetSaldo < currentSaldo) {
    const diff = currentSaldo - targetSaldo;
    const currentBase = Math.max(0, Number(c.deudaBase) || 0);
    const baseReduction = Math.min(currentBase, diff);
    c.deudaBase = Math.max(0, currentBase - baseReduction);
    const afterBaseUpdate = getClientBalance(c);
    const remainingDiff = afterBaseUpdate - targetSaldo;
    if (remainingDiff > 0) {
      db.movs.push({
        id: 'MOV-' + Date.now(),
        fecha: todayISO(),
        barberia: (c.barberia || '').trim().toUpperCase(),
        barbero: (c.barbero || '').trim().toUpperCase(),
        zona: normalizeZoneName(c.zona || ''),
        tipo: 'ABONO / PAGO',
        detalle: 'Ajuste de Deuda Base',
        medio: 'EFECTIVO',
        monto: remainingDiff,
        items: [],
        obs: 'Ajuste manual desde Deuda Base'
      });
    }
  }

  resetDeudaBaseModalForm();
  closeModal('deuda-base-modal');
  await persistData();
  showToast('💳 Deuda base actualizada');
}

function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('edit-cli-id').value;
  const payload = {
    id: id || ('CLI-' + Date.now()),
    barberia: document.getElementById('cli-barberia').value.trim().toUpperCase(),
    barbero: document.getElementById('cli-barbero').value.trim().toUpperCase(),
    zona: document.getElementById('cli-zona').value.trim().toUpperCase(),
    ruta: document.getElementById('cli-ruta').value,
    telefono: document.getElementById('cli-tel').value.trim(),
    categoria: document.getElementById('cli-cat').value,
    direccion: document.getElementById('cli-dir').value.trim().toUpperCase(),
    deudaBase: Math.max(0, Number(document.getElementById('cli-deuda').value) || 0),
    notas: document.getElementById('cli-notas').value.trim()
  };
  if (id) {
    const idx = db.clients.findIndex(x => x.id === id);
    if (idx !== -1) db.clients[idx] = payload;
  } else {
    db.clients.unshift(payload);
  }

  const fromSale = returnNewClientToSaleForm;
  returnNewClientToSaleForm = false;
  resetClientModalForm();
  closeModal('client-modal');
  persistData();

  if (fromSale) {
    const cliInput = document.getElementById('mov-cliente-search');
    if (cliInput) {
      cliInput.value = `${payload.barberia} | ${payload.barbero}`;
      hideMovClientAlert();
      updateAbonoParcialVisibility();
      updateMovClientBalanceNotice();
    }
    showToast('✅ Cliente creado y seleccionado en la venta');
  } else {
    showToast('Cliente guardado');
  }
}

function deleteClient(id) {
  const c = db.clients.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`¿Eliminar a ${c.barberia} (${c.barbero}) del directorio?`)) return;
  db.clients = db.clients.filter(x => x.id !== id);
  persistData();
  showToast('Cliente eliminado');
}

/* --- INVENTARIO (CREAR, EDITAR Y ELIMINAR) --- */
function resetInventoryFilters() {
  const searchEl = document.getElementById('inv-search');
  if (searchEl) searchEl.value = '';
  const lowChk = document.getElementById('filter-low-stock');
  if (lowChk) lowChk.checked = false;
  renderInventory();
}

function renderInventory() {
  const q = (document.getElementById('inv-search').value || '').toLowerCase();
  const onlyLow = document.getElementById('filter-low-stock').checked;
  const items = db.inv.filter(i => {
    const matchText = (i.producto || '').toLowerCase().includes(q) || (i.codigo || '').toLowerCase().includes(q);
    return matchText && (!onlyLow || Number(i.stock) <= 3);
  });
  document.getElementById('inv-body').innerHTML = items.map(i => {
    const st = Number(i.stock);
    const stClass = st <= 0 ? 'text-red' : (st <= 3 ? 'text-amber' : 'text-green');
    return `
      <tr>
        <td class="muted">${i.codigo}</td>
        <td class="font-bold">${i.producto}</td>
        <td class="text-center font-bold ${stClass}">${st} u.</td>
        <td class="text-right">${fmtMoney(i.venta)}</td>
        <td class="text-right" style="white-space:nowrap;">
          <div class="stock-stepper">
            <button class="step-btn" onclick="adjustStock('${i.codigo}', -1)" title="Restar 1">-1</button>
            <button class="step-btn" onclick="adjustStock('${i.codigo}', 1)" title="Sumar 1">+1</button>
            <button class="btn-icon" onclick="openProductModal('${i.codigo}')" title="Editar artículo">✏️</button>
            <button class="btn-icon btn-icon-del" onclick="deleteProduct('${i.codigo}')" title="Eliminar artículo">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function adjustStock(codigo, delta) {
  const item = db.inv.find(x => x.codigo === codigo);
  if (!item) return;
  item.stock = Number(item.stock) + delta;
  persistData();
}

function resetProductModalForm() {
  const form = document.getElementById('product-form');
  if (form) form.reset();
  if (document.getElementById('edit-prod-original-code')) document.getElementById('edit-prod-original-code').value = '';
  if (document.getElementById('prod-codigo')) document.getElementById('prod-codigo').value = '';
  if (document.getElementById('prod-nombre')) document.getElementById('prod-nombre').value = '';
  if (document.getElementById('prod-stock')) document.getElementById('prod-stock').value = 0;
  if (document.getElementById('prod-venta')) document.getElementById('prod-venta').value = 0;
}

function openProductModal(codigo = null) {
  document.getElementById('product-modal').style.display = 'flex';
  if (codigo) {
    const prod = db.inv.find(x => x.codigo === codigo);
    if (!prod) return;
    document.getElementById('product-modal-title').textContent = '✏️ Editar Artículo de Stock';
    document.getElementById('edit-prod-original-code').value = prod.codigo;
    document.getElementById('prod-codigo').value = prod.codigo;
    document.getElementById('prod-nombre').value = prod.producto;
    document.getElementById('prod-stock').value = Number(prod.stock) || 0;
    document.getElementById('prod-venta').value = Number(prod.venta) || 0;
  } else {
    document.getElementById('product-modal-title').textContent = 'Nuevo Artículo de Stock';
    resetProductModalForm();
  }
}

function saveProduct(e) {
  e.preventDefault();
  const originalCode = document.getElementById('edit-prod-original-code').value;
  const customCode = document.getElementById('prod-codigo').value.trim().toUpperCase();
  const nombre = document.getElementById('prod-nombre').value.trim().toUpperCase();
  const stock = Number(document.getElementById('prod-stock').value) || 0;
  const venta = Number(document.getElementById('prod-venta').value) || 0;

  if (originalCode) {
    const prod = db.inv.find(x => x.codigo === originalCode);
    if (prod) {
      prod.codigo = customCode || originalCode;
      prod.producto = nombre;
      prod.stock = stock;
      prod.venta = venta;
    }
    showToast('✅ Artículo actualizado');
  } else {
    db.inv.unshift({
      codigo: customCode || ('ART-' + String(db.inv.length + 1).padStart(3, '0')),
      producto: nombre,
      stock,
      costo: 0,
      venta
    });
    showToast('✅ Producto agregado al stock');
  }

  resetProductModalForm();
  closeModal('product-modal');
  persistData();
}

function deleteProduct(codigo) {
  const prod = db.inv.find(x => x.codigo === codigo);
  if (!prod) return;
  if (!confirm(`¿Eliminar "${prod.producto}" (${prod.codigo}) del inventario?`)) return;
  db.inv = db.inv.filter(x => x.codigo !== codigo);
  persistData();
  showToast('Artículo eliminado del inventario');
}

function closeModal(id) {
  if (id === 'client-modal') {
    returnNewClientToSaleForm = false;
    resetClientModalForm();
  } else if (id === 'deuda-base-modal') {
    resetDeudaBaseModalForm();
  } else if (id === 'product-modal') {
    resetProductModalForm();
  } else if (id === 'task-modal') {
    resetEditTaskForm();
  } else if (id === 'edit-op-modal') {
    resetEditOpModalForm();
  }
  document.getElementById(id).style.display = 'none';
}

function exportBackup() {
  ensureDbArrays();
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rapibarbe_Respaldo_${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('⬇ Respaldo (.json) exportado');
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (parsed && Array.isArray(parsed.clients) && Array.isArray(parsed.inv)) {
        db = parsed;
        ensureDbArrays();
        persistData();
        showToast('✅ Respaldo (.json) restaurado correctamente');
      } else {
        showToast('El archivo JSON no tiene el formato de Rapibarbe');
      }
    } catch (err) {
      showToast('Archivo .json inválido');
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

function resetToExcelDefault() {
  if (!confirm('¿Volver a los datos originales del Excel?')) return;
  db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [], tasks: [] };
  persistData();
  showToast('Datos originales restaurados');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}



