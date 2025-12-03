// Cargar variables de entorno (si existe `.env`)
try { require('dotenv').config(); } catch (e) { /* dotenv may be absent in some environments */ }

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const fs = require('fs');
const path = require('path');

// Persistencia exclusiva en disco (archivos JSON)
// Nota: se eliminó el soporte a MongoDB por decisión del deploy (solo almacenamiento en Clever Cloud/filesystem)
app.locals.dbConnected = false;
app.locals.dbBacking = 'file';
console.log('Persistencia: almacenamiento en disco (sistema de archivos local) activo. Soporte MongoDB eliminado.');

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

// Persistencia en disco (fallback cuando no hay MongoDB)
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

    const data = {
      sensor_id: String(sensor_id),
      caudal_min: caudalNum,
      total_acumulado: totalNum,
      hora: String(hora),
      ultima_actualizacion: new Date().toISOString()
    };

    // Si hay conexión a Mongo (conexión establecida), persistir con upsert; si no, usar memoria
    const Sensor = req.app.locals.Sensor;
    const dbConnected = req.app.locals.dbConnected;
    if (Sensor && dbConnected) {
      Sensor.findOneAndUpdate(
        { sensor_id: data.sensor_id },
        { $set: { caudal_min: data.caudal_min, total_acumulado: data.total_acumulado, hora: data.hora, ultima_actualizacion: new Date() } },
        { upsert: true, new: true }
      ).lean().then((saved) => {
        console.log(`[${new Date().toISOString()}] Datos persistidos Mongo para sensor ${sensor_id}:`, saved);
        // también mantener historial en memoria para la API de reportes
        try { pushHistory(sensor_id, { ...data, stored: 'mongo' }); } catch (e) { /* ignore */ }
        res.status(200).json({ success: true, message: 'Datos recibidos y guardados', data: saved });
      }).catch((err) => {
        console.error('Error guardando en Mongo:', err);
        // Fallback a memoria
        sensorData[sensor_id] = data;
        try { pushHistory(sensor_id, { ...data, stored: 'memory' }); } catch (e) { /* ignore */ }
        res.status(200).json({ success: true, message: 'Datos recibidos (guardado en memoria por error DB)', data });
      });
      return;
    }

    // Fallback: actualizar estado en memoria usando sensor_id como clave única
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
    // Si hay modelo Sensor (Mongo), leer desde DB
    const Sensor = req.app.locals.Sensor;
    if (Sensor) {
      Sensor.find({}).lean().then((sensores) => {
        res.status(200).json({ success: true, count: sensores.length, data: sensores });
      }).catch((err) => {
        console.error('Error leyendo sensores desde Mongo:', err);
        const sensores = Object.values(sensorData);
        res.status(200).json({ success: true, count: sensores.length, data: sensores });
      });
      return;
    }

    // Fallback: memoria
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
    const filename = `reporte_tecnico_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Error generando reporte técnico:', err);
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
