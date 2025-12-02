// Simulador simple para poblar el backend con datos de sensores
// Ejecuta: node simulator.js

const target = 'http://localhost:4000/api/sensor-data';

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Definir sensores iniciales
const sensors = [
  { sensor_id: '1', total_acumulado: 50 },
  { sensor_id: '2', total_acumulado: 10 },
  { sensor_id: '3', total_acumulado: 200 }
];

async function sendSensor(sensor) {
  // Generar valores aleatorios razonables
  const caudal = (Math.random() * 12 + 2).toFixed(1); // 2.0 - 14.0
  sensor.total_acumulado = parseFloat((sensor.total_acumulado + Math.random() * 3).toFixed(1));
  const payload = {
    sensor_id: String(sensor.sensor_id),
    caudal_min: String(caudal),
    total_acumulado: String(sensor.total_acumulado),
    hora: formatDate(new Date())
  };

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log(`Enviado sensor ${sensor.sensor_id} -> ${res.status} ${text}`);
  } catch (err) {
    console.error('Error enviando sensor', sensor.sensor_id, err.message || err);
  }
}

async function tick() {
  for (const s of sensors) {
    await sendSensor(s);
    // Pequeña pausa entre envíos
    await new Promise(r => setTimeout(r, 200));
  }
}

console.log('Simulador iniciado. Enviando datos cada 3 segundos...');
// Primer envío inmediato
tick();
setInterval(tick, 3000);
