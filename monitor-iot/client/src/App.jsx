import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './App.css';

import CommandCenter from './pages/CommandCenter';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function App() {
    // Cargar tema guardado al iniciar la aplicación
    useEffect(() => {
        try {
            const settings = JSON.parse(localStorage.getItem('acua_settings') || '{}');
            const theme = settings.colorTheme || 'estandar';
            document.documentElement.setAttribute('data-theme', theme);
        } catch (error) {
            console.error('Error loading theme:', error);
            document.documentElement.setAttribute('data-theme', 'estandar');
        }
    }, []);
    return (
        <BrowserRouter>
            <div className="app">
                <Sidebar />

                <div className="main-content">
                    <Header />
                    <Routes>
                        <Route path="/" element={<CommandCenter />} />
                        <Route path="/reportes" element={<Reports />} />
                        <Route path="/alertas" element={<Alerts />} />
                        <Route path="/config" element={<Settings />} />
                        <Route path="*" element={<CommandCenter />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
