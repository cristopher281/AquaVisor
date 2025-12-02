import './SensorHealth.css';

function SensorHealth({ sensorsCount }) {
    return (
        <div className="sensor-health glass">
            <h3 className="section-title">SALUD RED DE SENSORES</h3>

            <div className="health-stats">
                <div className="health-item">
                    <div className="health-icon">✓</div>
                    <div className="health-info">
                        <span className="health-label">En Línea</span>
                        <span className="health-value">{sensorsCount || 0}</span>
                    </div>
                </div>

                <div className="health-item">
                    <div className="health-icon offline">✗</div>
                    <div className="health-info">
                        <span className="health-label">Fuera de Línea</span>
                        <span className="health-value">0</span>
                    </div>
                </div>

                <div className="health-item">
                    <div className="health-icon warning">⚠</div>
                    <div className="health-info">
                        <span className="health-label">Con Alertas</span>
                        <span className="health-value">0</span>
                    </div>
                </div>
            </div>

            <div className="health-bar">
                <div className="health-bar-fill" style={{ width: '100%' }}></div>
            </div>

            <p className="health-status">Estado del Sistema: <strong>Óptimo</strong></p>
        </div>
    );
}

export default SensorHealth;
