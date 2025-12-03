import React from 'react';
import SensorCard from './SensorCard';
import './ThreeSensorPanel.css';

function ThreeSensorPanel({ sensors = [] }) {
  const main = sensors.length > 0 ? sensors[0] : null;
  const sec1 = sensors.length > 1 ? sensors[1] : null;
  const sec2 = sensors.length > 2 ? sensors[2] : null;

  const computedTotal = (() => {
    // Prefer the main sensor's caudal if available, otherwise sum the secondaries
    if (main && main.caudal_min !== undefined && main.caudal_min !== null) return main.caudal_min;
    const a = sec1 && sec1.caudal_min ? Number(sec1.caudal_min) : 0;
    const b = sec2 && sec2.caudal_min ? Number(sec2.caudal_min) : 0;
    return a + b;
  })();

  return (
    <div className="three-sensor-panel">
      <div className="main-sensor">
        <div className="main-card glass">
          <div className="main-card-header">
            <h3>Caudal Total</h3>
          </div>

          <div className="main-card-body">
            <div className="total-value">{computedTotal !== undefined ? `${computedTotal} m³/min` : '-'} </div>
            <div className="total-note">Representa el caudal del sensor principal o la suma de secundarios</div>
            {main && <div className="main-source">Fuente: Sensor {main.sensor_id}</div>}
          </div>
        </div>
      </div>

      <div className="secondary-sensors">
        <div className="secondary-card">
          {sec1 ? <SensorCard sensor={sec1} /> : <div className="placeholder">Sensor secundario 1 no disponible</div>}
        </div>
        <div className="secondary-card">
          {sec2 ? <SensorCard sensor={sec2} /> : <div className="placeholder">Sensor secundario 2 no disponible</div>}
        </div>
      </div>
    </div>
  );
}

export default ThreeSensorPanel;
