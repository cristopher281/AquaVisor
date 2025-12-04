import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiClock, FiActivity, FiX, FiRefreshCw } from 'react-icons/fi';
import './Alerts.css';

function Alerts() {
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filter, setFilter] = useState('active'); // 'active', 'dismissed', 'all'

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
                message: `El caudal ha excedido el umbral crítico de 12 L/min`,
                value: `${s.caudal_min} L/min`,
                details: {
                  timestamp: new Date().toISOString(),
                  threshold: '12 L/min',
                  current: `${s.caudal_min} L/min`,
                  exceeded: `${((s.caudal_min - 12) / 12 * 100).toFixed(1)}%`,
                  location: `Sensor ${s.sensor_id}`,
                  recommendations: [
                    'Verificar válvulas de control',
                    'Revisar presión del sistema',
                    'Contactar al equipo de mantenimiento'
                  ]
                }
              });
            }
            if (s.total_acumulado > 100) {
              gen.push({
                id: `total-${s.sensor_id}`,
                level: 'warning',
                title: 'Acumulado Alto',
                sensor: s.sensor_id,
                time: s.hora,
                message: `El total acumulado supera los 100 L`,
                value: `${s.total_acumulado} L`,
                details: {
                  timestamp: new Date().toISOString(),
                  threshold: '100 L',
                  current: `${s.total_acumulado} L`,
                  exceeded: `${((s.total_acumulado - 100) / 100 * 100).toFixed(1)}%`,
                  location: `Sensor ${s.sensor_id}`,
                  recommendations: [
                    'Monitorear consumo',
                    'Verificar lectura del sensor',
                    'Revisar configuración de límites'
                  ]
                }
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
                value: `${s.caudal_min} L/min`,
                details: {
                  timestamp: new Date().toISOString(),
                  threshold: 'N/A',
                  current: `${s.caudal_min} L/min`,
                  location: `Sensor ${s.sensor_id}`,
                  recommendations: ['Sistema funcionando correctamente']
                }
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

    // Cargar alertas descartadas desde localStorage
    const savedDismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    setDismissedAlerts(savedDismissed);

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

  const handleDismiss = (alert) => {
    const updated = [...dismissedAlerts, { ...alert, dismissedAt: new Date().toISOString() }];
    setDismissedAlerts(updated);
    localStorage.setItem('dismissedAlerts', JSON.stringify(updated));
    setAlerts(alerts.filter(a => a.id !== alert.id));
  };

  const handleRestore = (alert) => {
    const updated = dismissedAlerts.filter(a => a.id !== alert.id);
    setDismissedAlerts(updated);
    localStorage.setItem('dismissedAlerts', JSON.stringify(updated));
    setAlerts([...alerts, alert]);
  };

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
  };

  const closeModal = () => {
    setSelectedAlert(null);
  };

  const getFilteredAlerts = () => {
    switch (filter) {
      case 'active':
        return alerts;
      case 'dismissed':
        return dismissedAlerts;
      case 'all':
        return [...alerts, ...dismissedAlerts];
      default:
        return alerts;
    }
  };

  const filteredAlerts = getFilteredAlerts();

  return (
    <div className="page alerts-page">
      <header className="page-header">
        <div>
          <h1>Página de Alertas</h1>
          <p>Monitoreo y gestión de todas las alertas del sistema.</p>
        </div>
        <div className="alert-filters">
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Activas ({alerts.length})
          </button>
          <button
            className={`filter-btn ${filter === 'dismissed' ? 'active' : ''}`}
            onClick={() => setFilter('dismissed')}
          >
            Descartadas ({dismissedAlerts.length})
          </button>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas ({alerts.length + dismissedAlerts.length})
          </button>
        </div>
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
            <span className="stat-label">Total Activas</span>
          </div>
        </div>
      </div>

      <div className="alerts-grid">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            <FiInfo className="no-alerts-icon" />
            <h3>No hay alertas {filter === 'active' ? 'activas' : filter === 'dismissed' ? 'descartadas' : ''}</h3>
            <p>
              {filter === 'active' && 'Todos los sensores están operando normalmente'}
              {filter === 'dismissed' && 'No has descartado ninguna alerta'}
              {filter === 'all' && 'No hay alertas en el sistema'}
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const Icon = getAlertIcon(alert.level);
            const isDismissed = dismissedAlerts.some(d => d.id === alert.id);

            return (
              <div key={alert.id} className={`alert-card alert-${alert.level} ${isDismissed ? 'dismissed' : ''}`}>
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
                  {!isDismissed ? (
                    <>
                      <button className="alert-action dismiss-btn" onClick={() => handleDismiss(alert)}>
                        Descartar
                      </button>
                      <button className="alert-action details-btn" onClick={() => handleViewDetails(alert)}>
                        Ver Detalles
                      </button>
                    </>
                  ) : (
                    <button className="alert-action restore-btn" onClick={() => handleRestore(alert)}>
                      <FiRefreshCw /> Recuperar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Detalles */}
      {selectedAlert && (
        <>
          <div className="modal-overlay" onClick={closeModal}></div>
          <div className="alert-modal">
            <div className="modal-header">
              <h2>{selectedAlert.title}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h3>Información General</h3>
                <div className="modal-grid">
                  <div className="modal-item">
                    <span className="modal-label">Nivel</span>
                    <span className={`modal-value badge-${selectedAlert.level}`}>
                      {getAlertLabel(selectedAlert.level)}
                    </span>
                  </div>
                  <div className="modal-item">
                    <span className="modal-label">Sensor</span>
                    <span className="modal-value">{selectedAlert.sensor}</span>
                  </div>
                  <div className="modal-item">
                    <span className="modal-label">Hora</span>
                    <span className="modal-value">{selectedAlert.time}</span>
                  </div>
                  <div className="modal-item">
                    <span className="modal-label">Ubicación</span>
                    <span className="modal-value">{selectedAlert.details.location}</span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3>Métricas</h3>
                <div className="modal-grid">
                  <div className="modal-item">
                    <span className="modal-label">Umbral</span>
                    <span className="modal-value">{selectedAlert.details.threshold}</span>
                  </div>
                  <div className="modal-item">
                    <span className="modal-label">Valor Actual</span>
                    <span className="modal-value highlight">{selectedAlert.details.current}</span>
                  </div>
                  {selectedAlert.details.exceeded && (
                    <div className="modal-item">
                      <span className="modal-label">Excedido</span>
                      <span className="modal-value danger">{selectedAlert.details.exceeded}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-section">
                <h3>Descripción</h3>
                <p className="modal-description">{selectedAlert.message}</p>
              </div>

              <div className="modal-section">
                <h3>Recomendaciones</h3>
                <ul className="modal-recommendations">
                  {selectedAlert.details.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={closeModal}>Cerrar</button>
              <button className="modal-btn primary" onClick={() => {
                handleDismiss(selectedAlert);
                closeModal();
              }}>
                Descartar Alerta
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Alerts;
