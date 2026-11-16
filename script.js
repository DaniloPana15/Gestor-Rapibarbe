// Base de datos inicial migrada desde Rapibarbe_Sistema_Centralizado_v1.xlsx
// (Mantené tu línea const INITIAL_DATA = {...}; intacta arriba de todo, o usá el script.js descargable arriba que ya la incluye completa)

const STORAGE_KEY = 'rapibarbe_db_v3';
const CONFIG_KEY = 'rapibarbe_config_v2';

let db = { clients: [], movs: [], inv: [], orders: [] };
let config = { pin: '1234', cloudKey: '', cloudBin: '', geminiKey: '' };
let activeRouteFilter = 'TODOS';
let activeOrderFilter = 'PENDIENTE';
let currentCart = [];
let lastDetectedOrder = null;
let pendingBatchOps = [];

const fmtMoney = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  loadLocalData();
  document.getElementById('mov-fecha').value = new Date().toISOString().split('T')[0];
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

function loadLocalData() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('rapibarbe_db_v2');
  if (saved) {
    try {
      db = JSON.parse(saved);
      if (!Array.isArray(db.orders)) db.orders = [];
    } catch (e) {
      db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [] };
    }
  } else {
    db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}

async function persistData() {
  if (!Array.isArray(db.orders)) db.orders = [];
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
      if (!Array.isArray(db.orders)) db.orders = [];
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
      showToast('¡Nube creada! Compartí el Bin ID con Freddy.');
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

  document.getElementById('kpi-deuda').textContent = fmtMoney(totalDeuda);
  document.getElementById('kpi-deudores-count').textContent = `${deudoresCount} barberos con saldo activo`;
  document.getElementById('kpi-cobrado').textContent = fmtMoney(totalCobrado);
  document.getElementById('kpi-ventas').textContent = fmtMoney(ventasContado + ventasFiadas);
  document.getElementById('kpi-ventas-split').textContent = `Contado: ${fmtMoney(ventasContado)} · Fiado: ${fmtMoney(ventasFiadas)}`;
  document.getElementById('kpi-stock-bajo').textContent = db.inv.filter(i => Number(i.stock) <= 3).length;
  document.getElementById('kpi-pedidos-pendientes').textContent = pendingOrdersCount;
  document.getElementById('nav-orders-count').textContent = pendingOrdersCount;
}

