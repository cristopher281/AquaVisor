# Guía para usuarios — AquaVisor (interfaz web)

Esta guía está pensada para cualquier persona que use la aplicación web. No necesita conocimientos técnicos.

Si solo quieres ver datos en vivo o descargar reportes, esta página te muestra qué hacer y cómo interpretar lo que ves.

---

Qué encontrarás en la web
- Centro de Comando: resumen rápido con tarjetas, la gráfica del tanque y alertas.
- Reportes: descargar información en CSV o PDF.
- Alertas: lista de eventos importantes y acciones recomendadas.
- Control de Válvula: abrir/cerrar la válvula (si tu instalación lo permite).

Cómo usar la web (pasos rápidos)
1. Abre la página del sistema (por ejemplo `http://localhost:5173` en desarrollo).  
2. En la parte superior verás cuatro tarjetas con información rápida: Valor Actual, Nivel Promedio, Alertas Críticas y Estado Sistema.  
3. Revisa la gráfica para ver la tendencia del flujo/ nivel.  
4. Consulta el panel de alertas a la derecha para ver avisos y recomendaciones.  
5. Desde el panel de alertas puedes descargar un CSV o generar un PDF profesional.

---

Explicación simple de cada elemento

- Valor Actual: muestra el flujo promedio más reciente en litros (L). Debajo verás un porcentaje como "+9% vs ayer". Esto indica cómo cambió el flujo respecto al periodo anterior (últimas 24 horas frente a las 24 horas previas). Si no hay suficientes datos verás "N/A".

- Nivel Promedio: indica el nivel del tanque en metros. Si aparece vacío o con valores genéricos, significa que en tu instalación no se está enviando un valor de nivel real y se está mostrando un valor de ejemplo.

- Alertas Críticas: número de alertas activas. Haz clic en la sección de Alertas para ver los detalles y recomendaciones para cada aviso.

- Estado Sistema: indica si el sistema está operativo y cuántos sensores están enviando datos. Si ves "No operativo" o 0 sensores, el sistema no está recibiendo lecturas.

- Gráfica principal: muestra la evolución reciente del flujo o nivel. Útil para detectar subidas/bajadas rápidas.

---

Cómo interpretar una alerta
- En el panel de alertas verás un título, el sensor asociado y la hora.
- Cada alerta incluye una breve recomendación (por ejemplo: "Nivel por debajo del umbral").
- Qué hacer: seguir la recomendación, revisar el sensor indicado y, si procede, abrir la vista de Control de Válvula o contactar al responsable técnico.

Descargar reportes (CSV y PDF)
- CSV: botón "Generar CSV" descarga un archivo con el historial de lecturas. Útil para análisis en Excel.
- PDF: botón "Generar PDF" crea un informe con la gráfica y estadísticas. Puedes guardarlo en tu ordenador o, si tu sistema está configurado, se sube al servidor y se guarda en la carpeta de reportes.

Consejos prácticos
- Si ves "N/A" en el % vs ayer: deja que el sistema acumule datos durante 24–48 horas para que el cálculo tenga muestras suficientes.
- Si falta información (por ejemplo, nivel): puede que el sensor no esté enviando ese campo; contacta al equipo de soporte.
- Para necesidades de informe regular, usa la opción PDF y guarda el archivo con fecha en el nombre.

Problemas comunes y soluciones sencillas
- No se cargan datos en la página: intenta recargar el navegador. Si persiste, contacta soporte (ver abajo).
- El número de sensores es 0: verifica tu conexión a la red o consulta con el técnico de campo.
- PDF no descarga o error: intenta con otro navegador y revisa mensajes en pantalla.

Ayuda y contacto
- Si necesitas ayuda para interpretar datos o hay una posible falla en el sistema, contacta al responsable técnico de tu organización. Si no sabes quién es, deja un mensaje con la fecha/hora de la incidencia y una captura de pantalla del panel de alertas.

Buenas prácticas para usuarios
- Revisa las tarjetas del Centro de Comando al comenzar tu jornada.  
- Si aparece una alerta crítica, sigue la recomendación y registra la acción tomada.  
- Descarga un PDF semanal si necesitas enviar informes a supervisión.

