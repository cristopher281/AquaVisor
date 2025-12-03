import { useState, useEffect } from 'react';
import './Header.css';
import { FiBell, FiRadio, FiDownload, FiFileText, FiX } from 'react-icons/fi';

function Header({ lastUpdate }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [reports, setReports] = useState([]);

    // Función para cargar reportes desde localStorage
    const loadReports = () => {
        const savedReports = JSON.parse(localStorage.getItem('downloadedReports') || '[]');
        setReports(savedReports);
    };

    useEffect(() => {
        // Cargar reportes iniciales
        loadReports();

        // Escuchar evento personalizado cuando se descargue un reporte
        const handleNewReport = () => {
            loadReports();
        };

        window.addEventListener('reportDownloaded', handleNewReport);

        // Listener para cerrar dropdown al hacer click fuera
        const handleClickOutside = (e) => {
            if (!e.target.closest('.notification-button') && !e.target.closest('.notifications-dropdown')) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('reportDownloaded', handleNewReport);
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    const formatLastUpdate = () => {
        if (!lastUpdate) return 'Cargando...';

        const now = new Date();
        const diff = Math.floor((now - lastUpdate) / 1000);

        if (diff < 5) return 'Justo ahora';
        if (diff < 60) return `Hace ${diff}s`;
        return lastUpdate.toLocaleTimeString('es-ES');
    };

    const clearReport = (index) => {
        const newReports = reports.filter((_, i) => i !== index);
        setReports(newReports);
        localStorage.setItem('downloadedReports', JSON.stringify(newReports));
    };

    const clearAllReports = () => {
        setReports([]);
        localStorage.setItem('downloadedReports', JSON.stringify([]));
    };

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-left">
                    <h1 className="header-title">Centro de Comando AquaVisor</h1>
                    <div className="header-breadcrumb">
                        <span className="breadcrumb-item">Dashboard</span>
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-item active">Vista General</span>
                    </div>
                </div>

                <div className="header-right">
                    <div className="status-indicator">
                        <span className="status-dot-wrapper">
                            <FiRadio className="status-icon" />
                            <span className="status-pulse"></span>
                        </span>
                        <span className="status-text">En vivo</span>
                    </div>

                    <div className="last-update">
                        <span className="update-label">Última actualización:</span>
                        <span className="update-time">{formatLastUpdate()}</span>
                    </div>

                    <div className="notification-container">
                        <button
                            className="notification-button"
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <span className="notification-icon"><FiBell /></span>
                            {reports.length > 0 && (
                                <span className="notification-badge">{reports.length}</span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="notifications-dropdown">
                                <div className="notifications-header">
                                    <h3>Reportes Descargados</h3>
                                    {reports.length > 0 && (
                                        <button
                                            className="clear-all-btn"
                                            onClick={clearAllReports}
                                        >
                                            Limpiar todo
                                        </button>
                                    )}
                                </div>
                                <div className="notifications-list">
                                    {reports.length === 0 ? (
                                        <div className="no-notifications">
                                            <FiFileText className="no-notif-icon" />
                                            <p>No hay reportes descargados</p>
                                            <span className="no-notif-hint">
                                                Los reportes generados aparecerán aquí
                                            </span>
                                        </div>
                                    ) : (
                                        reports.map((report, index) => (
                                            <div key={index} className="notification-item">
                                                <div className="notif-icon">
                                                    <FiDownload />
                                                </div>
                                                <div className="notif-content">
                                                    <p className="notif-title">{report.name}</p>
                                                    <p className="notif-time">{report.time}</p>
                                                </div>
                                                <button
                                                    className="notif-remove"
                                                    onClick={() => clearReport(index)}
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;

