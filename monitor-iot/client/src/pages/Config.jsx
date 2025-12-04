import React, { useState, useEffect } from 'react';
import { FiDroplet, FiToggleLeft, FiToggleRight, FiClock, FiActivity, FiAlertCircle, FiTrendingUp, FiUser, FiCalendar, FiPlus, FiTrash2 } from 'react-icons/fi';
import './Config.css';

function Config() {
    const [valveStatus, setValveStatus] = useState('closed'); // 'open' o 'closed'
    const [flowRate, setFlowRate] = useState(85.3);
    const [pressure, setPressure] = useState(115);
    const [loading, setLoading] = useState(false);
    const [recentActivity, setRecentActivity] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [newSchedule, setNewSchedule] = useState({
        action: 'open',
        time: '',
        days: []
    });

    useEffect(() => {
        fetchValveStatus();
        fetchRecentActivity();
        fetchSchedules();

        // Actualizar estado cada 5 segundos
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
                setRecentActivity(data.history || []);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    const fetchSchedules = async () => {
        try {
            const res = await fetch('/api/valve/schedules');
            const data = await res.json();
            if (data.success) {
                setSchedules(data.schedules || []);
            }
        } catch (err) {
            console.error('Error fetching schedules:', err);
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
                    operator: 'Manual',
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

    const addSchedule = async () => {
        if (!newSchedule.time || newSchedule.days.length === 0) {
            alert('Por favor completa todos los campos');
            return;
        }

        try {
            const res = await fetch('/api/valve/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSchedule)
            });

            const data = await res.json();
            if (data.success) {
                fetchSchedules();
                setNewSchedule({ action: 'open', time: '', days: [] });
            }
        } catch (err) {
            console.error('Error adding schedule:', err);
        }
    };

    const deleteSchedule = async (id) => {
        try {
            const res = await fetch(`/api/valve/schedule/${id}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (data.success) {
                fetchSchedules();
            }
        } catch (err) {
            console.error('Error deleting schedule:', err);
        }
    };

    const toggleDay = (day) => {
        setNewSchedule(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return (
        <div className="page config-page">
            <header className="page-header">
                <div>
                    <p className="header-subtitle">Válvula  Principal - Sector A</p>
                    <h1>Control de Válvula</h1>
                </div>
            </header>

            <div className="config-grid">
                {/* Panel Principal de Control */}
                <div className="valve-control-panel">
                    <div className="valve-status-display">
                        <span className="status-label">ESTADO ACTUAL</span>
                        <h2 className={`status-text ${valveStatus}`}>
                            {valveStatus === 'open' ? 'ABIERTA' : 'CERRADA'}
                        </h2>

                        <div className="valve-icon-container">
                            <div className={`valve-icon ${valveStatus}`}>
                                <FiDroplet />
                            </div>
                        </div>

                        <button
                            className={`valve-toggle-btn ${valveStatus}`}
                            onClick={toggleValve}
                            disabled={loading}
                        >
                            {loading ? 'Procesando...' : (valveStatus === 'open' ? 'Cerrar' : 'Abrir')}
                        </button>

                        <p className="status-description">
                            {valveStatus === 'open'
                                ? 'El flujo de agua está activo. Para detener el flujo, deslice el control hacia la izquierda.'
                                : 'El flujo de agua está detenido. Para activar el flujo, deslice el control hacia la derecha.'}
                        </p>
                    </div>

                    {/* Métricas */}
                    <div className="valve-metrics">
                        <div className="metric-card flow">
                            <div className="metric-header">
                                <span className="metric-label">Flujo</span>
                                <FiTrendingUp className="metric-icon" />
                            </div>
                            <div className="metric-value">{flowRate}<span className="metric-unit">L/s</span></div>
                            <div className="metric-bar">
                                <div className="metric-bar-fill" style={{ width: `${(flowRate / 100) * 100}%` }}></div>
                            </div>
                        </div>

                        <div className="metric-card pressure">
                            <div className="metric-header">
                                <span className="metric-label">Presión</span>
                                <FiActivity className="metric-icon" />
                            </div>
                            <div className="metric-value">{pressure}<span className="metric-unit">PSI</span></div>
                            <div className="metric-bar">
                                <div className="metric-bar-fill yellow" style={{ width: `${(pressure / 200) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel Lateral Derecho */}
                <div className="config-sidebar">
                    {/* Actividad Reciente */}
                    <div className="activity-panel">
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
                                        <div className={`activity-status ${activity.action}`}>
                                            {activity.action === 'open' ? <FiToggleRight /> : <FiToggleLeft />}
                                        </div>
                                        <div className="activity-details">
                                            <div className="activity-title">
                                                {activity.action === 'open' ? 'Apertura' : 'Cierre'} {activity.source === 'scheduled' ? 'Programado' : 'Manual'}
                                            </div>
                                            <div className="activity-meta">
                                                <span><FiUser /> {activity.operator || 'Sistema'}</span>
                                                <span><FiClock /> {activity.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Panel de Programación */}
                    <div className="schedule-panel">
                        <h3>Programación</h3>

                        {/* Agregar Nueva Programación */}
                        <div className="add-schedule">
                            <select
                                value={newSchedule.action}
                                onChange={(e) => setNewSchedule({ ...newSchedule, action: e.target.value })}
                                className="schedule-input"
                            >
                                <option value="open">Abrir</option>
                                <option value="closed">Cerrar</option>
                            </select>

                            <input
                                type="time"
                                value={newSchedule.time}
                                onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                                className="schedule-input"
                            />

                            <div className="days-selector">
                                {daysOfWeek.map((day, idx) => (
                                    <button
                                        key={day}
                                        className={`day-btn ${newSchedule.days.includes(idx) ? 'active' : ''}`}
                                        onClick={() => toggleDay(idx)}
                                        title={dayNames[idx]}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>

                            <button className="add-schedule-btn" onClick={addSchedule}>
                                <FiPlus /> Agregar
                            </button>
                        </div>

                        {/* Lista de Programaciones */}
                        <div className="schedules-list">
                            {schedules.length === 0 ? (
                                <div className="no-schedules">
                                    <FiCalendar />
                                    <p>Sin programaciones</p>
                                </div>
                            ) : (
                                schedules.map((schedule) => (
                                    <div key={schedule.id} className="schedule-item">
                                        <div className="schedule-info">
                                            <span className={`schedule-action ${schedule.action}`}>
                                                {schedule.action === 'open' ? 'Abrir' : 'Cerrar'}
                                            </span>
                                            <span className="schedule-time">{schedule.time}</span>
                                            <span className="schedule-days">
                                                {schedule.days.map(d => daysOfWeek[d]).join(', ')}
                                            </span>
                                        </div>
                                        <button
                                            className="delete-schedule-btn"
                                            onClick={() => deleteSchedule(schedule.id)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Config;
