import './Sidebar.css';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiFileText, FiBell, FiSettings, FiDroplet, FiUser } from 'react-icons/fi';

function Sidebar() {
    const menuItems = [
        { to: '/', icon: <FiBarChart2 />, label: 'Centro comando' },
        { to: '/reportes', icon: <FiFileText />, label: 'Reportes' },
        { to: '/alertas', icon: <FiBell />, label: 'Alertas Críticas' },
        { to: '/config', icon: <FiSettings />, label: 'Configuración' },
    ];

    return (
        <aside className="sidebar glass">
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon"><FiDroplet /></div>
                    <h2>AcuaVisor</h2>
                </div>
                <p className="logo-subtitle">Sistema de Control</p>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <Link key={item.to} to={item.to} className={`nav-item`}>
                        <span className="nav-icon icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* footer removed: user/avatar section hidden per request */}
        </aside>
    );
}

export default Sidebar;
