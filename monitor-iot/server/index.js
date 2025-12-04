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
    const lines = [];
    // Cabecera con metadatos
    lines.push(`# Reporte Técnico AquaVisor`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('timestamp,sensor_id,hora,caudal_min,total_acumulado,stored');

    Object.entries(sensorHistory).forEach(([sensor_id, arr]) => {
      arr.forEach(entry => {
        const ts = entry.ultima_actualizacion || new Date().toISOString();
        const hora = entry.hora ? String(entry.hora).replace(/,/g, '') : '';
        const caudal = entry.caudal_min !== undefined ? String(entry.caudal_min) : '';
        const total = entry.total_acumulado !== undefined ? String(entry.total_acumulado) : '';
        const stored = entry.stored || '';
        lines.push(`${ts},${sensor_id},${hora},${caudal},${total},${stored}`);
      });
    });

    const csv = lines.join('\n');
    const filename = `reporte_tecnico_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

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
function loadValveData() {
  try {
    if (fs.existsSync(VALVE_STATE_FILE)) {
      const raw = fs.readFileSync(VALVE_STATE_FILE, 'utf8');
      Object.assign(valveState, JSON.parse(raw));
    }
    if (fs.existsSync(VALVE_HISTORY_FILE)) {
      const raw = fs.readFileSync(VALVE_HISTORY_FILE, 'utf8');
      valveHistory.push(...JSON.parse(raw));
    }
    if (fs.existsSync(VALVE_SCHEDULES_FILE)) {
      const raw = fs.readFileSync(VALVE_SCHEDULES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      valveSchedules.push(...parsed);
      if (parsed.length > 0) {
        scheduleIdCounter = Math.max(...parsed.map(s => s.id)) + 1;
      }
    }
    console.log('Datos de válvula cargados desde disco');
  } catch (err) {
    console.warn('No se pudieron cargar datos de válvula:', err.message);
  }
}

// Guardar estado de válvula en disco
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
