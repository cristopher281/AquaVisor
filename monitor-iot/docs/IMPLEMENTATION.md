``` 
```
---
## Persistencia: archivos locales (soporte a conexiones externas eliminado)

Por decisión de despliegue se ha eliminado el soporte para conexiones directas a bases de datos externas en este proyecto. La persistencia ahora se realiza exclusivamente en archivos JSON dentro de `monitor-iot/server/data` (`sensors.json` y `history.json`).

Puntos clave:
- El servidor guarda el estado actual de sensores en `sensors.json` y el historial en `history.json`.
- No hay dependencias ni scripts relacionados con MongoDB en el servidor.
- Si despliegas en Clever Cloud ten en cuenta que el sistema de archivos puede ser efímero: los ficheros locales pueden perderse al escalar o redeployar. Para persistencia duradera en Clever Cloud te recomiendo usar un servicio de almacenamiento o base de datos gestionada del PaaS (no incluida en este repositorio).

Si más adelante quieres añadir un servicio gestionado (por ejemplo una base de datos relacional o NoSQL) puedo adaptar el backend para ese servicio específico.

---

## Cómo debe comunicarse el ESP32 (recomendado) y alternativas

Recomendación (seguridad y escalabilidad): el ESP32 debe enviar sus lecturas al Backend mediante HTTP(S) POST. El Backend valida las lecturas y las persiste localmente o en una base de datos gestionada si se configura una en el entorno. Este patrón mantiene las credenciales y la lógica sensible en el servidor (o en las variables de entorno del PaaS), no en el firmware del dispositivo.

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

- Conexión directa a una base de datos gestionada: técnicamente posible solo si el dispositivo soporta TLS y un driver compatible; no es práctico ni seguro para microcontroladores.
- Uso de un servicio de funciones o App Services: puedes crear una Function HTTPS en el proveedor de tu elección y exponer un endpoint que el ESP32 llame. Las Functions permiten aplicar reglas y autenticación por token y son más seguras que exponer la conexión directa a la base de datos.

---

## Lógica completa: cómo se muestran los datos en el Frontend

1) Ingestión
- ESP32 → POST JSON → `POST /api/sensor-data`.

2) Persistencia
- Backend → base de datos gestionada (opcional, upsert por `sensor_id`) o almacenamiento en memoria si no está configurada la DB.

3) Visualización
- Frontend realiza polling a `GET /api/dashboard` cada 3s.
## AquaVisor — Implementación (limpia, actual)

Este documento resume la arquitectura actual del proyecto y cómo ejecutarlo. El soporte a conexiones directas a bases de datos externas fue retirado del código; la persistencia es por archivos JSON en `monitor-iot/server/data/`.

### Persistencia

- Persistencia por defecto: archivos JSON en `monitor-iot/server/data/` (`sensors.json` y `history.json`).
- El servidor mantiene el estado en memoria y lo guarda periódicamente a disco.
- En PaaS (Clever Cloud u otros) el sistema de archivos puede ser efímero; para durabilidad usa un servicio gestionado y adapta el backend.

### Comunicación ESP32 → Backend

- Enviar lecturas por HTTP(S) POST a `POST /api/sensor-data`.
- El servidor valida y actualiza el estado en memoria.

Ejemplo (Arduino/ESP32):

```cpp
HTTPClient http;
http.begin("https://tu-backend.example.com/api/sensor-data");
http.addHeader("Content-Type", "application/json");
String payload = "{\"sensor_id\":\"1\",\"caudal_min\":\"12.3\",\"total_acumulado\":\"42.7\",\"hora\":\"2025-12-02 10:00:00\"}";
int code = http.POST(payload);
```

### Flujo de datos

1. Ingestión: `POST /api/sensor-data` desde dispositivo o simulador.
2. Persistencia: memoria → sincronización a `monitor-iot/server/data/`.
3. Visualización: `GET /api/dashboard` por el frontend (polling cada 3s).

### Despliegue en Clever Cloud

- Puedes desplegar la app como Node.js; considera que el sistema de archivos puede ser efímero.
- Para persistencia duradera añade un servicio gestionado (DB o almacenamiento) y adapta el backend.

### Migraciones y scripts

- No hay scripts activos para migrar a una base de datos externa; cualquier archivo de migración anterior fue retirado. Si decides añadir una BD gestionada, puedo preparar la migración y el script correspondiente.

### API — Endpoints principales

- `POST /api/sensor-data`
- `GET /api/dashboard`
- `GET /api/reports`
- `GET /api/generate-report`
- `GET /api/health`

### Simulador

- `monitor-iot/server/simulator.js` envía POSTs para pruebas.

### Ejecutar localmente

Backend:
```cmd
cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\server"
npm install
npm run start
```

Frontend:
```cmd
cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\client"
npm install
npm run dev
```

Simulador:
```cmd
cd /d "c:\Users\DELL\OneDrive\Escritorio\Bakend-Esp32\monitor-iot\server"
node simulator.js
```

---

Si quieres, quito también las últimas referencias a Mongo en el repositorio (por ejemplo en `package-lock.json`) — esto requiere regenerar el lockfile localmente con `npm install`.
  - Si `simulator.js` falla con `fetch is not defined`: tu Node es menor a 18. Actualiza Node o instala `node-fetch` y ajusta el script.
  - Si el frontend no muestra datos: comprueba que `GET /api/dashboard` devuelve `200` (usa `curl`), y que la URL en `client` apunta al host correcto (en desarrollo normalmente `http://localhost:4000`).

  Para tests automáticos: se recomienda añadir pruebas unitarias con `jest` y `supertest` para testar `POST /api/sensor-data` y `GET /api/dashboard`.

  ---

  ## Mejoras propuestas (priorizadas)

  1. Persistencia: migrar a una base de datos (por ejemplo SQLite o una base de datos gestionada) para mantener histórico.
  2. Autenticación: API keys para el endpoint de ingestión.
  3. Reemplazar polling por WebSockets para mejorar latencia y reducir carga.
  4. Añadir un endpoint `POST /api/settings` para persistencia de configuraciones de usuario en servidor.
  5. Añadir una suite de tests e integración continua (GitHub Actions) para validar PRs.

  ---

  Si quieres, aplico también estos cambios al `README.md` (resumen + enlace a `docs/IMPLEMENTATION.md`) y puedo añadir un script `npm run simulate` en `server/package.json` para facilitar el arranque del simulador.

  ````