#  Documentación: Control de Válvulas desde ESP32

##  Interfaz de Control de Válvula

![Interfaz de Control de Válvula](./images/valve-control-interface.png)

La interfaz web de AquaVisor incluye una pantalla dedicada de control de válvula ubicada en el menú lateral entre "Alertas Críticas" y "Configuración".

###  Funcionalidad de la Interfaz Web

> [!IMPORTANT]
> **Control de la Válvula Física**: El control real de la válvula física (apertura/cierre) **SOLO funciona cuando el ESP32 está conectado** y ejecutando el código de control. La interfaz web actúa como centro de comando, pero necesita que el ESP32 esté encendido y conectado a la red para controlar la válvula solenoide.

#### ✅ Sin ESP32 Conectado (Solo Interfaz Web)
La interfaz web **SÍ permite**:
- ✅ Visualizar el estado actual de la válvula
- ✅ Registrar comandos de apertura/cierre
- ✅ Ver historial de actividad reciente
- ✅ Observar métricas (datos previos o simulados)
- ✅ Programar horarios futuros

**Pero NO puede**:
- ❌ Abrir/cerrar la válvula física real
- ❌ Actualizar métricas en tiempo real desde sensores

#### ✅ Con ESP32 Conectado (Control Físico Completo)
Cuando el ESP32 está conectado y ejecutando el código:
- ✅ **Válvula física responde** a comandos de apertura/cierre
- ✅ **Métricas en tiempo real** desde sensores (flujo, presión)
- ✅ **Ejecución automática** de programaciones horarias
- ✅ **Feedback inmediato** del estado real de la válvula
- ✅ **Sincronización** entre interfaz web y hardware físico

---

##  Protocolo de Comunicación

El ESP32 puede **controlar válvulas** y **recibir comandos** del servidor AquaVisor mediante HTTP.

---

## Flujo de Control

```
┌──────────┐      HTTP GET      ┌──────────┐      Control      ┌─────────┐
│ ESP32    │ ──────────────────> │ Servidor │ ───────────────> │ Válvula │
│          │ <────────────────── │          │ <─────────────── │ Física  │
└──────────┘    Estado/Comando   └──────────┘    Feedback      └─────────┘
```

---

##  1. Recibir Comandos (ESP32 consulta al servidor)

### Endpoint: `GET /api/valve/status`

El ESP32 debe consultar periódicamente (cada 1-5 segundos) el estado de la válvula.

### Código Arduino/ESP32:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuración WiFi
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_PASSWORD";

// Servidor
const char* serverIP = "192.168.1.100"; // IP de tu servidor
const int serverPort = 4000;

// Pin de control de válvula (relay)
const int VALVE_PIN = 2; // GPIO2 (ajusta según tu hardware)

String lastStatus = "closed";

void setup() {
  Serial.begin(115200);
  pinMode(VALVE_PIN, OUTPUT);
  digitalWrite(VALVE_PIN, LOW); // Válvula cerrada por defecto
  
  // Conectar a WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado a WiFi!");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  checkValveStatus();
  delay(2000); // Consultar cada 2 segundos
}

void checkValveStatus() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // URL completa
    String url = String("http://") + serverIP + ":" + serverPort + "/api/valve/status";
    http.begin(url);
    
    int httpCode = http.GET();
    
    if (httpCode == 200) {
      String payload = http.getString();
      
      // Parsear JSON
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        String status = doc["status"].as<String>();
        float flowRate = doc["flowRate"];
        float pressure = doc["pressure"];
        
        // Si el estado cambió, actualizar válvula
        if (status != lastStatus) {
          Serial.println("Estado cambió de " + lastStatus + " a " + status);
          
          if (status == "open") {
            openValve();
          } else {
            closeValve();
          }
          
          lastStatus = status;
        }
        
        Serial.print("Estado: ");
        Serial.print(status);
        Serial.print(" | Flujo: ");
        Serial.print(flowRate);
        Serial.print(" | Presión: ");
        Serial.println(pressure);
      }
    } else {
      Serial.print("Error HTTP: ");
      Serial.println(httpCode);
    }
    
    http.end();
  }
}

void openValve() {
  digitalWrite(VALVE_PIN, HIGH); // Activar relay
  Serial.println("✅ VÁLVULA ABIERTA");
  
  // Opcional: enviar confirmación al servidor
  sendValveFeedback("open");
}

void closeValve() {
  digitalWrite(VALVE_PIN, LOW); // Desactivar relay
  Serial.println("❌ VÁLVULA CERRADA");
  
  // Opcional: enviar confirmación al servidor
  sendValveFeedback("closed");
}

void sendValveFeedback(String action) {
  // Opcional: confirmar al servidor que la acción se completó
  HTTPClient http;
  String url = String("http://") + serverIP + ":" + serverPort + "/api/valve/feedback";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"action\":\"" + action + "\",\"timestamp\":\"" + String(millis()) + "\"}";
  int httpCode = http.POST(payload);
  
  http.end();
}
```

---

##  2. Respuesta del Servidor

### Formato JSON:

```json
{
  "success": true,
  "status": "open",
  "flowRate": 85.3,
  "pressure": 115,
  "lastUpdate": "2025-12-03T19:30:00.000Z"
}
```

### Campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | boolean | Indica si la petición fue exitosa |
| `status` | string | Estado de la válvula: `"open"` o `"closed"` |
| `flowRate` | number | Flujo actual en L/s |
| `pressure` | number | Presión actual en PSI |
| `lastUpdate` | string | Timestamp de última actualización |

---

##  3. Conexión Física (Hardware)

### Esquema Básico:

```
ESP32           Relay          Válvula Solenoide
                               (12V/24V)
