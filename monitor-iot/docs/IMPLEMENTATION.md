``` 
```
---
## Persistencia con MongoDB Atlas (activar MONGO_URI)

Se ha añadido soporte opcional para persistir las lecturas en MongoDB Atlas a través de Mongoose.

Pasos para activar la persistencia:

1. En el servidor, copia `monitor-iot/server/.env.example` a `monitor-iot/server/.env` (si no lo has hecho ya) y rellena `MONGO_URI` con la cadena de conexión. Por ejemplo (sustituye `<db_password>` por tu contraseña real):

```text
MONGO_URI=mongodb+srv://vallecristopher102_db_user:<db_password>@cluster0.ihcrgyl.mongodb.net/acuavisor?retryWrites=true&w=majority
PORT=4000
```

2. Reinicia el servidor para que cargue las variables de entorno:

```cmd
cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\server"
npm install
npm run start
```

3. Comprobación: en la consola verás `Conectado a MongoDB` cuando la conexión se establezca correctamente. Si no se define `MONGO_URI` (o hay un error) el servidor usará almacenamiento en memoria como fallback.

Detalles técnicos en el servidor:

- El backend define un esquema Mongoose `Sensor` con campos: `sensor_id` (string, único), `caudal_min` (number), `total_acumulado` (number), `hora` (string) y `ultima_actualizacion` (Date).
- En `POST /api/sensor-data` el servidor hace un `findOneAndUpdate({ sensor_id }, { $set: { ... } }, { upsert: true, new: true })` para mantener la última lectura por sensor.
- En `GET /api/dashboard` el servidor devuelve los documentos desde la colección `sensors` si la conexión a Mongo está activa; si no, devuelve los datos en memoria.

Si prefieres mantener un histórico completo de lecturas (series temporales), puedo añadir un modelo `Reading` (cada POST inserta un documento) y endpoints para consultar históricos y agregaciones.

---

## Cómo debe comunicarse el ESP32 (recomendado) y alternativas

Recomendación (seguridad y escalabilidad): el ESP32 debe enviar sus lecturas al Backend mediante HTTP(S) POST. El Backend se encarga de validar y persistir en MongoDB Atlas. Este patrón es el más seguro porque las credenciales de la base de datos permanecen en el servidor (o en las variables de entorno del PaaS) y no en el firmware del dispositivo.

Ejemplo (ya incluido anteriormente) — fragmento resumido:

```cpp
// Arduino/ESP32 (resumen)
HTTPClient http;
http.begin("https://tu-backend.example.com/api/sensor-data");
http.addHeader("Content-Type", "application/json");
String payload = "{\"sensor_id\":\"1\",\"caudal_min\":\"12.3\",\"total_acumulado\":\"42.7\",\"hora\":\"2025-12-02 10:00:00\"}";
int code = http.POST(payload);
```

Alternativas (no recomendadas directamente desde ESP32):

- Conexión directa a MongoDB Atlas: técnicamente posible solo si el dispositivo soporta TLS y un driver compatible; no es práctico ni seguro para microcontroladores.
- Uso de MongoDB Realm (App Services): puedes crear una Function HTTPS en Realm y exponer un endpoint que el ESP32 llame. Realm puede aplicar reglas y autenticación por token y es más seguro que exponer la conexión directa.

---

## Lógica completa: cómo se muestran los datos en el Frontend

1) Ingestión
- ESP32 → POST JSON → `POST /api/sensor-data`.

2) Persistencia
- Backend → MongoDB Atlas (upsert por `sensor_id`) o almacenamiento en memoria si no está configurada la DB.

3) Visualización
- Frontend realiza polling a `GET /api/dashboard` cada 3s.
- Ejemplo de consumo en React (simplificado):

```js
async function fetchDashboard() {
  const res = await fetch('/api/dashboard');
  const body = await res.json();
  if (body.success) setSensors(body.data);
}

useEffect(() => {
  fetchDashboard();
  const id = setInterval(fetchDashboard, 3000);
  return () => clearInterval(id);
}, []);

// Render
{sensors.map(s => (
  <SensorCard key={s.sensor_id} sensor={s} />
))}
```

En `SensorCard` mostrar campos:
- `sensor.caudal_min`
- `sensor.total_acumulado`
- `new Date(sensor.ultima_actualizacion).toLocaleString()`

Si implementas un modelo `Reading` para histórico, el frontend puede pedir `GET /api/readings?sensor_id=1&limit=100` y dibujar series temporales con Recharts.

---

## Añadir la connection string al entorno de Render (PaaS)

En Render (u otro PaaS) debes configurar las variables de entorno en el panel de configuración del servicio web:

- Key: `MONGO_URI`
- Value: `mongodb+srv://vallecristopher102_db_user:<db_password>@cluster0.ihcrgyl.mongodb.net/acuavisor?retryWrites=true&w=majority`

No subas el `.env` al repositorio. Las variables inyectadas por el panel de Render serán accesibles para el proceso y la app se conectará automáticamente.

---

Si quieres, implemento ahora (elige):

