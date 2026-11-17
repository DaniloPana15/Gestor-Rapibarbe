const INITIAL_DATA = { clients: [], movs: [], inv: [] };

const DEFAULT_HABITS = [
  { id: 'HAB-1', day: 'LUN', text: 'Ruta Celina: revisar saldos y avisar visita por WhatsApp', done: false },
  { id: 'HAB-2', day: 'LUN', text: 'Tarde: avisar por WhatsApp a barberos de ruta Martes (Liniers)', done: false },
  { id: 'HAB-3', day: 'MAR', text: 'Ruta Liniers: cobrar pendientes y anotar pedidos del día', done: false },
  { id: 'HAB-4', day: 'MIE', text: 'Preparar mercadería y avisar por WhatsApp a ruta Jueves (Virreyes)', done: false },
  { id: 'HAB-5', day: 'JUE', text: 'Ruta Virreyes + avisar a barberos de Viernes (Flores / Pompeya)', done: false },
  { id: 'HAB-6', day: 'VIE', text: 'Ruta Flores/Pompeya + grabar contenido / polo barbero con clientes', done: false },
  { id: 'HAB-7', day: 'SAB', text: 'Cierre semanal: revisar deudores activos y reposición de stock', done: false }
];

const STORAGE_KEY = 'rapibarbe_db_v3';
const CONFIG_KEY = 'rapibarbe_config_v2';

let db = { clients: [], movs: [], inv: [], orders: [], tasks: [], habits: [] };
let config = { pin: '1234', cloudKey: '', cloudBin: '', geminiKey: '' };
let activeRouteFilter = 'TODOS';
let activeOrderFilter = 'PENDIENTE';
let activeTaskFilter = 'PENDIENTES';
let currentCart = [];
let editOpCart = [];
let lastDetectedOrder = null;
let pendingBatchOps = [];

const fmtMoney = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
const todayISO = () => new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  applyMagicLinkFromUrl();
  loadLocalData();
  document.getElementById('mov-fecha').value = todayISO();
  if (document.getElementById('papa-day-date')) {
    document.getElementById('papa-day-date').value = todayISO();
  }
  if (document.getElementById('task-fecha')) {
    document.getElementById('task-fecha').value = todayISO();
  }
  setupAudioDropzone();

  if (sessionStorage.getItem('rapibarbe_unlocked') === '1') {
    showApp();
  }

  setInterval(() => {
    if (config.cloudKey && config.cloudBin && document.visibilityState === 'visible') {
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
  document.getElementById('cloud-key').value = config.cloudKey || '';
  document.getElementById('cloud-bin').value = config.cloudBin || '';
  if (document.getElementById('gemini-key')) {
    document.getElementById('gemini-key').value = config.geminiKey || '';
  }
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
  if (!Array.isArray(db.habits) || !db.habits.length) {
    db.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
  }
}

function loadLocalData() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('rapibarbe_db_v2');
  if (saved) {
    try {
      db = JSON.parse(saved);
      ensureDbArrays();
    } catch (e) {
      db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [], tasks: [], habits: JSON.parse(JSON.stringify(DEFAULT_HABITS)) };
    }
  } else {
    db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [], tasks: [], habits: JSON.parse(JSON.stringify(DEFAULT_HABITS)) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}

async function persistData() {
  ensureDbArrays();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  renderAll();

  if (config.cloudKey && config.cloudBin) {
    setSyncStatus('Sincronizando con nube...', false);
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${config.cloudBin}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': config.cloudKey },
        body: JSON.stringify(db)
      });
      setSyncStatus(res.ok ? 'Sincronizado en la nube ✓' : 'Error al subir (guardado local OK)', res.ok);
    } catch (err) {
      setSyncStatus('Sin internet (guardado local)', false);
    }
  } else {
    setSyncStatus('Guardado en este dispositivo', false);
  }
}

async function syncFromCloud(silent = false) {
  if (!config.cloudKey || !config.cloudBin) {
    if (!silent) {
      showToast('Configurá tu API Key en "Nube & IA" para sincronizar.');
      switchTab('nube');
    }
    return;
  }
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
      setSyncStatus('Nube actualizada ✓', true);
      if (!silent) showToast('Datos actualizados desde la nube');
    }
  } catch (e) {
    if (!silent) setSyncStatus('No se pudo conectar a la nube', false);
  }
}

async function createCloudBin() {
  const key = document.getElementById('cloud-key').value.trim();
  if (!key) return showToast('Pegá primero tu X-Master-Key de JSONBin.io');
  config.cloudKey = key;
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
      setSyncStatus('Nube privada conectada ✓', true);
      showToast('¡Nube creada! Tocá "Copiar Link de Acceso" para compartirlo.');
    }
  } catch (e) {
    showToast('Error de conexión con JSONBin.io');
  }
}

