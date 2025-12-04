import './MetricCard.css';

function MetricCard({ title, value, change, trend, subtitle, status, tooltip, invertTrend = false }) {
    const getTrendIcon = () => {
        if (status === 'operational') return '✓';
        if (trend === 'up') return '↑';
        if (trend === 'down') return '↓';
        return '−';
    };

    const getTrendClass = () => {
        if (status === 'operational') return 'success';
        // Si invertTrend es true, invertir la semántica de colores: subida = peligro (rojo)
        if (invertTrend) {
            if (trend === 'up') return 'danger';
            if (trend === 'down') return 'success';
            return 'neutral';
        }
        if (trend === 'up') return 'success';
        if (trend === 'down') return 'danger';
        return 'neutral';
    };

    return (
        <div className="metric-card glass fade-in">
            <div className="metric-header">
                <h3 className="metric-title">{title}</h3>
            </div>

            <div className="metric-body">
                <div className="metric-value-container">
                    <h2 className={`metric-value ${status === 'operational' ? 'status-value' : ''}`}>
                        {value}
                    </h2>
                    {change && (
                        <div className={`metric-change ${getTrendClass()}`} title={tooltip || ''}>
                            <span className="change-icon">{getTrendIcon()}</span>
                            <span className="change-value">{change}</span>
                        </div>
                    )}
                </div>

                {subtitle && (
                    <p className="metric-subtitle">{subtitle}</p>
                )}
            </div>

            {status === 'operational' && (
                <div className="status-indicator-bar success"></div>
            )}
        </div>
    );
}

export default MetricCard;
