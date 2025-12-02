const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

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

    // Actualizar estado en memoria usando sensor_id como clave única
    sensorData[sensor_id] = data;

    console.log(`[${new Date().toISOString()}] Datos recibidos del sensor ${sensor_id}:`, data);

    res.status(200).json({ 
      success: true, 
      message: 'Datos recibidos correctamente',
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
    // Convertir objeto a array de sensores
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
║  Puerto:              ${PORT}                                    ║
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
