import React, { useEffect, useState } from 'react';

function Alerts() {
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (json.success) {
          setSensors(json.data);
          // Generar alertas ejemplo en base a umbrales
          const gen = [];
          json.data.forEach(s => {
            if (s.caudal_min > 12) gen.push({ id: `high-${s.sensor_id}`, level: 'Crítica', title: 'Flujo Critico', sensor: s.sensor_id, time: s.hora });
            if (s.total_acumulado > 100) gen.push({ id: `total-${s.sensor_id}`, level: 'Advertencia', title: 'Acumulado Alto', sensor: s.sensor_id, time: s.hora });
          });
          setAlerts(gen);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="page alerts-page">
      <header className="page-header">
        <h1>Página de Alertas</h1>
        <p>Monitoreo y gestión de todas las alertas del sistema.</p>
      </header>

      <div className="alerts-table">
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Tipo de alerta</th>
              <th>Hora</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr><td colSpan={4}>No hay alertas</td></tr>
            ) : (
              alerts.map(a => (
                <tr key={a.id}>
                  <td>{a.level}</td>
                  <td>{a.title} (Sensor {a.sensor})</td>
                  <td>{a.time}</td>
                  <td>Generado automáticamente por umbrales</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Alerts;
