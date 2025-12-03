``` 
```
---
## Persistencia: archivos locales (MongoDB eliminado)

Por decisión de despliegue se ha eliminado el soporte para MongoDB en este proyecto. La persistencia ahora se realiza exclusivamente en archivos JSON dentro de `monitor-iot/server/data` (`sensors.json` y `history.json`).

Puntos clave:
- El servidor guarda el estado actual de sensores en `sensors.json` y el historial en `history.json`.
- No hay dependencias ni scripts relacionados con MongoDB en el servidor.
- Si despliegas en Clever Cloud ten en cuenta que el sistema de archivos puede ser efímero: los ficheros locales pueden perderse al escalar o redeployar. Para persistencia duradera en Clever Cloud te recomiendo usar un servicio de almacenamiento o base de datos gestionada del PaaS (no incluida en este repositorio).

Si más adelante quieres añadir un servicio gestionado (por ejemplo una base de datos relacional o NoSQL) puedo adaptar el backend para ese servicio específico.

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
## AquaVisor — Implementación (resumen actualizado)

Este documento explica la arquitectura actual del proyecto y cómo ejecutar y desplegar la app. Se ha eliminado el soporte a MongoDB del código: la persistencia es por archivos JSON en `monitor-iot/server/data/`.

### Estado actual — Persistencia

- Persistencia por defecto: archivos JSON en `monitor-iot/server/data/` (`sensors.json` y `history.json`).
- El servidor mantiene el estado en memoria y lo vuelca periódicamente a disco (cada pocos segundos).
- Si despliegas en un PaaS (por ejemplo Clever Cloud), ten en cuenta que el sistema de archivos puede ser efímero. Para persistencia duradera añade un servicio gestionado y adapta el backend.

### Comunicación recomendada desde el ESP32

- El ESP32 debe enviar lecturas al Backend mediante HTTP(S) POST a `POST /api/sensor-data`.
- El backend valida los campos y actualiza el estado en memoria.

Ejemplo (Arduino/ESP32):

```cpp
HTTPClient http;
http.begin("https://tu-backend.example.com/api/sensor-data");
http.addHeader("Content-Type", "application/json");
String payload = "{\"sensor_id\":\"1\",\"caudal_min\":\"12.3\",\"total_acumulado\":\"42.7\",\"hora\":\"2025-12-02 10:00:00\"}";
int code = http.POST(payload);
```

### Flujo de datos (resumen)

1. Ingestión: ESP32 → `POST /api/sensor-data`.
2. Persistencia: el backend guarda en memoria y sincroniza con `monitor-iot/server/data/` en disco.
3. Visualización: frontend consulta `GET /api/dashboard` periódicamente (polling cada 3s por defecto).

### Despliegue en Clever Cloud (nota sobre persistencia)

- Puedes desplegar la aplicación como una app Node.js en Clever Cloud. El repositorio ya contiene todo lo necesario para ejecutar el backend y el frontend.
- Atención: el almacenamiento local de la instancia puede ser efímero. Si necesitas datos duraderos en Clever Cloud, añade un servicio gestionado (base de datos o almacenamiento) y adapta el backend.
- Si quieres, te ayudo a generar la configuración de despliegue (`clevercloud.json`) y a adaptar el backend para usar la base de datos gestionada que prefieras.

### Notas sobre migraciones y scripts

- El proyecto no incluye actualmente ningún script activo para migrar datos a MongoDB. Un antiguo `migrate-to-mongo.js` fue deshabilitado cuando se eliminó el soporte a MongoDB.
- Si en el futuro decides usar un servicio gestionado, puedo volver a implementar un script de migración.

### API — Endpoints principales

- `POST /api/sensor-data` — ingestión de lecturas. Body JSON con `sensor_id`, `caudal_min`, `total_acumulado`, `hora`.
- `GET /api/dashboard` — devuelve sensores actuales y métricas.
- `GET /api/reports` — devuelve historial en memoria por sensor.
- `GET /api/generate-report` — genera y descarga un CSV con el histórico.
- `GET /api/health` — health-check.

### Simulador

- `monitor-iot/server/simulator.js` envía POSTs periódicos para probar la ingestión sin hardware.

### Pasos para ejecutar localmente

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

Si quieres, actualizo también el `README.md` (resumen) y elimino cualquier resto de referencias a MongoDB en la documentación o en `package-lock.json` (esto último requiere regenerar el lockfile localmente con `npm install`).
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