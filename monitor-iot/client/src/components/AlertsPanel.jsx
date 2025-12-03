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
                                // Generar PDF profesional client-side: captura gráfica, mini-gráficas (sparklines) y estadísticas
                                try {
                                    const html2canvasMod = await import('html2canvas');
                                    const html2canvas = html2canvasMod && html2canvasMod.default ? html2canvasMod.default : html2canvasMod;
                                    const jspdfMod = await import('jspdf');
                                    const jsPDF = jspdfMod && jspdfMod.jsPDF ? jspdfMod.jsPDF : jspdfMod.default || jspdfMod;

                                    // Capturar la gráfica principal
                                    const chartEl = document.getElementById('dashboard-chart');
                                    if (!chartEl) { alert('No se encontró la gráfica en la página. Ve al Centro de Comando y prueba de nuevo.'); return; }
                                    const canvas = await html2canvas(chartEl, { scale: 2 });
                                    const imgData = canvas.toDataURL('image/png');

                                    // Obtener historial y metadatos
                                    const repRes = await fetch('/api/reports');
                                    const repJson = await repRes.json();
                                    const sensorsData = (repJson && repJson.data) ? repJson.data : {};

                                    // Utility: crear sparkline dataURL desde array de números
                                    const makeSparkline = (values = [], w = 160, h = 40, stroke = '#3b82f6') => {
                                        const cvs = document.createElement('canvas');
                                        cvs.width = w; cvs.height = h; const ctx = cvs.getContext('2d');
                                        // background
                                        ctx.fillStyle = 'rgba(255,255,255,0)'; ctx.fillRect(0,0,w,h);
                                        if (!values || values.length === 0) return cvs.toDataURL('image/png');
                                        const min = Math.min(...values); const max = Math.max(...values);
                                        const range = (max - min) || 1;
                                        ctx.beginPath();
                                        values.forEach((v,i) => {
                                            const x = (i/(values.length-1))*(w-4) + 2;
                                            const y = h - 4 - ((v - min)/range)*(h-8);
                                            if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                                        });
                                        // stroke
                                        ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
                                        // fill area
                                        ctx.lineTo(w-2, h-2); ctx.lineTo(2, h-2); ctx.closePath();
                                        const grad = ctx.createLinearGradient(0,0,0,h);
                                        grad.addColorStop(0, 'rgba(59,130,246,0.25)'); grad.addColorStop(1, 'rgba(59,130,246,0)');
                                        ctx.fillStyle = grad; ctx.fill();
                                        // small circle on last point
                                        const lastX = ( (values.length-1)/(values.length-1) )*(w-4) + 2;
                                        const lastY = h - 4 - ((values[values.length-1]-min)/range)*(h-8);
                                        ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(lastX, lastY, 3, 0, Math.PI*2); ctx.fill();
                                        ctx.beginPath(); ctx.fillStyle = stroke; ctx.arc(lastX, lastY, 2, 0, Math.PI*2); ctx.fill();
                                        return cvs.toDataURL('image/png');
                                    };

                                    // Crear PDF con layout más profesional
                                    const doc = new jsPDF({ orientation: 'landscape' });
                                    const pageW = doc.internal.pageSize.getWidth();
                                    const pageH = doc.internal.pageSize.getHeight();
                                    const margin = 14;

                                    // Header (try to include logo if present)
                                    doc.setFontSize(18);
                                    const logoUrl = '/logo.png';
                                    try {
                                        const logoResp = await fetch(logoUrl);
                                        if (logoResp.ok) {
                                            const blob = await logoResp.blob();
                                            const reader = new FileReader();
                                            const logoData = await new Promise(res => { reader.onload = () => res(reader.result); reader.readAsDataURL(blob); });
                                            const logoW = 36; const logoH = 36;
                                            doc.addImage(logoData, 'PNG', margin, 12, logoW, logoH);
                                            doc.text('AquaVisor', margin + logoW + 8, 28);
                                        } else {
                                            doc.text('AquaVisor - Reporte Técnico', margin, 28);
                                        }
                                    } catch (e) {
                                        doc.text('AquaVisor - Reporte Técnico', margin, 28);
                                    }

                                    doc.setFontSize(10);
                                    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pageW - margin - 80, 20);
                                    doc.setDrawColor(220); doc.line(margin, 36, pageW - margin, 36);

                                    // Main chart image
                                    const imgProps = doc.getImageProperties(imgData);
                                    const imgW = pageW - margin*2;
                                    const imgH = (imgProps.height * imgW) / imgProps.width;
                                    let cursorY = 40;
                                    doc.addImage(imgData, 'PNG', margin, cursorY, imgW, imgH);
                                    cursorY += imgH + 8;

                                    // Añadir tabla de sensores con sparkline + stats (limitar a 12 sensores)
                                    const keys = Object.keys(sensorsData).slice(0, 12);
                                    doc.setFontSize(12); doc.text('Resumen por sensor', margin, cursorY);
                                    cursorY += 6;
                                    doc.setFontSize(10);

                                    const rowH = 36; const imgSparkW = 80; const col1W = 48; const col2W = imgSparkW + 8; const col3W = 60;
                                    for (let i=0;i<keys.length;i++) {
                                        const k = keys[i]; const arr = sensorsData[k] || [];
                                        const values = arr.map(x => Number(x.caudal_min) || 0).slice(-40);
                                        const avg = values.length ? (values.reduce((a,b)=>a+b,0)/values.length) : 0;
                                        const min = values.length ? Math.min(...values) : 0;
                                        const max = values.length ? Math.max(...values) : 0;
                                        const spark = makeSparkline(values, imgSparkW, 36);

                                        if (cursorY + rowH > pageH - 30) { doc.addPage(); cursorY = margin + 8; }

                                        // sensor id
                                        doc.setFontSize(11); doc.text(`${k}`, margin, cursorY + 12);
                                        // sparkline image
                                        doc.addImage(spark, 'PNG', margin + col1W, cursorY + 2, imgSparkW, 36);
                                        // stats
                                        doc.setFontSize(10);
                                        doc.text(`Avg: ${avg.toFixed(2)} m³/min`, margin + col1W + col2W + 4, cursorY + 10);
                                        doc.text(`Min: ${min.toFixed(2)}`, margin + col1W + col2W + 4, cursorY + 18);
                                        doc.text(`Max: ${max.toFixed(2)}`, margin + col1W + col2W + 4, cursorY + 26);

                                        cursorY += rowH;
                                    }

                                    // Footer
                                    doc.setFontSize(9);
                                    doc.text('Reporte generado por AquaVisor', margin, pageH - 10);

                                    const filename = `reporte_profesional_${new Date().toISOString().replace(/[:.]/g,'-')}.pdf`;
                                    doc.save(filename);
                                } catch (err) {
                                    console.error('Error generando PDF:', err);
                                    alert('Error generando PDF. Revisa la consola del navegador para más detalles.');
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
