import { useState } from 'react';
import './Sidebar.css';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiFileText, FiBell, FiSettings, FiDroplet, FiMenu, FiX } from 'react-icons/fi';

function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { to: '/', icon: <FiBarChart2 />, label: 'Centro comando' },
        { to: '/reportes', icon: <FiFileText />, label: 'Reportes' },
        { to: '/alertas', icon: <FiBell />, label: 'Alertas Críticas' },
        { to: '/valvula', icon: <FiDroplet />, label: 'Control de Válvula' },
        { to: '/config', icon: <FiSettings />, label: 'Configuración' },
    ];

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const closeSidebar = () => {
        setIsOpen(false);
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
                {isOpen ? <FiX /> : <FiMenu />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

            {/* Sidebar */}
            <aside className={`sidebar glass ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon"><FiDroplet /></div>
                        <h2>AquaVisor</h2>
                    </div>
                    <p className="logo-subtitle">Sistema de Control</p>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="nav-item"
                            onClick={closeSidebar}
                        >
                            <span className="nav-icon icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>
        </>
    );
}

export default Sidebar;
