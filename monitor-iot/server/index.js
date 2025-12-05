// Cargar variables de entorno: primero `.env.local` (si existe), luego `.env`
try {
  const dotenv = require('dotenv');
  const envLocal = require('path').join(__dirname, '.env.local');
  const fsCheck = require('fs');
  if (fsCheck.existsSync(envLocal)) {
    dotenv.config({ path: envLocal });
    console.log('Cargado entorno desde .env.local');
  }
  dotenv.config();
} catch (e) { /* dotenv may be absent in some environments */ }

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');

// Persistencia por defecto en disco (archivos JSON). Si hay vars de MySQL,
// se intentará inicializar la conexión a MySQL y usarla como back-end.
app.locals.dbConnected = false;
app.locals.dbBacking = 'file';
console.log('Persistencia: almacenamiento en disco (sistema de archivos local) activo.');

// MySQL pool (opcional)
let mysqlPool = null;

async function initMySQL() {
  const host = process.env.CLEVER_MYSQL_HOST;
  const user = process.env.CLEVER_MYSQL_USER;
  const password = process.env.CLEVER_MYSQL_PASSWORD;
  const database = process.env.CLEVER_MYSQL_DB;
  const port = process.env.CLEVER_MYSQL_PORT ? Number(process.env.CLEVER_MYSQL_PORT) : 3306;

  if (!host || !user || !database) {
    console.log('MySQL: variables de entorno no configuradas — usando persistencia por archivos.');
    return;
  }

  try {
    mysqlPool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Crear tablas si no existen
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS sensors (
        sensor_id VARCHAR(255) PRIMARY KEY,
        last_seen TIMESTAMP NOT NULL,
        caudal_min DOUBLE,
        total_acumulado DOUBLE,
        raw_json JSON
      )
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS history (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        sensor_id VARCHAR(255),
        ts TIMESTAMP NOT NULL,
        payload JSON,
        INDEX (sensor_id)
      )
    `);

    app.locals.dbConnected = true;
    app.locals.dbBacking = 'mysql';
    console.log('MySQL inicializado correctamente y tablas verificadas.');
  } catch (err) {
    console.error('Error inicializando MySQL:', err);
    mysqlPool = null;
    app.locals.dbConnected = false;
    app.locals.dbBacking = 'file';
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Servir informes guardados (si existen)
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Endpoint para guardar reportes (recibe PDF en body raw)
app.post('/api/save-report', express.raw({ type: 'application/pdf', limit: '20mb' }), (req, res) => {
  try {
    const filenameHeader = req.headers['x-filename'] || '';
    const safeName = filenameHeader ? filenameHeader.replace(/[^a-zA-Z0-9-_.]/g, '_') : `reporte_${Date.now()}.pdf`;
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const filePath = path.join(reportsDir, safeName);
    fs.writeFileSync(filePath, req.body);
    const publicPath = `/reports/${safeName}`;
    console.log(`Reporte guardado en servidor: ${filePath}`);
    res.status(200).json({ success: true, path: publicPath, filename: safeName });
  } catch (err) {
    console.error('Error guardando reporte en servidor:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Base de datos en memoria (objeto JS)
const sensorData = {};
// Historial en memoria por sensor (últimos N registros)
const sensorHistory = {};

// Persistencia en disco (fallback cuando no hay conexión a una base de datos externa)
// Se puede desactivar poniendo ENABLE_PERSISTENCE=false en el entorno.
const ENABLE_PERSISTENCE = process.env.ENABLE_PERSISTENCE === undefined ? true : (process.env.ENABLE_PERSISTENCE !== 'false');
const DATA_DIR = path.join(__dirname, 'data');
const SENSORS_FILE = path.join(DATA_DIR, 'sensors.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    if (fs.existsSync(SENSORS_FILE)) {
      const raw = fs.readFileSync(SENSORS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      Object.assign(sensorData, parsed);
      console.log('Cargados sensores desde disco:', Object.keys(parsed).length);
    }

    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      Object.assign(sensorHistory, parsed);
      console.log('Cargado historial desde disco:', Object.keys(parsed).length);
    }
  } catch (err) {
    console.warn('No se pudo cargar persistencia en disco:', err.message || err);
  }
}

function saveToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SENSORS_FILE, JSON.stringify(sensorData, null, 2), 'utf8');
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(sensorHistory, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando datos en disco:', err.message || err);
  }
}

// Cargar al inicio
loadFromDisk();

// Guardar periódicamente (cada 5s)
const SAVE_INTERVAL = 5000;
const saveIntervalRef = setInterval(saveToDisk, SAVE_INTERVAL);

function pushHistory(sensor_id, entry) {
  if (!sensorHistory[sensor_id]) sensorHistory[sensor_id] = [];
  sensorHistory[sensor_id].push(entry);
  const MAX = 500; // mantener últimos 500 registros por sensor
  if (sensorHistory[sensor_id].length > MAX) sensorHistory[sensor_id] = sensorHistory[sensor_id].slice(-MAX);
}

/**
 * A. Endpoint de Ingesta (Para el ESP32)
 * POST /api/sensor-data
 * Body: { sensor_id, caudal_min, total_acumulado, hora }
 */
app.post('/api/sensor-data', (req, res) => {
  try {
    const { sensor_id, caudal_min, total_acumulado, hora } = req.body;

    // Validación básica
    if (!sensor_id) {
      return res.status(400).json({
        error: 'sensor_id es requerido'
      });
    }

    // Validar que los campos esperados existen
    if (caudal_min === undefined || total_acumulado === undefined || hora === undefined) {
      return res.status(400).json({ error: 'Se requieren los campos: caudal_min, total_acumulado, hora' });
    }

    // Convertir valores numéricos y validar que son números válidos
    const caudalNum = parseFloat(caudal_min);
    const totalNum = parseFloat(total_acumulado);

    if (Number.isNaN(caudalNum) || Number.isNaN(totalNum)) {
      return res.status(400).json({ error: 'caudal_min y total_acumulado deben ser numéricos' });
    }

    // Los sensores envían valores en mililitros (mL). Convertir a litros (L) para
    // que todo el sistema trabaje con litros y el frontend muestre L.
    const caudalLiters = caudalNum / 1000; // mL -> L
    const totalLiters = totalNum / 1000; // mL -> L

    const data = {
      sensor_id: String(sensor_id),
      caudal_min: Number(caudalLiters.toFixed(3)),
      total_acumulado: Number(totalLiters.toFixed(3)),
      hora: String(hora),
      ultima_actualizacion: new Date().toISOString()
    };

    // Actualizar estado en memoria usando sensor_id como clave única
    sensorData[sensor_id] = data;

    // mantener historial en memoria
    try { pushHistory(sensor_id, { ...data, stored: 'memory' }); } catch (e) { /* ignore */ }

    console.log(`[${new Date().toISOString()}] Datos recibidos del sensor ${sensor_id}:`, data);

    res.status(200).json({
      success: true,
      message: 'Datos recibidos correctamente (memoria)',
      data: data
    });
  } catch (error) {
    console.error('Error al procesar datos del sensor:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * B. Endpoint de Visualización (Para el Frontend)
 * GET /api/dashboard
 * Respuesta: Array de objetos con todos los sensores activos
 */
app.get('/api/dashboard', (req, res) => {
  try {
    // Leer directamente desde memoria (persistencia a disco en segundo plano)
    const sensores = Object.values(sensorData);

    res.status(200).json({
      success: true,
      count: sensores.length,
      data: sensores
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * Endpoint de reportes: devuelve el historial en memoria por sensor
 * GET /api/reports
 * Response: { success: true, count: <total sensors>, data: { sensor_id: [ {..}, ... ] } }
 */
app.get('/api/reports', (req, res) => {
  try {
    res.status(200).json({ success: true, count: Object.keys(sensorHistory).length, data: sensorHistory });
  } catch (err) {
    console.error('Error al obtener reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/average-yesterday
 * Opcional query: sensor_id=<id>
 * Responde: { success: true, average: <number|null>, samples: <count>, sensor_id?: <id> }
 * Calcula el promedio de `caudal_min` para el día calendario de ayer (00:00-23:59) usando el historial en memoria.
 */
app.get('/api/average-yesterday', (req, res) => {
  try {
    const { sensor_id, mode } = req.query;
    const now = Date.now();
    const MS_DAY = 24 * 60 * 60 * 1000;

    // Utilidad para parsear timestamp de una entrada
    const parseTime = (e) => {
      const t = e.ultima_actualizacion || e.ts || e.hora || null;
      if (!t) return NaN;
      const time = new Date(t).getTime();
      return Number.isFinite(time) ? time : NaN;
    };

    // Recoger valores en un rango [start, end)
    const collectValuesInRange = (startMs, endMs) => {
      const vals = [];
      if (sensor_id) {
        const arr = sensorHistory[sensor_id] || [];
        (arr || []).forEach(e => {
          const t = parseTime(e);
          if (!Number.isNaN(t) && t >= startMs && t < endMs) {
            const v = parseFloat(e.caudal_min);
            if (!Number.isNaN(v)) vals.push(v);
          }
        });
      } else {
        Object.values(sensorHistory).forEach(arr => {
          (arr || []).forEach(e => {
            const t = parseTime(e);
            if (!Number.isNaN(t) && t >= startMs && t < endMs) {
              const v = parseFloat(e.caudal_min);
              if (!Number.isNaN(v)) vals.push(v);
            }
          });
        });
      }
      return vals;
    };

    if (mode && mode.toString() === 'rolling24h') {
      // Ventana actual: últimas 24 horas
      const windowEnd = now;
      const windowStart = now - MS_DAY;
      const prevStart = now - 2 * MS_DAY;
      const prevEnd = now - MS_DAY;

      const valsNow = collectValuesInRange(windowStart, windowEnd);
      const valsPrev = collectValuesInRange(prevStart, prevEnd);

      const summarize = (arr) => {
        if (!arr || arr.length === 0) return { average: null, samples: 0 };
        const sum = arr.reduce((a, b) => a + b, 0);
        return { average: Number((sum / arr.length).toFixed(3)), samples: arr.length };
      };

      const nowSummary = summarize(valsNow);
      const prevSummary = summarize(valsPrev);

      return res.status(200).json({
        success: true,
        mode: 'rolling24h',
        average: nowSummary.average,
        samples: nowSummary.samples,
        previousAverage: prevSummary.average,
        previousSamples: prevSummary.samples,
        sensor_id: sensor_id || undefined
      });
    }

    // Modo por defecto: "calendar" — día calendario de ayer
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0).getTime();
    const end = start + MS_DAY;

    const vals = collectValuesInRange(start, end);
    if (vals.length === 0) {
      return res.status(200).json({ success: true, mode: 'calendar', average: null, samples: 0, sensor_id: sensor_id || undefined, message: 'No hay muestras para ayer en el historial' });
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = Number((sum / vals.length).toFixed(3));
    return res.status(200).json({ success: true, mode: 'calendar', average: avg, samples: vals.length, sensor_id: sensor_id || undefined });
  } catch (err) {
    console.error('Error calculando average-yesterday:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Generar reporte técnico descargable (CSV)
 * GET /api/generate-report
 */
app.get('/api/generate-report', (req, res) => {
  try {
    // Build a clean, professional CSV with summary + header and numeric formatting
    const lines = [];

    // Summary header (CSV comment lines, many tools ignore them but they are useful for humans)
    const generatedAt = new Date().toISOString();
    const totalSensors = Object.keys(sensorHistory).length;
    let totalSamples = 0;
    Object.values(sensorHistory).forEach(arr => { totalSamples += (arr || []).length; });
    lines.push(`# AquaVisor - Reporte profesional`);
    lines.push(`# Generado: ${generatedAt}`);
    lines.push(`# Sensores: ${totalSensors} | Muestras: ${totalSamples}`);

    // CSV header (columns)
    lines.push('timestamp,sensor_id,hora,caudal_min (L),total_acumulado (L),stored');

    Object.entries(sensorHistory).forEach(([sensor_id, arr]) => {
      (arr || []).forEach(entry => {
        const ts = entry.ultima_actualizacion || new Date().toISOString();
        const hora = entry.hora ? String(entry.hora).replace(/,/g, '') : '';
        const caudal = entry.caudal_min !== undefined && entry.caudal_min !== null ? Number(entry.caudal_min).toFixed(3) : '';
        const total = entry.total_acumulado !== undefined && entry.total_acumulado !== null ? Number(entry.total_acumulado).toFixed(3) : '';
        const stored = entry.stored || '';
        lines.push(`${ts},${sensor_id},${hora},${caudal},${total},${stored}`);
      });
    });

    // Prefix BOM so Excel detects UTF-8 and accents correctly
    const csv = '\uFEFF' + lines.join('\n');
    // Guardar también una copia con nombre profesional en reports/
    try {
      const reportsDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
      const csvPath = path.join(reportsDir, filename);
      fs.writeFileSync(csvPath, csv, 'utf8');
      console.log('CSV profesional guardado en:', csvPath);
    } catch (e) {
      console.warn('No se pudo guardar CSV en reports:', e.message || e);
    }
    const filename = `reporte_profesional_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Error generando reporte técnico:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * C. Endpoints de Control de Válvulas
 */

// Estado de v álvulas en memoria
const valveState = {
  status: 'closed', // 'open' o 'closed'
  flowRate: 0,
  pressure: 0,
  lastUpdate: new Date().toISOString()
};

// Historial de actividad de válvulas
const valveHistory = [];

// Programaciones de válvulas
const valveSchedules = [];
let scheduleIdCounter = 1;

const VALVE_HISTORY_FILE = path.join(DATA_DIR, 'valve_history.json');
const VALVE_SCHEDULES_FILE = path.join(DATA_DIR, 'valve_schedules.json');
const VALVE_STATE_FILE = path.join(DATA_DIR, 'valve_state.json');

// Cargar estado de válvula desde disco
function loadFromDisk() {
  if (!ENABLE_PERSISTENCE) {
    console.log('Persistencia desactivada (ENABLE_PERSISTENCE=false). No se cargarán archivos desde disco.');
    return;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    if (fs.existsSync(SENSORS_FILE)) {
      const raw = fs.readFileSync(SENSORS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      Object.assign(sensorData, parsed);
      console.log('Cargados sensores desde disco:', Object.keys(parsed).length);
    }

    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      Object.assign(sensorHistory, parsed);
      console.log('Cargado historial desde disco:', Object.keys(parsed).length);
    }
  } catch (err) {
    console.warn('No se pudo cargar persistencia en disco:', err.message || err);
  }
}

// Guardar periódicamente (cada 5s) — sólo si la persistencia está activa
const SAVE_INTERVAL = 5000;
let saveIntervalRef = null;
if (ENABLE_PERSISTENCE) {
  saveIntervalRef = setInterval(saveToDisk, SAVE_INTERVAL);
} else {
  console.log('Auto-guardado desactivado: no se escribirán archivos de historial en disco.');
}
function saveValveData() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(VALVE_STATE_FILE, JSON.stringify(valveState, null, 2), 'utf8');
    fs.writeFileSync(VALVE_HISTORY_FILE, JSON.stringify(valveHistory.slice(-100), null, 2), 'utf8');
    fs.writeFileSync(VALVE_SCHEDULES_FILE, JSON.stringify(valveSchedules, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando datos de válvula:', err.message);
  }
}

// Cargar al inicio
loadValveData();

/**
 * POST /api/valve/control
 * Body: { action: 'open' | 'closed', operator: string, source: 'web' | 'scheduled' }
 * Controla el estado de la válvula
 */
app.post('/api/valve/control', (req, res) => {
  try {
    const { action, operator, source } = req.body;

    if (!action || (action !== 'open' && action !== 'closed')) {
      return res.status(400).json({ success: false, error: 'Action must be "open" or "closed"' });
    }

    const now = new Date();
    valveState.status = action;
    valveState.lastUpdate = now.toISOString();

    // Simular métricas (en producción, el ESP32 enviaría estos datos)
    if (action === 'open') {
      valveState.flowRate = 85.3 + Math.random() * 10;
      valveState.pressure = 115 + Math.random() * 5;
    } else {
      valveState.flowRate = 0;
      valveState.pressure = 0;
    }

    // Registrar en historial
    const historyEntry = {
      action,
      operator: operator || 'Sistema',
      source: source || 'web',
      time: now.toLocaleTimeString('es-ES'),
      timestamp: now.toISOString()
    };
    valveHistory.unshift(historyEntry);
    if (valveHistory.length > 100) valveHistory.length = 100;

    saveValveData();

    console.log(`[VÁLVULA] ${action.toUpperCase()} por ${operator} (${source})`);

    // Aquí enviarías la señal al ESP32
    // Ver documentación abajo sobre cómo el ESP32 recibiría esto

    res.json({
      success: true,
      status: valveState.status,
      message: `Válvula ${action === 'open' ? 'abierta' : 'cerrada'} correctamente`
    });
  } catch (err) {
    console.error('Error controlando válvula:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/valve/status
 * Responde con el estado actual de la válvula
 */
app.get('/api/valve/status', (req, res) => {
  res.json({
    success: true,
    status: valveState.status,
    flowRate: valveState.flowRate,
    pressure: valveState.pressure,
    lastUpdate: valveState.lastUpdate
  });
});

/**
 * GET /api/valve/history
 * Responde con el historial de actividad
 */
app.get('/api/valve/history', (req, res) => {
  res.json({
    success: true,
    history: valveHistory.slice(0, 10) // Últimas 10
  });
});

/**
 * POST /api/valve/schedule
 * Body: { action: 'open' | 'closed', time: 'HH:MM', days: [0-6] }
 * Crea una nueva programación
 */
app.post('/api/valve/schedule', (req, res) => {
  try {
    const { action, time, days } = req.body;

    if (!action || !time || !days || !Array.isArray(days)) {
      return res.status(400).json({ success: false, error: 'Invalid schedule data' });
    }

    const newSchedule = {
      id: scheduleIdCounter++,
      action,
      time,
      days,
      created: new Date().toISOString()
    };

    valveSchedules.push(newSchedule);
    saveValveData();

    console.log(`[PROGRAMACIÓN] Nueva: ${action} a las ${time}`);

    res.json({
      success: true,
      schedule: newSchedule,
      message: 'Programación creada correctamente'
    });
  } catch (err) {
    console.error('Error creando programación:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/valve/schedules
 * Responde con todas las programaciones
 */
app.get('/api/valve/schedules', (req, res) => {
  res.json({
    success: true,
    schedules: valveSchedules
  });
});

/**
 * DELETE /api/valve/schedule/:id
 * Elimina una programación
 */
app.delete('/api/valve/schedule/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = valveSchedules.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    valveSchedules.splice(index, 1);
    saveValveData();

    console.log(`[PROGRAMACIÓN] Eliminada: ${id}`);

    res.json({
      success: true,
      message: 'Programación eliminada correctamente'
    });
  } catch (err) {
    console.error('Error eliminando programación:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint de salud del servidor
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sensores_activos: Object.keys(sensorData).length
  });
});

// Helpers: estadística y generación de imágenes (QuickChart)
function computeStatistics(entries, threshold = 0.012) {
  const values = entries.map(e => Number(e.caudal_min)).filter(v => !Number.isNaN(v));
  const n = values.length;
  if (n === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const sigma = Math.sqrt(variance);

  // Umbral
  const exceeded = values.filter(v => v > threshold).length;
  const normal = n - exceeded;
  // Estimar intervalo de muestreo en segundos (mediana de diffs)
  const times = entries.map(e => new Date(e.ultima_actualizacion || e.ts || e.hora).getTime()).filter(t => !Number.isNaN(t)).sort((a,b)=>a-b);
  let samplingSeconds = 3;
  if (times.length >= 2) {
    const diffs = [];
    for (let i = 1; i < times.length; i++) diffs.push((times[i] - times[i-1]) / 1000);
    diffs.sort((a,b)=>a-b);
    samplingSeconds = diffs[Math.floor(diffs.length/2)] || samplingSeconds;
  }
  const timeOutsideSeconds = exceeded * samplingSeconds;

  // Distribución en bins dinámicos (5 bins)
  const bins = [];
  const binCount = 6;
  const range = max - min || 0.00001;
  for (let i = 0; i < binCount; i++) {
    const lo = min + (i * range / binCount);
    const hi = min + ((i+1) * range / binCount);
    bins.push({ lo, hi, count: 0 });
  }
  values.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / (range || 1) * binCount), binCount - 1);
    bins[idx].count++;
  });
  const distribution = bins.map(b => ({ range: `${b.lo.toFixed(5)} - ${b.hi.toFixed(5)}`, percent: Number(((b.count / n) * 100).toFixed(2)), count: b.count }));

  // Anomalías: puntos > threshold OR > mean + 2*sigma
  const anomalies = entries.filter(e => {
    const v = Number(e.caudal_min);
    return !Number.isNaN(v) && (v > threshold || v > mean + 2 * sigma);
  }).map(a => ({ sensor_id: a.sensor_id, ts: a.ultima_actualizacion || a.ts || a.hora, value: Number(a.caudal_min) }));

  return {
    count: n,
    mean: Number(mean.toFixed(6)),
    min: Number(min.toFixed(6)),
    max: Number(max.toFixed(6)),
    sigma: Number(sigma.toFixed(6)),
    exceededCount: exceeded,
    normalCount: normal,
    percentExceeded: Number(((exceeded / n) * 100).toFixed(2)),
    percentNormal: Number(((normal / n) * 100).toFixed(2)),
    timeOutsideSeconds: Math.round(timeOutsideSeconds),
    samplingSeconds,
    distribution,
    anomalies
  };
}

async function getChartImageBuffer(chartConfig, width = 1200, height = 400) {
  try {
    const qcUrl = 'https://quickchart.io/chart';
    const body = { chart: JSON.stringify(chartConfig), width, height, format: 'png', backgroundColor: 'white' };
    const resp = await fetch(qcUrl, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
    if (!resp.ok) throw new Error('QuickChart returned ' + resp.status);
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Error generando imagen con QuickChart:', err.message || err);
    return null;
  }
}

/**
 * GET /api/generate-professional-report
 * Query: sensor_id (optional), start (ISO, optional), end (ISO, optional), threshold (optional)
 * Generates CSV + PDF profesional with statistics, charts and diagnostics.
 */
app.get('/api/generate-professional-report', async (req, res) => {
  try {
    const { sensor_id, start, end, threshold } = req.query;
    const Lcrit = threshold ? Number(threshold) : 0.012;

    // Collect entries
    let entries = [];
    if (sensor_id) {
      entries = (sensorHistory[sensor_id] || []).slice();
    } else {
      Object.values(sensorHistory).forEach(arr => { entries.push(...(arr || [])); });
    }
    // Apply time filter
    let startMs = start ? new Date(start).getTime() : null;
    let endMs = end ? new Date(end).getTime() : null;
    if (startMs || endMs) {
      entries = entries.filter(e => {
        const t = new Date(e.ultima_actualizacion || e.ts || e.hora).getTime();
        if (Number.isNaN(t)) return false;
        if (startMs && t < startMs) return false;
        if (endMs && t > endMs) return false;
        return true;
      });
    }

    if (!entries || entries.length === 0) return res.status(400).json({ success: false, error: 'No hay datos disponibles para el periodo solicitado' });

    // Compute stats
    const stats = computeStatistics(entries, Lcrit);

    // Prepare report filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `reporte_profesional_${sensor_id || 'all'}_${timestamp}`;
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    // CSV: include header summary, distribution, and raw table
    const csvLines = [];
    csvLines.push(`# AquaVisor - Reporte profesional`);
    csvLines.push(`# Generado: ${new Date().toISOString()}`);
    csvLines.push(`# Sensor: ${sensor_id || 'Todos'} | Muestras: ${stats.count}`);
    csvLines.push(`# L_crítico: ${Lcrit}`);
    csvLines.push('');
    csvLines.push('---METRICAS DEL PERIODO---');
    csvLines.push(['Metric','Value'].join(','));
    csvLines.push(['Promedio (L/min)', stats.mean].join(','));
    csvLines.push(['Máximo (L/min)', stats.max].join(','));
    csvLines.push(['Mínimo (L/min)', stats.min].join(','));
    csvLines.push(['Desviación estándar (σ)', stats.sigma].join(','));
    csvLines.push(['% Normal', stats.percentNormal].join(','));
    csvLines.push(['% Excedido', stats.percentExceeded].join(','));
    csvLines.push(['Tiempo total fuera de umbral (s)', stats.timeOutsideSeconds].join(','));
    csvLines.push('');
    csvLines.push('---DISTRIBUCIÓN---');
    csvLines.push(['Rango (L/min)','Porcentaje','Conteo'].join(','));
    stats.distribution.forEach(d => csvLines.push([`"${d.range}"`, d.percent, d.count].join(',')));
    csvLines.push('');
    csvLines.push('---DATOS HISTÓRICOS (RAW)---');
    csvLines.push('timestamp,sensor_id,hora,caudal_min (L),total_acumulado (L),stored');
    entries.forEach(entry => {
      const ts = entry.ultima_actualizacion || new Date().toISOString();
      const horaVal = entry.hora ? String(entry.hora).replace(/,/g,'') : '';
      const caudal = entry.caudal_min !== undefined && entry.caudal_min !== null ? Number(entry.caudal_min).toFixed(6) : '';
      const total = entry.total_acumulado !== undefined && entry.total_acumulado !== null ? Number(entry.total_acumulado).toFixed(6) : '';
      csvLines.push([ts, entry.sensor_id || '', horaVal, caudal, total, entry.stored || ''].join(','));
    });

    const csvContent = '\uFEFF' + csvLines.join('\n');
    const csvPath = path.join(reportsDir, baseName + '.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf8');

    // Charts via QuickChart: main trend
    // Build chart config
    const labels = entries.map(e => new Date(e.ultima_actualizacion || e.ts || e.hora).toISOString());
    const dataPoints = entries.map(e => Number(e.caudal_min));
    const mainChartConfig = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Caudal (L/min)',
            data: dataPoints,
            borderColor: 'rgba(34,139,230,0.8)',
            fill: false,
            pointRadius: 2,
            tension: 0.1
          },
          {
            label: 'L_crítico',
            data: labels.map(() => Lcrit),
            borderColor: 'purple',
            borderDash: [6,4],
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Promedio histórico',
            data: labels.map(() => stats.mean),
            borderColor: 'green',
            borderDash: [4,4],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        scales: { x: { display: true, type: 'category' }, y: { title: { display: true, text: 'L/min' } } },
        plugins: { legend: { display: true } }
      }
    };

    const mainChartBuffer = await getChartImageBuffer(mainChartConfig, 1400, 500);

    // If anomalies, build zoom chart around first anomaly (±3 hours => 6 hours window)
    let zoomChartBuffer = null;
    if (stats.anomalies && stats.anomalies.length > 0) {
      const eventTs = new Date(stats.anomalies[0].ts).getTime();
      const windowMs = 6 * 60 * 60 * 1000; // 6 hours
      const zoomEntries = entries.filter(e => {
        const t = new Date(e.ultima_actualizacion || e.ts || e.hora).getTime();
        return t >= (eventTs - windowMs/2) && t <= (eventTs + windowMs/2);
      });
      if (zoomEntries.length > 0) {
        const zlabels = zoomEntries.map(e => new Date(e.ultima_actualizacion || e.ts || e.hora).toISOString());
        const zdata = zoomEntries.map(e => Number(e.caudal_min));
        const zoomConfig = {
          type: 'line',
          data: { labels: zlabels, datasets: [{ label: 'Caudal (L/min)', data: zdata, borderColor: 'rgba(255,99,132,0.9)', pointRadius: 3 } , { label: 'L_crítico', data: zlabels.map(()=>Lcrit), borderColor: 'purple', borderDash:[6,4], pointRadius:0 }]},
          options: { scales: { x: { type: 'category' }, y: { title: { display: true, text: 'L/min' } } } }
        };
        zoomChartBuffer = await getChartImageBuffer(zoomConfig, 1400, 450);
      }
    }

    // Generate PDF via PDFKit
    const pdfPath = path.join(reportsDir, baseName + '.pdf');
    const doc = new PDFDocument({ autoFirstPage: false });
    const pdfStream = fs.createWriteStream(pdfPath);
    doc.pipe(pdfStream);

    // Cover page
    doc.addPage({ size: 'A4', margin: 40 });
    // Include provided image if exists (project images folder)
    const providedImage = path.join(__dirname, '..', '..', 'images', 'diseño', 'images.png');
    if (fs.existsSync(providedImage)) {
      try { doc.image(providedImage, { fit: [500, 300], align: 'center' }); } catch (e) { /* ignore image errors */ }
    }
    doc.moveDown();
    doc.fontSize(20).text('AquaVisor - Reporte Profesional', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-ES')}`, { align: 'center' });
    doc.fontSize(10).text(`Sensor: ${sensor_id || 'Todos'}`, { align: 'center' });
    doc.addPage();

    // Executive summary (3 paragraphs): auto-generated
    const p1 = `Periodo: ${start || 'inicio'} → ${end || 'ahora'}. Muestras analizadas: ${stats.count}. El rendimiento general se resume en la tabla de métricas adjunta.`;
    const p2 = `Durante el periodo, el caudal promedio fue ${stats.mean} L/min con una desviación estándar de ${stats.sigma}. El umbral crítico definido es L_crítico = ${Lcrit} L/min.`;
    const p3 = `Se detectaron ${stats.anomalies.length} lecturas anómalas (${stats.percentExceeded}% de las muestras). Se incluye un análisis detallado y gráficos con líneas de referencia para facilitar la interpretación.`;
    doc.fontSize(12).text('Resumen Ejecutivo', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(p1 + '\n\n' + p2 + '\n\n' + p3);
    doc.moveDown();

    // Metrics table
    doc.fontSize(12).text('Tabla I: Métricas de Rendimiento del Período', { underline: true });
    doc.moveDown(0.3);
    const tableTop = doc.y;
    doc.fontSize(10);
    const metrics = [
      ['Promedio (L/min)', stats.mean],
      ['Máximo (L/min)', stats.max],
      ['Mínimo (L/min)', stats.min],
      ['Desviación estándar (σ)', stats.sigma],
      ['% Normal', stats.percentNormal + '%'],
      ['% Excedido', stats.percentExceeded + '%'],
      ['Tiempo fuera de umbral (s)', stats.timeOutsideSeconds]
    ];
    metrics.forEach(row => { doc.text(row[0], { continued: true, width: 300 }); doc.text(String(row[1]), { align: 'right' }); });
    doc.moveDown();

    // Insert main chart image if generated
    if (mainChartBuffer) {
      doc.addPage();
      doc.fontSize(12).text('Gráfico Principal: Tendencia histórica con líneas de referencia', { underline: true });
      doc.moveDown(0.3);
      try { doc.image(mainChartBuffer, { fit: [520, 300], align: 'center' }); } catch (e) { console.warn('No se pudo incrustar imagen principal:', e.message); }
    }

    // Diagnostics
    doc.addPage();
    doc.fontSize(12).text('Diagnóstico Automatizado y Análisis de Impacto', { underline: true });
    doc.moveDown(0.5);
    // Simple rule-based narrative
    const peak = stats.max;
    const peakEntry = entries.find(e => Number(e.caudal_min) === peak) || {};
    const peakTs = peakEntry.ultima_actualizacion || peakEntry.ts || peakEntry.hora || 'N/A';
    const diag = `El rendimiento del sensor durante el periodo se mantuvo en estado Normal el ${stats.percentNormal}% del tiempo. No obstante, se registraron ${stats.exceededCount} lecturas que excedieron el umbral crítico (L_crítico = ${Lcrit} L/min). El pico máximo se documentó a ${peakTs} con una lectura de ${peak} L/min, lo que representa una desviación significativa respecto al promedio histórico.`;
    doc.fontSize(10).text(diag);
    doc.moveDown();

    // Zoom chart if available
    if (zoomChartBuffer) {
      doc.addPage();
      doc.fontSize(12).text('Gráfico de Zoom (anomalía detectada)', { underline: true });
      doc.moveDown(0.3);
      try { doc.image(zoomChartBuffer, { fit: [520, 300], align: 'center' }); } catch (e) { console.warn('No se pudo incrustar zoom:', e.message); }
    }

    // Distribution table
    doc.addPage();
    doc.fontSize(12).text('Distribución de Frecuencia', { underline: true });
    doc.moveDown(0.3);
    stats.distribution.forEach(d => doc.fontSize(10).text(`${d.range} → ${d.percent}% (${d.count} lecturas)`));

    doc.end();
    await new Promise(resolve => pdfStream.on('finish', resolve));

    return res.json({ success: true, pdf: `/reports/${path.basename(pdfPath)}`, csv: `/reports/${path.basename(csvPath)}`, stats });
  } catch (err) {
    console.error('Error generando reporte profesional:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint sencillo para conocer el estado de la conexión a la base de datos
app.get('/api/db-status', (req, res) => {
  try {
    const dbConnected = !!req.app.locals.dbConnected;
    const dbBacking = req.app.locals.dbBacking || 'file';
    res.status(200).json({ success: true, dbConnected, dbBacking });
  } catch (err) {
    console.error('Error obteniendo estado DB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Iniciar servidor
// Manejo de cierre para asegurar persistencia en disco
function shutdownHandler(signal) {
  try {
    console.log(`Recibido ${signal} — guardando datos en disco y cerrando...`);
    if (saveIntervalRef) clearInterval(saveIntervalRef);
    saveToDisk();
  } catch (err) {
    console.error('Error durante shutdown:', err.message || err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdownHandler('SIGINT'));
process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
process.on('exit', () => saveToDisk());
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  saveToDisk();
  process.exit(1);
});
// Evita caídas por promesas rechazadas que nadie captura
process.on('unhandledRejection', (reason, promise) => {
  try {
    console.error('Promesa no manejada rechazada:', { reason, promise });
    // Guardar por si acaso
    saveToDisk();
  } catch (e) {
    // noop
  }
});

// Arranque: inicializar MySQL (si está configurado) y luego arrancar Express
(async () => {
  await initMySQL();
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                   SERVIDOR ACUAVISOR                       ║
╠════════════════════════════════════════════════════════════╣
║  Puerto:              ${PORT}                              ║
║  Estado:              ACTIVO ✓                             ║
║  Endpoint Ingesta:    POST /api/sensor-data                ║
║  Endpoint Dashboard:  GET  /api/dashboard                  ║
║  Health Check:        GET  /api/health                     ║
╚════════════════════════════════════════════════════════════╝

Para conectar el ESP32, usa:
  http://<TU_IP>:${PORT}/api/sensor-data

Para obtener tu IP local, ejecuta:
  Windows: ipconfig
  Mac/Linux: ifconfig
  `);
  });
})();
