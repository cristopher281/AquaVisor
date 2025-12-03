import './Header.css';
import { FiBell, FiRadio } from 'react-icons/fi';

function Header({ lastUpdate }) {
    const formatLastUpdate = () => {
        if (!lastUpdate) return 'Cargando...';

        const now = new Date();
        const diff = Math.floor((now - lastUpdate) / 1000);

        if (diff < 5) return 'Justo ahora';
        if (diff < 60) return `Hace ${diff}s`;
        return lastUpdate.toLocaleTimeString('es-ES');
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
                        <span className="status-dot pulse"><FiRadio /></span>
                        <span className="status-text">En vivo</span>
                    </div>

                    <div className="last-update">
                        <span className="update-label">Última actualización:</span>
                        <span className="update-time">{formatLastUpdate()}</span>
                    </div>

                    <button className="notification-button">
                        <span className="notification-icon"><FiBell /></span>
                        <span className="notification-badge">3</span>
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;
