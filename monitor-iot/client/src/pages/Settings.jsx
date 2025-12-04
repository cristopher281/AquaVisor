import { useState, useEffect } from 'react';
import './Settings.css';

const DEFAULTS = {
  fullName: '',
  email: '',
  alertsEmail: true,
  alertsPush: true,
  dailySummary: false,
  enableWQ: false,
  thresholdTop: '9.5',
  thresholdBottom: '2.0',
  colorTheme: 'estandar',
};

function Settings() {
  const [state, setState] = useState(DEFAULTS);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('acua_settings');
      if (raw) setState(JSON.parse(raw));
    } catch (e) {
      console.error('load settings', e);
    }
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setState((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  }

  function selectTheme(name) {
    const newState = { ...state, colorTheme: name };
    setState(newState);
    document.documentElement.setAttribute('data-theme', name);
    // Guardar inmediatamente
    localStorage.setItem('acua_settings', JSON.stringify(newState));
    setSavedAt(new Date().toISOString());
  }

  function save() {
    localStorage.setItem('acua_settings', JSON.stringify(state));
    setSavedAt(new Date().toISOString());
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Página de Configuración</h1>
        <p>Gestiona tu cuenta, notificaciones y apariencia del sistema.</p>
      </div>

      <div className="settings-grid">
        <section className="card">
          <h3 className="card-title">GESTIÓN DE CUENTA</h3>
          <p className="card-sub">Administra tu información personal y seguridad.</p>

          <div className="form-row">
            <label>Nombre Completo</label>
            <input name="fullName" value={state.fullName} onChange={handleChange} placeholder="Javier Molina" />
          </div>

          <div className="form-row">
            <label>Correo Electrónico</label>
            <input name="email" value={state.email} onChange={handleChange} placeholder="j.molina@aguascorp.es" />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={save}>Guardar Cambios</button>
            {savedAt && <span className="saved-note">Guardado: {new Date(savedAt).toLocaleString()}</span>}
          </div>
        </section>

        <section className="card">
          <h3 className="card-title">NOTIFICACIONES</h3>
          <p className="card-sub">Define cómo y cuándo quieres recibir alertas.</p>

          <div className="toggle-row">
            <div>
              <label>Alertas Críticas por Email</label>
              <p className="muted">Recibe un correo para eventos de alta prioridad.</p>
            </div>
            <label className="switch">
              <input type="checkbox" name="alertsEmail" checked={state.alertsEmail} onChange={handleChange} />
              <span className="slider" />
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <label>Notificaciones Push</label>
              <p className="muted">Alertas instantáneas en tu dispositivo móvil.</p>
            </div>
            <label className="switch">
              <input type="checkbox" name="alertsPush" checked={state.alertsPush} onChange={handleChange} />
              <span className="slider" />
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <label>Resumen Diario</label>
              <p className="muted">Informe diario del rendimiento del sistema.</p>
            </div>
            <label className="switch">
              <input type="checkbox" name="dailySummary" checked={state.dailySummary} onChange={handleChange} />
              <span className="slider" />
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <label>Mostrar métricas Calidad Agua</label>
              <p className="muted">Activa para mostrar el panel de métricas de calidad del agua en el Centro de Comando.</p>
            </div>
            <label className="switch">
              <input type="checkbox" name="enableWQ" checked={state.enableWQ} onChange={(e) => {
                handleChange(e);
                // También mantener la clave rápida para toggles inmediatos
                try {
                  if (e.target.checked) window.localStorage.setItem('acua_enable_wq', 'true');
                  else window.localStorage.removeItem('acua_enable_wq');
                } catch (err) { /* noop */ }
              }} />
              <span className="slider" />
            </label>
          </div>
        </section>

        <section className="card sensors-card">
          <h3 className="card-title">AJUSTES DE SENSORES</h3>
          <p className="card-sub">Calibra umbrales y define parámetros operativos.</p>

          <div className="threshold-row">
            <label>Umbral Nivel de Tanque (Superior)</label>
            <input name="thresholdTop" value={state.thresholdTop} onChange={handleChange} />
            <span className="unit">m</span>
          </div>

          <div className="threshold-row">
            <label>Umbral Nivel de Tanque (Inferior)</label>
            <input name="thresholdBottom" value={state.thresholdBottom} onChange={handleChange} />
            <span className="unit">m</span>
          </div>
        </section>

        <section className="card">
          <h3 className="card-title">MODIFICACIÓN DE COLORES DEL SISTEMA</h3>
          <p className="card-sub">Personaliza la apariencia de la interfaz de AquaVisor.</p>

          <div className="themes">
            <div className={`theme-tile ${state.colorTheme === 'estandar' ? 'selected' : ''}`} onClick={() => selectTheme('estandar')}>
              <div className="swatches">
                <span style={{ background: '#2b3a67' }} />
                <span style={{ background: '#3b82f6' }} />
                <span style={{ background: '#06b6d4' }} />
              </div>
              <div className="theme-label">Estándar</div>
            </div>

            <div className={`theme-tile ${state.colorTheme === 'medianoche' ? 'selected' : ''}`} onClick={() => selectTheme('medianoche')}>
              <div className="swatches">
                <span style={{ background: '#0b1220' }} />
                <span style={{ background: '#4c51bf' }} />
                <span style={{ background: '#06b6d4' }} />
              </div>
              <div className="theme-label">Medianoche</div>
            </div>

            <div className={`theme-tile ${state.colorTheme === 'neon' ? 'selected' : ''}`} onClick={() => selectTheme('neon')}>
              <div className="swatches">
                <span style={{ background: '#081018' }} />
                <span style={{ background: '#06b6d4' }} />
                <span style={{ background: '#f59e0b' }} />
              </div>
              <div className="theme-label">Neón</div>
            </div>

            <div className={`theme-tile ${state.colorTheme === 'cobalto' ? 'selected' : ''}`} onClick={() => selectTheme('cobalto')}>
              <div className="swatches">
                <span style={{ background: '#071124' }} />
                <span style={{ background: '#334155' }} />
                <span style={{ background: '#667eea' }} />
              </div>
              <div className="theme-label">Cobalto</div>
            </div>

            <div className={`theme-tile ${state.colorTheme === 'claro' ? 'selected' : ''}`} onClick={() => selectTheme('claro')}>
              <div className="swatches">
                <span style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }} />
                <span style={{ background: '#2563eb' }} />
                <span style={{ background: '#059669' }} />
              </div>
              <div className="theme-label">Modo Claro</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Settings;
