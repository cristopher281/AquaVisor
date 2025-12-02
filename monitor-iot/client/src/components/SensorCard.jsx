import React from 'react';
import './SensorCard.css';

function SensorCard({ sensor }) {
  if (!sensor) return null;

  const { sensor_id, caudal_min, total_acumulado, hora, ultima_actualizacion } = sensor;

  return (
    <div className="sensor-card">
      <div className="sensor-card-header">
        <span className="sensor-id">Sensor {sensor_id}</span>
        <span className="sensor-status">Operativo</span>
      </div>

      <div className="sensor-card-body">
        <div className="metric">
          <div className="metric-label">Caudal (m³/min)</div>
          <div className="metric-value">{caudal_min !== undefined ? caudal_min : '-'} </div>
        </div>

        <div className="metric">
          <div className="metric-label">Total Acumulado</div>
          <div className="metric-value">{total_acumulado !== undefined ? total_acumulado : '-'} </div>
        </div>
      </div>

      <div className="sensor-card-footer">
        <small className="sensor-time">Hora: {hora || '-'}</small>
        <small className="sensor-updated">Última: {ultima_actualizacion ? new Date(ultima_actualizacion).toLocaleTimeString('es-ES') : '-'}</small>
      </div>
    </div>
  );
}

export default SensorCard;
