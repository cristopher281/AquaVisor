import { useState, useEffect } from 'react';
import './AlertsPanel.css';
import { FiAlertTriangle, FiBarChart2, FiCheckCircle, FiRadio } from 'react-icons/fi';

function AlertsPanel({ sensors }) {
    const [alerts, setAlerts] = useState([]);
    const [alertTrend, setAlertTrend] = useState('neutral'); // 'up' | 'down' | 'neutral'
    const prevAlertsCountRef = { current: 0 };

    // Función para guardar reporte en localStorage
    const saveReportToHistory = (filename, type = 'CSV') => {
        const reports = JSON.parse(localStorage.getItem('downloadedReports') || '[]');
        const newReport = {
            name: filename,
            time: new Date().toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            type: type
        };
        reports.unshift(newReport); // Agregar al inicio
        // Mantener solo los últimos 10 reportes
        if (reports.length > 10) reports.pop();
        localStorage.setItem('downloadedReports', JSON.stringify(reports));

        // Disparar evento personalizado para notificar al Header
        window.dispatchEvent(new CustomEvent('reportDownloaded', {
            detail: newReport
        }));
    };

    useEffect(() => {
        // Cargar umbrales desde settings en localStorage (si existen)
        let settings = null;
        try {
            const raw = localStorage.getItem('acua_settings');
            if (raw) settings = JSON.parse(raw);
        } catch (e) {
            console.warn('No fue posible leer settings desde localStorage:', e);
        }

        const topThreshold = settings && settings.thresholdTop ? parseFloat(settings.thresholdTop) : null;
        const bottomThreshold = settings && settings.thresholdBottom ? parseFloat(settings.thresholdBottom) : null;

        // Generar alertas basadas en datos de sensores y umbrales configurados
        const generatedAlerts = [];

        sensors.forEach(sensor => {
            const value = Number(sensor.caudal_min);
            const timeStr = sensor.hora ? new Date(sensor.hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            // Si hay umbrales configurados, priorizar su uso
            if (topThreshold !== null && !Number.isNaN(topThreshold)) {
                if (!Number.isNaN(value) && value > topThreshold) {
                    generatedAlerts.push({
                        id: `threshold-top-${sensor.sensor_id}`,
                        type: 'warning',
                        icon: FiAlertTriangle,
                        title: `Nivel superior excedido (${value} m)`,
                        sensor: `Sensor ${sensor.sensor_id}`,
                        time: timeStr
                    });
                }
            }

            if (bottomThreshold !== null && !Number.isNaN(bottomThreshold)) {
                if (!Number.isNaN(value) && value < bottomThreshold) {
                    generatedAlerts.push({
                        id: `threshold-bottom-${sensor.sensor_id}`,
                        type: 'info',
                        icon: FiBarChart2,
                        title: `Nivel por debajo del umbral (${value} m)`,
                        sensor: `Sensor ${sensor.sensor_id}`,
                        time: timeStr
                    });
                }
            }

            // Comportamiento previo: alertas por acumulado
            if (sensor.total_acumulado > 100) {
                generatedAlerts.push({
                    id: `high-total-${sensor.sensor_id}`,
                    type: 'info',
                    icon: FiBarChart2,
                    title: 'Acumulado alto',
                    sensor: `Sensor ${sensor.sensor_id}`,
                    time: timeStr
                });
            }
        });

        // Agregar algunas alertas de ejemplo si no hay suficientes
        if (generatedAlerts.length === 0) {
            generatedAlerts.push(
                {
                    id: 'default-1',
                    type: 'info',
                    icon: FiRadio,
                    title: 'Flujo dentro de parámetros',
                    sensor: 'Sistema',
                    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                },
                {
                    id: 'default-2',
                    type: 'success',
                    icon: FiCheckCircle,
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
                    icon: FiRadio,
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

    // Detectar cambio en el conteo de alertas para mostrar tendencia (color)
    useEffect(() => {
        const curr = alerts.length;
        const prev = Number(prevAlertsCountRef.current || 0);
        if (curr > prev) setAlertTrend('up');
        else if (curr < prev) setAlertTrend('down');
        else setAlertTrend('neutral');
        prevAlertsCountRef.current = curr;
    }, [alerts]);

    return (
        <div className="alerts-panel glass">
            <div className="alerts-header">
                <h3 className="alerts-title">ALERTAS ACTIVAS</h3>
                <span className={`alerts-count ${alertTrend === 'up' ? 'danger' : (alertTrend === 'down' ? 'success' : 'neutral')}`} title={alertTrend === 'up' ? 'Aumento de alertas' : (alertTrend === 'down' ? 'Disminución de alertas' : 'Sin cambio')}>{alerts.length}</span>
            </div>

            <div className="alerts-list">
                {alerts.map((alert) => {
                    const IconComponent = alert.icon;
                    return (
                        <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                            <div className="alert-icon">
                                <IconComponent />
                            </div>
                            <div className="alert-content">
                                <p className="alert-title">{alert.title}</p>
                                <p className="alert-sensor">{alert.sensor}</p>
                            </div>
                            <div className="alert-time">{alert.time}</div>
                        </div>
                    );
                })}
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
                        // Guardar en historial
                        saveReportToHistory(filename, 'CSV');
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
                        console.log('[AlertsPanel] Iniciando generación de PDF...');
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
                            ctx.fillStyle = 'rgba(255,255,255,0)'; ctx.fillRect(0, 0, w, h);
                            if (!values || values.length === 0) return cvs.toDataURL('image/png');
                            const min = Math.min(...values); const max = Math.max(...values);
                            const range = (max - min) || 1;
                            ctx.beginPath();
                            values.forEach((v, i) => {
                                const x = (i / (values.length - 1)) * (w - 4) + 2;
                                const y = h - 4 - ((v - min) / range) * (h - 8);
                                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                            });
                            // stroke
                            ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
                            // fill area
                            ctx.lineTo(w - 2, h - 2); ctx.lineTo(2, h - 2); ctx.closePath();
                            const grad = ctx.createLinearGradient(0, 0, 0, h);
                            grad.addColorStop(0, 'rgba(59,130,246,0.25)'); grad.addColorStop(1, 'rgba(59,130,246,0)');
                            ctx.fillStyle = grad; ctx.fill();
                            // small circle on last point
                            const lastX = ((values.length - 1) / (values.length - 1)) * (w - 4) + 2;
                            const lastY = h - 4 - ((values[values.length - 1] - min) / range) * (h - 8);
                            ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(lastX, lastY, 3, 0, Math.PI * 2); ctx.fill();
                            ctx.beginPath(); ctx.fillStyle = stroke; ctx.arc(lastX, lastY, 2, 0, Math.PI * 2); ctx.fill();
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
                        const imgW = pageW - margin * 2;
                        const imgH = (imgProps.height * imgW) / imgProps.width;
                        let cursorY = 40;
                        doc.addImage(imgData, 'PNG', margin, cursorY, imgW, imgH);
                        cursorY += imgH + 8;

                        // Tabla de sensores con sparklines y estadísticas (diseño profesional)
                        const keys = Object.keys(sensorsData).slice(0, 24);
                        doc.setFontSize(12); doc.text('Resumen por sensor', margin, cursorY);
                        cursorY += 8;

                        // Column layout
                        const tableX = margin;
                        const tableYStart = cursorY;
                        const colWidths = {
                            sensor: 42,
                            spark: 120,
                            last: 48,
                            avg: 40,
                            min: 40,
                            max: 40,
                            total: 56
                        };
                        const tableW = Object.values(colWidths).reduce((a, b) => a + b, 0);
                        const headerH = 12;
                        const rowH = 44;

                        // Header row
                        doc.setFillColor(245, 245, 245);
                        doc.rect(tableX, cursorY, tableW, headerH, 'F');
                        doc.setDrawColor(200);
                        doc.rect(tableX, cursorY, tableW, headerH);
                        doc.setFontSize(10); doc.setTextColor(30);
                        let cx = tableX + 4;
                        doc.text('Sensor', cx, cursorY + 8);
                        cx += colWidths.sensor; doc.text('Tendencia', cx + 6, cursorY + 8);
                        cx += colWidths.spark; doc.text('Último', cx + 6, cursorY + 8);
                        cx += colWidths.last; doc.text('Avg', cx + 6, cursorY + 8);
                        cx += colWidths.avg; doc.text('Min', cx + 6, cursorY + 8);
                        cx += colWidths.min; doc.text('Max', cx + 6, cursorY + 8);
                        cx += colWidths.max; doc.text('Total', cx + 6, cursorY + 8);

                        cursorY += headerH;

                        // Rows
                        for (let i = 0; i < keys.length; i++) {
                            const k = keys[i]; const arr = sensorsData[k] || [];
                            const values = arr.map(x => Number(x.caudal_min) || 0).slice(-60);
                            const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
                            const min = values.length ? Math.min(...values) : 0;
                            const max = values.length ? Math.max(...values) : 0;
                            const last = arr.length ? arr[arr.length - 1] : null;
                            const total = last ? (last.total_acumulado || '-') : '-';
                            const spark = makeSparkline(values, colWidths.spark - 8, rowH - 8);

                            if (cursorY + rowH > pageH - 28) { doc.addPage(); cursorY = margin + 8; }

                            // Row background
                            doc.setFillColor(255, 255, 255); doc.setDrawColor(220);
                            doc.rect(tableX, cursorY, tableW, rowH);

                            // Sensor cell
                            let x = tableX + 6; let y = cursorY + 14;
                            doc.setFontSize(11); doc.setTextColor(20);
                            doc.text(`${k}`, x, y);

                            // Sparkline cell (draw image)
                            const sparkX = tableX + colWidths.sensor + 4;
                            const sparkY = cursorY + 6;
                            try { doc.addImage(spark, 'PNG', sparkX, sparkY, colWidths.spark - 8, rowH - 12); } catch (e) { /* ignore */ }

                            // Last / stats
                            let sx = sparkX + colWidths.spark + 6;
                            doc.setFontSize(10);
                            doc.text(last ? String(last.caudal_min) : '-', sx, cursorY + 12);
                            doc.text(avg.toFixed(2), sx + colWidths.last - 10, cursorY + 12);
                            doc.text(min.toFixed(2), sx + colWidths.last + colWidths.avg - 4, cursorY + 12);
                            doc.text(max.toFixed(2), sx + colWidths.last + colWidths.avg + colWidths.min + 2, cursorY + 12);
                            // total at far right
                            const totalX = tableX + tableW - colWidths.total + 6;
                            doc.text(String(total), totalX, cursorY + 12);

                            // small subtext row with timestamps/count
                            doc.setFontSize(9); doc.setTextColor(110);
                            doc.text(`Muestras: ${values.length}`, x, cursorY + 26);
                            if (last && last.ultima_actualizacion) doc.text(`${new Date(last.ultima_actualizacion).toLocaleString('es-ES')}`, x + 80, cursorY + 26);

                            cursorY += rowH;
                        }

                        // Footer
                        doc.setFontSize(9);
                        doc.text('Reporte generado por AquaVisor', margin, pageH - 10);

                        const filename = `reporte_profesional_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;

                        // Generar blob del PDF y subir al servidor (para guardarlo en carpeta server/reports)
                        try {
                            const pdfBlobForServer = doc.output('blob');
                            console.log('[AlertsPanel] Subiendo PDF al servidor...');
                            try {
                                const uploadRes = await fetch('/api/save-report', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/pdf',
                                        'X-Filename': filename
                                    },
                                    body: pdfBlobForServer
                                });
                                if (uploadRes.ok) {
                                    const json = await uploadRes.json();
                                    console.log('[AlertsPanel] Reporte guardado en servidor:', json.path);
                                    // Mostrar enlace al usuario
                                    const base = window.location.origin;
                                    const downloadUrl = base + (json.path || `/reports/${filename}`);
                                    // Abrir enlace en nueva pestaña para que el usuario pueda descargar si lo desea
                                    // window.open(downloadUrl, '_blank'); // opcional
                                    alert(`Reporte guardado en servidor: ${downloadUrl}`);
                                } else {
                                    console.warn('[AlertsPanel] Falló guardar en servidor, status:', uploadRes.status);
                                }
                            } catch (upErr) {
                                console.warn('[AlertsPanel] Error subiendo al servidor:', upErr);
                            }
                        } catch (blobErr) {
                            console.warn('[AlertsPanel] No se pudo generar blob para subida:', blobErr);
                        }

                        try {
                            console.log('[AlertsPanel] Intentando doc.save()', filename);
                            doc.save(filename);
                            console.log('[AlertsPanel] doc.save() completado (download triggered)');
                            // Guardar en historial de reportes
                            saveReportToHistory(filename, 'PDF');
                        } catch (saveErr) {
                            console.error('[AlertsPanel] doc.save() falló:', saveErr);
                            try {
                                // Fallback: crear blob y abrir en nueva pestaña
                                const pdfBlob = doc.output('blob');
                                const pdfUrl = URL.createObjectURL(pdfBlob);
                                window.open(pdfUrl, '_blank');
                                console.log('[AlertsPanel] Fallback: PDF abierto en nueva pestaña');
                                // Guardar en historial incluso con fallback
                                saveReportToHistory(filename, 'PDF');
                            } catch (fallbackErr) {
                                console.error('[AlertsPanel] Fallback para mostrar PDF falló:', fallbackErr);
                                alert('No fue posible descargar ni abrir el PDF. Revisa la consola para detalles.');
                            }
                        }
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
