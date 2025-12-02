import './Sidebar.css';
import { Link } from 'react-router-dom';

function Sidebar() {
    const menuItems = [
        { to: '/', icon: '📊', label: 'Centro comando' },
        { to: '/reportes', icon: '📋', label: 'Reportes' },
        { to: '/alertas', icon: '🔔', label: 'Alertas Críticas' },
        { to: '/config', icon: '⚙️', label: 'Configuración' },
    ];

    return (
        <aside className="sidebar glass">
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon">💧</div>
                    <h2>AcuaVisor</h2>
                </div>
                <p className="logo-subtitle">Sistema de Control</p>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <Link key={item.to} to={item.to} className={`nav-item`}>
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">👤</div>
                    <div className="user-details">
                        <p className="user-name">Admin</p>
                        <p className="user-role">Sistema</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
