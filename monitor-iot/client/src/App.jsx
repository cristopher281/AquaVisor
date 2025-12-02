import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './App.css';

import CommandCenter from './pages/CommandCenter';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';

function App() {
    const [sensors, setSensors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Función para obtener datos del dashboard
    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard');
            const result = await response.json();

            if (result.success) {
                setSensors(result.data);
                setLastUpdate(new Date());
                setError(null);
            } else {
                setError('Error al obtener datos');
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('No se pudo conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    // useEffect con setInterval para polling cada 3 segundos
    useEffect(() => {
        // Obtener datos inmediatamente
        fetchDashboardData();

        // Configurar polling cada 3 segundos
        const interval = setInterval(() => {
            fetchDashboardData();
        }, 3000);

        // Limpiar intervalo al desmontar
        return () => clearInterval(interval);
    }, []);

    // Calcular métricas agregadas
    const calculateMetrics = () => {
        if (sensors.length === 0) {
            return {
                totalFlow: 0,
                averageFlow: 0,
                totalAccumulated: 0,
                operationalSensors: 0
            };
        }

        const totalAccumulated = sensors.reduce((sum, sensor) => sum + (sensor.total_acumulado || 0), 0);
        const averageFlow = sensors.reduce((sum, sensor) => sum + (sensor.caudal_min || 0), 0) / sensors.length;
        const operationalSensors = sensors.length;

        return {
            totalFlow: totalAccumulated,
            averageFlow: averageFlow.toFixed(1),
            totalAccumulated: totalAccumulated.toFixed(1),
            operationalSensors
        };
    };

    const metrics = calculateMetrics();

    // Generar datos históricos simulados para el gráfico
    const generateChartData = () => {
        if (sensors.length === 0) return [];

        const data = [];
        const now = new Date();

        for (let i = 12; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 3600000); // Cada hora
            const hour = time.getHours();
            data.push({
                time: `${hour.toString().padStart(2, '0')}:00`,
                value: parseFloat((Math.random() * 3 + 6).toFixed(1))
            });
        }

        // Agregar valor actual
        data.push({
            time: 'Ahora',
            value: parseFloat(metrics.averageFlow)
        });

        return data;
    };

    return (
        <div className="app">
            <Sidebar />

            <div className="main-content">
                <Header lastUpdate={lastUpdate} />

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Cargando datos del sistema...</p>
                    </div>
                ) : error ? (
                    <div className="error-container">
                        <div className="error-icon">⚠️</div>
                        <h3>{error}</h3>
                        <p>Verifica que el servidor esté corriendo en el puerto 4000</p>
                        <button onClick={fetchDashboardData} className="retry-button">
                            Reintentar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="metrics-grid">
                            <MetricCard
                                title="Valor Actual"
                                value={`${metrics.averageFlow} m³`}
                                change="+9%"
                                trend="up"
                                subtitle="vs ayer"
                            />
                            <MetricCard
                                title="Variación respecto ayer"
                                value={`${(parseFloat(metrics.averageFlow) - 0.3).toFixed(1)}`}
                                change="-16%"
                                trend="down"
                                subtitle="vs anterior"
                            />
                            <MetricCard
                                title="Cambio en último ciclo"
                                value={sensors.length > 0 ? sensors.length.toString() : '0'}
                                change="+24%"
                                trend="up"
                                subtitle="vs día 25"
                            />
                            <MetricCard
                                title="Estado del Sistema"
                                value="Operativo"
                                status="operational"
                                subtitle={`${metrics.operationalSensors} sensores activos`}
                            />
                        </div>

                        <div className="dashboard-grid">
                            <div className="chart-section">
                                <Chart data={generateChartData()} title="DINÁMICA NIVEL TANQUE PRIMARIO" currentValue={`${metrics.averageFlow} m³`} />

                                <div className="bottom-metrics">
                                    <WaterQualityMetrics />
                                    <SensorHealth sensorsCount={metrics.operationalSensors} />
                                </div>
                                
                                <div className="sensors-list">
                                    {sensors.map((s) => (
                                        <SensorCard key={s.sensor_id} sensor={s} />
                                    ))}
                                </div>
                            </div>

                            <AlertsPanel sensors={sensors} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

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
                        <Route path="*" element={<CommandCenter />} />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
