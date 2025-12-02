import './Sidebar.css';

function Sidebar() {
    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Centro comando', active: true },
        { id: 'monitoring', icon: '📡', label: 'Monitoreo en tiempo real' },
        { id: 'units', icon: '🔧', label: 'Unidades' },
        { id: 'analytics', icon: '📈', label: 'Análisis Predictivo' },
        { id: 'history', icon: '📜', label: 'Histórico' },
        { id: 'settings', icon: '⚙️', label: 'Configuración' },
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
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`nav-item ${item.active ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </a>
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
