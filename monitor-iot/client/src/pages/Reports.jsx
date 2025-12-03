import React, { useEffect, useState } from 'react';
import Chart from '../components/Chart';

function Reports() {
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/reports');
        const json = await res.json();
        if (json.success) {
          setReports(json.data || {});
          const first = Object.keys(json.data || {})[0] || null;
          setSelectedSensor(first);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // actualizar cada 5s
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const flattened = [];
  Object.entries(reports).forEach(([sid, arr]) => {
    arr.forEach(item => flattened.push({ sensor_id: sid, ...item }));
  });

  const chartData = selectedSensor && reports[selectedSensor] ? reports[selectedSensor].map(r => ({ time: r.hora || new Date(r.ultima_actualizacion).toLocaleTimeString('es-ES'), value: Number(r.caudal_min) })) : [];

  return (
    <div className="page reports">
      <header className="page-header">
        <h1>Página de Reportes</h1>
        <p>Genera, filtra y exporta datos históricos y de rendimiento.</p>
      </header>

      {loading ? (
        <p>Cargando reportes...</p>
      ) : (
        <div className="reports-grid">
          <div className="reports-chart">
            <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <label>Sensor: </label>
                <select value={selectedSensor || ''} onChange={e => setSelectedSensor(e.target.value)}>
                  {Object.keys(reports).length === 0 && <option value="">(sin datos)</option>}
                  {Object.keys(reports).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <button onClick={() => {
                  // Exportar CSV del sensor seleccionado (cliente-side)
                  if (!selectedSensor || !reports[selectedSensor]) { alert('Selecciona un sensor con datos'); return; }
                  const arr = reports[selectedSensor];
                  const rows = [];
                  rows.push(['timestamp','sensor_id','hora','caudal_min','total_acumulado']);
                  arr.forEach(it => rows.push([it.ultima_actualizacion || '', selectedSensor, it.hora || '', it.caudal_min || '', it.total_acumulado || '']));
                  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `historial_${selectedSensor}_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
                  document.body.appendChild(a);
                  a.click(); a.remove(); URL.revokeObjectURL(url);
                }}>Exportar CSV</button>
              </div>
            </div>
            <Chart data={chartData} title={`Rendimiento Histórico: ${selectedSensor || ''}`} currentValue={`${chartData.length ? chartData[chartData.length-1].value : '-'} m³`} />
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
                {flattened.length === 0 && (
                  <tr><td colSpan={4}>No hay datos históricos disponibles.</td></tr>
                )}
                {flattened.map((s, idx) => (
                  <tr key={`${s.sensor_id}-${idx}`}>
                    <td>{s.hora || new Date(s.ultima_actualizacion).toLocaleString('es-ES')}</td>
                    <td>{s.sensor_id}</td>
                    <td>{s.caudal_min}</td>
                    <td>{s.total_acumulado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