GPIO2 ─────────┐
               │
GND ───────────┼────> Relay ───────> Válvula
               │      Control        Eléctrica
3.3V/5V ───────┘
```

### Componentes Necesarios:

1. **Módulo Relay** (5V o 3.3V compatible con ESP32)
   - Entrada: GPIO del ESP32
   - Salida: Contacto para válvula solenoide

2. **Válvula Solenoide** (12V o 24V)
   - Normalmente cerrada (NC) - recomendado para seguridad
   - Alimentación independiente del ESP32

3. **Fuente de Alimentación**
   - 5V para ESP32
   - 12V/24V para válvula solenoide

### Código de Pines (Ajustar según tu hardware):

```cpp
// Pines de control
const int VALVE_PIN = 2;       // GPIO2 para válvula principal
const int FLOW_SENSOR_PIN = 4;  // GPIO4 para sensor de flujo
const int PRESSURE_PIN = 34;    // GPIO34 (ADC) para sensor de presión
```

---

##  4. Programación de Horarios

Las programaciones se ejecutan automáticamente en el servidor. El ESP32 solo necesita consultar el estado y obedecer.

### Ejemplo de Programación:

```javascript
// Desde la interfaz web:
{
  "action": "open",
  "time": "06:00",
  "days": [0, 1, 2, 3, 4] // Lunes a Viernes
}
```

El servidor automáticamente enviará el comando `"open"` a las 6:00 AM de Lunes a Viernes.

---

##  5. Envío de Métricas al Servidor (Opcional)

Si tu ESP32 tiene sensores de flujo/presión, puedes enviar los valores reales:

### Endpoint: `POST /api/valve/metrics`

```cpp
void sendMetrics(float flow, float pressure) {
  HTTPClient http;
  String url = String("http://") + serverIP + ":" + serverPort + "/api/valve/metrics";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Crear JSON
  StaticJsonDocument<256> doc;
  doc["flowRate"] = flow;
  doc["pressure"] = pressure;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  http.end();
}

// En loop():
if (millis() - lastMetricsSent > 5000) { // Cada 5 segundos
  float flow = readFlowSensor();
  float pressure = readPressureSensor();
  sendMetrics(flow, pressure);
  lastMetricsSent = millis();
}
```

---

##  6. Seguridad y Manejo de Errores

### Timeout de Conexión:

```cpp
void checkValveStatus() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.setTimeout(5000); // 5 segundos de timeout
    // ... resto del código
  } else {
    // WiFi desconectado - mantener válvula en estado seguro
    closeValve(); // Cerrar por seguridad
    Serial.println("⚠️ WiFi desconectado - válvula cerrada por seguridad");
  }
}
```

### Reconexión Automática:

```cpp
void loop() {
  // Verificar WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Reconectando WiFi...");
    WiFi.reconnect();
    delay(1000);
    return;
  }
  
  checkValveStatus();
  delay(2000);
}
```

---

##  7. Pruebas

### 1. Probar Conexión:

```cpp
void testConnection() {
  HTTPClient http;
  String url = String("http://") + serverIP + ":" + serverPort + "/api/health";
  http.begin(url);
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    Serial.println("✅ Conexión al servidor OK");
  } else {
    Serial.println("❌ Error de conexión");
  }
  http.end();
}
```

### 2. Probar Desde Web:

1. Abre `http://TU_SERVIDOR:4000/config`
2. Click en "Abrir" o "Cerrar"
3. Observa el Serial Monitor del ESP32
4. Verifica que el relay cambia de estado

---

##  Checklist de Implementación

- [ ] ESP32 conectado a WiFi
- [ ] IP del servidor configurada correctamente
- [ ] Relay conectado al GPIO correcto
- [ ] Válvula solenoide con alimentación adecuada
- [ ] Código cargado y funcionando
- [ ] Prueba manual desde web interface
- [ ] Verificar estado en Serial Monitor
- [ ] Confirmar que relay activa/desactiva
- [ ] Probar recuperación ante pérdida de WiFi
- [ ] (Opcional) Configurar programaciones de horario

---

##  Troubleshooting

### Problema: ESP32 no se conecta al servidor

**Solución:**
1. Verificar IP del servidor con `ipconfig` (Windows) o `ifconfig` (Mac/Linux)
2. Asegurar que ESP32 y servidor están en la misma red
3. Verificar que el puerto 4000 está abierto (firewall)

### Problema: Válvula no responde

**Solución:**
1. Verificar conexión del relay (LED indicador)
2. Medir voltaje en salida del relay con multímetro
3. Verificar alimentación de la válvula solenoide
4. Probar relay manualmente (sin ESP32)

### Problema: Estado inconsistente

**Solución:**
1. Reducir intervalo de consulta (de 5s a 2s)
2. Añadir logs detallados en Serial Monitor
3. Verificar latencia de red (ping al servidor)

---

##  Librerías Necesarias

Instalar en Arduino IDE:

1. **WiFi** (incluida en ESP32 Core)
2. **HTTPClient** (incluida en ESP32 Core)
3. **ArduinoJson** v6.x
   ```
   Sketch > Include Library > Manage Libraries
   Buscar: "ArduinoJson"
   Instalar versión 6.x
   ```

---

##  Ejemplo Completo Funcional

Ver archivo: `esp32_valve_control_complete.ino` en el repositorio para código completo probado y listo para usar.

---

**¡Listo!** Con esta configuración tu ESP32 puede controlar válvulas en tiempo real desde la interfaz web de AquaVisor. 🚀