- [A] Guardar cada lectura histórica en una colección `readings` en lugar de sobrescribir (añadir modelo `Reading` y endpoint `GET /api/readings`).
- [B] Añadir autenticación simple (API key) para `POST /api/sensor-data` y documentar cómo configurar la clave en los ESP32.
- [C] Añadir instrucciones paso a paso para crear el usuario `vallecristopher102_db_user` en MongoDB Atlas y ajustar IP Access/Network Rules.

---

Fin de la documentación actualizada.

``` 
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
  ````markdown
  # AquaVisor — Documentación de implementación (detallada)

  Este documento explica en detalle la arquitectura del proyecto, los contratos API, cómo ejecutar y probar localmente (con y sin hardware), estructura del frontend, decisiones de diseño y recomendaciones operativas.

  Tabla de contenidos
  - Resumen ejecutivo
  - Arquitectura y flujo de datos
  - API: contrato detallado (payloads, validaciones, respuestas)
  - Backend: comportamiento y estructura del servidor
  - Simulador (cómo usarlo y ejemplos)
  - Frontend: estructura, componentes y comportamiento (polling)
  - Ejemplos de conexión desde ESP32 (código de ejemplo)
  - Comandos útiles y cómo ejecutar el proyecto
  - Pruebas y debugging
  - Mejoras y hoja de ruta

  ---

  ## Resumen ejecutivo

  - Backend: Node.js con Express, expone API REST en `http://<host>:4000`.
  - Frontend: React con Vite en `monitor-iot/client`, consume `GET /api/dashboard` periódicamente (polling 3s) y renderiza el dashboard.
  - Persistencia actual: memoria en proceso (útil para desarrollo). No apta para producción.
  - Simulador: script `monitor-iot/server/simulator.js` para generar tráfico de prueba.

  ## Arquitectura y flujo de datos

  1. El ESP32 (o el simulador) envía un POST JSON a `/api/sensor-data` con la lectura del sensor.
  2. El backend valida y guarda/actualiza el registro del sensor en memoria.
  3. El frontend realiza polling a `/api/dashboard` cada 3 segundos para obtener el estado agregado y actualizar la UI (SensorCards, métricas, alertas).

  El objetivo de esta arquitectura es simplicidad y facilidad de desarrollo local. Para producción recomendamos reemplazar el almacenamiento en memoria por una base de datos y usar WebSockets para push en tiempo real.

  ## API — Contrato detallado

  1) POST /api/sensor-data
  - Descripción: endpoint de ingestión de lecturas desde sensores (ESP32) o simulador.
  - Content-Type: `application/json`
  - Body esperado (ejemplo):

  ```json
  {
    "sensor_id": "1",               // string: identificador único del sensor
    "caudal_min": "12",             // string o number: caudal instantáneo (se parsea a número)
    "total_acumulado": "120.5",     // string o number: acumulado (se parsea a número)
    "hora": "2025-12-02 10:00:00"   // string: marca de tiempo legible (se guarda tal cual)
  }
  ```

  - Reglas y validación:
    - `sensor_id`: requerido, no vacío.
    - `caudal_min` y `total_acumulado`: se aceptan como strings o numbers, pero el servidor hace `parseFloat`. Si `parseFloat` resulta en `NaN` -> responde `400`.
    - `hora`: requerido (formato libre), recomendado ISO-8601 o `YYYY-MM-DD HH:mm:ss`.

  - Respuestas:
    - 200 OK — body: `{ success: true, message: 'Datos recibidos correctamente', data: { sensor: { ... } } }`
    - 400 Bad Request — body: `{ success: false, error: 'mensaje descriptivo' }`

  2) GET /api/dashboard
  - Descripción: devuelve la lista de sensores almacenados y métricas derivadas.
  - Respuesta (ejemplo):

  ```json
  {
    "success": true,
    "count": 3,
    "data": [
      {
        "sensor_id": "1",
        "caudal_min": 12.0,
        "total_acumulado": 120.5,
        "hora": "2025-12-02 10:00:00",
        "ultima_actualizacion": "2025-12-02T10:00:03.123Z"
      }
    ]
  }
  ```

  3) GET /api/health
  - Respuesta: `{ status: 'ok', timestamp: '<iso>', sensores_activos: N }`.

  ---

  ## Backend — `monitor-iot/server/index.js`

  Resumen de comportamiento del servidor:

  - Middlewares:
    - `express.json()` para parsear JSON.
    - `cors()` configurado para permitir peticiones desde el cliente en desarrollo.

  - Estado en memoria:
    - Estructura: `const sensorData = { [sensor_id]: { sensor_id, caudal_min, total_acumulado, hora, ultima_actualizacion } }`.
    - Al recibir un POST se calcula `Number` para `caudal_min` y `total_acumulado`, se añade `ultima_actualizacion = new Date().toISOString()` y se guarda/actualiza el objeto.

  - Manejo de errores:
    - Validación temprana y respuestas con `res.status(400).json({ success:false, error: '...' })`.
    - Errores internos devuelven `500` con un mensaje genérico.

  Recomendación: si vas a exponer el servicio en una red amplia, añade autenticación (API key o tokens) en este endpoint de ingestión.

  ---

  ## Simulador — `monitor-iot/server/simulator.js`

  Propósito: permitir probar el pipeline sin hardware real.

  Características:
  - Envía lecturas periódicas (configurable) para un conjunto de sensores.
  - Usa `fetch` (Node 18+) o puede adaptarse a `node-fetch`/`axios` si tu Node es más antiguo.

  Uso:

  ```cmd
  cd monitor-iot/server
  node simulator.js
  ```

  Salida esperada: logs tipo `Enviado sensor 1 -> 200 { success: true, ... }` cada intervalo configurado.

  Configuraciones típicas que puedes añadir al script: número de sensores, intervalo, valores máximos/mínimos, jitter aleatorio.

  ---

  ## Frontend — estructura y comportamiento

  Ubicación: `monitor-iot/client`

  Ficheros y responsabilidades principales:

  - `src/App.jsx` — Router y layout general.
  - `src/components/Sidebar.jsx` — navegación lateral.
  - `src/components/Header.jsx` — barra superior (estado en vivo, notificaciones).
  - `src/pages/CommandCenter.jsx` — dashboard principal (usa `SensorCard`, `MetricCard`, `Chart`).
  - `src/pages/Settings.jsx` — página de configuración (ya implementada, guarda en `localStorage`).
  - `src/components/SensorCard.jsx` — tarjeta por sensor (muestra `caudal_min`, `total_acumulado`, hora y estado).

  Comportamiento de actualización:
  - `fetchDashboardData()` llama a `GET /api/dashboard` y actualiza `sensors` en `useState`.
  - `useEffect` del `CommandCenter` crea un `setInterval(fetchDashboardData, 3000)` y lo limpia en el `cleanup`.

  Notas de diseño:
  - El polling simplifica el desarrollo. Para producción se recomienda usar WebSockets para disminuir latencia y coste de peticiones.

  ---

  ## Ejemplo rápido: cómo programar un ESP32 (Arduino) para enviar lecturas

  El siguiente ejemplo ilustra el flujo de envío HTTP desde un ESP32 con Arduino core (WiFi.h + HTTPClient.h).

  ```cpp
  #include <WiFi.h>
  #include <HTTPClient.h>

  const char* ssid = "TU_SSID";
  const char* password = "TU_PASS";
  const char* serverUrl = "http://192.168.1.42:4000/api/sensor-data"; // sustituye por tu IP

  void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("Conectado");
  }

  void loop() {
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");

      String payload = "{\"sensor_id\":\"1\",\"caudal_min\":\"12.3\",\"total_acumulado\":\"42.7\",\"hora\":\"2025-12-02 10:00:00\"}";
      int code = http.POST(payload);
      String resp = http.getString();
      Serial.println(code);
      Serial.println(resp);
      http.end();
    }
    delay(3000);
  }
  ```

  Nota: asegúrate de que el ESP32 esté en la misma red local y que la IP del servidor sea accesible desde el dispositivo.

  ---

  ## Comandos y pasos de ejecución

  Frontend (Vite):

  ```cmd
  cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\client"
  npm install
  npm run dev
  ```

  Backend (Express):

  ```cmd
  cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\server"
  npm install
  npm run start
  ```

  Simulador:

  ```cmd
  cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\server"
  node simulator.js
  ```

  Pruebas con `curl` (Windows `cmd`):

  ```cmd
  curl -H "Content-Type: application/json" -d "{\"sensor_id\":\"5\",\"caudal_min\":\"12\",\"total_acumulado\":\"120.5\",\"hora\":\"2025-12-02 10:00:00\"}" http://localhost:4000/api/sensor-data
  curl http://localhost:4000/api/dashboard
  ```

  ---

  ## Pruebas y debugging

  - Si obtienes `Cannot find module 'express'`: ejecutar `npm install` dentro de `monitor-iot/server`.
  - Si `simulator.js` falla con `fetch is not defined`: tu Node es menor a 18. Actualiza Node o instala `node-fetch` y ajusta el script.
  - Si el frontend no muestra datos: comprueba que `GET /api/dashboard` devuelve `200` (usa `curl`), y que la URL en `client` apunta al host correcto (en desarrollo normalmente `http://localhost:4000`).

  Para tests automáticos: se recomienda añadir pruebas unitarias con `jest` y `supertest` para testar `POST /api/sensor-data` y `GET /api/dashboard`.

  ---

  ## Mejoras propuestas (priorizadas)

  1. Persistencia: migrar a una base de datos (SQLite o MongoDB) para mantener histórico.
  2. Autenticación: API keys para el endpoint de ingestión.
  3. Reemplazar polling por WebSockets para mejorar latencia y reducir carga.
  4. Añadir un endpoint `POST /api/settings` para persistencia de configuraciones de usuario en servidor.
  5. Añadir una suite de tests e integración continua (GitHub Actions) para validar PRs.

  ---

  Si quieres, aplico también estos cambios al `README.md` (resumen + enlace a `docs/IMPLEMENTATION.md`) y puedo añadir un script `npm run simulate` en `server/package.json` para facilitar el arranque del simulador.

  ````