import { useState, useEffect } from 'react';
import './AlertsPanel.css';

function AlertsPanel({ sensors }) {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        // Generar alertas basadas en datos de sensores
        const generatedAlerts = [];

        sensors.forEach(sensor => {
            if (sensor.caudal_min > 15) {
                generatedAlerts.push({
                    id: `high-flow-${sensor.sensor_id}`,
                    type: 'warning',
                    icon: '⚠️',
                    title: 'Flujo elevado detectado',
                    sensor: `Sensor ${sensor.sensor_id}`,
                    time: new Date(sensor.hora).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                });
            }

            if (sensor.total_acumulado > 100) {
                generatedAlerts.push({
                    id: `high-total-${sensor.sensor_id}`,
                    type: 'info',
                    icon: '📊',
                    title: 'Acumulado alto',
                    sensor: `Sensor ${sensor.sensor_id}`,
                    time: new Date(sensor.hora).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                });
            }
        });

        // Agregar algunas alertas de ejemplo si no hay suficientes
        if (generatedAlerts.length === 0) {
            generatedAlerts.push(
                {
                    id: 'default-1',
                    type: 'info',
                    icon: '📡',
                    title: 'Flujo dentro de parámetros',
                    sensor: 'Sistema',
                    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                },
                {
                    id: 'default-2',
                    type: 'success',
                    icon: '✓',
                    title: 'Parámetros óptimos',
                    sensor: 'Tanque 1',
                    time: new Date(Date.now() - 300000).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                },
                {
                    id: 'default-3',
                    type: 'info',
                    icon: '🔄',
                    title: 'Sistema sincronizado',
                    sensor: 'Red Sensores',
                    time: new Date(Date.now() - 600000).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }
            );
        }

        setAlerts(generatedAlerts.slice(0, 5)); // Máximo 5 alertas
    }, [sensors]);

    return (
        <div className="alerts-panel glass">
            <div className="alerts-header">
                <h3 className="alerts-title">ALERTAS ACTIVAS</h3>
                <span className="alerts-count">{alerts.length}</span>
            </div>

            <div className="alerts-list">
                {alerts.map((alert) => (
                    <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                        <div className="alert-icon">{alert.icon}</div>
                        <div className="alert-content">
                            <p className="alert-title">{alert.title}</p>
                            <p className="alert-sensor">{alert.sensor}</p>
                        </div>
                        <div className="alert-time">{alert.time}</div>
                    </div>
                ))}
            </div>

            <button className="view-all-button" onClick={async () => {
                try {
                    const res = await fetch('/api/generate-report');
                    if (!res.ok) throw new Error('Error generando reporte');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const disposition = res.headers.get('content-disposition') || '';
                    let filename = 'reporte_tecnico.csv';
                    const match = /filename\*=UTF-8''(.+)$/.exec(disposition) || /filename="?([^";]+)"?/.exec(disposition);
                    if (match && match[1]) filename = decodeURIComponent(match[1]);
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                } catch (err) {
                    console.error(err);
                    alert('Error generando el reporte técnico. Revisa la consola.');
                }
            }}>
                <span>Generar Reporte Técnico</span>
                <span className="button-arrow">→</span>
            </button>
        </div>
    );
}

export default AlertsPanel;
