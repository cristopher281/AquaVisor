import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './App.css';

import CommandCenter from './pages/CommandCenter';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function App() {
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
