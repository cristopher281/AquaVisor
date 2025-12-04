// Simulador simple para poblar el backend con datos de sensores
// Ejecuta: node simulator.js

const target = 'http://localhost:4000/api/sensor-data';

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Definir sensores iniciales y estado de ciclo para cada uno
const sensors = [
  { sensor_id: '1', total_acumulado: 50, state: {} },
  { sensor_id: '2', total_acumulado: 10, state: {} },
  { sensor_id: '3', total_acumulado: 200, state: {} }
];

// Configuración de patrón por sensor (puedes ajustar amplitudes y duraciones)
const PATTERN = [
  { name: 'normal', duration: 30 },       // periodo normal con ruido
  { name: 'ramp_up', duration: 10 },      // subida gradual
  { name: 'spike', duration: 6 },         // picos cortos
  { name: 'sustain_high', duration: 20 }, // periodo sostenido alto
  { name: 'ramp_down', duration: 10 },    // bajada gradual
  { name: 'sustain_low', duration: 20 },  // periodo sostenido bajo
  { name: 'noise', duration: 10 }         // ruido aleatorio
];

function initSensorState(sensor) {
  sensor.state.phaseIndex = 0;
  sensor.state.phaseTick = 0;
  // base level (L/min) por sensor — aumentado para simular caudales reales grandes
  // Valores típicos de red: decenas a cientos de L/min según la bomba/red
  sensor.state.base = (Math.random() * 150) + 50; // ~50-200 L/min
  sensor.state.highLevel = sensor.state.base + (Math.random() * 300) + 100; // base + 100-400
  sensor.state.lowLevel = Math.max(0, sensor.state.base - (Math.random() * 30) - 20); // más bajo
  sensor.state.spikeAmp = (Math.random() * 400) + 200; // amplitud de pico (L/min)
}

for (const s of sensors) initSensorState(s);

async function sendSensor(sensor) {
  // Generar valores según patrón cíclico con ruido, picos y sostenidos
  const intervalSeconds = 3; // intervalo del tick en segundos (se usa para acumulado)
  const state = sensor.state;
  const phase = PATTERN[state.phaseIndex];

  // avance de fase
  const t = state.phaseTick;
  const dur = phase.duration;

  // ruido base
  const noise = () => (Math.random() - 0.5) * 1.2; // +/- ~0.6 L/min

  let caudalValue = state.base + noise();

  if (phase.name === 'normal') {
    caudalValue = state.base + noise();
  } else if (phase.name === 'ramp_up') {
    const f = (t + 1) / dur;
    caudalValue = state.base + f * (state.highLevel - state.base) + noise();
  } else if (phase.name === 'spike') {
    // picos cortos, con posibilidad de pico extremo aleatorio
    const spike = state.spikeAmp * (0.7 + Math.random() * 0.8);
    caudalValue = state.highLevel + spike * (Math.random() > 0.4 ? 1 : 0) + noise();
  } else if (phase.name === 'sustain_high') {
    caudalValue = state.highLevel + noise();
  } else if (phase.name === 'ramp_down') {
    const f = (t + 1) / dur;
    caudalValue = state.highLevel - f * (state.highLevel - state.lowLevel) + noise();
  } else if (phase.name === 'sustain_low') {
    caudalValue = state.lowLevel + noise();
  } else if (phase.name === 'noise') {
    caudalValue = state.base + (Math.random() - 0.5) * (state.spikeAmp / 2);
  }

  // Raramente introduce un pico extremo aleatorio para pruebas de límites
  if (Math.random() < 0.03) {
    caudalValue = Math.max(0, caudalValue + (Math.random() * state.spikeAmp + 50));
  }

  // Actualizar contadores de fase
  state.phaseTick = (state.phaseTick + 1) % dur;
  if (state.phaseTick === 0) {
    state.phaseIndex = (state.phaseIndex + 1) % PATTERN.length;
  }

  // Garantizar valor no negativo y limitar precisión (interno en L/min)
  const caudal = Math.max(0, parseFloat(caudalValue.toFixed(3)));

  // Calcular acumulado en litros: caudal (L/min) * segundos / 60
  const litersThisTick = +(caudal * (intervalSeconds / 60));
  sensor.total_acumulado = parseFloat((sensor.total_acumulado + litersThisTick).toFixed(3));

  // Convertir a mililitros para enviar (el servidor divide por 1000 al recibir)
  const caudal_mL = Math.round(caudal * 1000); // mL/min entero
  const total_mL = Math.round(sensor.total_acumulado * 1000); // mL acumulados

  const payload = {
    sensor_id: String(sensor.sensor_id),
    caudal_min: String(caudal_mL),
    total_acumulado: String(total_mL),
    hora: formatDate(new Date())
  };

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log(`Enviado sensor ${sensor.sensor_id} -> ${res.status} ${text} | caudal:${caudal} L/min (${caudal_mL} mL/min) total:${sensor.total_acumulado} L (${total_mL} mL)`);
  } catch (err) {
    console.error('Error enviando sensor', sensor.sensor_id, err.message || err);
  }
}

async function tick() {
  for (const s of sensors) {
    await sendSensor(s);
    // pequeña pausa entre envíos para no saturar
    await new Promise(r => setTimeout(r, 150));
  }
}

console.log('Simulador mejorado iniciado. Enviando datos cada 3 segundos con patrones (picos, sostenidos, ruido)...');
// Primer envío inmediato
tick();
setInterval(tick, 3000);
