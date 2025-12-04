import { useState, useEffect } from 'react';
import { FiDroplet, FiToggleLeft, FiToggleRight, FiClock, FiTrendingUp, FiActivity, FiUser } from 'react-icons/fi';
import './Valve.css';

function Valve() {
    const [valveStatus, setValveStatus] = useState('closed');
    const [flowRate, setFlowRate] = useState(85.3);
    const [pressure, setPressure] = useState(115);
    const [loading, setLoading] = useState(false);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        fetchValveStatus();
        fetchRecentActivity();

        // Update every 5 seconds
        const interval = setInterval(() => {
            fetchValveStatus();
            fetchRecentActivity();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchValveStatus = async () => {
        try {
            const res = await fetch('/api/valve/status');
            const data = await res.json();
            if (data.success) {
                setValveStatus(data.status);
                setFlowRate(data.flowRate || 85.3);
                setPressure(data.pressure || 115);
            }
        } catch (err) {
            console.error('Error fetching valve status:', err);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            const res = await fetch('/api/valve/history');
            const data = await res.json();
            if (data.success) {
                setRecentActivity(data.history?.slice(0, 4) || []);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    const toggleValve = async () => {
        setLoading(true);
        const newStatus = valveStatus === 'open' ? 'closed' : 'open';

        try {
            const res = await fetch('/api/valve/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: newStatus,
                    operator: 'Operador 1',
                    source: 'web'
                })
            });

            const data = await res.json();
            if (data.success) {
                setValveStatus(newStatus);
                fetchRecentActivity();
            }
        } catch (err) {
            console.error('Error controlling valve:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page valve-page">
            <header className="page-header">
                <div>
                    <p className="header-subtitle">Válvula Principal - Sector A</p>
                    <h1>Control de Válvula</h1>
                </div>
            </header>

            <div className="valve-container">
                {/* Main Control Panel */}
                <div className="valve-main-panel">
                    <div className="valve-status-section">
                        <span className="status-label">ESTADO ACTUAL</span>
                        <h2 className={`valve-status-text ${valveStatus}`}>
                            {valveStatus === 'open' ? 'ABIERTA' : 'CERRADA'}
                        </h2>

                        <div className="valve-icon-wrapper">
                            <div className={`valve-icon ${valveStatus}`}>
                                <FiDroplet />
                            </div>
                        </div>

                        <button
                            className={`valve-control-btn ${valveStatus}`}
                            onClick={toggleValve}
                            disabled={loading}
                        >
                            {loading ? 'Procesando...' : (valveStatus === 'open' ? 'Cerrar' : 'Abrir')}
                        </button>

                        <p className="valve-description">
                            {valveStatus === 'open'
                                ? 'El flujo de agua está activo. Para detener el flujo, deslice el control hacia la izquierda.'
                                : 'El flujo de agua está detenido. Para activar el flujo, deslice el control hacia la derecha.'}
                        </p>
                    </div>

                    {/* Flow and Pressure Metrics */}
                    <div className="valve-metrics-grid">
                        <div className="valve-metric-card flow">
                            <div className="metric-header">
                                <span className="metric-label">Flujo</span>
                                <FiTrendingUp className="metric-icon" />
                            </div>
                            <div className="metric-value">
                                {flowRate}<span className="metric-unit">L/s</span>
                            </div>
                            <div className="metric-bar">
                                <div
                                    className="metric-bar-fill cyan"
                                    style={{ width: `${Math.min((flowRate / 100) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="valve-metric-card pressure">
                            <div className="metric-header">
                                <span className="metric-label">Presión</span>
                                <FiActivity className="metric-icon" />
                            </div>
                            <div className="metric-value">
                                {pressure}<span className="metric-unit">PSI</span>
                            </div>
                            <div className="metric-bar">
                                <div
                                    className="metric-bar-fill yellow"
                                    style={{ width: `${Math.min((pressure / 200) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Sidebar */}
                <div className="valve-activity-panel">
                    <h3>Actividad Reciente</h3>
                    <div className="activity-list">
                        {recentActivity.length === 0 ? (
                            <div className="no-activity">
                                <FiClock />
                                <p>Sin actividad reciente</p>
                            </div>
                        ) : (
                            recentActivity.map((activity, idx) => (
                                <div key={idx} className={`activity-item ${activity.action}`}>
                                    <div className={`activity-indicator ${activity.action}`}>
                                        {activity.action === 'open' ? <FiToggleRight /> : <FiToggleLeft />}
                                    </div>
                                    <div className="activity-content">
                                        <div className="activity-title">
                                            {activity.action === 'open' ? 'Apertura' : 'Cierre'} {activity.source === 'scheduled' ? 'Programado' : 'Manual'}
                                        </div>
                                        <div className="activity-meta">
                                            <span><FiUser /> {activity.operator || 'Sistema'}</span>
                                        </div>
                                        <div className="activity-time">
                                            <FiClock /> {activity.time}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Valve;
