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

                        <div style={{ display: 'flex', gap: 8 }}>
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
                                <span>Generar CSV</span>
                                <span className="button-arrow">→</span>
                            </button>

                            <button className="view-all-button" onClick={async () => {
                                // Generar PDF profesional client-side: captura gráfica y tabla/alertas
                                try {
                                    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
                                        import('html2canvas'),
                                        import('jspdf')
                                    ].map(p => p.catch(e => { throw e; })));

                                    // Capturar la gráfica principal
                                    const chartEl = document.getElementById('dashboard-chart');
                                    if (!chartEl) { alert('No se encontró la gráfica en la página.'); return; }
                                    const canvas = await html2canvas(chartEl, { scale: 2 });
                                    const imgData = canvas.toDataURL('image/png');

                                    // Obtener algunos metadatos y tablas desde /api/reports
                                    const repRes = await fetch('/api/reports');
                                    const repJson = await repRes.json();

                                    // Crear PDF
                                    const doc = new jsPDF({ orientation: 'landscape' });
                                    const pageW = doc.internal.pageSize.getWidth();
                                    const margin = 12;

                                    // Encabezado
                                    doc.setFontSize(18);
                                    doc.text('AquaVisor - Reporte Técnico', margin, 20);
                                    doc.setFontSize(10);
                                    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, margin, 28);

                                    // Incluir imagen de la gráfica
                                    const imgProps = doc.getImageProperties(imgData);
                                    const imgW = pageW - margin*2;
                                    const imgH = (imgProps.height * imgW) / imgProps.width;
                                    doc.addImage(imgData, 'PNG', margin, 34, imgW, imgH);

                                    // Añadir resumen pequeño debajo
                                    let cursorY = 34 + imgH + 8;
                                    doc.setFontSize(12);
                                    doc.text('Resumen de Sensores:', margin, cursorY);
                                    cursorY += 6;

                                    // Tabla simple de totales por sensor
                                    if (repJson && repJson.data) {
                                        const keys = Object.keys(repJson.data);
                                        keys.slice(0, 20).forEach((k, i) => {
                                            const last = (repJson.data[k] || []).slice(-1)[0];
                                            const text = `${k} — caudal: ${last ? last.caudal_min : '-'} m³/min — total: ${last ? last.total_acumulado : '-'} `;
                                            doc.setFontSize(10);
                                            doc.text(text, margin, cursorY);
                                            cursorY += 5;
                                            if (cursorY > doc.internal.pageSize.getHeight() - 20) {
                                                doc.addPage(); cursorY = 20;
                                            }
                                        });
                                    }

                                    // Footer
                                    doc.setFontSize(9);
                                    doc.text('Reporte generado por AquaVisor', margin, doc.internal.pageSize.getHeight() - 10);

                                    const filename = `reporte_profesional_${new Date().toISOString().replace(/[:.]/g,'-')}.pdf`;
                                    doc.save(filename);
                                } catch (err) {
                                    console.error('Error generando PDF:', err);
                                    alert('Error generando PDF. Asegúrate de haber instalado dependencias: `npm install html2canvas jspdf` en el cliente.');
                                }
                            }}>
                                <span>Generar PDF</span>
                                <span className="button-arrow">→</span>
                            </button>
                        </div>
        </div>
    );
}

export default AlertsPanel;
