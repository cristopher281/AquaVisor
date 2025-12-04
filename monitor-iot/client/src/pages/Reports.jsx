import React, { useEffect, useState } from 'react';
import Chart from '../components/Chart';
import { FiChevronLeft, FiChevronRight, FiDownload, FiFilter } from 'react-icons/fi';
import './Reports.css';

function Reports() {
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/reports');
        const json = await res.json();
        if (json.success) {
          setReports(json.data || {});

          // Solo setear el primer sensor si no hay ninguno seleccionado
          // o si el sensor seleccionado ya no existe en los nuevos datos
          if (!selectedSensor || !json.data[selectedSensor]) {
            const first = Object.keys(json.data || {})[0] || null;
            setSelectedSensor(first);
          }
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
  }, [selectedSensor]); // Agregar selectedSensor como dependencia

  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [reports]);

  const flattened = [];
  Object.entries(reports).forEach(([sid, arr]) => {
    arr.forEach(item => flattened.push({ sensor_id: sid, ...item }));
  });

  // Ordenar por fecha más reciente primero
  flattened.sort((a, b) => {
    const dateA = new Date(a.ultima_actualizacion || a.hora);
    const dateB = new Date(b.ultima_actualizacion || b.hora);
    return dateB - dateA; // Más reciente primero
  });

  // Paginación
  const totalPages = Math.ceil(flattened.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = flattened.slice(startIndex, endIndex);

  const chartData = selectedSensor && reports[selectedSensor] ? reports[selectedSensor].map(r => ({ time: r.hora || new Date(r.ultima_actualizacion).toLocaleTimeString('es-ES'), value: Number(r.caudal_min) })) : [];

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleExportCSV = () => {
    // Exportar CSV del sensor seleccionado (cliente-side)
    if (!selectedSensor || !reports[selectedSensor]) {
      alert('Selecciona un sensor con datos');
      return;
    }
    const arr = reports[selectedSensor];
    const rows = [];
    rows.push(['timestamp', 'sensor_id', 'hora', 'caudal_min', 'total_acumulado']);
    arr.forEach(it => rows.push([it.ultima_actualizacion || '', selectedSensor, it.hora || '', it.caudal_min || '', it.total_acumulado || '']));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_${selectedSensor}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
            <div className="chart-controls">
              <div className="control-group">
                <label className="control-label">
                  <FiFilter className="label-icon" />
                  Sensor
                </label>
                <select
                  className="sensor-select"
                  value={selectedSensor || ''}
                  onChange={e => setSelectedSensor(e.target.value)}
                >
                  {Object.keys(reports).length === 0 && <option value="">(sin datos)</option>}
                  {Object.keys(reports).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <button className="export-btn" onClick={handleExportCSV}>
                <FiDownload className="btn-icon" />
                Exportar CSV
              </button>
            </div>

            <Chart data={chartData} title={`Rendimiento Histórico: ${selectedSensor || ''}`} currentValue={`${chartData.length ? chartData[chartData.length - 1].value : '-'} L`} />
          </div>

          <div className="reports-table-container">
            <div className="reports-table-header">
              <h3>Datos Históricos</h3>
              <span className="table-info">
                Mostrando {startIndex + 1}-{Math.min(endIndex, flattened.length)} de {flattened.length}
              </span>
            </div>

            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Sensor</th>
                    <th>Caudal (L/min)</th>
                    <th>Total Acumulado (L)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 && (
                    <tr><td colSpan={4} className="no-data">No hay datos históricos disponibles.</td></tr>
                  )}
                  {paginatedData.map((s, idx) => (
                    <tr key={`${s.sensor_id}-${idx}`}>
                      <td>{s.hora || new Date(s.ultima_actualizacion).toLocaleString('es-ES')}</td>
                      <td><span className="sensor-badge">{s.sensor_id}</span></td>
                      <td className="data-value">{s.caudal_min}</td>
                      <td className="data-value">{s.total_acumulado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft />
                </button>

                <div className="pagination-info">
                  <span className="page-number">Página {currentPage} de {totalPages}</span>
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
