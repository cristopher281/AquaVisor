import './WaterQualityMetrics.css';

function WaterQualityMetrics() {
    return (
        <div className="water-quality glass">
            <h3 className="section-title">MÉTRICAS CALIDAD DEL AGUA</h3>

            <div className="metrics-list">
                <div className="metric-item">
                    <div className="metric-info">
                        <span className="metric-label">PH</span>
                        <span className="metric-value-large">7.2</span>
                    </div>
                    <div className="metric-status status-ok">Óptimo</div>
                </div>

                <div className="metric-item">
                    <div className="metric-info">
                        <span className="metric-label">Temperatura</span>
                        <span className="metric-value-large">18.5°C</span>
                    </div>
                    <div className="metric-status status-ok">Normal</div>
                </div>

                <div className="metric-item">
                    <div className="metric-info">
                        <span className="metric-label">Turbidez</span>
                        <span className="metric-value-large">0.8 ppm</span>
                    </div>
                    <div className="metric-status status-ok">Bajo</div>
                </div>
            </div>
        </div>
    );
}

export default WaterQualityMetrics;
