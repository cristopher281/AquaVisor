# 🔧 Guía de Migración: De ESP32 a PCB Personalizada

**Proyecto:** AquaVisor  
**Versión:** 2.0.0  
**Última Actualización:** Diciembre 2025  
**Objetivo:** Documentar el proceso completo para migrar el sistema de monitoreo desde placas ESP32 de desarrollo a una PCB personalizada de producción.

---

## 📑 Índice

1. [Introducción](#-introducción)
2. [Análisis del Sistema Actual](#-análisis-del-sistema-actual)
3. [Ventajas de una PCB Personalizada](#-ventajas-de-una-pcb-personalizada)
4. [Aspectos a Considerar](#-aspectos-a-considerar)
5. [Diseño de la PCB](#-diseño-de-la-pcb)
6. [Componentes Necesarios](#-componentes-necesarios)
7. [Esquemático de la PCB](#-esquemático-de-la-pcb)
8. [Layout y Ruteo](#-layout-y-ruteo)
9. [Fabricación](#-fabricación)
10. [Programación y Migración del Firmware](#-programación-y-migración-del-firmware)
11. [Pruebas y Validación](#-pruebas-y-validación)
12. [Integración con el Sistema AquaVisor](#-integración-con-el-sistema-aquavisor)
13. [Costos y Producción](#-costos-y-producción)
14. [Troubleshooting](#-troubleshooting)
15. [Recursos Adicionales](#-recursos-adicionales)

---

## 🌟 Introducción

Esta guía proporciona un roadmap completo para transformar el sistema AquaVisor de prototipos basados en módulos ESP32 comerciales a un diseño de PCB personalizado optimizado para producción.

### ¿Por qué hacer esta migración?

El ESP32 en formato de desarrollo (DevKit, NodeMCU, etc.) es excelente para prototipos, pero presenta limitaciones para productos finales:

- **Tamaño:** Los módulos de desarrollo son más grandes que lo necesario
- **Costo:** Incluyen componentes innecesarios (USB, reguladores extra, etc.)
- **Durabilidad:** No están optimizados para ambientes industriales/húmedos
- **Profesionalismo:** Dificultan la presentación del producto final

Una PCB personalizada resuelve todos estos problemas.

---

## 🔍 Análisis del Sistema Actual

### Configuración Actual (ESP32 DevKit)

Según la documentación existente ([ESP32_VALVE_CONTROL.md](./ESP32_VALVE_CONTROL.md)), el sistema actual utiliza:

#### Hardware Principal
- **Microcontrolador:** ESP32 DevKit (30 pines)
- **Conectividad:** WiFi 2.4GHz
- **Alimentación:** 5V vía USB o VIN pin
- **Pines Usados:**
  - `GPIO2` → Control de válvula (Relay)
  - `GPIO4` → Sensor de flujo
  - `GPIO34` (ADC) → Sensor de presión

#### Flujo de Datos
```
ESP32 → WiFi → Servidor Backend (Node.js) → Frontend (React)
```

#### Comunicación
- **Protocolo:** HTTP/HTTPS
- **Formato:** JSON
- **Endpoints principales:**
  - POST `/api/sensor-data` (envío de métricas)
  - GET `/api/valve/status` (recepción de comandos)

### Funciones Críticas que Debe Mantener la PCB

> [!IMPORTANT]
> La PCB personalizada **DEBE** preservar estas funcionalidades:

1. ✅ **Conectividad WiFi** para comunicación con el servidor
2. ✅ **GPIO suficientes** para sensores y actuadores
3. ✅ **ADC** para lectura de sensores analógicos
4. ✅ **Alimentación estable** 3.3V para el ESP32
5. ✅ **Protección de entrada** para ambientes industriales
6. ✅ **Interfaz de programación** para actualizaciones de firmware

---

## 🚀 Ventajas de una PCB Personalizada

### 1. Reducción de Tamaño
- **DevKit ESP32:** ~55mm x 28mm
- **PCB Personalizada:** ~40mm x 25mm (o menor)
- **Ahorro:** ~40% de espacio

### 2. Reducción de Costos (Producción en Escala)

| Componente | Precio DevKit | Precio PCB Custom | Ahorro |
|------------|---------------|-------------------|--------|
| Módulo ESP32 | $8-12 USD | $2-3 USD (ESP32-WROOM-32) | 70% |
| Regulador integrado | Incluido | $0.30 USD | - |
| PCB fabricada | - | $0.50-1.00 USD (100 unidades) | - |
| **Total por unidad** | **~$10** | **~$4-5** | **50%** |

> Costos estimados para producción de 100-500 unidades

### 3. Confiabilidad
- ✅ Conexiones soldadas (vs. headers)
- ✅ Protecciones integradas
- ✅ Menor interferencia electromagnética
- ✅ Resistencia a vibraciones

### 4. Profesionalismo
- ✅ Logo personalizado en PCB
- ✅ Tamaño compacto
- ✅ Enclosure/caja diseñada específicamente
- ✅ Certificaciones más fáciles (CE, FCC)

---

## ⚠️ Aspectos a Considerar

### Antes de Comenzar

> [!WARNING]
> **Este proceso requiere conocimientos técnicos avanzados:**
> - Diseño electrónico (esquemáticos, PCB layout)
> - Software de diseño PCB (KiCad, Altium, Eagle)
> - Programación de microcontroladores
> - Soldadura SMD (Surface Mount Device)

### Decisiones Clave

#### 1. Módulo ESP32 vs. Chip Directo

| Opción | Complejidad | Costo | Certificaciones | Recomendado para |
|--------|------------|-------|-----------------|------------------|
| **Módulo ESP32-WROOM-32** | Baja | ~$3 | Ya certificado | Primeros 100-1000 unidades |
| **Chip ESP32-D0WD** | Alta | ~$1.5 | Requiere recertificación | Producción masiva (10,000+) |

**Recomendación:** Usar **ESP32-WROOM-32** (módulo) para facilitar el diseño inicial.

#### 2. Número de Capas de la PCB

- **2 capas:** Más económica, suficiente para la mayoría de casos
- **4 capas:** Mejor manejo de ruido, necesaria si hay RF adicional

**Recomendación:** Comenzar con **2 capas**.

#### 3. Método de Programación

- **USB-Serial integrado:** Cómodo pero añade costo
- **Header para programador externo:** Más económico, requiere hardware adicional

**Recomendación:** Header UART + adaptador USB-Serial externo para producción.

---

## 🎨 Diseño de la PCB

### Software Recomendado

#### KiCad (Recomendado - GRATIS)
- ✅ Open source
- ✅ Potente y completo
- ✅ Gran comunidad
- ✅ Librería de componentes amplia

**Alternativas:**
- **EasyEDA:** Basado en web, integrado con JLCPCB
- **Altium Designer:** Profesional pero costoso (~$500/año)
- **Eagle:** Bueno, pero de pago (Autodesk)

### Flujo de Trabajo

```mermaid
graph LR
    A[Esquemático] --> B[Asignación de footprints]
    B --> C[Layout PCB]
    C --> D[Verificación DRC]
    D --> E[Generación de Gerbers]
    E --> F[Envío a fabricante]
    F --> G[Recepción y ensamblaje]
    G --> H[Pruebas]
```

---

## 🧩 Componentes Necesarios

### Lista Completa de Componentes (BOM - Bill of Materials)

#### 1. Microcontrolador Principal

| Componente | Cantidad | Especificación | Precio Unitario | Notas |
|------------|----------|----------------|-----------------|-------|
| ESP32-WROOM-32D | 1 | 4MB Flash, WiFi/BT | $2.80 | Módulo certificado |

#### 2. Alimentación

| Componente | Cantidad | Especificación | Precio | Notas |
|------------|----------|----------------|--------|-------|
| Regulador 3.3V | 1 | AMS1117-3.3, SOT-223 | $0.15 | 1A max |
| Capacitor 10µF | 2 | 0805, Cerámico | $0.05 | Filtrado entrada/salida |
| Capacitor 100nF | 3 | 0805, Cerámico | $0.02 | Desacople |
| Conector DC Jack | 1 | 5.5mm x 2.1mm | $0.30 | Alimentación externa |
| Diodo protección | 1 | 1N4007 o equivalente | $0.05 | Protección polaridad inversa |

#### 3. Programación y Debug

| Componente | Cantidad | Especificación | Precio | Notas |
|------------|----------|----------------|--------|-------|
| Header 6 pines | 1 | 2.54mm pitch | $0.10 | UART + GND + 3V3 |
| Botón RESET | 1 | Táctil 6x6mm | $0.08 | Reset manual |
| Botón BOOT | 1 | Táctil 6x6mm | $0.08 | Modo programación |
| Resistor 10kΩ | 2 | 0805 | $0.01 | Pull-up RESET/BOOT |

#### 4. Conectores para Sensores

| Componente | Cantidad | Especificación | Precio | Notas |
|------------|----------|----------------|--------|-------|
| Terminal block 2 pines | 1 | 5.08mm | $0.25 | Sensor de flujo |
| Terminal block 3 pines | 1 | 5.08mm | $0.35 | Sensor de presión |
| Terminal block 2 pines | 1 | 5.08mm | $0.25 | Control de válvula/relay |

#### 5. Indicadores

| Componente | Cantidad | Especificación | Precio | Notas |
|------------|----------|----------------|--------|-------|
| LED Power (Verde) | 1 | 0805 | $0.03 | Indicador alimentación |
| LED WiFi (Azul) | 1 | 0805 | $0.03 | Estado conexión |
| LED Status (Rojo) | 1 | 0805 | $0.03 | Estado general |
| Resistor 330Ω | 3 | 0805 | $0.01 | Limitador corriente LED |

#### 6. Protecciones

| Componente | Cantidad | Especificación | Precio | Notas |
|------------|----------|----------------|--------|-------|
| TVS Diode | 2 | SMAJ5.0A | $0.15 | Protección sobretensión |
| Fusible reseteable | 1 | 500mA, 0805 | $0.20 | Protección sobrecorriente |

### Costo Total Estimado (BOM)

- **Componentes:** ~$5.50 USD
- **PCB (fabricación 100 unidades):** ~$1.00 USD
- **Total por unidad:** **~$6.50 USD**

> **Comparación:** ESP32 DevKit completo = ~$10 USD  
> **Ahorro:** 35% por unidad

---

## 📐 Esquemático de la PCB

### Esquemático Principal

El esquemático debe incluir los siguientes bloques:

#### Bloque 1: Alimentación

```
DC Jack (5-12V) → Diodo Protección → AMS1117-3.3 → ESP32-WROOM-32
                                    ↓
                              Capacitores de filtrado
```

**Notas importantes:**
- Entrada: 5-12V DC
- Regulador debe soportar mínimo 800mA
- Capacitores de desacople cerca del pin de alimentación del ESP32

#### Bloque 2: ESP32 Core

```
        ESP32-WROOM-32D
    ┌─────────────────────┐
    │ EN (pull-up 10kΩ)   │←─── Botón RESET → GND
    │ GPIO0 (pull-up 10kΩ)│←─── Botón BOOT → GND
    │                     │
    │ GPIO2  ─────────────┼───→ Relay Control
    │ GPIO4  ─────────────┼───→ Flow Sensor
    │ GPIO34 ─────────────┼───→ Pressure Sensor (ADC)
    │                     │
    │ TXD    ─────────────┼───→ UART Header
    │ RXD    ─────────────┼───→ UART Header
    │ GND    ─────────────┼───→ UART Header
    │ 3V3    ─────────────┼───→ UART Header
    └─────────────────────┘
```

#### Bloque 3: Sensores y Actuadores

**Salida para Relay (Válvula):**
```
GPIO2 → Resistor 1kΩ → Transistor NPN (2N2222) → Relay Coil
                       ↓
                      Diodo Flyback (1N4007)
```

**Entrada Sensor de Flujo:**
```
Terminal Block → Resistor Pull-up 10kΩ → GPIO4
```

**Entrada Sensor de Presión (Analógico):**
```
Terminal Block → Divisor de voltaje (si es necesario) → GPIO34 (ADC)
```

#### Bloque 4: LEDs Indicadores

```
3V3 → LED Power (Verde) → Resistor 330Ω → GND
GPIO21 → LED WiFi (Azul) → Resistor 330Ω → GND
GPIO22 → LED Status (Rojo) → Resistor 330Ω → GND
```

### Diagrama Completo Simplificado

```
┌─────────────────────────────────────────────────────┐
│                  PCB AquaVisor v2.0                 │
│                                                     │
│  ┌──────────┐                                       │
│  │ DC Jack  │→ [Regulador 3.3V] → [ESP32-WROOM-32]  │
│  └──────────┘                          │            │
│                                        │            │
│  [UART Header] ←───────────────────────┤            │
│  [Reset/Boot Buttons]                  │            │
│                                        │            │
│  [Terminal: Valve]     ←───────────────┤            │
│  [Terminal: Flow]      ←───────────────┤            │
│  [Terminal: Pressure]  ←───────────────┤            │
│                                        │            │
│  [LEDs: Power/WiFi/Status] ←───────────┘            │
└─────────────────────────────────────────────────────┘
```

### Herramientas de Diseño

**Para KiCad:**

1. **Descargar librerías oficiales:**
   - ESP32-WROOM-32: [Espressif KiCad Library](https://github.com/espressif/kicad-libraries)

2. **Crear símbolos personalizados:**
   - Terminal blocks
   - Conectores específicos

3. **Generar netlist y pasar a PCB Layout**

---

## 🖼️ Layout y Ruteo

### Consideraciones de Diseño

#### 1. Tamaño de la PCB

**Recomendación:** 50mm x 40mm (tamaño estándar económico)

#### 2. Capas

- **TOP:** Componentes y trazas principales
- **BOTTOM:** Plano de GND y trazas secundarias

#### 3. Reglas de Diseño (Design Rules)

| Parámetro | Valor Mínimo | Recomendado |
|-----------|--------------|-------------|
| Ancho de pista (señal) | 0.15mm | 0.25mm |
| Ancho de pista (alimentación) | 0.3mm | 0.5mm |
| Clearance | 0.15mm | 0.2mm |
| Via diameter | 0.6mm | 0.8mm |
| Via drill | 0.3mm | 0.4mm |

#### 4. Zonificación

```
┌─────────────────────────────┐
│  ZONA RF (ESP32 + Antena)   │  ← Mantener libre de trazas
├─────────────────────────────┤
│  ALIMENTACIÓN               │  ← Capacitores cerca del ESP32
├─────────────────────────────┤
│  INTERFAZ SENSORES          │  ← Terminal blocks en borde
├─────────────────────────────┤
│  PROGRAMACIÓN (Header UART) │  ← En borde para fácil acceso
└─────────────────────────────┘
```

#### 5. Antena WiFi

> [!CAUTION]
> **CRÍTICO:** La antena del ESP32-WROOM-32 DEBE sobresalir del borde de la PCB

**Guidelines:**
- ✅ Ningún plano de GND debajo de la antena
- ✅ Keepout area de 15mm alrededor
- ✅ Dejar sobresalir 5-10mm del borde
- ✅ No colocar componentes metálicos cerca

### Plano de GND

- **Capa BOTTOM:** Plano GND completo
- **Vías de GND:** Múltiples vías conectando componentes al plano
- **Stitching vias:** Vías adicionales cada 10mm para reducir impedancia

### Ruteo de Trazas

#### Alimentación (3.3V)
- **Ancho:** 0.5mm mínimo
- **Prioridad:** Primera en rutearse
- **Descople:** Capacitores 100nF cerca de CADA IC

#### Señales Digitales
- **Ancho:** 0.25mm
- **Longitud:** Mínima posible
- **GPIO → Conectores:** Rutas directas

#### Señales Analógicas (ADC)
- **Ancho:** 0.3mm
- **Separación:** Alejadas de señales digitales rápidas
- **Filtrado:** Capacitor 100nF cerca del pin ADC

---

## 🏭 Fabricación

### Fabricantes Recomendados

#### Opción 1: JLCPCB (China) - Más Económico

**Ventajas:**
- ✅ $2 USD por 5 PCBs (10x10cm)
- ✅ Servicio de ensamblaje SMD disponible
- ✅ Envío internacional

**Tiempos:**
- Fabricación: 2-3 días
- Envío a Latinoamérica: 7-15 días

**URL:** [https://jlcpcb.com](https://jlcpcb.com)

#### Opción 2: PCBWay (China) - Mejor Calidad

**Ventajas:**
- ✅ Mayor control de calidad
- ✅ Mejor acabado
- ✅ Opciones de color variadas

**Costos:** ~$5 USD por 10 PCBs

**URL:** [https://www.pcbway.com](https://www.pcbway.com)

#### Opción 3: OSH Park (USA) - Local pero más caro

**Ventajas:**
- ✅ Calidad excepcional
- ✅ PCB morada característica
- ✅ Servicio al cliente en inglés

**Costos:** ~$1/cm² (más caro que opciones chinas)

**URL:** [https://oshpark.com](https://oshpark.com)

### Proceso de Orden

#### 1. Preparar Archivos Gerber

En KiCad:
```
File → Plot → 
  ☑ F.Cu (Top copper layer)
  ☑ B.Cu (Bottom copper layer)  
  ☑ F.SilkS (Top silkscreen)
  ☑ B.SilkS (Bottom silkscreen)
  ☑ F.Mask (Top solder mask)
  ☑ B.Mask (Bottom solder mask)
  ☑ Edge.Cuts (Board outline)

Generate Drill Files
```

#### 2. Comprimir en ZIP

Crear archivo `AquaVisor_PCB_v1.0.zip` con todos los Gerbers

#### 3. Subir a Fabricante

- Seleccionar opciones:
  - **Layers:** 2
  - **Dimensions:** (auto-detectadas)
  - **Quantity:** 10 (mínimo práctico)
  - **Thickness:** 1.6mm
  - **Color:** Verde (más económico) o Negro (más profesional)
  - **Surface Finish:** HASL (económico) o ENIG (premium)

#### 4. Revisión y Pago

- Verificar preview 3D generado
- Confirmar todas las especificaciones
- Proceder al pago

### Especificaciones Técnicas Recomendadas

```
PCB Specifications:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Layers:              2
Material:            FR-4
Thickness:           1.6mm
Copper Weight:       1 oz (35µm)
Minimum Track Width: 0.15mm
Minimum Spacing:     0.15mm
Solder Mask:         Green / Black
Silkscreen:          White
Surface Finish:      HASL / ENIG
```

---

## 💻 Programación y Migración del Firmware

### Hardware de Programación

#### Opción 1: Adaptador USB-Serial (RECOMENDADO)

**Componente:** CP2102 o FT232RL USB-Serial  
**Costo:** ~$3-5 USD  
**Conexión:**

```
USB-Serial     →    PCB Header
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3.3V           →    3V3
GND            →    GND
TX             →    RXD (ESP32)
RX             →    TXD (ESP32)
DTR (opcional) →    EN (auto-reset)
RTS (opcional) →    GPIO0 (auto-program)
```

#### Opción 2: ESP-Prog (Profesional)

**Componente:** ESP-Prog oficial de Espressif  
**Costo:** ~$15 USD  
**Ventajas:**
- ✅ Auto-reset y auto-program
- ✅ JTAG debugging
- ✅ Alimentación integrada

### Configuración del Entorno

#### Arduino IDE

**1. Instalar soporte ESP32:**

```
File → Preferences → Additional Boards Manager URLs:
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

**2. Instalar board:**
```
Tools → Board → Boards Manager → "ESP32" → Install
```

**3. Seleccionar board:**
```
Tools → Board → ESP32 Arduino → ESP32 Dev Module
```

**4. Configuraciones importantes:**

| Setting | Valor |
|---------|-------|
| Flash Frequency | 80MHz |
| Flash Mode | QIO |
| Flash Size | 4MB |
| Partition Scheme | Default 4MB with spiffs |
| Upload Speed | 921600 |
| Core Debug Level | None (producción) |

### Migración del Código

> [!NOTE]
> El código actual funcionará SIN cambios si usas los mismos GPIOs

#### Verificar Pinout

**Código actual** (de ESP32_VALVE_CONTROL.md):
```cpp
const int VALVE_PIN = 2;       // GPIO2
const int FLOW_SENSOR_PIN = 4;  // GPIO4
const int PRESSURE_PIN = 34;    // GPIO34
```

**PCB personalizada** debe mantener estos mismos GPIOs o actualizar el código.

#### Añadir LEDs de Estado

```cpp
// Añadir al código existente
const int LED_POWER = 21;   // LED Verde (siempre ON)
const int LED_WIFI = 22;    // LED Azul (WiFi status)
const int LED_STATUS = 23;  // LED Rojo (errores)

void setup() {
  // ... código existente ...
  
  pinMode(LED_POWER, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_STATUS, OUTPUT);
  
  digitalWrite(LED_POWER, HIGH); // Power ON
}

void loop() {
  // Indicar conexión WiFi
  digitalWrite(LED_WIFI, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
  
  // ... resto del código ...
}
```

### Proceso de Programación

#### Primera Vez (Nueva PCB)

1. **Conectar USB-Serial a header UART**
2. **Mantener presionado botón BOOT**
3. **Presionar botón RESET brevemente**
4. **Soltar botón BOOT**
5. **En Arduino IDE: Sketch → Upload**

#### Después (OTA Updates)

**Código OTA básico:**

```cpp
#include <ArduinoOTA.h>

void setup() {
  // ... código WiFi existente ...
  
  // Configurar OTA
  ArduinoOTA.setHostname("aquavisor-sensor-001");
  ArduinoOTA.setPassword("admin"); // Cambiar en producción
  
  ArduinoOTA.onStart([]() {
    Serial.println("OTA: Iniciando actualización");
  });
  
  ArduinoOTA.onEnd([]() {
    Serial.println("OTA: Actualización completa");
  });
  
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("OTA Error[%u]: ", error);
  });
  
  ArduinoOTA.begin();
  Serial.println("OTA: Listo");
}

void loop() {
  ArduinoOTA.handle(); // Añadir esto
  
  // ... resto del código existente ...
}
```

**Actualizar remotamente:**
```
Tools → Port → aquavisor-sensor-001 (network)
Sketch → Upload
```

---

## 🧪 Pruebas y Validación

### Checklist de Pruebas

#### 1. Inspección Visual

- [ ] Verificar polaridad de componentes
- [ ] Buscar puentes de soldadura (shorts)
- [ ] Verificar orientación del ESP32-WROOM-32
- [ ] Revisar calidad de soldaduras
- [ ] Comprobar que no hay componentes faltantes

#### 2. Pruebas de Continuidad (Multímetro)

- [ ] Verificar conexión GND
- [ ] Verificar conexión 3.3V
- [ ] Verificar NO hay corto entre 3.3V y GND (resistencia > 1kΩ)
- [ ] Verificar pistas críticas (UART, GPIO)

#### 3. Prueba de Alimentación

```
Paso 1: Sin ESP32 montado
       ├─ Conectar fuente 5V
       ├─ Medir salida regulador = 3.3V ± 0.1V
       └─ Verificar corriente < 50mA (sin ESP32)

Paso 2: Con ESP32 montado
       ├─ Conectar fuente 5V
       ├─ Medir salida regulador = 3.3V ± 0.1V
       ├─ Verificar corriente 80-150mA (ESP32 idle)
       └─ LED Power debe encender
```

#### 4. Prueba de Programación

- [ ] Conectar USB-Serial
- [ ] Cargar sketch de prueba (Blink)
- [ ] Verificar carga exitosa
- [ ] Verificar funcionamiento del LED

#### 5. Prueba de WiFi

**Código de prueba:**

```cpp
#include <WiFi.h>

const char* ssid = "TEST_WIFI";
const char* password = "password";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal: ");
  Serial.println(WiFi.RSSI());
}

void loop() {
  Serial.printf("RSSI: %d dBm\n", WiFi.RSSI());
  delay(2000);
}
```

**Criterios de aprobación:**
- ✅ Conexión exitosa en < 10 segundos
- ✅ RSSI > -70 dBm a 1 metro del router
- ✅ Conexión estable (no se desconecta)

#### 6. Prueba de GPIO

**Para cada GPIO usado:**

```cpp
// Test GPIO2 (Valve control)
pinMode(2, OUTPUT);
digitalWrite(2, HIGH);
delay(1000);
digitalWrite(2, LOW);
// Medir voltaje en terminal: debe ser 3.3V → 0V

// Test GPIO4 (Flow sensor input)
pinMode(4, INPUT);
int val = digitalRead(4);
// Simular señal externa

// Test GPIO34 (ADC)
int adc = analogRead(34);
Serial.println(adc); // 0-4095
```

#### 7. Prueba de Integración Completa

Cargar el firmware de AquaVisor completo y verificar:

- [ ] Conexión a WiFi exitosa
- [ ] Envío de datos al servidor (`/api/sensor-data`)
- [ ] Recepción de comandos del servidor (`/api/valve/status`)
- [ ] Control de válvula funcional
- [ ] Lectura de sensores correcta
- [ ] LEDs indicadores funcionando

---

## 🔗 Integración con el Sistema AquaVisor

### Cambios Necesarios en el Backend

**NO son necesarios cambios** si mantienes el mismo formato de datos.

El servidor actual acepta:

```json
{
  "sensor_id": "ESP32_001",
  "caudal_min": 12.5,
  "total_acumulado": 45.3,
  "hora": "2025-12-02T23:19:00"
}
```

### Identificación de Dispositivos

Para gestionar múltiples PCBs en producción:

#### Opción 1: ID por MAC Address

```cpp
void setup() {
  String mac = WiFi.macAddress();
  String sensor_id = "AQV_" + mac.substring(12); // Últimos 6 chars
  // sensor_id = "AQV_A1B2C3"
}
```

#### Opción 2: ID almacenado en EEPROM

```cpp
#include <EEPROM.h>

void setup() {
  EEPROM.begin(64);
  
  // Primera vez: escribir ID único
  // EEPROM.writeString(0, "AQV_001");
  // EEPROM.commit();
  
  String sensor_id = EEPROM.readString(0);
  if (sensor_id == "") {
    sensor_id = "AQV_DEFAULT";
  }
}
```

#### Opción 3: Provisioning por WiFi

**Modo AP inicial:**
1. PCB inicia como Access Point
2. Usuario se conecta vía WiFi
3. Interfaz web permite configurar:
   - Sensor ID
   - Credenciales WiFi
   - URL del servidor
4. Datos guardados en EEPROM
5. PCB reinicia y conecta normalmente

### Actualización OTA Masiva

Para actualizar múltiples dispositivos:

**Backend (nuevo endpoint):**

```javascript
// server/index.js
app.get('/api/firmware/version', (req, res) => {
  res.json({
    version: "2.0.0",
    url: "http://servidor.com/firmware/aquavisor_v2.0.0.bin",
    mandatory: false
  });
});
```

**Firmware:**

```cpp
#include <HTTPUpdate.h>

const String FIRMWARE_VERSION = "1.0.0";

void checkFirmwareUpdate() {
  HTTPClient http;
  http.begin("http://servidor.com/api/firmware/version");
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    // Parse JSON...
    
    if (newVersion > FIRMWARE_VERSION) {
      Serial.println("Nueva versión disponible!");
      
      t_httpUpdate_return ret = httpUpdate.update(client, firmwareURL);
      
      if (ret == HTTP_UPDATE_OK) {
        Serial.println("Actualización exitosa. Reiniciando...");
        ESP.restart();
      }
    }
  }
  http.end();
}
```

---

## 💰 Costos y Producción

### Análisis de Costos por Volumen

#### Pequeña Escala (10-50 unidades)

| Ítem | Costo Unitario | Total (50 uds) |
|------|----------------|----------------|
| PCB fabricada | $1.00 | $50 |
| Componentes (BOM) | $5.50 | $275 |
| Ensamblaje manual | $2.00 | $100 |
| **Total** | **$8.50** | **$425** |

#### Mediana Escala (100-500 unidades)

| Ítem | Costo Unitario | Total (500 uds) |
|------|----------------|-----------------|
| PCB fabricada | $0.80 | $400 |
| Componentes (BOM compra por volumen) | $4.50 | $2,250 |
| Ensamblaje SMD automatizado | $1.20 | $600 |
| **Total** | **$6.50** | **$3,250** |

**Ahorro:** 24% vs. pequeña escala

#### Gran Escala (1000+ unidades)

| Ítem | Costo Unitario | Total (1000 uds) |
|------|----------------|------------------|
| PCB fabricada | $0.50 | $500 |
| Componentes (bulk pricing) | $3.80 | $3,800 |
| Ensamblaje SMD + testing | $1.00 | $1,000 |
| **Total** | **$5.30** | **$5,300** |

**Ahorro:** 38% vs. pequeña escala

### ROI (Return on Investment)

**Comparación con ESP32 DevKit:**

| Producción | Costo DevKit | Costo PCB Custom | Ahorro Total |
|------------|--------------|------------------|--------------|
| 50 unidades | $500 ($10/ud) | $425 ($8.50/ud) | $75 (15%) |
| 500 unidades | $5,000 | $3,250 | $1,750 (35%) |
| 1000 unidades | $10,000 | $5,300 | $4,700 (47%) |

**Punto de equilibrio:** ~100 unidades (inversión inicial en diseño se recupera)

### Costos No Recurrentes (NRE - Non-Recurring Engineering)

| Actividad | Horas | Costo (si contratas) |
|-----------|-------|---------------------|
| Diseño esquemático | 8-16h | $400-800 |
| Layout PCB | 12-20h | $600-1000 |
| Revisión y testing | 4-8h | $200-400 |
| **Total NRE** | **24-44h** | **$1,200-2,200** |

> Si lo haces tú mismo: ~2-3 semanas de trabajo (asumiendo experiencia básica)

### Servicios de Ensamblaje (SMD Assembly)

#### JLCPCB SMD Assembly

**Ventajas:**
- ✅ Componentes básicos en stock
- ✅ Ensamblaje automático económico
- ✅ Integrado con orden de PCB

**Limitaciones:**
- ❌ No todos los componentes disponibles
- ❌ Setup fee + costo por unidad

**Costos aproximados:**
- Setup fee: $8 USD (one-time por diseño)
- Ensamblaje: $2-5 USD por unidad (dependiendo de componentes)

#### Ensamblaje Local (Recomendado para primeras pruebas)

**Ventajas:**
- ✅ Control total
- ✅ Sin setup fees
- ✅ Ideal para prototipos

**Equipamiento necesario:**
- Estación de soldadura (temperatura controlada)
- Pinzas de precisión
- Flux y soldadura (SAC305 libre de plomo)
- Lupa o microscopio

---

## 🔧 Troubleshooting

### Problema: PCB no enciende

**Diagnóstico:**

```
1. Medir voltaje de entrada
   ├─ 0V → Problema con fuente/conector
   └─ 5-12V → Continuar

2. Medir salida del regulador 3.3V
   ├─ 0V → Regulador defectuoso o corto circuito
   │      Acciones:
   │      ├─ Verificar orientación del regulador
   │      ├─ Buscar cortos con multímetro
   │      └─ Reemplazar regulador
   └─ 3.3V → Continuar

3. Medir voltaje en pin 3V3 del ESP32
   ├─ 0V → Pista cortada o soldadura fría
   └─ 3.3V → Problema con ESP32
              └─ Verificar soldadura de pines
```

### Problema: ESP32 no programa

**Diagnóstico:**

```
Error: "Failed to connect to ESP32"

Verificar:
1. ¿Botón BOOT presionado durante inicio de carga?
   └─ Método correcto listado en sección "Programación"

2. ¿Conexión UART correcta?
   ├─ TX del programador → RX del ESP32
   └─ RX del programador → TX del ESP32

3. ¿Velocidad de comunicación correcta?
   └─ Arduino IDE: Tools → Upload Speed → 115200 (reducir si falla)

4. ¿Driver USB-Serial instalado?
   ├─ CP2102 → https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
   └─ FT232RL → https://ftdichip.com/drivers/vcp-drivers/

5. ¿LED Power encendido?
   ├─ NO → Problema de alimentación
   └─ SÍ → Verificar EN pin (debe estar HIGH via pull-up)
```

### Problema: WiFi no conecta

**Diagnóstico:**

```
Serial Monitor muestra: "....."

1. Verificar keepout area de antena
   └─ ¿Hay plano GND debajo de la antena?
       └─ Sí → ERROR DE DISEÑO, necesitas nueva revisión de PCB

2. Test de alcance
   ├─ Acercar PCB a 50cm del router
   └─ ¿Conecta ahora?
       ├─ SÍ → Problema de alcance/antena
       └─ NO → Continuar

3. Modo de prueba (Access Point)
   Código test:
   ```cpp
   WiFi.softAP("TEST_ESP32", "");
   Serial.println(WiFi.softAPIP());
   ```
   └─ ¿Aparece red WiFi "TEST_ESP32"?
       ├─ SÍ → Módulo WiFi funcional, problema con credenciales
       └─ NO → Módulo WiFi defectuoso

4. Verificar credenciales
   ├─ SSID correcto (case-sensitive)
   ├─ Password correcto
   └─ Red 2.4GHz (ESP32 no soporta 5GHz)
```

### Problema: Alcance WiFi muy corto

**Causas comunes:**

1. **Antena bloqueada:**
   - Solución: Alejar componentes metálicos
   - Verificar que antena sobresale del borde

2. **Plano GND invasivo:**
   - Solución: Rediseñar PCB sin GND bajo antena

3. **Interferencia:**
   - Solución: Añadir capacitores de desacople adicionales

4. **Módulo ESP32 defectuoso:**
   - Test: Medir RSSI en código
   ```cpp
   Serial.println(WiFi.RSSI());
   // Debe ser > -70 dBm a 1 metro
   // Si es < -85 dBm, módulo débil
   ```

### Problema: Sensores no leen correctamente

**Sensor de Flujo (Digital):**

```
1. Verificar pull-up
   └─ Medir voltaje en GPIO4 sin señal: debe ser 3.3V

2. Test con señal manual
   ```cpp
   pinMode(4, INPUT);
   while(1) {
     Serial.println(digitalRead(4));
     delay(100);
   }
   ```
   └─ Conectar GPIO4 a GND brevemente
       └─ ¿Cambia de 1 a 0?
           ├─ SÍ → GPIO OK, problema con sensor externo
           └─ NO → GPIO o pista defectuosa
```

**Sensor de Presión (Analógico):**

```
1. Test ADC sin sensor
   ```cpp
   pinMode(34, INPUT);
   int val = analogRead(34);
   Serial.println(val); // 0-4095
   ```

2. Aplicar voltajes conocidos
   ├─ 0V → debe leer ~0
   ├─ 1.65V → debe leer ~2048
   └─ 3.3V → debe leer ~4095

3. ¿Lectura errática?
   └─ Añadir capacitor 100nF en paralelo al ADC
```

### Problema: Relay no activa

**Diagnóstico:**

```
1. Verificar señal GPIO
   ```cpp
   digitalWrite(2, HIGH);
   ```
   └─ Medir voltaje en GPIO2: debe ser 3.3V

2. Verificar transistor
   ├─ Medir base del transistor: debe ser ~3.3V
   └─ Medir colector: debe ser ~0V (activado)

3. Verificar relay
   ├─ ¿Se escucha "click"?
   │   └─ SÍ → Relay OK
   └─ Medir bobina con multímetro
       └─ Resistencia: 50-100Ω (relay típico)
```

---

## 📚 Recursos Adicionales

### Documentación Oficial

- **ESP32 Datasheet:** [Espressif ESP32 Technical Reference](https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf)
- **ESP32-WROOM-32 Datasheet:** [Module Specifications](https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf)
- **Hardware Design Guidelines:** [ESP32 PCB Design](https://www.espressif.com/sites/default/files/documentation/esp32_hardware_design_guidelines_en.pdf)

### Tutoriales de Diseño PCB

#### KiCad
- **Tutorial oficial:** [Getting Started with KiCad](https://docs.kicad.org/7.0/en/getting_started_in_kicad/)
- **Video curso (en español):** [KiCad Tutorial Completo](https://www.youtube.com/watch?v=PlDOnSHkX2c)

#### ESP32 PCB Design
- **Phil's Lab:** [ESP32 Custom Board Design](https://www.youtube.com/watch?v=COxGD6z3F70)
- **Andreas Spiess:** [ESP32 PCB Tutorial](https://www.youtube.com/watch?v=H6ImFUWFmJA)

### Librerías de Componentes

- **KiCad ESP32 Libraries:** [Espressif GitHub](https://github.com/espressif/kicad-libraries)
- **SnapEDA:** [Free PCB footprints](https://www.snapeda.com/)
- **Ultra Librarian:** [Component library](https://www.ultralibrarian.com/)

### Comunidades y Foros

- **ESP32 Forum:** [esp32.com](https://www.esp32.com/)
- **Reddit r/esp32:** [reddit.com/r/esp32](https://www.reddit.com/r/esp32/)
- **KiCad Forum:** [forum.kicad.info](https://forum.kicad.info/)
- **EEVblog Forum:** [eevblog.com/forum](https://www.eevblog.com/forum/)

### Herramientas Online

- **PCB Trace Width Calculator:** [4pcb.com/trace-width-calculator](https://www.4pcb.com/trace-width-calculator.html)
- **Antenna Calculator:** [antenna-theory.com](https://www.antenna-theory.com/)
- **Gerber Viewer:** [gerber-viewer.com](https://www.gerber-viewer.com/)

### Proveedores de Componentes

#### Internacional
- **Digi-Key:** [digikey.com](https://www.digikey.com/) - Envío global
- **Mouser:** [mouser.com](https://www.mouser.com/) - Gran stock
- **LCSC:** [lcsc.com](https://www.lcsc.com/) - Económico, integrado con JLCPCB

#### China (importación)
- **AliExpress:** Componentes individuales económicos
- **Taobao:** Acceso a fabricantes directos

#### Local (buscar distribuidores en tu país)
- Empresas de electrónica industrial
- Distribuidores Espressif certificados

---

## ✅ Checklist Final de Migración

### Fase 1: Diseño (Semanas 1-2)

- [ ] Definir requisitos específicos de la PCB
- [ ] Seleccionar módulo ESP32 (recomendado: ESP32-WROOM-32D)
- [ ] Crear esquemático en KiCad
- [ ] Validar esquemático (Design Rules Check)
- [ ] Crear layout PCB
- [ ] Verificar área de antena (keepout zone)
- [ ] Ejecutar Design Rules Check (DRC)
- [ ] Generar archivos Gerber
- [ ] Revisar visualización 3D

### Fase 2: Fabricación (Semanas 3-4)

- [ ] Seleccionar fabricante (ej. JLCPCB)
- [ ] Crear lista de componentes (BOM)
- [ ] Ordenar PCBs (mínimo 10 unidades)
- [ ] Ordenar componentes
  - [ ] ESP32-WROOM-32D
  - [ ] Regulador AMS1117-3.3
  - [ ] Capacitores y resistores
  - [ ] Conectores y terminales
  - [ ] LEDs y botones
- [ ] Esperar recepción (2-3 semanas típicamente)

### Fase 3: Ensamblaje (Semana 5)

- [ ] Preparar estación de trabajo
  - [ ] Soldador temperatura controlada
  - [ ] Flux y soldadura
  - [ ] Pinzas y herramientas
- [ ] Ensamblar primera PCB (prototipo)
- [ ] Inspección visual completa
- [ ] Pruebas de continuidad

### Fase 4: Validación (Semana 6)

- [ ] Prueba de alimentación (sin ESP32)
- [ ] Prueba de alimentación (con ESP32)
- [ ] Programación inicial (sketch de prueba)
- [ ] Prueba de conectividad WiFi
- [ ] Prueba de alcance WiFi (RSSI test)
- [ ] Prueba de GPIO (todos los pines usados)
- [ ] Prueba de sensores
- [ ] Prueba de relay/actuadores

### Fase 5: Integración (Semana 7)

- [ ] Cargar firmware completo de AquaVisor
- [ ] Verificar envío de datos al servidor
- [ ] Verificar recepción de comandos
- [ ] Prueba de funcionamiento continuo (24h+)
- [ ] Implementar OTA updates
- [ ] Documentar ID del dispositivo
- [ ] Crear enclosure/caja (opcional)

### Fase 6: Producción (Semana 8+)

- [ ] Ensamblar lote completo
- [ ] Testing individual de cada unidad
- [ ] Programación con IDs únicos
- [ ] Prueba de calidad final
- [ ] Empaquetado y documentación
- [ ] Despliegue en campo

---

## 🎯 Conclusión

La migración de ESP32 DevKit a una PCB personalizada es un paso natural en la evolución de AquaVisor hacia un producto maduro y comercializable.

### Beneficios Principales

✅ **Reducción de costos:** 35-50% en producción  
✅ **Tamaño compacto:** Ideal para instalaciones reales  
✅ **Profesionalismo:** Producto terminado de calidad  
✅ **Escalabilidad:** Preparado para producción masiva  
✅ **Confiabilidad:** Mayor durabilidad y estabilidad  

### Próximos Pasos Recomendados

1. **Empezar pequeño:** Fabricar 10-20 PCBs para validación
2. **Iterar el diseño:** Basándose en pruebas de campo
3. **Escalar gradualmente:** Aumentar producción según demanda
4. **Certificaciones:** Considerar CE/FCC para mercados internacionales
5. **Enclosure profesional:** Diseñar caja impresa en 3D o inyectada

### Tiempo Total Estimado

| Fase | Duración |
|------|----------|
| Diseño PCB | 1-2 semanas |
| Fabricación + envío | 2-3 semanas |
| Ensamblaje | 3-5 días |
| Testing | 1 semana |
| **TOTAL** | **6-8 semanas** |

> Con experiencia previa en diseño PCB, el proceso se puede reducir a 4-5 semanas

---

## 📞 Soporte y Contacto

Para dudas específicas sobre la migración de AquaVisor:

- **GitHub Issues:** [https://github.com/cristopher281/AquaVisor/issues](https://github.com/cristopher281/AquaVisor/issues)
- **Documentación adicional:** Ver carpeta `/docs`
- **Comunidad ESP32:** [esp32.com](https://www.esp32.com/)

---

**¡Éxito con tu migración a PCB personalizada! 🚀**

*Documento creado como parte del proyecto AquaVisor*  
*Contribuciones y mejoras son bienvenidas*
