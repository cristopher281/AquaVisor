import React, { useEffect, useState } from 'react';
import MetricCard from '../components/MetricCard';
import Chart from '../components/Chart';
import AlertsPanel from '../components/AlertsPanel';
import WaterQualityMetrics from '../components/WaterQualityMetrics';
import SensorHealth from '../components/SensorHealth';
import SensorCard from '../components/SensorCard';
import ThreeSensorPanel from '../components/ThreeSensorPanel';
import './pages.css';

function CommandCenter() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [pctChange, setPctChange] = useState(null);
  const [pctTrend, setPctTrend] = useState('neutral');
  const [pctTooltip, setPctTooltip] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        // Normalizar estructura: aceptar array o objeto, distintos nombres de campo
        let raw = json.data;
        let list = [];
        if (Array.isArray(raw)) list = raw;
        else if (raw && typeof raw === 'object') list = Object.values(raw);

        const normalized = list.map(s => ({
          sensor_id: s.sensor_id ?? s.id ?? s.name ?? null,
          caudal_min: s.caudal_min ?? s.caudal ?? s.flow ?? s.value ?? null,
          total_acumulado: s.total_acumulado ?? s.total ?? s.accumulated ?? null,
          hora: s.hora ?? s.time ?? null,
          ultima_actualizacion: s.ultima_actualizacion ?? s.updated_at ?? s.last_update ?? null,
          role: s.role ?? s.type ?? s.role_type ?? null,
          raw: s
        }));

        // Selección robusta del sensor principal y secundarios por 'role'
        const mainByRole = normalized.find(x => x.role && x.role.toString().toLowerCase().includes('prin'));
        const secondariesByRole = normalized.filter(x => x.role && x.role.toString().toLowerCase().includes('sec'));

        const main = mainByRole || normalized[0] || null;
        const sec1 = secondariesByRole[0] || normalized.find(x => x.sensor_id !== (main && main.sensor_id)) || null;
        const sec2 = secondariesByRole[1] || normalized.filter(x => x.sensor_id !== (main && main.sensor_id) && x.sensor_id !== (sec1 && sec1.sensor_id))[0] || null;

        // Orden: main, sec1, sec2, luego el resto
        const ordered = [];
        if (main) ordered.push(main);
        if (sec1) ordered.push(sec1);
        if (sec2) ordered.push(sec2);
        normalized.forEach(n => {
          if (![main && main.sensor_id, sec1 && sec1.sensor_id, sec2 && sec2.sensor_id].includes(n.sensor_id)) ordered.push(n);
        });

        setSensors(ordered);

        // Actualizar datos para la gráfica: usar el sensor principal o sumar secundarios
        const mainForChart = main;
        let chartValue = null;
        if (mainForChart && mainForChart.caudal_min !== null && mainForChart.caudal_min !== undefined) {
          chartValue = Number(mainForChart.caudal_min);
        } else {
          const a = sec1 && sec1.caudal_min ? Number(sec1.caudal_min) : 0;
          const b = sec2 && sec2.caudal_min ? Number(sec2.caudal_min) : 0;
          chartValue = a + b;
        }

        const timeLabel = new Date().toLocaleTimeString('es-ES');
        if (chartValue !== null && !Number.isNaN(chartValue)) {
          setChartData(prev => {
            const next = [...prev, { time: timeLabel, value: Number(chartValue.toFixed(2)) }];
            // mantener último N puntos
            const MAX = 30;
            return next.slice(-MAX);
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const iv = setInterval(fetchDashboard, 3000);
    return () => clearInterval(iv);
  }, []);

  // Feature flag para métricas de calidad del agua.
  // Se puede activar mediante la variable de entorno Vite `VITE_ENABLE_WQ=true`,
  // mediante el campo `enableWQ` en `acua_settings` (persistido en localStorage),
  // o temporalmente en el navegador con `localStorage.setItem('acua_enable_wq','true')`.
  let enableWQ = false;
  try {
    const fromEnv = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENABLE_WQ === 'true');
    const fromKey = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('acua_enable_wq') === 'true');
    let fromSettings = false;
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem('acua_settings');
      if (raw) {
        try {
          const s = JSON.parse(raw);
          fromSettings = !!s && !!s.enableWQ;
        } catch (e) { /* ignore */ }
      }
    }
    enableWQ = fromEnv || fromKey || fromSettings;
  } catch (e) {
    enableWQ = false;
  }

  const metrics = (() => {
    if (sensors.length === 0) return { averageFlow: 0, operationalSensors: 0, averageVolume: 0 };
    const avg = sensors.reduce((s, x) => s + (x.caudal_min || 0), 0) / sensors.length;
    // averageVolume: promedio de `total_acumulado` (ya está en litros en el backend)
    const avgVol = sensors.reduce((s, x) => s + (x.total_acumulado || 0), 0) / sensors.length;
    return { averageFlow: avg.toFixed(1), operationalSensors: sensors.length, averageVolume: Number(avgVol.toFixed(1)) };
  })();

  // Obtener promedio de ayer desde el servidor y calcular % de cambio frente al promedio actual
  async function fetchYesterdayAverage() {
    try {
      const res = await fetch('/api/average-yesterday?mode=rolling24h');
      if (!res.ok) return null;
      const json = await res.json();
      if (json && json.success) return json; // devuelve objeto con average/previousAverage/etc
    } catch (e) {
      console.warn('fetchYesterdayAverage error', e);
    }
    return null;
  }

  useEffect(() => {
    // cuando cambie el promedio calculado, obtener promedio de ayer y calcular %
    let mounted = true;
    (async () => {
      try {
        const currStr = metrics.averageFlow;
        const curr = Number(currStr);
        if (Number.isNaN(curr)) {
          if (mounted) { setPctChange(null); setPctTrend('neutral'); }
          return;
        }

        const resp = await fetchYesterdayAverage();
        if (!mounted) return;
        if (!resp) {
          setPctChange(null); setPctTrend('neutral'); setPctTooltip('');
        } else {
          // resp puede tener: average, previousAverage, samples, previousSamples, mode
          const avg = resp.average;
          const prev = resp.previousAverage !== undefined ? resp.previousAverage : resp.average; // si no hay previous, usar average (no hay cambio)
          const samples = resp.samples || 0;
          const prevSamples = resp.previousSamples || 0;

          if (prev === null || prev === 0 || avg === null) {
            setPctChange(null);
            setPctTrend('neutral');
            // tooltip: mostrar valores disponibles
            const tip = resp.mode === 'rolling24h'
              ? `Últimas 24h: ${avg !== null ? avg + ' L' : 'N/D'} (${samples} muestras) — Prev 24-48h: ${resp.previousAverage !== null ? resp.previousAverage + ' L' : 'N/D'} (${prevSamples} muestras)`
              : `Ayer: ${avg !== null ? avg + ' L' : 'N/D'} (${samples} muestras)`;
            setPctTooltip(tip);
          } else {
            const diff = Number(curr) - Number(prev);
            const pct = (diff / Math.abs(Number(prev))) * 100;
            const sign = pct >= 0 ? '+' : '';
            setPctChange(`${sign}${pct.toFixed(1)}%`);
            setPctTrend(pct > 0 ? 'up' : (pct < 0 ? 'down' : 'neutral'));
            const tip = resp.mode === 'rolling24h'
              ? `Últimas 24h: ${avg} L (${samples} muestras) — Prev 24-48h: ${resp.previousAverage !== null ? resp.previousAverage + ' L' : 'N/D'} (${prevSamples} muestras)`
              : `Ayer: ${avg} L (${samples} muestras)`;
            setPctTooltip(tip);
          }
        }
      } catch (err) {
        console.warn('Error calculando cambio vs ayer', err);
        if (mounted) { setPctChange(null); setPctTrend('neutral'); }
      }
    })();
    return () => { mounted = false; };
  }, [metrics.averageFlow]);

  return (
    <div className="page command-center">
      <header className="page-header">
        <h1>Centro de Comando AquaVisor</h1>
      </header>

      {loading ? (
        <p>Cargando datos...</p>
      ) : (
        <>
            <div className="metrics-grid">
            <MetricCard title="Valor Actual" value={`${metrics.averageFlow} L`} change={pctChange || 'N/A'} trend={pctTrend || 'neutral'} subtitle="vs ayer" tooltip={pctTooltip} invertTrend={true} />
            <MetricCard title="Nivel (L)" value={`${metrics.averageVolume} L`} change="-0.5%" trend="down" subtitle="Total acumulado (promedio)" />
            <MetricCard title="Alertas Críticas" value="5" change="+2" trend="up" subtitle="Activas" />
            <MetricCard title="Estado Sistema" value="Operativo" status="operational" subtitle={`${metrics.operationalSensors} sensores activos`} />
          </div>

          <div className="dashboard-grid">
            <div className="chart-section">
              <Chart elementId="dashboard-chart" data={chartData} title="DINÁMICA NIVEL TANQUE" currentValue={`${chartData.length ? chartData[chartData.length-1].value : metrics.averageFlow} L`} />

              <div className="bottom-metrics">
                {enableWQ && <WaterQualityMetrics />}
                <SensorHealth sensorsCount={metrics.operationalSensors} />
              </div>

              <div className="sensors-list">
                <ThreeSensorPanel sensors={sensors.slice(0, 3)} />
              </div>
            </div>

            <AlertsPanel sensors={sensors} />
          </div>
        </>
      )}
    </div>
  );
}

export default CommandCenter;
