import React from 'react';
import { FiActivity, FiDroplet } from 'react-icons/fi';
import './SensorCard.css';

function SensorCard({ sensor }) {
  if (!sensor) return null;

  const { sensor_id, caudal_min, total_acumulado, hora, ultima_actualizacion } = sensor;

  return (
    <div className="sensor-card">
      <div className="sensor-card-header">
        <div className="sensor-id-wrapper">
          <FiDroplet className="sensor-icon" />
          <span className="sensor-id">Sensor {sensor_id}</span>
        </div>
        <span className="sensor-status">
          <span className="status-dot"></span>
          Operativo
        </span>
      </div>

      <div className="sensor-card-body">
        <div className="metric-primary">
          <div className="metric-icon-wrapper">
            <FiActivity className="metric-icon" />
          </div>
          <div className="metric-content">
            <div className="metric-label">Caudal</div>
            <div className="metric-value-large">
              {caudal_min !== undefined ? caudal_min : '-'}
              <span className="metric-unit">m³/min</span>
            </div>
          </div>
        </div>

        <div className="metric-secondary">
          <div className="metric-item">
            <div className="metric-label-small">Total Acumulado</div>
            <div className="metric-value-medium">
              {total_acumulado !== undefined ? total_acumulado : '-'}
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label-small">Última Actualización</div>
            <div className="metric-value-small">
              {ultima_actualizacion ? new Date(ultima_actualizacion).toLocaleTimeString('es-ES') : hora || '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SensorCard;
