const express = require('express');
const router = express.Router();
const { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion } = require('../controllers/ai.controller');
const { protegerRuta } = require('../middleware/auth.middleware');

router.use(protegerRuta);

router.post('/generar-subtareas', generarSubtareas);
router.get('/analizar-carga', analizarCargaTrabajo);
router.post('/sugerir-descripcion', sugerirDescripcion);

module.exports = router;
