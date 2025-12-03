// Script de migración desde los JSON locales hacia MySQL
// USO: configurar variables de entorno CLEVER_MYSQL_* y ejecutar `node migrate-json-to-mysql.js`

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const host = process.env.CLEVER_MYSQL_HOST;
  const user = process.env.CLEVER_MYSQL_USER;
  const password = process.env.CLEVER_MYSQL_PASSWORD;
  const database = process.env.CLEVER_MYSQL_DB;
  const port = process.env.CLEVER_MYSQL_PORT ? Number(process.env.CLEVER_MYSQL_PORT) : 3306;

  if (!host || !user || !database) {
    console.error('Faltan variables CLEVER_MYSQL_*. Configura el entorno antes de ejecutar.');
    process.exit(1);
  }

  const pool = mysql.createPool({ host, user, password, database, port, connectionLimit: 5 });

  try {
    const dataDir = path.join(__dirname, 'data');
    const historyFile = path.join(dataDir, 'history.json');
    if (fs.existsSync(historyFile)) {
      const raw = fs.readFileSync(historyFile, 'utf8');
      const arr = JSON.parse(raw);
      console.log('Registros encontrados en history.json:', arr.length);
      for (const item of arr) {
        const sensor_id = item.sensor_id || item.id || 'unknown';
        const ts = item.hora ? new Date(item.hora) : new Date();
        try {
          await pool.query('INSERT INTO history (sensor_id, ts, payload) VALUES (?, ?, ?)', [sensor_id, ts, JSON.stringify(item)]);
        } catch (err) {
          console.error('Error insert history item:', err);
        }
      }
      console.log('Migración history.json completada.');
    } else {
      console.log('No existe history.json — nada que migrar para history.');
    }

    const sensorsFile = path.join(dataDir, 'sensors.json');
    if (fs.existsSync(sensorsFile)) {
      const raw = fs.readFileSync(sensorsFile, 'utf8');
      const obj = JSON.parse(raw);
      const keys = Object.keys(obj);
      console.log('Sensores encontrados en sensors.json:', keys.length);
      for (const key of keys) {
        const data = obj[key];
        const sensor_id = data.sensor_id || key;
        const last_seen = data.ultima_actualizacion ? new Date(data.ultima_actualizacion) : new Date();
        try {
          await pool.query(
            `INSERT INTO sensors (sensor_id, last_seen, caudal_min, total_acumulado, raw_json)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE last_seen = VALUES(last_seen), caudal_min = VALUES(caudal_min), total_acumulado = VALUES(total_acumulado), raw_json = VALUES(raw_json)`,
            [sensor_id, last_seen, data.caudal_min ?? null, data.total_acumulado ?? null, JSON.stringify(data)]
          );
        } catch (err) {
          console.error('Error insert sensor:', err);
        }
      }
      console.log('Migración sensors.json completada.');
    } else {
      console.log('No existe sensors.json — nada que migrar para sensors.');
    }

    console.log('Migración finalizada.');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error en migración:', err);
  process.exit(1);
});
