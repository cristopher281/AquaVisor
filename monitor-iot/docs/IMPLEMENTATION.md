#  AquaVisor - Documentación de Implementación

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2025  
**Autor:** Cristopher Valladares

---

##  Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Requisitos Previos](#requisitos-previos)
4. [Instalación](#instalación)
5. [Configuración](#configuración)
6. [Ejecución](#ejecución)
7. [API Endpoints](#api-endpoints)
8. [Integración ESP32](#integración-esp32)
9. [Sistema de Persistencia](#sistema-de-persistencia)
10. [Funcionalidades Avanzadas](#funcionalidades-avanzadas)
11. [Despliegue en Producción](#despliegue-en-producción)
12. [Resolución de Problemas](#resolución-de-problemas)
13. [Mejoras Futuras](#mejoras-futuras)
14. [Documentación Adicional](#documentación-adicional)

---

##  Descripción General

**AquaVisor** es un sistema completo de monitoreo IoT diseñado para visualizar y gestionar datos de sensores ESP32 en tiempo real. El proyecto implementa una arquitectura full-stack moderna con:

- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **Base de Datos:** Sistema dual (JSON + MySQL opcional)
- **Dispositivos:** ESP32 con sensores de caudal

### Características Principales

# Monitoreo en tiempo real de múltiples sensores  
# Dashboard interactivo con gráficas dinámicas  
# Sistema de alertas configurable  
# Generación de reportes profesionales (CSV/PDF)  
# Persistencia dual (archivos JSON + MySQL opcional)  
# Interfaz moderna con glassmorphism  
# API RESTful completa  

---

##  Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      DISPOSITIVOS IoT                        │
│                     ESP32 + Sensores                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP POST
                         │ /api/sensor-data
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │  Validación  │  │ Persistencia │      │
│  │   Server     │→ │     Datos    │→ │  (Dual)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                                     │              │
│         │                                     ├─→ JSON       │
│         │                                     └─→ MySQL      │
└─────────┼───────────────────────────────────────────────────┘
          │ REST API
          │ /api/dashboard
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │   Reportes   │  │    Alertas   │      │
│  │   Tiempo     │  │   CSV/PDF    │  │   Sistema    │      │
│  │    Real      │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  Gráficas (Recharts) + Componentes Modulares                │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

1. **Ingesta:** ESP32 envía datos vía POST → `/api/sensor-data`
2. **Validación:** Backend valida formato y tipos de datos
3. **Persistencia:** Datos guardados en memoria + disco (JSON) + MySQL (opcional)
4. **Visualización:** Frontend consulta `/api/dashboard` cada 3 segundos
5. **Presentación:** Datos renderizados en gráficas y métricas

---

##  Requisitos Previos

### Software Necesario

| Componente | Versión Mínima | Recomendada | Verificar |
|------------|----------------|-------------|-----------|
| **Node.js** | 16.x | 18.x o superior | `node --version` |
| **npm** | 8.x | 9.x o superior | `npm --version` |
| **Git** | 2.x | Última | `git --version` |

### Hardware Opcional

- **ESP32** (para datos reales)
- **Sensor de Caudal** compatible con ESP32

---

##  Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/cristopher281/AquaVisor.git
cd AquaVisor/monitor-iot
```

### 2. Instalar Dependencias del Backend

```bash
cd server
npm install
```

**Dependencias instaladas:**
- `express` - Framework web
- `cors` - Manejo de CORS
- `mysql2` - Cliente MySQL
- `dotenv` - Variables de entorno

### 3. Instalar Dependencias del Frontend

```bash
cd ../client
npm install
```

**Dependencias instaladas:**
- `react` & `react-dom` - Framework UI
- `react-router-dom` - Navegación
- `recharts` - Gráficas
- `react-icons` - Iconos
- `html2canvas` & `jspdf` - Generación de PDFs

---

## 🔧 Configuración

### Backend - Variables de Entorno

Crea un archivo `.env` en la carpeta `server/`:

```env
# Configuración del Servidor
PORT=4000

# MySQL (Opcional - Solo si usarás base de datos externa)
CLEVER_MYSQL_HOST=localhost
CLEVER_MYSQL_USER=root
CLEVER_MYSQL_PASSWORD=tu_password
CLEVER_MYSQL_DB=aquavisor
CLEVER_MYSQL_PORT=3306
```

> **Nota:** Si no configuras MySQL, el sistema usará persistencia en archivos JSON automáticamente.

### Frontend - Configuración de Proxy

El archivo `client/vite.config.js` ya está configurado:

```javascript
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true
            }
        }
    }
})
```

---

##  Ejecución

### Modo Desarrollo

#### Opción 1: Scripts Separados

**Terminal 1 - Backend:**
```bash
cd server
npm start
# Servidor en http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Cliente en http://localhost:3000
```

**Terminal 3 - Simulador (Opcional):**
```bash
cd server
node simulator.js
# Genera datos de prueba cada 5 segundos
```

#### Opción 2: Script Único (Windows)

Crea un archivo `start.bat` en la raíz del proyecto:

```batch
@echo off
start cmd /k "cd /d server && npm start"
start cmd /k "cd /d client && npm run dev"
echo Servidores iniciados en ventanas separadas
```

### Verificar Instalación

1. **Backend:** Abre http://localhost:4000/api/health
   - Debe responder: `{"status":"ok", "timestamp":"...", "sensores_activos":0}`

2. **Frontend:** Abre http://localhost:3000
   - Debe cargar el dashboard de AquaVisor

---

##  API Endpoints

### 1. Ingesta de Datos (ESP32)

**Endpoint:** `POST /api/sensor-data`

**Payload:**
```json
{
  "sensor_id": "ESP32_001",
  "caudal_min": 12.5,
  "total_acumulado": 45.3,
  "hora": "2025-12-02T23:19:00"
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Datos recibidos correctamente (memoria)",
  "data": {
    "sensor_id": "ESP32_001",
    "caudal_min": 12.5,
    "total_acumulado": 45.3,
    "hora": "2025-12-02T23:19:00",
    "ultima_actualizacion": "2025-12-02T23:19:05.123Z"
  }
}
```

### 2. Dashboard (Frontend)

**Endpoint:** `GET /api/dashboard`

**Respuesta:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "sensor_id": "ESP32_001",
      "caudal_min": 12.5,
      "total_acumulado": 45.3,
      "hora": "2025-12-02T23:19:00",
      "ultima_actualizacion": "2025-12-02T23:19:05.123Z"
    }
  ]
}
```

### 3. Reportes Históricos

**Endpoint:** `GET /api/reports`

**Respuesta:**
```json
{
  "success": true,
  "count": 2,
  "data": {
    "ESP32_001": [
      {
        "sensor_id": "ESP32_001",
        "caudal_min": 12.5,
        "total_acumulado": 45.3,
        "hora": "2025-12-02T23:19:00",
        "ultima_actualizacion": "2025-12-02T23:19:05.123Z",
        "stored": "memory"
      }
    ]
  }
}
```

### 4. Generar Reporte CSV

**Endpoint:** `GET /api/generate-report`

**Respuesta:** Descarga automática de archivo CSV

### 5. Guardar Reporte PDF

**Endpoint:** `POST /api/save-report`

**Headers:**
- `Content-Type: application/pdf`
- `X-Filename: nombre_archivo.pdf`

**Body:** Binary PDF data

### 6. Estado del Servidor

**Endpoint:** `GET /api/health`

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-02T23:19:05.123Z",
  "sensores_activos": 2
}
```

### 7. Estado de la Base de Datos

**Endpoint:** `GET /api/db-status`

**Respuesta:**
```json
{
  "success": true,
  "dbConnected": false,
  "dbBacking": "file"
}
```

---

## 🔌 Integración ESP32

### Código Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuración WiFi
const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";

// Configuración del servidor
const char* serverUrl = "http://192.168.1.100:4000/api/sensor-data";

// ID único del sensor
const String sensorId = "ESP32_001";

void setup() {
  Serial.begin(115200);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Leer datos del sensor
    float caudal = leerCaudal();        // Implementar según tu sensor
    float total = leerTotalAcumulado(); // Implementar según tu sensor
    
    // Preparar JSON
    StaticJsonDocument<200> doc;
    doc["sensor_id"] = sensorId;
    doc["caudal_min"] = caudal;
    doc["total_acumulado"] = total;
    doc["hora"] = obtenerTimestamp(); // Implementar NTP
    
    String payload;
    serializeJson(doc, payload);
    
    // Enviar al servidor
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(payload);
    
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Respuesta: " + response);
    } else {
      Serial.println("Error en petición: " + String(httpCode));
    }
    
    http.end();
  }
  
  delay(3000); // Enviar cada 3 segundos
}
```

### Obtener IP del Servidor

**Windows:**
```bash
ipconfig
# Buscar "Dirección IPv4" de tu adaptador de red
```

**Mac/Linux:**
```bash
ifconfig
# O usar: hostname -I
```

---

##  Sistema de Persistencia

### Modo 1: Archivos JSON (Por Defecto)

**Ubicación:** `server/data/`

**Archivos:**
- `sensors.json` - Estado actual de cada sensor
- `history.json` - Historial de lecturas (últimas 500 por sensor)

**Características:**
-  Sin configuración adicional
-  Guardado automático cada 5 segundos
-  Recuperación ante fallos (SIGINT, SIGTERM)
-  Límite de 500 registros por sensor

**Estructura sensors.json:**
```json
{
  "ESP32_001": {
    "sensor_id": "ESP32_001",
    "caudal_min": 12.5,
    "total_acumulado": 45.3,
    "hora": "2025-12-02T23:19:00",
    "ultima_actualizacion": "2025-12-02T23:19:05.123Z"
  }
}
```

### Modo 2: MySQL (Opcional)

**Configuración:**

1. Crear base de datos:
```sql
CREATE DATABASE aquavisor;
```

2. Configurar `.env`:
```env
CLEVER_MYSQL_HOST=localhost
CLEVER_MYSQL_USER=root
CLEVER_MYSQL_PASSWORD=tu_password
CLEVER_MYSQL_DB=aquavisor
CLEVER_MYSQL_PORT=3306
```

3. Reiniciar servidor - Las tablas se crean automáticamente:

**Tablas creadas:**
```sql
CREATE TABLE sensors (
  sensor_id VARCHAR(255) PRIMARY KEY,
  last_seen TIMESTAMP NOT NULL,
  caudal_min DOUBLE,
  total_acumulado DOUBLE,
  raw_json JSON
);

CREATE TABLE history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sensor_id VARCHAR(255),
  ts TIMESTAMP NOT NULL,
  payload JSON,
  INDEX (sensor_id)
);
```

**Ventajas:**
- ✅ Sin límite de registros
- ✅ Consultas SQL avanzadas
- ✅ Escalabilidad
- ✅ Backup profesional

### Sistema de Fallback

Si MySQL falla → Automáticamente cambia a archivos JSON

```javascript
// El sistema detecta errores y cambia de modo
app.locals.dbConnected = false;  // MySQL no disponible
app.locals.dbBacking = 'file';   // Usando archivos
```

---

## 🎨 Funcionalidades Avanzadas

### 1. Generación de Reportes CSV

**Ubicación:** Dashboard → Panel de Alertas → Botón "Generar CSV"

**Contenido:**
- Timestamp de cada lectura
- ID del sensor
- Caudal por minuto
- Total acumulado
- Origen del dato (memory/mysql)

**Formato:**
```csv
# Reporte Técnico AquaVisor
# Generated: 2025-12-02T23:19:05.123Z
timestamp,sensor_id,hora,caudal_min,total_acumulado,stored
2025-12-02T23:19:05.123Z,ESP32_001,2025-12-02T23:19:00,12.5,45.3,memory
```

### 2. Generación de Reportes PDF

**Ubicación:** Dashboard → Panel de Alertas → Botón "Generar PDF"

**Características:**
- ✅ Layout profesional apaisado
- ✅ Logo AquaVisor (si existe `/logo.png`)
- ✅ Captura de gráfica principal
- ✅ Tabla con hasta 24 sensores
- ✅ Sparklines (mini-gráficas de tendencias)
- ✅ Estadísticas: último, promedio, mín, máx, total
- ✅ Guardado automático en `server/reports/`
- ✅ Descarga en navegador

**Agregar Logo:**
1. Coloca tu logo en `client/public/logo.png`
2. Tamaño recomendado: 512x512px
3. Formato: PNG con transparencia

### 3. Sistema de Alertas

**Ubicación:** Panel de Alertas

**Tipos de Alertas:**
- 🟡 **Warning:** Flujo elevado (> 15 L/min)
- 🔵 **Info:** Acumulado alto (> 100 L)
- 🟢 **Success:** Parámetros óptimos

**Generación:**
- Automática basada en datos de sensores
- Máximo 5 alertas visibles
- Actualización en tiempo real

### 4. Simulador de Datos

**Ubicación:** `server/simulator.js`

**Uso:**
```bash
cd server
node simulator.js
```

**Funcionalidad:**
- Genera datos realistas de 3 sensores simulados
- Envía lecturas cada 5 segundos
- Útil para pruebas sin hardware

**Personalizar:**
```javascript
// Editar simulator.js
const sensors = [
  { id: 'Sensor_A', baseFlow: 10 },
  { id: 'Sensor_B', baseFlow: 15 },
  { id: 'Sensor_C', baseFlow: 8 }
];
```

---

##  Despliegue en Producción

### Opción 1: Clever Cloud

**Backend:**
1. Crear aplicación Node.js en Clever Cloud
2. Configurar variables de entorno en el panel
3. Conectar repositorio Git
4. Deploy automático

**Variables de Entorno:**
```
PORT=8080 (o el que asigne Clever Cloud)
CLEVER_MYSQL_HOST=xxx
CLEVER_MYSQL_USER=xxx
CLEVER_MYSQL_PASSWORD=xxx
CLEVER_MYSQL_DB=xxx
```

**Frontend:**
1. Build de producción: `npm run build`
2. Desplegar carpeta `dist/` en servicio estático

### Opción 2: Render

**Backend:**
```yaml
# render.yaml
services:
  - type: web
    name: aquavisor-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: PORT
        value: 4000
```

**Frontend:**
```yaml
  - type: web
    name: aquavisor-frontend
    env: static
    buildCommand: npm run build
    staticPublishPath: ./dist
```

### Opción 3: VPS (DigitalOcean, Linode, etc.)

**Configurar PM2:**
```bash
npm install -g pm2

# Backend
cd server
pm2 start index.js --name aquavisor-backend

# Simulador (opcional)
pm2 start simulator.js --name aquavisor-simulator

# Guardar configuración
pm2 save
pm2 startup
```

**Nginx Reverse Proxy:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### Consideraciones de Seguridad

> **Producción - Configurar CORS:**
```javascript
// server/index.js
app.use(cors({
  origin: ['https://tu-dominio.com'],
  credentials: true
}));
```

> **Añadir HTTPS:**
- Usar Let's Encrypt con Certbot
- O configurar en tu PaaS

> **Variables de entorno:**
- Nunca commitear archivos `.env`
- Usar secretos del PaaS

---

##  Resolución de Problemas

### Problema: Backend no inicia

**Error:** `Cannot find module 'express'`

**Solución:**
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

### Problema: Frontend no conecta con Backend

**Error:** `Network Error` o `ERR_CONNECTION_REFUSED`

**Verificar:**
1. Backend está corriendo en puerto 4000
2. Proxy configurado en `vite.config.js`
3. URL correcta en peticiones fetch

**Test:**
```bash
curl http://localhost:4000/api/health
```

### Problema: Simulador falla con "fetch is not defined"

**Causa:** Node.js < 18

**Solución 1:** Actualizar Node.js
```bash
node --version  # Debe ser >= 18
```

**Solución 2:** Instalar node-fetch
```bash
npm install node-fetch
```
```javascript
// simulator.js - agregar al inicio
const fetch = require('node-fetch');
```

### Problema: PDF no se genera

**Posibles causas:**
1. No existe la gráfica en el DOM
2. Problemas con html2canvas

**Verificar:**
```javascript
// Abrir consola del navegador y buscar:
const chartEl = document.getElementById('dashboard-chart');
console.log(chartEl); // Debe existir
```

**Solución:** Ir primero al Centro de Comando antes de generar PDF

### Problema: Datos de sensores no persisten

**Verificar:**
1. Carpeta `server/data/` existe
2. Permisos de escritura
3. Guardado cada 5 segundos activo

**Test:**
```bash
# Enviar datos
curl -X POST http://localhost:4000/api/sensor-data \
-H "Content-Type: application/json" \
-d '{"sensor_id":"TEST","caudal_min":10,"total_acumulado":50,"hora":"2025-12-02T23:00:00"}'

# Verificar archivo
cat server/data/sensors.json
```

---

##  Mejoras Futuras

### Alta Prioridad

1. **Autenticación y Autorización**
   - JWT para API
   - Roles de usuario (admin, viewer)
   - API keys para ESP32

2. **WebSockets en tiempo real**
   - Reemplazar polling por Socket.io
   - Notificaciones push de alertas
   - Reducir latencia

3. **Tests Automatizados**
   - Jest + Supertest para backend
   - React Testing Library para frontend
   - CI/CD con GitHub Actions

### Media Prioridad

4. **Dashboard Mejorado**
   - Filtros por rango de fechas
   - Comparación entre sensores
   - Exportar todo el historial

5. **Gestión de Sensores**
   - CRUD completo de sensores
   - Configuración de umbrales por sensor
   - Calibración remota

6. **Notificaciones**
   - Email/SMS en alertas críticas
   - Integración con Telegram/WhatsApp
   - Webhook configurable

### Baja Prioridad

7. **Optimizaciones**
   - Caché de datos frecuentes
   - Compresión gzip
   - Lazy loading de componentes

8. **Analytics**
   - Estadísticas de uso
   - Predicciones con ML
   - Detección de anomalías

---

## 📚 Documentación Adicional

### Historial de Mejoras y Correcciones

Para conocer el historial completo de todas las mejoras, correcciones y optimizaciones implementadas en el proyecto, consulta:

📖 **[MEJORAS-Y-CORRECCIONES.md](./MEJORAS-Y-CORRECCIONES.md)**

Este documento incluye:
- Análisis detallado de problemas encontrados
- Soluciones implementadas con ejemplos de código
- Mejores prácticas establecidas
- Métricas de mejora y validación
- Guía de referencia para futuras implementaciones

### Otros Recursos

- **README.md** - Introducción rápida al proyecto
- **IMPLEMENTATION.md** (este documento) - Guía completa de implementación
- **MEJORAS-Y-CORRECCIONES.md** - Historial de mejoras y cambios

---

**Última actualización:** Diciembre 2025  
**Versión del documento:** 1.0.0