function setRouteFilter(route, btn) {
  activeRouteFilter = route;
  document.querySelectorAll('#route-filters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderDashboard();
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
    const cleanPhone = (c.telefono || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('54') ? cleanPhone : (cleanPhone ? '549' + cleanPhone : '');
    const waMsg = encodeURIComponent(`Hola ${c.barbero}! Cómo va? Te escribo de Rapibarbe para recordarte el saldo pendiente de ${fmtMoney(c.saldoActual)}. Avisame cuando pase por ${c.zona || 'tu local'}!`);
    const waBtn = waPhone ? `<a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" class="btn-sm btn-wa">WhatsApp</a>` : '';

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

  const recent = [...db.movs].reverse().slice(0, 5);
  document.getElementById('recent-movs-list').innerHTML = recent.map(m => {
    const isPay = m.tipo === 'ABONO / PAGO';
    return `
      <div class="activity-item">
        <div style="min-width:0; flex:1;">
          <div class="font-bold" style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.barberia} — ${m.barbero}</div>
          <div class="muted" style="font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.fecha} · ${m.detalle || m.tipo}</div>
        </div>
        <div class="font-bold ${isPay ? 'text-green' : 'text-main'}" style="flex-shrink:0;">${isPay ? '+' : ''}${fmtMoney(m.monto)}</div>
      </div>
    `;
  }).join('');
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

      const cliList = db.clients.map(c => `${c.barberia} | ${c.barbero} (${c.zona})`).join('; ');
      const invList = db.inv.map(p => `${p.codigo}: ${p.producto} ($${p.venta})`).join('; ');

      const prompt = `Sos el asistente administrativo de Rapibarbe (insumos de barbería en Argentina).
Escuchá este audio de WhatsApp de Freddy. Puede contener UNA o MÚLTIPLES operaciones mezcladas (ventas fiadas, ventas contado, cobros/abonos y pedidos/encargos futuros de distintos clientes).

Clientes válidos: [${cliList}]
Productos válidos: [${invList}]

Reglas:
- Si menciona que entregó/vendió mercadería a pagar después -> tipo = "VENTA FIADA".
- Si menciona que vendió y le pagaron en el acto -> tipo = "VENTA CONTADO".
- Si menciona que cobró plata de una deuda anterior -> tipo = "ABONO / PAGO".
- Si menciona un encargo o pedido para llevar en el futuro ("me pidió", "anotame para el viernes", "encargó") -> tipo = "PEDIDO".
- Separá cada cliente o movimiento distinto en un objeto independiente dentro del array "operaciones".

Devolvé ÚNICAMENTE JSON válido sin markdown con esta estructura exacta:
{
  "transcripcion": "transcripción completa y fiel del audio",
  "operaciones": [
    {
      "tipo": "VENTA FIADA" | "VENTA CONTADO" | "ABONO / PAGO" | "PEDIDO",
      "cliente": "BARBERIA | BARBERO",
      "items": [{"codigo": "ART-XXX", "qty": 1}],
      "montoManual": 0,
      "abonoParcial": 0,
      "medio": "EFECTIVO" | "TRANSFERENCIA" | "CUENTA CORRIENTE",
      "notas": "detalle o día de entrega"
    }
  ]
}`;

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

      if (ops.length <= 1) {
        closeBatchReview();
        applyParsedCommandToForm(ops[0] || {});
      } else {
        document.getElementById('detected-order-banner').style.display = 'none';
        renderBatchReview(ops);
      }

      if (dropHint) dropHint.innerHTML = `✅ Audio procesado (${ops.length} ${ops.length === 1 ? 'operación detectada' : 'operaciones detectadas'})`;
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
    return { ...op, resolvedItems, totalCalculado: total };
  });

  const box = document.getElementById('batch-review-container');
  box.style.display = 'block';
  box.innerHTML = `
    <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.45); border-radius:14px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <strong style="color:#6ee7b7; font-size:13px;">📋 ${pendingBatchOps.length} Operaciones Detectadas en el Audio</strong>
        <button type="button" class="btn-icon" onclick="closeBatchReview()" title="Cancelar lote">✕</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${pendingBatchOps.map((op, idx) => {
          const itemsDesc = op.resolvedItems.length
            ? op.resolvedItems.map(i => `${i.qty}x ${i.producto}`).join(', ')
            : (op.notas || 'Movimiento directo');
          return `
            <div style="background:rgba(8,12,24,0.88); border:1px solid rgba(59,130,246,0.28); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <select onchange="pendingBatchOps[${idx}].tipo = this.value" style="padding:5px 8px; font-size:11.5px; font-weight:700; width:auto;">
                  <option value="VENTA FIADA" ${op.tipo === 'VENTA FIADA' ? 'selected' : ''}>📝 VENTA FIADA</option>
                  <option value="VENTA CONTADO" ${op.tipo === 'VENTA CONTADO' ? 'selected' : ''}>✅ VENTA CONTADO</option>
                  <option value="ABONO / PAGO" ${op.tipo === 'ABONO / PAGO' ? 'selected' : ''}>💵 ABONO / PAGO</option>
                  <option value="PEDIDO" ${op.tipo === 'PEDIDO' ? 'selected' : ''}>📦 PEDIDO</option>
                </select>
                <button type="button" class="btn-icon" onclick="removeBatchItem(${idx})" style="color:#fca5a5; font-size:15px;" title="Quitar">🗑</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <input type="text" list="clientes-datalist" value="${op.cliente || ''}" onchange="pendingBatchOps[${idx}].cliente = this.value" placeholder="BARBERIA | BARBERO" style="padding:6px 9px; font-size:12.5px; font-weight:700; flex:1;" />
                <input type="number" value="${op.totalCalculado}" onchange="pendingBatchOps[${idx}].totalCalculado = Number(this.value)" style="width:100px; padding:6px 8px; text-align:right; font-weight:700;" />
              </div>
              <div class="muted" style="font-size:11.5px;">${itemsDesc}</div>
            </div>
          `;
        }).join('')}
      </div>
      <button type="button" class="btn-primary btn-full" style="margin-top:12px;" onclick="saveAllBatchOperations()">✅ Confirmar y Guardar Todas (${pendingBatchOps.length})</button>
    </div>
  `;
  showToast(`Se detectaron ${pendingBatchOps.length} operaciones. Revisalas y tocá Guardar Todas.`);
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

async function saveAllBatchOperations() {
  if (!pendingBatchOps.length) return;
  if (config.cloudKey && config.cloudBin) await syncFromCloud(true);

  const fecha = document.getElementById('mov-fecha').value || new Date().toISOString().split('T')[0];

  pendingBatchOps.forEach((op, index) => {
    const rawCli = (op.cliente || '').trim();
    let barberia = rawCli, barbero = '';
    if (rawCli.includes('|')) {
      const parts = rawCli.split('|');
      barberia = parts[0].trim();
      barbero = parts[1].trim();
    }

    if (op.tipo === 'PEDIDO') {
      const matched = db.clients.find(c =>
        (c.barberia || '').toUpperCase() === barberia.toUpperCase() &&
        (!barbero || (c.barbero || '').toUpperCase() === barbero.toUpperCase())
      ) || db.clients.find(c => (c.barberia || '').toUpperCase() === barberia.toUpperCase());

      db.orders.unshift({
        id: 'ORD-' + (Date.now() + index),
        fecha,
        cliente: barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : barberia.toUpperCase(),
        ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
        items: op.resolvedItems,
        detalleManual: op.resolvedItems.length ? '' : (op.notas || 'Pedido por audio'),
        totalEstimado: op.totalCalculado,
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
  showToast(`✅ ¡${count} operaciones guardadas y sincronizadas!`);
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
    showToast('📦 Pedido detectado. Podés guardarlo directo en Pedidos.');
  } else {
    lastDetectedOrder = null;
    banner.style.display = 'none';
    showToast('¡Listo! Revisá los datos y tocá Guardar Operación.');
  }
}

async function saveDetectedOrder() {
  if (!lastDetectedOrder) return;
  const rawCli = document.getElementById('mov-cliente-search').value.trim() || lastDetectedOrder.cliente || 'SIN CLIENTE';
  const parts = rawCli.split('|');
  const barberia = (parts[0] || '').trim().toUpperCase();
  const barbero = (parts[1] || '').trim().toUpperCase();
  const matched = db.clients.find(c =>
    (c.barberia || '').toUpperCase() === barberia && (!barbero || (c.barbero || '').toUpperCase() === barbero)
  ) || db.clients.find(c => (c.barberia || '').toUpperCase() === barberia);

  db.orders.unshift({
    id: 'ORD-' + Date.now(),
    fecha: document.getElementById('mov-fecha').value || new Date().toISOString().split('T')[0],
    cliente: rawCli.toUpperCase(),
    ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
    items: [...currentCart],
    detalleManual: currentCart.length ? '' : (document.getElementById('mov-detalle').value.trim() || document.getElementById('voice-input').value.trim()),
    totalEstimado: Number(document.getElementById('mov-monto').value) || 0,
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
  showToast('📦 Pedido guardado en la bandeja de Pedidos');
  switchTab('pedidos');
}

/* --- DICTADO POR VOZ E INTERPRETACIÓN INTELIGENTE DE TEXTO --- */
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
  if (!text) return showToast('Escribí, dictá o subí primero un audio');

  if (config.geminiKey) {
    showToast('Interpretando mensaje con IA...');
    try {
      const cliList = db.clients.map(c => `${c.barberia} | ${c.barbero}`).join('; ');
      const invList = db.inv.map(p => `${p.codigo}: ${p.producto} ($${p.venta})`).join('; ');
      const prompt = `Sos el asistente de Rapibarbe. Extraé en JSON estricto una o varias operaciones de este mensaje: "${text}".
Clientes válidos: [${cliList}]
Productos válidos: [${invList}]
Devolvé SOLO JSON válido con este formato exacto:
{"operaciones":[{"tipo":"VENTA FIADA"|"VENTA CONTADO"|"ABONO / PAGO"|"PEDIDO","cliente":"BARBERIA | BARBERO","items":[{"codigo":"ART-XXX","qty":1}],"montoManual":0,"abonoParcial":0,"medio":"EFECTIVO"|"TRANSFERENCIA"|"CUENTA CORRIENTE","notas":""}]}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const rawJson = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(rawJson);
      const ops = Array.isArray(parsed.operaciones) ? parsed.operaciones : [parsed];

      if (ops.length <= 1) {
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

  const tipo = document.getElementById('mov-tipo').value;
  const monto = Number(document.getElementById('mov-monto').value) || 0;
  const abonoParcial = Number(document.getElementById('mov-abono-parcial').value) || 0;
  const fecha = document.getElementById('mov-fecha').value;
  const medio = document.getElementById('mov-medio').value;

  if (tipo === 'PEDIDO') {
    const matched = db.clients.find(c =>
      (c.barberia || '').toUpperCase() === barberia.toUpperCase() &&
      (!barbero || (c.barbero || '').toUpperCase() === barbero.toUpperCase())
    ) || db.clients.find(c => (c.barberia || '').toUpperCase() === barberia.toUpperCase());

    db.orders.unshift({
      id: 'ORD-' + Date.now(),
      fecha,
      cliente: barbero ? `${barberia.toUpperCase()} | ${barbero.toUpperCase()}` : barberia.toUpperCase(),
      ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
      items: [...currentCart],
      detalleManual: currentCart.length ? '' : document.getElementById('mov-detalle').value.trim(),
      totalEstimado: monto,
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
    showToast('📦 Pedido guardado en bandeja Pedidos');
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
  if (mov && mov.items && mov.items.length) {
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
  const tbody = document.getElementById('all-movs-body');
  tbody.innerHTML = [...db.movs].reverse().map(m => {
    const badgeClass = m.tipo === 'ABONO / PAGO' ? 'badge-green' : (m.tipo === 'VENTA FIADA' ? 'badge-amber' : 'badge-blue');
    return `
      <tr>
        <td>${m.fecha}</td>
        <td><div class="font-bold">${m.barberia}</div><div class="muted" style="font-size:11.5px;">${m.barbero} · ${m.detalle || ''}</div></td>
        <td><span class="kpi-badge ${badgeClass}">${m.tipo}</span></td>
        <td class="text-right font-bold">${fmtMoney(m.monto)}</td>
        <td class="text-right"><button class="btn-icon" onclick="deleteMovement('${m.id}')" title="Eliminar">🗑</button></td>
      </tr>
    `;
  }).join('');
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
    const isPending = o.estado === 'PENDIENTE';
    const actionBtns = isPending
      ? `<button class="btn-sm btn-wa" onclick="deliverOrder('${o.id}', 'VENTA FIADA')" title="Entregar Fiado y descontar stock">Fiado</button>
         <button class="btn-sm btn-pay" onclick="deliverOrder('${o.id}', 'VENTA CONTADO')" title="Entregar Contado y descontar stock">Contado</button>
         <button class="btn-icon" onclick="deleteOrder('${o.id}')" title="Eliminar">🗑</button>`
      : `<span class="kpi-badge badge-green">ENTREGADO</span> <button class="btn-icon" onclick="deleteOrder('${o.id}')" title="Eliminar">🗑</button>`;

    return `
      <tr>
        <td><div class="font-bold">${o.fecha}</div><div class="muted" style="font-size:11px;">${o.ruta || 'A DEFINIR'}</div></td>
        <td><div class="font-bold">${o.cliente}</div>${o.notas ? `<div class="muted" style="font-size:11px;">📝 ${o.notas}</div>` : ''}</td>
        <td>${desc}</td>
        <td class="text-right font-bold">${fmtMoney(o.totalEstimado)}</td>
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

  const parts = rawCli.split('|');
  const barberia = (parts[0] || '').trim().toUpperCase();
  const barbero = (parts[1] || '').trim().toUpperCase();
  const matched = db.clients.find(c =>
    (c.barberia || '').toUpperCase() === barberia && (!barbero || (c.barbero || '').toUpperCase() === barbero)
  ) || db.clients.find(c => (c.barberia || '').toUpperCase() === barberia);

  db.orders.unshift({
    id: 'ORD-' + Date.now(),
    fecha: new Date().toISOString().split('T')[0],
    cliente: rawCli.toUpperCase(),
    ruta: matched ? (matched.ruta || 'A DEFINIR') : 'A DEFINIR',
    items: [],
    detalleManual: detail,
    totalEstimado: total,
    estado: 'PENDIENTE',
    notas: nota
  });

  document.getElementById('quick-order-cli').value = '';
  document.getElementById('quick-order-detail').value = '';
  document.getElementById('quick-order-total').value = 0;
  document.getElementById('quick-order-nota').value = '';
  await persistData();
  showToast('📦 Pedido anotado correctamente');
}

async function deliverOrder(orderId, tipoVenta) {
  const ord = db.orders.find(o => o.id === orderId);
  if (!ord) return;
  if (!confirm(`¿Marcar pedido de ${ord.cliente} como ENTREGADO (${tipoVenta})? Se descontará el stock y se registrará la venta.`)) return;

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
  const detalleText = (currentOrd.items && currentOrd.items.length)
    ? currentOrd.items.map(i => `${i.qty}x ${i.producto}`).join(', ')
    : (currentOrd.detalleManual || 'Pedido entregado');

  db.movs.push({
    id: 'MOV-' + Date.now(),
    fecha: new Date().toISOString().split('T')[0],
    barberia,
    barbero,
    tipo: tipoVenta,
    detalle: detalleText,
    medio: tipoVenta === 'VENTA FIADA' ? 'CUENTA CORRIENTE' : 'EFECTIVO',
    monto: Number(currentOrd.totalEstimado) || 0,
    items: currentOrd.items || [],
    obs: currentOrd.notas || 'Pedido entregado'
  });

  currentOrd.estado = 'ENTREGADO';
  await persistData();
  showToast(`✅ Pedido entregado como ${tipoVenta} y stock actualizado`);
}

function deleteOrder(id) {
  if (!confirm('¿Eliminar este pedido?')) return;
  db.orders = db.orders.filter(o => o.id !== id);
  persistData();
  showToast('Pedido eliminado');
}

/* --- CLIENTES --- */
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
        <td class="text-right"><button class="btn-sm btn-pay" onclick="openClientModal('${c.id}')">Editar</button></td>
      </tr>
    `;
  }).join('');
}

function openClientModal(id = null) {
  document.getElementById('client-modal').style.display = 'flex';
  if (id) {
    const c = db.clients.find(x => x.id === id);
    document.getElementById('client-modal-title').textContent = 'Editar Cliente';
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

/* --- INVENTARIO --- */
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
        <td class="text-right">
          <div class="stock-stepper">
            <button class="step-btn" onclick="adjustStock('${i.codigo}', -1)">-1</button>
            <button class="step-btn" onclick="adjustStock('${i.codigo}', 1)">+1</button>
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

function openProductModal() { document.getElementById('product-modal').style.display = 'flex'; }

function saveProduct(e) {
  e.preventDefault();
  db.inv.unshift({
    codigo: 'ART-' + String(db.inv.length + 1).padStart(3, '0'),
    producto: document.getElementById('prod-nombre').value.trim().toUpperCase(),
    stock: Number(document.getElementById('prod-stock').value) || 0,
    costo: 0,
    venta: Number(document.getElementById('prod-venta').value) || 0
  });
  document.getElementById('prod-nombre').value = '';
  closeModal('product-modal');
  persistData();
  showToast('Producto agregado al stock');
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Rapibarbe_Respaldo_${new Date().toISOString().slice(0,10)}.json`;
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
        if (!Array.isArray(parsed.orders)) parsed.orders = [];
        db = parsed;
        persistData();
        showToast('Respaldo restaurado');
      }
    } catch (err) { showToast('Archivo inválido'); }
  };
  reader.readAsText(file);
}

function resetToExcelDefault() {
  if (!confirm('¿Volver a los datos originales del Excel?')) return;
  db = { ...JSON.parse(JSON.stringify(INITIAL_DATA)), orders: [] };
  persistData();
  showToast('Datos originales restaurados');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}