function saveCloudConfig(e) {
  e.preventDefault();
  config.cloudKey = document.getElementById('cloud-key').value.trim();
  config.cloudBin = document.getElementById('cloud-bin').value.trim();
  config.geminiKey = document.getElementById('gemini-key').value.trim();
  saveConfigLocal();
  showToast('Configuración guardada');
  if (config.cloudKey && config.cloudBin) syncFromCloud();
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
  if (config.cloudKey && config.cloudBin) syncFromCloud();
  else renderAll();
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
  selectTipo.value = tipoOperacion;
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

function getClientBalance(client) {
  let saldo = Number(client.deudaBase) || 0;
  const b1 = (client.barberia || '').trim().toUpperCase();
  const b2 = (client.barbero || '').trim().toUpperCase();

  db.movs.forEach(m => {
    if ((m.barberia || '').trim().toUpperCase() === b1 && (m.barbero || '').trim().toUpperCase() === b2) {
      if (m.tipo === 'VENTA FIADA') saldo += Number(m.monto) || 0;
      if (m.tipo === 'ABONO / PAGO') saldo -= Number(m.monto) || 0;
    }
  });
  return saldo;
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

function renderKPIs() {
  let totalDeuda = 0, deudoresCount = 0, totalCobrado = 0, ventasContado = 0, ventasFiadas = 0;

  db.clients.forEach(c => {
    const saldo = getClientBalance(c);
    if (saldo > 0) { totalDeuda += saldo; deudoresCount++; }
  });

  db.movs.forEach(m => {
    const monto = Number(m.monto) || 0;
    if (m.tipo === 'ABONO / PAGO') totalCobrado += monto;
    if (m.tipo === 'VENTA CONTADO') ventasContado += monto;
    if (m.tipo === 'VENTA FIADA') ventasFiadas += monto;
  });

  const pendingOrdersCount = (db.orders || []).filter(o => o.estado === 'PENDIENTE').length;
  const today = todayISO();
  const pendingTasksToday = (db.tasks || []).filter(t => !t.done && t.fecha <= today).length;

  document.getElementById('kpi-deuda').textContent = fmtMoney(totalDeuda);
  document.getElementById('kpi-deudores-count').textContent = `${deudoresCount} barberos con saldo activo`;
  document.getElementById('kpi-cobrado').textContent = fmtMoney(totalCobrado);
  document.getElementById('kpi-ventas').textContent = fmtMoney(ventasContado + ventasFiadas);
  document.getElementById('kpi-ventas-split').textContent = `Contado: ${fmtMoney(ventasContado)} · Fiado: ${fmtMoney(ventasFiadas)}`;
  document.getElementById('kpi-stock-bajo').textContent = db.inv.filter(i => Number(i.stock) <= 3).length;
  document.getElementById('kpi-pedidos-pendientes').textContent = pendingOrdersCount;
  document.getElementById('nav-orders-count').textContent = pendingOrdersCount;
  document.getElementById('kpi-tareas-hoy').textContent = pendingTasksToday;
  document.getElementById('nav-tasks-count').textContent = pendingTasksToday;
}

function setRouteFilter(route, btn) {
  activeRouteFilter = route;
  document.querySelectorAll('#route-filters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
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
        <td><div class="font-bold">${c.barberia}</div><div class="muted">${c.barbero}</div></td>
        <td><div>${c.zona || '-'}</div><div class="muted" style="font-size:11px;">${c.ruta || 'A DEFINIR'}</div></td>
        <td class="text-right font-bold text-amber">${fmtMoney(c.saldoActual)}</td>
        <td class="text-right" style="white-space:nowrap;">
          ${waBtn}
          <button class="btn-sm btn-pay" onclick="quickPayment('${c.barberia.replace(/'/g, "\\'")}', '${c.barbero.replace(/'/g, "\\'")}', ${c.saldoActual})">+ Cobrar</button>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="4" class="text-center muted" style="padding:24px;">No hay deudas pendientes en este filtro.</td></tr>`;

  // TAREAS DE HOY EN EL DASHBOARD
  const today = todayISO();
  const todayTasks = (db.tasks || []).filter(t => !t.done && t.fecha <= today).slice(0, 4);
  const dashTasksEl = document.getElementById('dash-today-tasks');
  if (dashTasksEl) {
    dashTasksEl.innerHTML = todayTasks.length ? todayTasks.map(t => {
      const cliObj = findClientByComposite(t.cliente);
      const waUrl = buildWhatsAppLinkForClient(cliObj, t.tipo);
      return `
        <div class="activity-item">
          <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
            <button class="task-check-btn" onclick="toggleTaskDone('${t.id}')" title="Completar">✓</button>
            <div style="min-width:0;">
              <div class="font-bold" style="font-size:12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.titulo}</div>
              <div class="muted" style="font-size:11px;">${t.fecha < today ? '⚠️ Atrasada · ' : '📅 Hoy · '}${t.cliente || t.tipo}</div>
            </div>
          </div>
          ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn-sm btn-wa" style="flex-shrink:0;">WA</a>` : ''}
        </div>
      `;
    }).join('') : '<p class="muted">No hay avisos ni tareas pendientes para hoy.</p>';
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
        <div class="bar-labels"><span>${ruta}</span><span class="font-bold">${fmtMoney(total)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((total / maxRoute) * 100)}%"></div></div>
      </div>
    `).join('') || '<p class="muted">Sin deudas activas</p>';

  const unifiedRecent = getUnifiedOperationsList().slice(0, 6);
  document.getElementById('recent-movs-list').innerHTML = unifiedRecent.map(item => {
    const isPay = item.tipo === 'ABONO / PAGO';
    const isOrder = item.isOrder;
    const valColor = isPay ? 'text-green' : (isOrder ? 'text-amber' : 'text-main');
    const prefix = isOrder ? '📦 ' : (isPay ? '+' : '');
    return `
      <div class="activity-item">
        <div style="min-width:0; flex:1;">
          <div class="font-bold" style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.barberia}${item.barbero ? ' — ' + item.barbero : ''}</div>
          <div class="muted" style="font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.fecha} · ${item.detalle || item.tipo}</div>
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

    return {
      id: o.id,
      fecha: o.fecha || todayISO(),
      barberia,
      barbero,
      tipo: o.estado === 'ENTREGADO' ? 'PEDIDO (ENTREGADO)' : 'PEDIDO',
      detalle: desc + senaTag + (o.notas ? ` (${o.notas})` : ''),
      medio: 'ENCARGO',
      monto: totalNum,
      isOrder: true,
      orderEstado: o.estado,
      sortIndex: 100000 + idx
    };
  });

  return [...movEntries, ...orderEntries].sort((a, b) => {
    const cmpDate = (b.fecha || '').localeCompare(a.fecha || '');
    if (cmpDate !== 0) return cmpDate;
    return b.sortIndex - a.sortIndex;
  });
}

function setPapaDateToday() {
  const input = document.getElementById('papa-day-date');
  if (input) {
    input.value = todayISO();
    renderMovements();
  }
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
    document.getElementById('edit-op-tipo').value = mov.tipo || 'VENTA FIADA';
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
  const tipo = document.getElementById('edit-op-tipo').value;
  document.getElementById('edit-op-order-status-group').style.display = (tipo === 'PEDIDO') ? 'block' : 'none';
  document.getElementById('edit-op-picker-box').style.display = (tipo === 'ABONO / PAGO') ? 'none' : 'block';
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
  const newTipo = document.getElementById('edit-op-tipo').value;
  const newOrderEstado = document.getElementById('edit-op-order-estado').value;
  const rawCli = document.getElementById('edit-op-cliente').value.trim();
  const newMonto = Number(document.getElementById('edit-op-monto').value) || 0;
  const newMedio = document.getElementById('edit-op-medio').value;
  const newDetalle = document.getElementById('edit-op-detalle').value.trim();
  const newObs = document.getElementById('edit-op-obs').value.trim();

  let barberia = rawCli, barbero = '';
  if (rawCli.includes('|')) {
    const parts = rawCli.split('|');
    barberia = parts[0].trim();
    barbero = parts[1].trim();
  }
  const compositeCli = barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : barberia.toUpperCase();
  const matchedCli = findClientByComposite(compositeCli);

  if (!wasOrder) {
    const oldMov = db.movs.find(m => m.id === id);
    if (oldMov && oldMov.items && oldMov.items.length && oldMov.tipo !== 'ABONO / PAGO') {
      oldMov.items.forEach(it => {
        const invItem = db.inv.find(x => x.codigo === it.codigo);
        if (invItem) invItem.stock = Number(invItem.stock) + Number(it.qty);
      });
    }
  }

  if (newTipo === 'PEDIDO') {
    if (!wasOrder) {
      db.movs = db.movs.filter(m => m.id !== id);
      db.orders.unshift({
        id: 'ORD-' + Date.now(),
        fecha: newFecha,
        cliente: compositeCli,
        ruta: matchedCli ? (matchedCli.ruta || 'A DEFINIR') : 'A DEFINIR',
        items: [...editOpCart],
        detalleManual: editOpCart.length ? '' : newDetalle,
        totalEstimado: newMonto,
        sena: 0,
        estado: newOrderEstado,
        notas: newObs
      });
    } else {
      const ord = db.orders.find(o => o.id === id);
      if (ord) {
        ord.fecha = newFecha;
        ord.cliente = compositeCli;
        ord.ruta = matchedCli ? (matchedCli.ruta || 'A DEFINIR') : (ord.ruta || 'A DEFINIR');
        ord.items = [...editOpCart];
        ord.detalleManual = editOpCart.length ? '' : newDetalle;
        ord.totalEstimado = newMonto;
        ord.estado = newOrderEstado;
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

    const finalDetalle = newDetalle || (editOpCart.length ? editOpCart.map(i => `${i.qty}x ${i.producto}`).join(', ') : newTipo);

    if (wasOrder) {
      db.orders = db.orders.filter(o => o.id !== id);
      db.movs.push({
        id: 'MOV-' + Date.now(),
        fecha: newFecha,
        barberia: barberia.toUpperCase(),
        barbero: barbero.toUpperCase(),
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
        mov.barberia = barberia.toUpperCase();
        mov.barbero = barbero.toUpperCase();
        mov.tipo = newTipo;
        mov.detalle = finalDetalle;
        mov.medio = newMedio === 'ENCARGO' ? 'EFECTIVO' : newMedio;
        mov.monto = newMonto;
        mov.items = [...editOpCart];
        mov.obs = newObs;
      }
    }
  }

  closeModal('edit-op-modal');
  await persistData();
  showToast('✅ Operación actualizada y saldos recalculados');
}

function deleteFromEditOpModal() {
  const id = document.getElementById('edit-op-id').value;
  const wasOrder = document.getElementById('edit-op-was-order').value === '1';
  closeModal('edit-op-modal');
  if (wasOrder) deleteOrder(id);
  else deleteMovement(id);
}

/* --- AGENDA DE AVISOS WHATSAPP Y HABIT TRACKER --- */
function findClientByComposite(rawCli) {
  if (!rawCli) return null;
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
    titleInput.value = `Avisar por WhatsApp a ${shortName} sobre saldo pendiente`;
  } else if (tipo === 'GRABAR POLO') {
    titleInput.value = `Grabar video con polo barbero en local de ${shortName}`;
  } else if (tipo === 'AVISO RUTA') {
    titleInput.value = `Avisar a ${shortName} que mañana pasamos por su zona`;
  }
}

function setTaskFilter(filter, btn) {
  activeTaskFilter = filter;
  document.querySelectorAll('#task-filters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderAgenda();
}

async function saveScheduledTask(e) {
  e.preventDefault();
  const fecha = document.getElementById('task-fecha').value || todayISO();
  const tipo = document.getElementById('task-tipo').value;
  const cliente = document.getElementById('task-cliente').value.trim().toUpperCase();
  const titulo = document.getElementById('task-titulo').value.trim();

  db.tasks.unshift({
    id: 'TSK-' + Date.now(),
    fecha,
    tipo,
    cliente,
    titulo,
    done: false
  });

  document.getElementById('task-cliente').value = '';
  document.getElementById('task-titulo').value = '';
  await persistData();
  showToast('📅 Tarea / aviso programado en la agenda');
}

function openEditTaskModal(id) {
  const t = (db.tasks || []).find(x => x.id === id);
  if (!t) return;
  document.getElementById('edit-task-id').value = t.id;
  document.getElementById('edit-task-fecha').value = t.fecha || todayISO();
  document.getElementById('edit-task-tipo').value = t.tipo || 'AVISO PAGO';
  document.getElementById('edit-task-cliente').value = t.cliente || '';
  document.getElementById('edit-task-titulo').value = t.titulo || '';
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

  closeModal('task-modal');
  await persistData();
  showToast('📅 Tarea actualizada');
}

async function toggleTaskDone(id) {
  const t = db.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  await persistData();
  showToast(t.done ? '✅ Tarea completada' : 'Tarea marcada como pendiente');
}

async function deleteScheduledTask(id) {
  if (!confirm('¿Eliminar esta tarea programada?')) return;
  db.tasks = db.tasks.filter(x => x.id !== id);
  await persistData();
  showToast('Tarea eliminada');
}

async function toggleHabitDone(id) {
  const h = db.habits.find(x => x.id === id);
  if (!h) return;
  h.done = !h.done;
  await persistData();
}

async function addHabitItem(e) {
  e.preventDefault();
  const day = document.getElementById('habit-day').value;
  const text = document.getElementById('habit-text').value.trim();
  if (!text) return;

  db.habits.push({
    id: 'HAB-' + Date.now(),
    day,
    text,
    done: false
  });

  document.getElementById('habit-text').value = '';
  await persistData();
  showToast('Hábito agregado a la rutina semanal');
}

async function editHabitItem(id) {
  const h = db.habits.find(x => x.id === id);
  if (!h) return;
  const updated = prompt('Editar hábito semanal:', h.text);
  if (updated !== null && updated.trim()) {
    h.text = updated.trim();
    await persistData();
    showToast('Hábito actualizado');
  }
}

async function deleteHabitItem(id) {
  db.habits = db.habits.filter(x => x.id !== id);
  await persistData();
}

async function resetWeeklyHabits() {
  if (!confirm('¿Desmarcar todos los hábitos para iniciar una semana nueva?')) return;
  db.habits.forEach(h => h.done = false);
  await persistData();
  showToast('↻ Rutina semanal reiniciada');
}

function renderAgenda() {
  const listEl = document.getElementById('scheduled-tasks-list');
  if (!listEl) return;

  const today = todayISO();
  let tasks = [...(db.tasks || [])].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  if (activeTaskFilter === 'PENDIENTES') tasks = tasks.filter(t => !t.done);
  else if (activeTaskFilter === 'HOY') tasks = tasks.filter(t => !t.done && t.fecha === today);
  else if (activeTaskFilter === 'ATRASADAS') tasks = tasks.filter(t => !t.done && t.fecha < today);
  else if (activeTaskFilter === 'HECHAS') tasks = tasks.filter(t => t.done);

  listEl.innerHTML = tasks.length ? tasks.map(t => {
    const isOverdue = !t.done && t.fecha < today;
    const isToday = !t.done && t.fecha === today;
    const cardClass = t.done ? 'task-done' : (isOverdue ? 'task-overdue' : (isToday ? 'task-today' : ''));
    const badgeClass = t.tipo === 'GRABAR POLO' ? 'badge-purple' : (t.tipo === 'AVISO PAGO' ? 'badge-amber' : 'badge-blue');
    const dateLabel = isOverdue ? `⚠️ Atrasada (${t.fecha})` : (isToday ? `📅 HOY (${t.fecha})` : `🗓 ${t.fecha}`);

    const cliObj = findClientByComposite(t.cliente);
    const waUrl = buildWhatsAppLinkForClient(cliObj, t.tipo);

    return `
      <div class="task-card ${cardClass}">
        <div style="display:flex; align-items:flex-start; gap:12px; min-width:0; flex:1;">
          <button class="task-check-btn ${t.done ? 'checked' : ''}" onclick="toggleTaskDone('${t.id}')">${t.done ? '✓' : ''}</button>
          <div style="min-width:0; flex:1;">
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:4px;">
              <span class="kpi-badge ${badgeClass}">${t.tipo}</span>
              <span class="muted" style="font-size:11.5px; font-weight:600;">${dateLabel}</span>
            </div>
            <div class="font-bold" style="font-size:13.5px; ${t.done ? 'text-decoration:line-through;' : ''}">${t.titulo}</div>
            ${t.cliente ? `<div class="muted" style="font-size:12px; margin-top:2px;">💈 ${t.cliente}</div>` : ''}
          </div>
        </div>
        <div class="action-icon-group" style="flex-shrink:0;">
          ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn-sm btn-wa">WA</a>` : ''}
          <button class="btn-icon" onclick="openEditTaskModal('${t.id}')" title="Editar tarea">✏️</button>
          <button class="btn-icon btn-icon-del" onclick="deleteScheduledTask('${t.id}')" title="Eliminar">🗑</button>
        </div>
      </div>
    `;
  }).join('') : `<p class="muted" style="padding:18px; text-align:center;">No hay tareas en esta vista.</p>`;

  const habitsEl = document.getElementById('habits-weekly-container');
  if (habitsEl) {
    const dayMap = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    const currentDayCode = dayMap[new Date().getDay()];
    const dayOrder = { LUN: 1, MAR: 2, MIE: 3, JUE: 4, VIE: 5, SAB: 6, DOM: 7 };

    const sortedHabits = [...(db.habits || [])].sort((a, b) => (dayOrder[a.day] || 9) - (dayOrder[b.day] || 9));
    const doneCount = sortedHabits.filter(h => h.done).length;
    const totalCount = sortedHabits.length;
    const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

    document.getElementById('habit-progress-text').textContent = `${pct}% (${doneCount}/${totalCount})`;
    document.getElementById('habit-progress-bar').style.width = `${pct}%`;

    habitsEl.innerHTML = sortedHabits.map(h => {
      const isTodayDay = h.day === currentDayCode;
      return `
        <div class="habit-row ${isTodayDay ? 'habit-today-highlight' : ''}">
          <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
            <button class="task-check-btn ${h.done ? 'checked' : ''}" onclick="toggleHabitDone('${h.id}')">${h.done ? '✓' : ''}</button>
            <span class="habit-day-pill">${h.day}</span>
            <span style="font-size:12.5px; ${h.done ? 'text-decoration:line-through; opacity:0.6;' : ''}">${h.text}</span>
          </div>
          <div class="action-icon-group">
            <button class="btn-icon" onclick="editHabitItem('${h.id}')" style="font-size:12px;" title="Editar">✏️</button>
            <button class="btn-icon btn-icon-del" onclick="deleteHabitItem('${h.id}')" style="font-size:12px;" title="Quitar">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

function quickPayment(barberia, barbero, saldo) {
  switchTab('movimientos');
  document.getElementById('mov-tipo').value = 'ABONO / PAGO';
  toggleProductPicker();
  document.getElementById('mov-cliente-search').value = `${barberia} | ${barbero}`;
  document.getElementById('mov-monto').value = saldo;
  document.getElementById('mov-detalle').value = 'Abono de saldo pendiente';
  document.getElementById('mov-monto').focus();
}

function populateDatalists() {
  document.getElementById('clientes-datalist').innerHTML = db.clients
    .map(c => `<option value="${c.barberia} | ${c.barbero}">${c.zona} (${c.ruta})</option>`).join('');
  document.getElementById('productos-datalist').innerHTML = db.inv
    .map(p => `<option value="${p.codigo} | ${p.producto}">Stock: ${p.stock} · ${fmtMoney(p.venta)}</option>`).join('');
}

/* --- CARRITO DE PRODUCTOS Y DESCUENTO AUTOMÁTICO DE STOCK --- */
function toggleProductPicker() {
  const tipo = document.getElementById('mov-tipo').value;
  const isAbono = tipo === 'ABONO / PAGO';
  document.getElementById('product-picker-box').style.display = isAbono ? 'none' : 'block';
  const abonoParcialGroup = document.getElementById('abono-parcial-group');
  if (abonoParcialGroup) {
    abonoParcialGroup.style.display = (tipo === 'VENTA FIADA') ? 'block' : 'none';
  }
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
}

/* --- PROCESAMIENTO DE AUDIOS DE WHATSAPP (DRAG & DROP O ARCHIVO) --- */
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
  const cliList = db.clients.map(c => `${c.barberia} | ${c.barbero} (${c.zona})`).join('; ');
  const invList = db.inv.map(p => `${p.codigo}: ${p.producto} ($${p.venta})`).join('; ');

  return `Sos el asistente administrativo de Rapibarbe (insumos de barbería en Argentina). Fecha de hoy: ${todayISO()}.
Analizá este audio o resumen estructurado de ventas, cobros, pedidos y tareas de Freddy y convertilo en una lista plana de operaciones individuales:
${extraText ? `"""\n${extraText}\n"""` : ''}

Clientes existentes: [${cliList}]
Productos en stock: [${invList}]

REGLAS CRÍTICAS DE DESGLOSE:
1. Si un cliente HACE UN ABONO de deuda anterior Y ADEMÁS lleva mercadería nueva (ej: "Abono $30.000 + 1 shaver crédito $16.000" o "Tenía deuda $65.000 + shaver $40.000, abonó $40.000"), separalo en DOS operaciones en el array:
   - Operación A: tipo "ABONO / PAGO" por el monto abonado.
   - Operación B: tipo "VENTA FIADA" por la mercadería nueva llevada.
2. Si un cliente deja SEÑA por un PEDIDO pendiente (ej: "Richard: 1 silla $1.000.000, seña $100.000, resta $900.000"), generá:
   - Operación A: tipo "PEDIDO", montoManual: 1000000, sena: 100000, notas: "1 silla de barbería · Seña $100.000 · Resta $900.000".
   - Operación B: tipo "ABONO / PAGO" (o "VENTA CONTADO") por $100.000 con notas "Seña por pedido (silla de barbería)" SOLO si no figura ya aparte como cobro del día, para reflejar la caja real cobrada hoy sin duplicar.
3. Ignorá las líneas de resumen global como "TOTALES DEL DÍA", "Total cobrado hoy", "Mercadería entregada hoy" o "Total en pedidos por entregar", porque el sistema los calcula sumando cada operación.
4. Si pide agendar un aviso de pago, grabar polo barbero o recordatorio para una fecha, usá tipo "TAREA".
5. Si el cliente no está en la lista, formatealo como "BARBERIA O ZONA | NOMBRE" (ej: "CELINA - GOYO | NELSON" o "BARBERIA LIAN | HECTOR") y completá "zona" si se menciona.
6. Si el producto no coincide con un código ART-XXX del stock, dejá "items": [] y poné el total en "montoManual" y el detalle en "notas".

Devolvé ÚNICAMENTE JSON válido sin markdown con esta estructura exacta:
{
  "transcripcion": "transcripción o resumen breve",
  "operaciones": [
    {
      "tipo": "VENTA FIADA" | "VENTA CONTADO" | "ABONO / PAGO" | "PEDIDO" | "TAREA",
      "subtipoTarea": "AVISO PAGO" | "GRABAR POLO" | "AVISO RUTA" | "GENERAL",
      "fechaProgramada": "${todayISO()}",
      "cliente": "BARBERIA | BARBERO",
      "zona": "",
      "items": [{"codigo": "ART-XXX", "qty": 1}],
      "montoManual": 0,
      "sena": 0,
      "abonoParcial": 0,
      "medio": "EFECTIVO" | "TRANSFERENCIA" | "CUENTA CORRIENTE",
      "notas": "detalle exacto de productos o concepto"
    }
  ]
}`;
}

function processWhatsAppAudioFile(file) {
  if (!config.geminiKey) {
    showToast('Configurá tu Gemini API Key en "Nube & IA" para leer audios de WhatsApp.');
    switchTab('nube');
    return;
  }

  const dropHint = document.getElementById('drop-hint-text');
  if (dropHint) dropHint.innerHTML = `⏳ Escuchando audio completo <strong>${file.name}</strong>...`;
  showToast('Analizando todas las operaciones del audio con Gemini...');

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const base64Data = reader.result.split(',')[1];
      const mimeType = getAudioMimeType(file);
      const prompt = buildSmartExtractionPrompt();

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }]
        })
      });

      const data = await res.json();
      if (!data.candidates || !data.candidates[0]) throw new Error('Sin respuesta de Gemini');

      const rawJson = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(rawJson);

      if (parsed.transcripcion) {
        document.getElementById('voice-input').value = parsed.transcripcion;
      }

      const ops = Array.isArray(parsed.operaciones) ? parsed.operaciones : [parsed];

      if (ops.length === 1 && ops[0].tipo !== 'TAREA') {
        closeBatchReview();
        applyParsedCommandToForm(ops[0] || {});
      } else {
        document.getElementById('detected-order-banner').style.display = 'none';
        renderBatchReview(ops);
      }

      if (dropHint) dropHint.innerHTML = `✅ Audio procesado (${ops.length} ${ops.length === 1 ? 'acción detectada' : 'acciones detectadas'})`;
    } catch (err) {
      console.error(err);
      if (dropHint) dropHint.innerHTML = `❌ Error al procesar el audio. Verificá tu Gemini API Key.`;
      showToast('Error al procesar el audio con Gemini.');
    }
  };
  reader.readAsDataURL(file);
}

