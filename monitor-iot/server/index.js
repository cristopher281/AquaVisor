// Cargar variables de entorno (si existe `.env`)
try { require('dotenv').config(); } catch (e) { /* dotenv may be absent in some environments */ }

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Conectar a MongoDB si MONGO_URI está definida (opcional)
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || null;
if (MONGO_URI) {
  try {
    const mongoose = require('mongoose');
    mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => console.log('Conectado a MongoDB'))
      .catch((err) => console.error('Error conectando a MongoDB:', err.message));

    // Definir esquema y modelo para lecturas de sensores (upsert por sensor_id)
    const sensorSchema = new mongoose.Schema({
      sensor_id: { type: String, required: true, unique: true },
      caudal_min: { type: Number, required: true },
      total_acumulado: { type: Number, required: true },
      hora: { type: String },
      ultima_actualizacion: { type: Date, default: Date.now }
    }, { timestamps: true });

    // Si el modelo ya existe (re-ejecuciones en dev), usarlo
    try {
      mongoose.model('Sensor');
    } catch (e) {}
    const Sensor = mongoose.models.Sensor || mongoose.model('Sensor', sensorSchema);

    // Exponer el modelo en app.locals para uso en handlers
    app.locals.Sensor = Sensor;
  } catch (err) {
    console.warn('Mongoose no está instalado o no se pudo cargar:', err.message);
  }
} else {
  console.log('MONGO_URI no definida — usando almacenamiento en memoria (desarrollo).');
}

// Middleware
app.use(cors());
app.use(express.json());

// Base de datos en memoria (objeto JS)
const sensorData = {};

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

    // Si hay conexión a Mongo, persistir con upsert; si no, usar memoria
    const Sensor = req.app.locals.Sensor;
    if (Sensor) {
      Sensor.findOneAndUpdate(
        { sensor_id: data.sensor_id },
        { $set: { caudal_min: data.caudal_min, total_acumulado: data.total_acumulado, hora: data.hora, ultima_actualizacion: new Date() } },
        { upsert: true, new: true }
      ).lean().then((saved) => {
        console.log(`[${new Date().toISOString()}] Datos persistidos Mongo para sensor ${sensor_id}:`, saved);
        res.status(200).json({ success: true, message: 'Datos recibidos y guardados', data: saved });
      }).catch((err) => {
        console.error('Error guardando en Mongo:', err);
        // Fallback a memoria
        sensorData[sensor_id] = data;
        res.status(200).json({ success: true, message: 'Datos recibidos (guardado en memoria por error DB)', data });
      });
      return;
    }

    // Fallback: actualizar estado en memoria usando sensor_id como clave única
    sensorData[sensor_id] = data;

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

// Endpoint de salud del servidor
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    sensores_activos: Object.keys(sensorData).length
  });
});

// Iniciar servidor
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
