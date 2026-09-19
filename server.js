const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const aiRoutes = require('./routes/ai.routes');
const authRoutes = require('./routes/auth.routes');   // Descomentado
const tareaRoutes = require('./routes/tarea.routes'); // Descomentado

const app = express();

/* ─── Middlewares Globales ────────────────────────────────────────────── */

// Configuración de CORS completa (incluyendo OPTIONS para preflight)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middlewares para procesar JSON (Debe ir antes de las rutas)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ─── Definición de Rutas API ─────────────────────────────────────────── */

app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tareas', tareaRoutes);

// Ruta de comprobación de estado
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor SmartTask IA corriendo correctamente 🚀' });
});

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
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
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor ejecutándose en el puerto: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error al conectar con MongoDB:', err.message);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`⚠️ Servidor iniciado en el puerto ${PORT} sin conexión a MongoDB.`);
    });
  });