function renderBatchReview(ops) {
  pendingBatchOps = ops.map(op => {
    let total = Number(op.montoManual) || 0;
    const resolvedItems = [];
    if (op.items && op.items.length) {
      total = 0;
      op.items.forEach(it => {
        const prod = db.inv.find(p => p.codigo === it.codigo);
        if (prod) {
          const qty = Number(it.qty) || 1;
          const precio = Number(prod.venta) || 0;
          total += qty * precio;
          resolvedItems.push({ codigo: prod.codigo, producto: prod.producto, qty, precio });
        }
      });
    }
    return {
      ...op,
      zona: op.zona || '',
      sena: Number(op.sena) || 0,
      fechaProgramada: op.fechaProgramada || todayISO(),
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
        <strong style="color:#6ee7b7; font-size:13px;">📋 ${pendingBatchOps.length} Acciones Detectadas</strong>
        <button type="button" class="btn-icon" onclick="closeBatchReview()" title="Cancelar lote">✕</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; max-height:380px; overflow-y:auto; padding-right:2px;">
        ${pendingBatchOps.map((op, idx) => {
          const isTask = op.tipo === 'TAREA';
          const isOrder = op.tipo === 'PEDIDO';
          const itemsDesc = op.resolvedItems.length
            ? op.resolvedItems.map(i => `${i.qty}x ${i.producto}`).join(', ')
            : (op.notas || 'Movimiento directo');
          return `
            <div style="background:rgba(8,12,24,0.88); border:1px solid rgba(59,130,246,0.28); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <select onchange="pendingBatchOps[${idx}].tipo = this.value; renderBatchReview(pendingBatchOps);" style="padding:5px 8px; font-size:11.5px; font-weight:700; width:auto;">
                  <option value="VENTA FIADA" ${op.tipo === 'VENTA FIADA' ? 'selected' : ''}>📝 VENTA FIADA</option>
                  <option value="VENTA CONTADO" ${op.tipo === 'VENTA CONTADO' ? 'selected' : ''}>✅ VENTA CONTADO</option>
                  <option value="ABONO / PAGO" ${op.tipo === 'ABONO / PAGO' ? 'selected' : ''}>💵 ABONO / PAGO</option>
                  <option value="PEDIDO" ${op.tipo === 'PEDIDO' ? 'selected' : ''}>📦 PEDIDO</option>
                  <option value="TAREA" ${op.tipo === 'TAREA' ? 'selected' : ''}>📅 TAREA / AVISO</option>
                </select>
                ${isOrder ? `<span style="font-size:11px; color:#fcd34d;">Seña: $<input type="number" value="${op.sena || 0}" onchange="pendingBatchOps[${idx}].sena = Number(this.value)" style="width:76px; padding:3px 6px; font-size:11px; display:inline-block;" /></span>` : ''}
                <button type="button" class="btn-icon btn-icon-del" onclick="removeBatchItem(${idx})" style="font-size:15px;" title="Quitar">🗑</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <input type="text" list="clientes-datalist" value="${op.cliente || ''}" onchange="pendingBatchOps[${idx}].cliente = this.value" placeholder="BARBERIA | BARBERO" style="padding:6px 9px; font-size:12.5px; font-weight:700; flex:1;" />
                ${isTask
                  ? `<input type="date" value="${op.fechaProgramada}" onchange="pendingBatchOps[${idx}].fechaProgramada = this.value" style="width:130px; padding:6px 8px; font-size:12px;" />`
                  : `<input type="number" value="${op.totalCalculado}" onchange="pendingBatchOps[${idx}].totalCalculado = Number(this.value)" style="width:110px; padding:6px 8px; text-align:right; font-weight:700;" />`
                }
              </div>
              <input type="text" value="${itemsDesc}" onchange="pendingBatchOps[${idx}].notas = this.value" style="padding:5px 8px; font-size:11.5px;" />
            </div>
          `;
        }).join('')}
      </div>
      <button type="button" class="btn-primary btn-full" style="margin-top:12px;" onclick="saveAllBatchOperations()">✅ Confirmar y Guardar Todas (${pendingBatchOps.length})</button>
    </div>
  `;
  showToast(`Se detectaron ${pendingBatchOps.length} acciones. Revisalas y tocá Guardar Todas.`);
}

function removeBatchItem(idx) {
  pendingBatchOps.splice(idx, 1);
  if (!pendingBatchOps.length) closeBatchReview();
  else renderBatchReview(pendingBatchOps);
}

function closeBatchReview() {
  pendingBatchOps = [];
  const box = document.getElementById('batch-review-container');
  if (box) box.style.display = 'none';
}

function ensureClientExists(barberiaStr, barberoStr, zonaStr = '') {
  const b1 = (barberiaStr || '').trim().toUpperCase();
  const b2 = (barberoStr || '').trim().toUpperCase();
  if (!b1) return;

  const exists = db.clients.some(c =>
    ((c.barberia || '').toUpperCase() === b1 && (c.barbero || '').toUpperCase() === (b2 || b1)) ||
    (!b2 && ((c.barbero || '').toUpperCase() === b1 || (c.barberia || '').toUpperCase() === b1))
  );

  if (!exists) {
    const inferredZone = (zonaStr || (b1.includes('CELINA') ? 'VILLA CELINA' : '')).toUpperCase();
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
  if (config.cloudKey && config.cloudBin) await syncFromCloud(true);

  const fecha = document.getElementById('mov-fecha').value || todayISO();

  pendingBatchOps.forEach((op, index) => {
    const rawCli = (op.cliente || '').trim();
    let barberia = rawCli, barbero = '';
    if (rawCli.includes('|')) {
      const parts = rawCli.split('|');
      barberia = parts[0].trim();
      barbero = parts[1].trim();
    }

    ensureClientExists(barberia, barbero, op.zona);

    if (op.tipo === 'TAREA') {
      db.tasks.unshift({
        id: 'TSK-' + (Date.now() + index),
        fecha: op.fechaProgramada || fecha,
        tipo: op.subtipoTarea || 'AVISO PAGO',
        cliente: rawCli.toUpperCase(),
        titulo: op.notas || 'Tarea programada por audio',
        done: false
      });
    } else if (op.tipo === 'PEDIDO') {
      const matched = findClientByComposite(rawCli);
      db.orders.unshift({
        id: 'ORD-' + (Date.now() + index),
        fecha,
        cliente: barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : barberia.toUpperCase(),
        ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
        items: op.resolvedItems,
        detalleManual: op.resolvedItems.length ? '' : (op.notas || 'Pedido por lote'),
        totalEstimado: op.totalCalculado,
        sena: Number(op.sena) || 0,
        estado: 'PENDIENTE',
        notas: op.notas || ''
      });
    } else {
      if (op.resolvedItems.length && op.tipo !== 'ABONO / PAGO') {
        op.resolvedItems.forEach(item => {
          const invItem = db.inv.find(x => x.codigo === item.codigo);
          if (invItem) invItem.stock = Number(invItem.stock) - item.qty;
        });
      }

      const detalleText = op.resolvedItems.length
        ? op.resolvedItems.map(i => `${i.qty}x ${i.producto}`).join(', ')
        : (op.notas || op.tipo);

      db.movs.push({
        id: 'MOV-' + (Date.now() + index),
        fecha,
        barberia: barberia.toUpperCase(),
        barbero: barbero.toUpperCase(),
        tipo: op.tipo,
        detalle: detalleText,
        medio: op.medio || 'EFECTIVO',
        monto: op.totalCalculado,
        items: op.resolvedItems,
        obs: op.notas || ''
      });

      if (op.tipo === 'VENTA FIADA' && Number(op.abonoParcial) > 0) {
        db.movs.push({
          id: 'MOV-' + (Date.now() + index + 500),
          fecha,
          barberia: barberia.toUpperCase(),
          barbero: barbero.toUpperCase(),
          tipo: 'ABONO / PAGO',
          detalle: 'Entrega a cuenta en el momento de la venta',
          medio: op.medio || 'EFECTIVO',
          monto: Number(op.abonoParcial),
          obs: ''
        });
      }
    }
  });

  const count = pendingBatchOps.length;
  closeBatchReview();
  document.getElementById('voice-input').value = '';
  await persistData();
  showToast(`✅ ¡${count} acciones guardadas en Historial y sincronizadas!`);
}

function applyParsedCommandToForm(parsed) {
  currentCart = [];
  renderCart();
  document.getElementById('mov-abono-parcial').value = '';
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-detalle').value = '';
  document.getElementById('mov-obs').value = parsed.notas || '';

  if (parsed.tipo) document.getElementById('mov-tipo').value = parsed.tipo;
  toggleProductPicker();
  if (parsed.cliente) document.getElementById('mov-cliente-search').value = parsed.cliente;
  if (parsed.medio) document.getElementById('mov-medio').value = parsed.medio;
  if (parsed.abonoParcial) document.getElementById('mov-abono-parcial').value = parsed.abonoParcial;

  if (parsed.items && parsed.items.length) {
    parsed.items.forEach(it => {
      const prod = db.inv.find(p => p.codigo === it.codigo);
      if (prod) currentCart.push({ codigo: prod.codigo, producto: prod.producto, qty: Number(it.qty) || 1, precio: Number(prod.venta) || 0 });
    });
    renderCart();
  } else if (parsed.montoManual) {
    document.getElementById('mov-monto').value = parsed.montoManual;
  }

  const banner = document.getElementById('detected-order-banner');
  if (parsed.tipo === 'PEDIDO') {
    lastDetectedOrder = parsed;
    const summaryItems = currentCart.length
      ? currentCart.map(i => `${i.qty}x ${i.producto}`).join(', ')
      : (parsed.notas || document.getElementById('voice-input').value);
    document.getElementById('detected-order-summary').textContent = `${parsed.cliente || 'Cliente'}: ${summaryItems}`;
    banner.style.display = 'flex';
    showToast('📦 Pedido detectado. Guardalo para sumarlo al Historial y Pedidos.');
  } else {
    lastDetectedOrder = null;
    banner.style.display = 'none';
    showToast('¡Listo! Revisá los datos y tocá Guardar Operación.');
  }
}

async function saveDetectedOrder() {
  if (!lastDetectedOrder) return;
  const rawCli = document.getElementById('mov-cliente-search').value.trim() || lastDetectedOrder.cliente || 'SIN CLIENTE';
  const matched = findClientByComposite(rawCli);

  db.orders.unshift({
    id: 'ORD-' + Date.now(),
    fecha: document.getElementById('mov-fecha').value || todayISO(),
    cliente: rawCli.toUpperCase(),
    ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
    items: [...currentCart],
    detalleManual: currentCart.length ? '' : (document.getElementById('mov-detalle').value.trim() || document.getElementById('voice-input').value.trim()),
    totalEstimado: Number(document.getElementById('mov-monto').value) || 0,
    sena: Number(lastDetectedOrder.sena) || 0,
    estado: 'PENDIENTE',
    notas: document.getElementById('mov-obs').value.trim()
  });

  document.getElementById('detected-order-banner').style.display = 'none';
  lastDetectedOrder = null;
  currentCart = [];
  renderCart();
  document.getElementById('voice-input').value = '';
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-detalle').value = '';
  document.getElementById('mov-obs').value = '';
  await persistData();
  showToast('📦 Pedido guardado en Historial y bandeja de Pedidos');
}

/* --- DICTADO POR VOZ E INTERPRETACIÓN INTELIGENTE DE TEXTO / RESÚMENES --- */
function startDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return showToast('Tu navegador no soporta dictado directo; usá el micrófono del teclado o subí el audio de WhatsApp.');

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
  if (!text) return showToast('Escribí, pegá un resumen o subí primero un audio');

  if (config.geminiKey) {
    showToast('Interpretando resumen con IA...');
    try {
      const prompt = buildSmartExtractionPrompt(text);

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const rawJson = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(rawJson);
      const ops = Array.isArray(parsed.operaciones) ? parsed.operaciones : [parsed];

      if (ops.length === 1 && ops[0].tipo !== 'TAREA') {
        closeBatchReview();
        applyParsedCommandToForm(ops[0] || {});
      } else {
        document.getElementById('detected-order-banner').style.display = 'none';
        renderBatchReview(ops);
      }
      return;
    } catch (err) {
      showToast('Fallo IA, aplicando lectura rápida local...');
    }
  }

  currentCart = [];
  renderCart();
  const lower = text.toLowerCase();
  if (lower.includes('pedido') || lower.includes('encarg') || lower.includes('llevarle')) {
    document.getElementById('mov-tipo').value = 'PEDIDO';
  } else if (lower.includes('abon') || (lower.includes('pagó') && !lower.includes('llev') && !lower.includes('vend'))) {
    document.getElementById('mov-tipo').value = 'ABONO / PAGO';
  } else if (lower.includes('contado')) {
    document.getElementById('mov-tipo').value = 'VENTA CONTADO';
  } else {
    document.getElementById('mov-tipo').value = 'VENTA FIADA';
  }
  toggleProductPicker();

  const matchedCli = db.clients.find(c =>
    (c.barberia && lower.includes(c.barberia.toLowerCase())) ||
    (c.barbero && c.barbero.length > 3 && lower.includes(c.barbero.toLowerCase()))
  );
  if (matchedCli) {
    document.getElementById('mov-cliente-search').value = `${matchedCli.barberia} | ${matchedCli.barbero}`;
  }

  const nums = text.match(/\d{4,}/g);
  if (nums && nums.length) {
    document.getElementById('mov-monto').value = nums[0];
  }
  document.getElementById('mov-detalle').value = text;
  showToast('Datos pre-cargados. Verificá cliente y productos.');
}

async function saveMovement(e) {
  e.preventDefault();
  if (config.cloudKey && config.cloudBin) {
    await syncFromCloud(true);
  }

  const rawCli = document.getElementById('mov-cliente-search').value.trim();
  let barberia = rawCli, barbero = '';
  if (rawCli.includes('|')) {
    const parts = rawCli.split('|');
    barberia = parts[0].trim();
    barbero = parts[1].trim();
  }

  ensureClientExists(barberia, barbero);

  const tipo = document.getElementById('mov-tipo').value;
  const monto = Number(document.getElementById('mov-monto').value) || 0;
  const abonoParcial = Number(document.getElementById('mov-abono-parcial').value) || 0;
  const fecha = document.getElementById('mov-fecha').value;
  const medio = document.getElementById('mov-medio').value;

  if (tipo === 'PEDIDO') {
    const matched = findClientByComposite(rawCli);
    db.orders.unshift({
      id: 'ORD-' + Date.now(),
      fecha,
      cliente: barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : barberia.toUpperCase(),
      ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
      items: [...currentCart],
      detalleManual: currentCart.length ? '' : document.getElementById('mov-detalle').value.trim(),
      totalEstimado: monto,
      sena: 0,
      estado: 'PENDIENTE',
      notas: document.getElementById('mov-obs').value.trim()
    });

    currentCart = [];
    renderCart();
    document.getElementById('mov-monto').value = '';
    document.getElementById('mov-detalle').value = '';
    document.getElementById('mov-obs').value = '';
    document.getElementById('voice-input').value = '';
    await persistData();
    showToast('📦 Pedido guardado en el Historial y bandeja Pedidos');
    return;
  }

  if (currentCart.length && tipo !== 'ABONO / PAGO') {
    currentCart.forEach(item => {
      const invItem = db.inv.find(x => x.codigo === item.codigo);
      if (invItem) invItem.stock = Number(invItem.stock) - item.qty;
    });
  }

  db.movs.push({
    id: 'MOV-' + Date.now(),
    fecha,
    barberia: barberia.toUpperCase(),
    barbero: barbero.toUpperCase(),
    tipo,
    detalle: document.getElementById('mov-detalle').value.trim(),
    medio,
    monto,
    items: [...currentCart],
    obs: document.getElementById('mov-obs').value.trim()
  });

  if (tipo === 'VENTA FIADA' && abonoParcial > 0) {
    db.movs.push({
      id: 'MOV-' + (Date.now() + 1),
      fecha,
      barberia: barberia.toUpperCase(),
      barbero: barbero.toUpperCase(),
      tipo: 'ABONO / PAGO',
      detalle: 'Entrega a cuenta en el momento de la venta',
      medio,
      monto: abonoParcial,
      obs: ''
    });
  }

  currentCart = [];
  renderCart();
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-abono-parcial').value = '';
  document.getElementById('mov-detalle').value = '';
  document.getElementById('mov-obs').value = '';
  document.getElementById('voice-input').value = '';
  await persistData();
  showToast('Movimiento guardado y stock actualizado');
}

function deleteMovement(id) {
  if (!confirm('¿Eliminar este movimiento? Se recalculará el saldo y se devolverá el stock si tenía productos.')) return;
  const mov = db.movs.find(m => m.id === id);
  if (mov && mov.items && mov.items.length && mov.tipo !== 'ABONO / PAGO') {
    mov.items.forEach(it => {
      const invItem = db.inv.find(x => x.codigo === it.codigo);
      if (invItem) invItem.stock = Number(invItem.stock) + Number(it.qty);
    });
  }
  db.movs = db.movs.filter(m => m.id !== id);
  persistData();
  showToast('Movimiento eliminado y stock restaurado');
}

function renderMovements() {
  const papaDateInput = document.getElementById('papa-day-date');
  const selectedDay = (papaDateInput && papaDateInput.value) ? papaDateInput.value : todayISO();

  let dayContado = 0, dayFiado = 0, dayCobrado = 0, dayVentasCount = 0;
  let dayPedidosMonto = 0, dayPedidosCount = 0;

  (db.movs || []).forEach(m => {
    if (m.fecha === selectedDay) {
      const monto = Number(m.monto) || 0;
      if (m.tipo === 'VENTA CONTADO') { dayContado += monto; dayVentasCount++; }
      if (m.tipo === 'VENTA FIADA') { dayFiado += monto; dayVentasCount++; }
      if (m.tipo === 'ABONO / PAGO') { dayCobrado += monto; }
    }
  });

  (db.orders || []).forEach(o => {
    if (o.fecha === selectedDay) {
      dayPedidosMonto += Number(o.totalEstimado) || 0;
      dayPedidosCount++;
    }
  });

  if (document.getElementById('papa-total-vendido')) {
    document.getElementById('papa-total-vendido').textContent = fmtMoney(dayContado + dayFiado);
    document.getElementById('papa-ventas-count').textContent = `${dayVentasCount} ${dayVentasCount === 1 ? 'venta registrada' : 'ventas registradas'}`;
    document.getElementById('papa-contado-fiado').textContent = `${fmtMoney(dayContado)} / ${fmtMoney(dayFiado)}`;
    document.getElementById('papa-cobrado-dia').textContent = fmtMoney(dayCobrado);
    document.getElementById('papa-pedidos-dia').textContent = fmtMoney(dayPedidosMonto);
    document.getElementById('papa-pedidos-count').textContent = `${dayPedidosCount} ${dayPedidosCount === 1 ? 'encargo' : 'encargos'} ese día`;
    document.getElementById('papa-day-label').textContent = `Fecha consultada: ${selectedDay}`;
  }

  const tbody = document.getElementById('all-movs-body');
  if (!tbody) return;

  const q = (document.getElementById('movs-history-search')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('movs-type-filter')?.value || 'TODOS';
  const onlySelectedDate = document.getElementById('filter-movs-by-papa-date')?.checked || false;

  const unifiedList = getUnifiedOperationsList().filter(item => {
    if (onlySelectedDate && item.fecha !== selectedDay) return false;

    if (typeFilter === 'VENTAS' && item.tipo !== 'VENTA FIADA' && item.tipo !== 'VENTA CONTADO') return false;
    if (typeFilter === 'PEDIDO' && !item.isOrder) return false;
    if (typeFilter === 'ABONO / PAGO' && item.tipo !== 'ABONO / PAGO') return false;

    if (q) {
      const hay = `${item.barberia} ${item.barbero} ${item.detalle} ${item.tipo} ${item.fecha}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  tbody.innerHTML = unifiedList.length ? unifiedList.map(m => {
    let badgeClass = 'badge-blue';
    if (m.tipo === 'ABONO / PAGO') badgeClass = 'badge-green';
    else if (m.tipo === 'VENTA FIADA') badgeClass = 'badge-amber';
    else if (m.isOrder) badgeClass = m.orderEstado === 'ENTREGADO' ? 'badge-green' : 'badge-purple';

    const delAction = m.isOrder ? `deleteOrder('${m.id}')` : `deleteMovement('${m.id}')`;

    return `
      <tr>
        <td>${m.fecha}</td>
        <td>
          <div class="font-bold">${m.barberia}${m.barbero ? ' · ' + m.barbero : ''}</div>
          <div class="muted" style="font-size:11.5px;">${m.detalle || ''}</div>
        </td>
        <td><span class="kpi-badge ${badgeClass}">${m.isOrder ? '📦 ' + m.tipo : m.tipo}</span></td>
        <td class="text-right font-bold">${fmtMoney(m.monto)}</td>
        <td class="text-right" style="white-space:nowrap;">
          <div class="action-icon-group">
            <button class="btn-icon" onclick="openEditOperationModal('${m.id}', ${m.isOrder})" title="Editar operación">✏️</button>
            <button class="btn-icon btn-icon-del" onclick="${delAction}" title="Eliminar">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="5" class="text-center muted" style="padding:24px;">No hay operaciones registradas con este filtro.</td></tr>`;
}

/* --- BANDEJA DE PEDIDOS & ENCARGOS --- */
function setOrderFilter(status, btn) {
  activeOrderFilter = status;
  document.querySelectorAll('#order-status-filters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderOrders();
}

function renderOrders() {
  const q = (document.getElementById('order-search').value || '').toLowerCase();
  const tbody = document.getElementById('orders-body');
  if (!tbody) return;

  const orders = (db.orders || [])
    .filter(o => activeOrderFilter === 'TODOS' || o.estado === activeOrderFilter)
    .filter(o => {
      const itemsStr = (o.items || []).map(i => i.producto).join(' ').toLowerCase();
      return (o.cliente || '').toLowerCase().includes(q) ||
             itemsStr.includes(q) ||
             (o.detalleManual || '').toLowerCase().includes(q) ||
             (o.notas || '').toLowerCase().includes(q);
    });

  tbody.innerHTML = orders.length ? orders.map(o => {
    const desc = (o.items && o.items.length)
      ? o.items.map(i => `${i.qty}x ${i.producto}`).join(', ')
      : (o.detalleManual || o.notas || 'Pedido sin detalle');
    const sena = Number(o.sena) || 0;
    const total = Number(o.totalEstimado) || 0;
    const resta = Math.max(0, total - sena);
    const senaInfo = sena > 0
      ? `<div class="text-green" style="font-size:11px;">Seña: ${fmtMoney(sena)} · Resta: <b>${fmtMoney(resta)}</b></div>`
      : '';

    const isPending = o.estado === 'PENDIENTE';
    const actionBtns = isPending
      ? `<div class="action-icon-group">
           <button class="btn-sm btn-wa" onclick="deliverOrder('${o.id}', 'VENTA FIADA')" title="Entregar Fiado (por el saldo restante)">Fiado</button>
           <button class="btn-sm btn-pay" onclick="deliverOrder('${o.id}', 'VENTA CONTADO')" title="Entregar Contado (por el saldo restante)">Contado</button>
           <button class="btn-icon" onclick="openEditOperationModal('${o.id}', true)" title="Editar pedido">✏️</button>
           <button class="btn-icon btn-icon-del" onclick="deleteOrder('${o.id}')" title="Eliminar">🗑</button>
         </div>`
      : `<div class="action-icon-group">
           <span class="kpi-badge badge-green">ENTREGADO</span>
           <button class="btn-icon" onclick="openEditOperationModal('${o.id}', true)" title="Editar pedido">✏️</button>
           <button class="btn-icon btn-icon-del" onclick="deleteOrder('${o.id}')" title="Eliminar">🗑</button>
         </div>`;

    return `
      <tr>
        <td><div class="font-bold">${o.fecha}</div><div class="muted" style="font-size:11px;">${o.ruta || 'A DEFINIR'}</div></td>
        <td><div class="font-bold">${o.cliente}</div>${o.notas ? `<div class="muted" style="font-size:11px;">📝 ${o.notas}</div>` : ''}</td>
        <td><div>${desc}</div>${senaInfo}</td>
        <td class="text-right font-bold">${fmtMoney(total)}</td>
        <td class="text-right" style="white-space:nowrap;">${actionBtns}</td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="5" class="text-center muted" style="padding:24px;">No hay pedidos en esta vista.</td></tr>`;

  const picking = {};
  (db.orders || []).filter(o => o.estado === 'PENDIENTE').forEach(o => {
    if (o.items && o.items.length) {
      o.items.forEach(it => {
        picking[it.producto] = (picking[it.producto] || 0) + Number(it.qty);
      });
    } else if (o.detalleManual) {
      picking[o.detalleManual] = (picking[o.detalleManual] || 0) + 1;
    }
  });

  const pickingEl = document.getElementById('orders-picking-list');
  if (pickingEl) {
    const entries = Object.entries(picking);
    pickingEl.innerHTML = entries.length ? entries.map(([prod, qty]) => `
      <div class="activity-item">
        <span class="font-bold" style="font-size:13px;">${prod}</span>
        <span class="kpi-badge badge-amber">${qty} u.</span>
      </div>
    `).join('') : '<p class="muted">No hay artículos pendientes para preparar.</p>';
  }
}

async function saveQuickOrder(e) {
  e.preventDefault();
  const rawCli = document.getElementById('quick-order-cli').value.trim();
  const detail = document.getElementById('quick-order-detail').value.trim();
  const total = Number(document.getElementById('quick-order-total').value) || 0;
  const nota = document.getElementById('quick-order-nota').value.trim();
  const matched = findClientByComposite(rawCli);

  db.orders.unshift({
    id: 'ORD-' + Date.now(),
    fecha: todayISO(),
    cliente: rawCli.toUpperCase(),
    ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
    items: [],
    detalleManual: detail,
    totalEstimado: total,
    sena: 0,
    estado: 'PENDIENTE',
    notas: nota
  });

  document.getElementById('quick-order-cli').value = '';
  document.getElementById('quick-order-detail').value = '';
  document.getElementById('quick-order-total').value = 0;
  document.getElementById('quick-order-nota').value = '';
  await persistData();
  showToast('📦 Pedido anotado y agregado al Historial');
}

async function deliverOrder(orderId, tipoVenta) {
  const ord = db.orders.find(o => o.id === orderId);
  if (!ord) return;
  const sena = Number(ord.sena) || 0;
  const saldoRestante = Math.max(0, (Number(ord.totalEstimado) || 0) - sena);
  const confirmMsg = sena > 0
    ? `¿Marcar pedido de ${ord.cliente} como ENTREGADO (${tipoVenta})?\nTotal: ${fmtMoney(ord.totalEstimado)} | Seña ya cobrada: ${fmtMoney(sena)} | Saldo a registrar ahora: ${fmtMoney(saldoRestante)}`
    : `¿Marcar pedido de ${ord.cliente} como ENTREGADO (${tipoVenta}) por ${fmtMoney(saldoRestante)}?`;

  if (!confirm(confirmMsg)) return;

  if (config.cloudKey && config.cloudBin) await syncFromCloud(true);
  const currentOrd = db.orders.find(o => o.id === orderId);
  if (!currentOrd) return;

  if (currentOrd.items && currentOrd.items.length) {
    currentOrd.items.forEach(item => {
      const invItem = db.inv.find(x => x.codigo === item.codigo);
      if (invItem) invItem.stock = Number(invItem.stock) - Number(item.qty);
    });
  }

  const parts = (currentOrd.cliente || '').split('|');
  const barberia = (parts[0] || '').trim().toUpperCase();
  const barbero = (parts[1] || '').trim().toUpperCase();
  const detalleBase = (currentOrd.items && currentOrd.items.length)
    ? currentOrd.items.map(i => `${i.qty}x ${i.producto}`).join(', ')
    : (currentOrd.detalleManual || 'Pedido entregado');
  const detalleText = sena > 0 ? `${detalleBase} (Saldo restante tras seña de ${fmtMoney(sena)})` : detalleBase;

  if (saldoRestante > 0) {
    db.movs.push({
      id: 'MOV-' + Date.now(),
      fecha: todayISO(),
      barberia,
      barbero,
      tipo: tipoVenta,
      detalle: detalleText,
      medio: tipoVenta === 'VENTA FIADA' ? 'CUENTA CORRIENTE' : 'EFECTIVO',
      monto: saldoRestante,
      items: currentOrd.items || [],
      obs: currentOrd.notas || 'Pedido entregado'
    });
  }

  currentOrd.estado = 'ENTREGADO';
  await persistData();
  showToast(`✅ Pedido entregado (${fmtMoney(saldoRestante)} registrados) y stock actualizado`);
}

function deleteOrder(id) {
  if (!confirm('¿Eliminar este pedido?')) return;
  db.orders = db.orders.filter(o => o.id !== id);
  persistData();
  showToast('Pedido eliminado');
}

/* --- CLIENTES (CREAR, EDITAR Y ELIMINAR) --- */
function renderClients() {
  const q = (document.getElementById('cli-search').value || '').toLowerCase();
  const filtered = db.clients.filter(c =>
    (c.barberia || '').toLowerCase().includes(q) ||
    (c.barbero || '').toLowerCase().includes(q) ||
    (c.zona || '').toLowerCase().includes(q) ||
    (c.ruta || '').toLowerCase().includes(q)
  );
  document.getElementById('clients-body').innerHTML = filtered.map(c => {
    const saldo = getClientBalance(c);
    return `
      <tr>
        <td class="font-bold">${c.barberia}</td>
        <td>${c.barbero}</td>
        <td><div>${c.zona || '-'}</div><div class="muted" style="font-size:11.5px;">${c.direccion || ''}</div></td>
        <td>${c.ruta || '-'}</td>
        <td><span class="tag-tier tier-${c.categoria}">${c.categoria}</span></td>
        <td class="text-right font-bold ${saldo > 0 ? 'text-amber' : 'text-green'}">${fmtMoney(saldo)}</td>
        <td class="text-right" style="white-space:nowrap;">
          <div class="action-icon-group">
            <button class="btn-icon" onclick="openClientModal('${c.id}')" title="Editar cliente">✏️</button>
            <button class="btn-icon btn-icon-del" onclick="deleteClient('${c.id}')" title="Eliminar cliente">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openClientModal(id = null) {
  document.getElementById('client-modal').style.display = 'flex';
  if (id) {
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
    document.getElementById('cli-deuda').value = c.deudaBase || 0;
    document.getElementById('cli-notas').value = c.notas || '';
  } else {
    document.getElementById('client-modal-title').textContent = 'Nuevo Cliente';
    ['edit-cli-id','cli-barberia','cli-barbero','cli-zona','cli-tel','cli-dir','cli-notas'].forEach(k => document.getElementById(k).value = '');
    document.getElementById('cli-deuda').value = 0;
  }
}

function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('edit-cli-id').value;
  const payload = {
    id: id || 'CLI-' + String(db.clients.length + 1).padStart(3, '0'),
    barberia: document.getElementById('cli-barberia').value.trim().toUpperCase(),
    barbero: document.getElementById('cli-barbero').value.trim().toUpperCase(),
    zona: document.getElementById('cli-zona').value.trim().toUpperCase(),
    ruta: document.getElementById('cli-ruta').value,
    telefono: document.getElementById('cli-tel').value.trim(),
    categoria: document.getElementById('cli-cat').value,
    direccion: document.getElementById('cli-dir').value.trim().toUpperCase(),
    deudaBase: Number(document.getElementById('cli-deuda').value) || 0,
    notas: document.getElementById('cli-notas').value.trim()
  };
  if (id) {
    const idx = db.clients.findIndex(x => x.id === id);
    if (idx !== -1) db.clients[idx] = payload;
  } else {
    db.clients.unshift(payload);
  }
  closeModal('client-modal');
  persistData();
  showToast('Cliente guardado');
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
    document.getElementById('edit-prod-original-code').value = '';
    document.getElementById('prod-codigo').value = '';
    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-stock').value = 10;
    document.getElementById('prod-venta').value = 6000;
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

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Rapibarbe_Respaldo_${todayISO()}.json`;
  a.click();
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (parsed.clients && parsed.inv) {
        db = parsed;
        ensureDbArrays();
        persistData();
        showToast('Respaldo restaurado');
      }
    } catch (err) { showToast('Archivo inválido'); }
  };
  reader.readAsText(file);
}

function resetToExcelDefault() {
  if (!confirm('¿Volver a los datos originales del Excel?')) return;
  db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [], tasks: [], habits: JSON.parse(JSON.stringify(DEFAULT_HABITS)) };
  persistData();
  showToast('Datos originales restaurados');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}
