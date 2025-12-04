import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useEffect, useState } from 'react';
import './Chart.css';

function Chart({ data, title, currentValue, elementId }) {
    const [chartColors, setChartColors] = useState({
        grid: 'rgba(255, 255, 255, 0.1)',
        axis: 'rgba(255, 255, 255, 0.5)',
        text: 'rgba(255, 255, 255, 0.7)'
    });

    useEffect(() => {
        // Get computed style from root element to access CSS variables
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);

        setChartColors({
            grid: computedStyle.getPropertyValue('--chart-grid-color').trim() || 'rgba(255, 255, 255, 0.1)',
            axis: computedStyle.getPropertyValue('--chart-axis-color').trim() || 'rgba(255, 255, 255, 0.5)',
            text: computedStyle.getPropertyValue('--chart-text-color').trim() || 'rgba(255, 255, 255, 0.7)'
        });

        // Listen for theme changes
        const observer = new MutationObserver(() => {
            const updatedStyle = getComputedStyle(root);
            setChartColors({
                grid: updatedStyle.getPropertyValue('--chart-grid-color').trim() || 'rgba(255, 255, 255, 0.1)',
                axis: updatedStyle.getPropertyValue('--chart-axis-color').trim() || 'rgba(255, 255, 255, 0.5)',
                text: updatedStyle.getPropertyValue('--chart-text-color').trim() || 'rgba(255, 255, 255, 0.7)'
            });
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        return () => observer.disconnect();
    }, []);

    // Umbrales leídos desde settings en localStorage (thresholdTop/thresholdBottom)
    const [thresholds, setThresholds] = useState({ top: null, bottom: null });

    useEffect(() => {
        const readThresholds = () => {
            try {
                const raw = localStorage.getItem('acua_settings');
                if (raw) {
                    const s = JSON.parse(raw);
                    const top = s && s.thresholdTop ? parseFloat(s.thresholdTop) : null;
                    const bottom = s && s.thresholdBottom ? parseFloat(s.thresholdBottom) : null;
                    setThresholds({ top: Number.isFinite(top) ? top : null, bottom: Number.isFinite(bottom) ? bottom : null });
                    return;
                }
            } catch (e) {
                // noop
            }
            setThresholds({ top: null, bottom: null });
        };

        readThresholds();
        // Escuchar cambios en localStorage desde otra pestaña
        const onStorage = (ev) => { if (ev.key === 'acua_settings') readThresholds(); };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

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

    // Custom dot: pinta azul si está por debajo del umbral inferior,
    // rojo si excede el umbral superior, y verde en valores normales.
    const CustomDot = (props) => {
        const { cx, cy, payload } = props;
        if (cx === undefined || cy === undefined) return null;
        const val = payload && payload.value !== undefined ? Number(payload.value) : Number(props.value);
        let fill = '#10b981'; // verde por defecto
        if (thresholds.top !== null && !Number.isNaN(thresholds.top) && val > thresholds.top) {
            fill = '#ef4444'; // rojo
        } else if (thresholds.bottom !== null && !Number.isNaN(thresholds.bottom) && val < thresholds.bottom) {
            fill = '#2563eb'; // azul
        }
        return (
            <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={1} />
        );
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
                        <span className="indicator-dot" style={{ background: '#2563eb' }}></span>
                        <span className="indicator-label">Por debajo (umbral inferior)</span>
                    </div>
                    <div className="indicator">
                        <span className="indicator-dot" style={{ background: '#10b981' }}></span>
                        <span className="indicator-label">Normal</span>
                    </div>
                    <div className="indicator">
                        <span className="indicator-dot" style={{ background: '#ef4444' }}></span>
                        <span className="indicator-label">Excedido (umbral superior)</span>
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
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis
                            dataKey="time"
                            stroke={chartColors.axis}
                            style={{ fontSize: '12px', fill: chartColors.text }}
                        />
                        <YAxis
                            stroke={chartColors.axis}
                            style={{ fontSize: '12px', fill: chartColors.text }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#colorValue)"
                            animationDuration={1000}
                            dot={<CustomDot />}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default Chart;
