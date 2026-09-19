const express = require('express');
const router = express.Router();
const {
  generarSubtareas,
  analizarCargaTrabajo,
  sugerirDescripcion,
} = require('../controllers/ai.controller');

// Importa tu middleware de autenticación (Ajusta la ruta según la estructura de tus carpetas)
const authMiddleware = require('../middleware/auth.middleware');

/* ─── Rutas de Inteligencia Artificial (/api/ai) ───────────────────────── */

// 1. POST /api/ai/sugerir-descripcion
// Nota: Omitimos authMiddleware aquí para permitir la generación en el modal de creación sin bloqueos por JWT, 
// o puedes incluirlo si tu cliente siempre envía el header Authorization.
router.post('/sugerir-descripcion', sugerirDescripcion);

// 2. POST /api/ai/generar-subtareas
// Requiere autenticación porque vincula y guarda subtareas en la BD según req.usuario._id
router.post('/generar-subtareas', authMiddleware, generarSubtareas);

// 3. GET /api/ai/analizar-carga
// Requiere autenticación porque lee las tareas pendientes del usuario logueado
router.get('/analizar-carga', authMiddleware, analizarCargaTrabajo);

module.exports = router;