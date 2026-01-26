# Guía Detallada: Configurando el ESP32 para la Nube

Esta guía profundiza en cómo hacer que tu ESP32 hable con tu nuevo servidor en la nube de forma segura y fiable.

---

## 📋 ¿Qué cambia respecto a la versión local?

1.  **WiFi**: Obviamente, necesitas conectarte a una red con Internet, no solo a tu red local.
2.  **Protocolo**: Pasamos de `HTTP` (inseguro) a `HTTPS` (seguro, con candadito). Render FUERZA el uso de HTTPS.
3.  **Destino**: Ya no apuntamos a una IP tipo `192.168.1.50`, sino a un dominio público `...onrender.com`.

---

## 🛠️ El Código Explicado Paso a Paso

Aquí tienes el código completo con explicaciones detalladas.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

// ==========================================
// 1. ZONA DE CONFIGURACIÓN
// ==========================================

// TUS CREDENCIALES DE INTERNET
const char* ssid = "NOMBRE_DE_TU_WIFI";      // Tu red WiFi (2.4GHz)
const char* password = "CONTRASEÑA_WIFI";    // Tu contraseña

// LA DIRECCIÓN DE TU SERVIDOR (La que copiaste de Render)
// - Debe empezar por "https://"
// - Debe terminar en "/api/sensor-data"
// - NO debe tener espacios
const char* serverUrl = "https://acuavisor-server.onrender.com/api/sensor-data";

// IDENTIFICADOR DE ESTE ESP32
// Cambia esto si tienes varios dispositivos (ej: sensor_02, sensor_jardin)
const char* sensorId = "sensor_01"; 

// ==========================================

void setup() {
  Serial.begin(115200); // Iniciamos la comunicación para ver mensajes en pantalla
  delay(1000);

  // CONEXIÓN WIFI
  Serial.println();
  Serial.println("--------------------------------");
  Serial.print("Intentando conectar a: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  // Esperamos hasta que conecte...
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    intentos++;
    if (intentos > 20) { // Si tras 10 segundos no conecta, avisa
        Serial.println("\nPRECAUCIÓN: Tarda mucho en conectar. Revisa contraseña.");
    }
  }

  Serial.println("\n¡Conectado!");
  Serial.print("Dirección IP asignada: ");
  Serial.println(WiFi.localIP()); 
  Serial.println("--------------------------------");
}

void loop() {
  // 1. OBTENER DATOS (Aquí iría la lectura real de tu sensor de flujo)
  // Por ahora simulamos valores para probar la conexión
  float caudal = 15.5;  
  float total = 120.4;
  
  // Verificamos si seguimos conectados a internet
  if (WiFi.status() == WL_CONNECTED) {
    
    // Objeto para manejar la conexión
    HTTPClient http;
    
    // Cliente seguro para HTTPS
    WiFiClientSecure client;
    
    // TRUCO DE SEGURIDAD:
    // "setInsecure()" le dice al ESP32: "Confía en el certificado del servidor".
    // Esto ahorra memoria y evita errores si el certificado de Render cambia.
    // Para un proyecto de hobby/prototipo es perfecto y seguro.
    client.setInsecure(); 
    
    Serial.print("Iniciando conexión a: ");
    Serial.println(serverUrl);
    
    // Inicializamos la conexión con el cliente seguro
    if (http.begin(client, serverUrl)) { 
      
      // Le decimos al servidor que le vamos a enviar un JSON
      http.addHeader("Content-Type", "application/json");
      
      // 2. CONSTRUIR EL MENSAJE (PAYLOAD)
      // Tenemos que fabricar este texto exacto:
      // {"sensor_id": "sensor_01", "caudal_min": 15.5, "total_acumulado": 120.4}
      
      String jsonPayload = "{";
      jsonPayload += "\"sensor_id\": \"" + String(sensorId) + "\",";
      jsonPayload += "\"caudal_min\": " + String(caudal) + ",";
      jsonPayload += "\"total_acumulado\": " + String(total) + ",";
      // La hora la dejamos que la ponga el servidor al recibir el mensaje para simplificar
      // pero si tienes un módulo reloj (RTC), podrías añadirla aquí.
      jsonPayload += "\"hora\": \"\""; 
      jsonPayload += "}";
      
      Serial.print("Enviando mensaje: ");
      Serial.println(jsonPayload);

      // 3. ENVIAR (POST)
      int httpResponseCode = http.POST(jsonPayload);
      
      // 4. VERIFICAR RESULTADO
      if (httpResponseCode > 0) {
        // Si es positivo, el servidor respondió
        String response = http.getString();
        
        Serial.print("Código HTTP: ");
        Serial.println(httpResponseCode); // 200 o 201 es ÉXITO
        
        if (httpResponseCode == 200 || httpResponseCode == 201) {
            Serial.println("✅ ÉXITO: Datos recibidos y guardados por el servidor.");
        } else {
            Serial.println("⚠️ ALERTA: El servidor respondió pero algo no le gustó.");
        }
        Serial.println("Respuesta del servidor: " + response);
        
      } else {
        // Si es negativo, ni siquiera llegamos al servidor (Error de red)
        Serial.print("❌ ERROR DE CONEXIÓN: ");
        Serial.println(httpResponseCode);
        Serial.println("Posibles causas: URL mal escrita, WiFi sin internet, Servidor caído.");
      }
      
      // Cerrar conexión para liberar memoria
      http.end();
      
    } else {
      Serial.println("❌ Error: No se pudo iniciar la conexión HTTP (Problema interno)");
    }
  } else {
    Serial.println("❌ Error: WiFi desconectado. Intentando reconectar...");
    // Podrías añadir WiFi.reconnect() aquí si quisieras
  }
  
  // Esperar X tiempo antes del próximo envío
  Serial.println("Esperando 10 segundos...");
  delay(10000); 
}
```

---

## 🔍 Solución de Problemas Comunes

**1. El Monitor Serie dice "Conectando a WiFi....." y nunca termina.**
*   **Causa**: Contraseña incorrecta, red WiFi de 5GHz (el ESP32 solo usa 2.4GHz), o señal muy débil.
*   **Solución**: Revisa las credenciales y asegúrate de estar cerca del router.

**2. Error de Conexión -1 (Connection Refused).**
*   **Causa**: La URL está mal escrita o falta el protocolo `https://`.
*   **Solución**: Copia y pega la URL de Render de nuevo.

**3. Código HTTP 404 (Not Found).**
*   **Causa**: Llegaste al servidor, pero a una puerta equivocada.
*   **Solución**: Te falta `/api/sensor-data` al final de la URL.

**4. Código HTTP 500 (Server Error).**
*   **Causa**: El servidor recibió el mensaje pero explotó al procesarlo.
*   **Solución**: Probablemente tu JSON está mal formado (faltan comillas o comas). Revisa la construcción del `jsonPayload`. Revisa también los logs en el panel de Render ("Logs") para ver qué error dio el servidor.
