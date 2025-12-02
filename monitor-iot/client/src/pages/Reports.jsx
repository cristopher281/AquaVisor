import React, { useEffect, useState } from 'react';
import Chart from '../components/Chart';

function Reports() {
  const [sensors, setSensors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (json.success) setSensors(json.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="page reports">
      <header className="page-header">
        <h1>Página de Reportes</h1>
        <p>Genera, filtra y exporta datos históricos y de rendimiento.</p>
      </header>

      <div className="reports-grid">
        <div className="reports-chart">
          <Chart data={[]} title="Rendimiento Histórico: Nivel de Agua" />
        </div>

        <div className="reports-table">
          <h3>Datos Históricos</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sensor</th>
                <th>Caudal (m³/min)</th>
                <th>Total Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map(s => (
                <tr key={s.sensor_id}>
                  <td>{s.hora}</td>
                  <td>{s.sensor_id}</td>
                  <td>{s.caudal_min}</td>
                  <td>{s.total_acumulado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Reports;
