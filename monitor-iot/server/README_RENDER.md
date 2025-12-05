# Deploy en Render (Guía rápida)

Este servicio es el backend Node.js del proyecto AquaVisor ubicado en `monitor-iot/server`.

Requisitos previos
- Cuenta en Render (https://render.com)
- Repositorio accesible desde Render (GitHub/GitLab)
- Una base de datos MySQL accesible desde Render (o un servicio externo). En este proyecto las variables usadas son `CLEVER_MYSQL_*`.

Variables de entorno necesarias
- `PORT` (opcional, Render provee una propia)
- `ENABLE_PERSISTENCE=true` (habilita persistencia; en producción debe activarse cuando tienes MySQL configurado)
- `CLEVER_MYSQL_HOST` - host de MySQL
- `CLEVER_MYSQL_DB` - nombre de la base de datos
- `CLEVER_MYSQL_USER` - usuario
- `CLEVER_MYSQL_PASSWORD` - contraseña
- `CLEVER_MYSQL_PORT` - puerto (por defecto 3306)
- Cualquier otra variable que uses (API keys, etc.)

Pasos para desplegar en Render
1. En Render, crea un nuevo **Web Service**.
2. Conecta el repositorio y selecciona la rama `main`.
3. En `Root` pon `monitor-iot/server` (importante: el servidor está dentro de esa carpeta).
4. Build Command: `npm install`
5. Start Command: `npm start`
6. En `Environment` añade las variables de entorno listadas arriba (no subas `.env.local` al repo).
7. Configura el Health Check en Render a `http://$PORT/api/health`.

Notas sobre persistencia y MySQL
- Si `CLEVER_MYSQL_*` está configurado el servidor intentará inicializar una conexión MySQL y guardar `sensors` y `history` en la BD.
- Si prefieres no usar persistencia en disco (por ejemplo, porque Render ya gestiona volúmenes o quieres usar solo MySQL), deja `ENABLE_PERSISTENCE=true` y configura las vars MySQL.
- Si `ENABLE_PERSISTENCE=false` el servidor no leerá ni escribirá archivos en `monitor-iot/server/data`.

Archivos importantes
- `index.js` - servidor Express principal
- `data/` - contiene persistencia JSON local (si está habilitada)
- `reports/` - archivos PDF/CSV generados

Recomendaciones
- Asegúrate de añadir los secretos (MySQL credentials) en el panel de Environment de Render.
- Si quieres usar el servicio de MySQL de Render, crea primero la base de datos y copia las credenciales a las variables de entorno.

Soporte
Si quieres, puedo generar un `render.yaml` con la definición del servicio y un `Procfile` si lo prefieres.
