const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const aiRoutes = require('./routes/ai.routes');
// Importa tus otras rutas si las tienes (ej. authRoutes, tareaRoutes, etc.)
// const authRoutes = require('./routes/auth.routes');
// const tareaRoutes = require('./routes/tarea.routes');

const app = express();

/* ─── Middlewares Globales ────────────────────────────────────────────── */

// Configuración de CORS para permitir peticiones desde tu Frontend en Railway/Local
app.use(cors({
  origin: '*', // O especifica la URL de tu frontend: 'https://smarttask-ia-frontend-production.up.railway.app'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares para procesar el cuerpo de las peticiones (JSON)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ─── Definición de Rutas API ─────────────────────────────────────────── */

app.use('/api/ai', aiRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/tareas', tareaRoutes);

// Ruta de comprobación de estado de la API
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor SmartTask IA corriendo correctamente 🚀' });
});

// Manejo de rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

/* ─── Manejador de errores global ─────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('Error interno del servidor:', err);
  res.status(500).json({ error: 'Error interno en el servidor' });
});

/* ─── Conexión a MongoDB y Arranque del Servidor ──────────────────────── */

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.warn('⚠️ Advertencia: No se detectó la variable MONGO_URI en el entorno.');
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Conexión exitosa a la base de datos MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en el puerto: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error al conectar con MongoDB:', err.message);
    // Iniciar el servidor aun si falla la base de datos para no bloquear peticiones aisladas
    app.listen(PORT, () => {
      console.log(`⚠️ Servidor iniciado en el puerto ${PORT} sin conexión a base de datos.`);
    });
  });