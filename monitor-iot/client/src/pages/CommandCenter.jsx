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

  const metrics = (() => {
    if (sensors.length === 0) return { averageFlow: 0, operationalSensors: 0 };
    const avg = sensors.reduce((s, x) => s + (x.caudal_min || 0), 0) / sensors.length;
    return { averageFlow: avg.toFixed(1), operationalSensors: sensors.length };
  })();

  return (
    <div className="page command-center">
      <header className="page-header">
        <h1>Centro de Comando AcuaVisor</h1>
      </header>

      {loading ? (
        <p>Cargando datos...</p>
      ) : (
        <>
          <div className="metrics-grid">
            <MetricCard title="Valor Actual" value={`${metrics.averageFlow} m³`} change="+9%" trend="up" subtitle="vs ayer" />
            <MetricCard title="Nivel Promedio" value="7.9 m" change="-0.5%" trend="down" subtitle="Promedio horario" />
            <MetricCard title="Alertas Críticas" value="5" change="+2" trend="up" subtitle="Activas" />
            <MetricCard title="Estado Sistema" value="Operativo" status="operational" subtitle={`${metrics.operationalSensors} sensores activos`} />
          </div>

          <div className="dashboard-grid">
            <div className="chart-section">
              <Chart data={[]} title="DINÁMICA NIVEL TANQUE" currentValue={`${metrics.averageFlow} m³`} />

              <div className="bottom-metrics">
                <WaterQualityMetrics />
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
