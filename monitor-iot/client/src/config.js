// Configuración de la URL de la API
// En desarrollo (Vite) usa el proxy con URL relativa ('')
// En producción (Vercel) debe usar la variable de entorno completa
export const API_URL = import.meta.env.VITE_API_URL || '';
