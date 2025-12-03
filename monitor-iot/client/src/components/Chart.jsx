import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './Chart.css';

function Chart({ data, title, currentValue, elementId }) {
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip glass">
                    <p className="tooltip-label">{payload[0].payload.time}</p>
                    <p className="tooltip-value">{payload[0].value} m³</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div id={elementId} className="chart-container glass">
            <div className="chart-header">
                <div className="chart-title-group">
                    <h3 className="chart-title">{title}</h3>
                    <div className="chart-value">{currentValue}</div>
                </div>

                <div className="chart-indicators">
                    <div className="indicator">
                        <span className="indicator-dot" style={{ background: '#3b82f6' }}></span>
                        <span className="indicator-label">Consumo Real</span>
                    </div>
                    <div className="indicator">
                        <span className="indicator-dot" style={{ background: '#10b981' }}></span>
                        <span className="indicator-label">Consumo Proyec.</span>
                    </div>
                </div>
            </div>

            <div className="chart-body">
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="time"
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#colorValue)"
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default Chart;
