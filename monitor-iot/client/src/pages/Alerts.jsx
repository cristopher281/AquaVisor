import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiClock, FiActivity } from 'react-icons/fi';
import './Alerts.css';

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
            if (s.caudal_min > 12) {
              gen.push({
                id: `high-${s.sensor_id}`,
                level: 'critical',
                title: 'Flujo Crítico',
                sensor: s.sensor_id,
                time: s.hora,
                message: `El caudal ha excedido el umbral crítico de 12 m³/min`,
                value: `${s.caudal_min} m³/min`
              });
            }
            if (s.total_acumulado > 100) {
              gen.push({
                id: `total-${s.sensor_id}`,
                level: 'warning',
                title: 'Acumulado Alto',
                sensor: s.sensor_id,
                time: s.hora,
                message: `El total acumulado supera los 100 m³`,
                value: `${s.total_acumulado} m³`
              });
            }
          });

          // Si no hay alertas críticas, agregar algunas informativas
          if (gen.length === 0) {
            json.data.slice(0, 3).forEach((s, i) => {
              gen.push({
                id: `info-${s.sensor_id}`,
                level: 'info',
                title: 'Sensor Operativo',
                sensor: s.sensor_id,
                time: s.hora,
                message: 'Todos los parámetros dentro del rango normal',
                value: `${s.caudal_min} m³/min`
              });
            });
          }

          setAlerts(gen);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    // Actualizar cada 10s
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (level) => {
    switch (level) {
      case 'critical': return FiAlertTriangle;
      case 'warning': return FiAlertCircle;
      case 'info': return FiInfo;
      default: return FiInfo;
    }
  };

  const getAlertLabel = (level) => {
    switch (level) {
      case 'critical': return 'Crítica';
      case 'warning': return 'Advertencia';
      case 'info': return 'Información';
      default: return 'Info';
    }
  };

  return (
    <div className="page alerts-page">
      <header className="page-header">
        <h1>Página de Alertas</h1>
        <p>Monitoreo y gestión de todas las alertas del sistema.</p>
      </header>

      <div className="alerts-stats">
        <div className="stat-card critical-stat">
          <FiAlertTriangle className="stat-icon" />
          <div className="stat-content">
            <span className="stat-value">{alerts.filter(a => a.level === 'critical').length}</span>
            <span className="stat-label">Críticas</span>
          </div>
        </div>

        <div className="stat-card warning-stat">
          <FiAlertCircle className="stat-icon" />
          <div className="stat-content">
            <span className="stat-value">{alerts.filter(a => a.level === 'warning').length}</span>
            <span className="stat-label">Advertencias</span>
          </div>
        </div>

        <div className="stat-card info-stat">
          <FiInfo className="stat-icon" />
          <div className="stat-content">
            <span className="stat-value">{alerts.filter(a => a.level === 'info').length}</span>
            <span className="stat-label">Informativas</span>
          </div>
        </div>

        <div className="stat-card total-stat">
          <FiActivity className="stat-icon" />
          <div className="stat-content">
            <span className="stat-value">{alerts.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </div>

      <div className="alerts-grid">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <FiInfo className="no-alerts-icon" />
            <h3>No hay alertas activas</h3>
            <p>Todos los sensores están operando normalmente</p>
          </div>
        ) : (
          alerts.map(alert => {
            const Icon = getAlertIcon(alert.level);
            return (
              <div key={alert.id} className={`alert-card alert-${alert.level}`}>
                <div className="alert-header">
                  <div className="alert-icon-wrapper">
                    <Icon className="alert-icon" />
                  </div>
                  <div className="alert-meta">
                    <span className="alert-badge">{getAlertLabel(alert.level)}</span>
                    <div className="alert-time">
                      <FiClock className="time-icon" />
                      {alert.time}
                    </div>
                  </div>
                </div>

                <div className="alert-body">
                  <h3 className="alert-title">{alert.title}</h3>
                  <p className="alert-message">{alert.message}</p>

                  <div className="alert-details">
                    <div className="detail-item">
                      <span className="detail-label">Sensor</span>
                      <span className="detail-value sensor-tag">{alert.sensor}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Valor</span>
                      <span className="detail-value">{alert.value}</span>
                    </div>
                  </div>
                </div>

                <div className="alert-footer">
                  <button className="alert-action dismiss-btn">Descartar</button>
                  <button className="alert-action details-btn">Ver Detalles</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Alerts;
