# Guía Maestra de Despliegue: AquaVisor en la Nube

Esta guía es tu manual completo para llevar el proyecto AquaVisor desde tu computadora hasta internet. Está diseñada para ser clara, detallada y fácil de seguir.

---

## 🏗️ Arquitectura: ¿Cómo funciona todo junto?

Antes de empezar, es importante entender las piezas del rompecabezas:

1.  **Clever Cloud (La Memoria)**: Aquí vive tu **Base de Datos**. Es como el disco duro en la nube. Guarda todos los registros de los sensores para que no se pierdan nunca, incluso si apagas todo.
2.  **Render (El Cerebro)**: Aquí vive tu **Servidor (Backend)**. Es el programa que recibe los datos del ESP32, los procesa y los guarda en Clever Cloud. También se los entrega a la página web cuando los pide.
3.  **Vercel (La Cara)**: Aquí vive tu **Página Web (Frontend)**. Es lo que ves en el navegador. Se conecta a Render para pedirle los datos y mostrártelos bonito.
4.  **ESP32 (El Origen)**: Tu dispositivo físico. Recopila datos del mundo real y los envía a Render.

---

## 🚀 Paso 1: Base de Datos (Clever Cloud)
*Objetivo: Tener un lugar seguro y gratuito para guardar tus datos.*

1.  Ve a [clever-cloud.com](https://www.clever-cloud.com/) y regístrate (puedes usar tu cuenta de GitHub).
2.  En el panel principal, busca el botón **"Create..."** o **"New"** y selecciona **"an add-on"**.
3.  En la lista de servicios, selecciona **MySQL**.
4.  Elige el plan **"Dev"** (es gratuito). Dale un nombre (ej: `bd-aquavisor`) y selecciona la zona (recomiendo Montreal o Paris, la mas cercana a ti).
5.  Una vez creada, verás un panel con muchas pestañas. Haz clic en la pestaña **"Information"**.
6.  **¡OJO!** Copia estos 5 valores en un bloc de notas, los necesitarás en el Paso 2:
    *   **Host** (ej: `b0x...mysql.services.clever-cloud.com`) -> Esto será `MYSQL_ADDON_HOST`
    *   **Database** (ej: `b0x...`) -> Esto será `MYSQL_ADDON_DB`
    *   **User** (ej: `u7x...`) -> Esto será `MYSQL_ADDON_USER`
    *   **Password** (ej: `P0...`) -> Esto será `MYSQL_ADDON_PASSWORD`
    *   **Port** (normalmente `3306`) -> Esto será `MYSQL_ADDON_PORT`

---

## 🧠 Paso 2: Servidor Backend (Render)
*Objetivo: Poner tu código de servidor en internet para que el ESP32 pueda hablar con él.*

1.  Asegúrate de haber subido tu código actualizado a **GitHub**.
2.  Ve a [render.com](https://render.com/) y crea una cuenta.
3.  Haz clic en el botón **"New +"** y elige **"Web Service"**.
4.  Conecta tu cuenta de GitHub y selecciona el repositorio de `AquaVisor`.
5.  Render te pedirá configurar el servicio. Llena esto con cuidado:
    *   **Name**: `acuavisor-server` (o lo que quieras).
    *   **Region**: Elige la misma o cercana a tu base de datos (ej: US East).
    *   **Branch**: `main`.
    *   **Root Directory**: Escribe `monitor-iot/server` (¡Muy importante! Indica dónde está el código del servidor).
    *   **Runtime**: `Node`.
    *   **Build Command**: `npm install` (Instala las librerías).
    *   **Start Command**: `npm start` (Arranca el servidor).
    *   **Plan**: Free.
6.  Baja hasta la sección **"Environment Variables"** (Variables de Entorno). Aquí conectamos con la base de datos. Haz clic en "Add Environment Variable" para cada una:
    *   Clave: `CLEVER_MYSQL_HOST` | Valor: (Pega el Host de Clever Cloud)
    *   Clave: `CLEVER_MYSQL_DB` | Valor: (Pega la Database de Clever Cloud)
    *   Clave: `CLEVER_MYSQL_USER` | Valor: (Pega el User de Clever Cloud)
    *   Clave: `CLEVER_MYSQL_PASSWORD` | Valor: (Pega el Password de Clever Cloud)
    *   Clave: `CLEVER_MYSQL_PORT` | Valor: `3306`
7.  Haz clic en **"Create Web Service"**.
8.  Espera unos minutos. Si todo sale bien, verás un check verde que dice "Live".
9.  **COPIA LA URL** que aparece arriba a la izquierda (ej: `https://acuavisor-server.onrender.com`). ¡Esta es la dirección de tu cerebro en la nube!

---

## 🎨 Paso 3: Cliente Frontend (Vercel)
*Objetivo: Que tu página web sea accesible desde cualquier celular o PC.*

1.  Ve a [vercel.com](https://vercel.com/) y crea cuenta.
2.  Haz clic en **"Add New..."** -> **"Project"**.
3.  Importa el mismo repositorio de GitHub `AquaVisor`.
4.  Configuración del proyecto:
    *   **Framework Preset**: Vite (se detecta solo).
    *   **Root Directory**: Haz clic en "Edit" y selecciona la carpeta `monitor-iot/client`.
5.  **Environment Variables**:
    *   Aquí le decimos a la web dónde está el cerebro (Render).
    *   Nombre: `VITE_API_URL`
    *   Valor: Pega la URL de Render que copiaste en el paso anterior (ej: `https://acuavisor-server.onrender.com`). **IMPORTANTE**: Sin la barra `/` al final.
6.  Haz clic en **"Deploy"**.
7.  Vercel construirá tu página. En un minuto verás confeti y un botón "Visit". ¡Tu web ya está online!

---

## 🔌 Paso 4: Conectar todo
Ahora que todo está en la nube:
1.  **Abre tu web en Vercel**: Debería cargar, pero quizás no muestre datos aún.
2.  **Configura tu ESP32**: Sigue la guía `ESP32_CLOUD_CONFIG.md` para actualizar el código de tu microcontrolador con la nueva URL de Render.
3.  **Prueba**: En cuanto el ESP32 envíe el primer dato, deberías verlo aparecer en tu web de Vercel (quizás tengas que refrescar).

---

## ❓ Solución de Problemas (Troubleshooting)

**Mi web carga pero no muestra datos.**
*   Revisa la consola del navegador (F12 -> Console). Si ves errores en rojo de conexión, verifica que la variable `VITE_API_URL` en Vercel sea correcta y no tenga espacios.
*   Asegúrate de que el servidor en Render esté "Live" y no se haya  "dormido" (los planes gratis se duermen tras 15 min de inactividad, tardan 1 min en despertar).

**El ESP32 no conecta.**
*   Verifica el Monitor Serie de Arduino. ¿Dice "WiFi connected"?
*   Si dice error HTTP, verifica que la URL en el código C++ sea exáctamente la de Render + `/api/sensor-data`.

**Los datos se borran al día siguiente.**
*   Verifica en Render que las variables de entorno de Clever Cloud (`CLEVER_MYSQL_...`) estén bien puestas. Si fallan, el servidor guarda en memoria y se borra al reiniciarse.
