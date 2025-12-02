# AquaVisor — Documentación de implementación

Esta documentación describe la arquitectura del proyecto, qué hace cada pieza de código, cómo ejecutar el sistema localmente y cómo probar sin hardware (simulador). Está escrita en español para desarrollo local.

## Resumen rápido
- Backend: Node.js + Express (puerto `4000`). API REST para ingestión y lectura de datos de sensores.
- Frontend: React (Vite) en `monitor-iot/client` que realiza polling cada 3s a `GET /api/dashboard` y renderiza tarjetas por sensor.
- Almacenamiento: Memoria volátil (objeto JS) dentro del proceso Node para desarrollo rápido.
- Simulador: `monitor-iot/server/simulator.js` — envía POSTs periódicos para poblar el backend.

## Estructura del repositorio (resumen)
```
/monitor-iot
  /server
    index.js            # Servidor Express con endpoints
    package.json
    simulator.js        # Script para simular sensores locales
  /client
    package.json
    src/
      App.jsx           # Lógica principal, polling y mapeo de sensores
      components/       # Componentes UI (MetricCard, Chart, AlertsPanel, SensorCard, ...)
  README.md
  docs/IMPLEMENTATION.md
```

## API (Contract)

A. Ingesta — Endpoint para ESP32
- Método: `POST`
- Ruta: `/api/sensor-data`
- Body (JSON EXACTO esperado):

```json
{
  "sensor_id": "1",
  "caudal_min": "12",
  "total_acumulado": "120.5",
  "hora": "2025-11-30 08:30:30"
}
```

- Comportamiento:
  - El servidor valida la presencia de `sensor_id`, `caudal_min`, `total_acumulado` y `hora`.
  - Convierte `caudal_min` y `total_acumulado` con `parseFloat` y rechaza con `400` si no son numéricos.
  - Guarda o actualiza el sensor en un objeto JS en memoria usando `sensor_id` como clave única.
  - Respuestas:
    - `200` — `{ success: true, message: 'Datos recibidos correctamente', data: { ... } }`.
    - `400` — `{ error: 'mensaje' }` si falla validación.

B. Visualización — Endpoint para frontend
- Método: `GET`
- Ruta: `/api/dashboard`
- Respuesta: `200` con JSON `{ success: true, count: N, data: [ ...sensores ] }` donde cada sensor contiene:
  - `sensor_id` (string)
  - `caudal_min` (number)
  - `total_acumulado` (number)
  - `hora` (string)
  - `ultima_actualizacion` (ISO string)

C. Health check
- `GET /api/health` — devuelve estado simple `{ status: 'ok', timestamp, sensores_activos }`.

## Backend — `monitor-iot/server/index.js`

Puntos clave:
- Usa `express.json()` para parsear JSON y `cors()` para permitir el frontend/ESP32.
- Contiene validaciones estrictas en `POST /api/sensor-data` para asegurar la estructura del JSON.
- Mantiene un objeto `sensorData = {}` en memoria:
  - Al recibir POST, crea/actualiza `sensorData[sensor_id] = { sensor_id, caudal_min, total_acumulado, hora, ultima_actualizacion }`.
- `GET /api/dashboard` retorna `Object.values(sensorData)`.

## Frontend — `monitor-iot/client/src/App.jsx`

Puntos clave:
- `useState` mantiene `sensors` (array) y estados `loading`, `error`, `lastUpdate`.
- `fetchDashboardData()` consume `GET /api/dashboard` y hace `setSensors(result.data)`.
- `useEffect` configura `setInterval` para llamar `fetchDashboardData()` cada 3000ms (3s). También realiza la primera llamada inmediatamente.
- Mapea `sensors.map(sensor => <SensorCard sensor={sensor} />)` en la UI.

Componentes principales:
- `SensorCard.jsx` — representación por sensor (métricas, hora, estado).
- `MetricCard`, `Chart`, `AlertsPanel`, `SensorHealth` — UI del dashboard, ya incluidos en `client/src/components`.

## Simulador local — `monitor-iot/server/simulator.js`

- Script Node que envía POST periódicos (cada 3s) con datos simulados de 3 sensores a `http://localhost:4000/api/sensor-data`.
- Útil para ver el dashboard sin hardware.
- Ejecutar: `node simulator.js` dentro de `monitor-iot/server`.
- Nota: el script usa la API `fetch` disponible en Node 18+; si tienes Node < 18, el script debería instalar `node-fetch` o usar `axios`.

## Cómo ejecutar todo localmente

1) Backend
```cmd
cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\server"
npm install
npm run start
```
- El servidor atiende en `http://localhost:4000`.

2) Simulador (opcional — para poblar datos sin ESP32)
```cmd
cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\server"
node simulator.js
```
- Verás logs en consola y el backend recibirá datos periódicamente.

3) Frontend
```cmd
cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\client"
npm install
npm run dev
```
- Abre la URL que Vite muestre en consola (por ejemplo `http://localhost:5173`).
- La UI hará polling al backend cada 3s y mostrará tarjetas por sensor.

## Probar manualmente con `curl` (ejemplos)

Enviar un POST de prueba:
```cmd
curl -H "Content-Type: application/json" -d "{\"sensor_id\":\"5\",\"caudal_min\":\"12\",\"total_acumulado\":\"120.5\",\"hora\":\"2025-12-02 10:00:00\"}" http://localhost:4000/api/sensor-data
```
Obtener dashboard:
```cmd
curl http://localhost:4000/api/dashboard
```

## Conectar un ESP32 real
1. En la máquina que corre el servidor, ejecutar `ipconfig` y obtener la IPv4 del adaptador Wi‑Fi (ej.: `192.168.1.42`).
2. En el firmware del ESP32, configurar la URL POST como:
```
http://192.168.1.42:4000/api/sensor-data
```
3. Enviar exactamente el JSON indicado en la sección API.

## Recomendaciones y mejoras futuras
- Persistencia: migrar a una base de datos ligera (SQLite, LevelDB o MongoDB) si necesitas conservar datos entre reinicios.
- Autenticación: añadir API keys o autenticación para evitar envíos no autorizados.
- Validación extendida: usar `ajv` o `joi` para validación JSON schema si aumentan los campos.
- WebSocket: considerar socket para push en tiempo real (evita polling) si esperas alta frecuencia.
- Tests: añadir tests unitarios para endpoints con `supertest` y `jest`.

## Troubleshooting rápido
- Error `Cannot find module 'express'`: ejecutar `npm install` en `monitor-iot/server`.
- `simulator.js` falla con `fetch is not defined`: tu Node es < 18. Instala `node-fetch` o ejecuta con Node 18+.
- Frontend no muestra datos: comprobar que backend corre en `4000`, que el simulador/ESP32 envía datos y que Vite no está proxyando a otro host.

---

Si quieres, aplico automáticamente estos cambios al `README.md` (resumiendo) y abro un `PR` en GitHub (si me das acceso o un token). También puedo:
- Añadir un script `npm run simulate` en `server/package.json` para facilitar el arranque del simulador.
- Convertir `simulator.js` en una utilidad configurable (`--sensors`, `--interval`).

Dime si quieres que:
- agregue el script `npm run simulate` y lo deje configurado, o
- actualice `README.md` con un resumen y enlace a `docs/IMPLEMENTATION.md`, o
- cree automáticamente un PR con los cambios (necesitaré permiso/token).